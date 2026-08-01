// ── Partner store: Neon-backed, in-memory fallback ────────────────
// Mirrors the app's data-layer pattern (MockDataSource ↔ MetaDataSource):
// with DATABASE_URL set the partner tables live in Neon (db/partner-auth.sql);
// without it, an in-memory store keeps the full flow demoable — credentials
// simply reset on server restart.

import { getSql } from "./db";

export type PartnerScope = "results:read" | "keys:manage";
export const DEFAULT_SCOPES: PartnerScope[] = ["results:read", "keys:manage"];

export interface Partner {
  id: string;
  name: string;
  status: "active" | "suspended";
  /** Campaign ids this partner may read. null = all campaigns. */
  campaignScope: string[] | null;
  createdAt: string;
}

export interface PartnerApiKey {
  keyId: string;
  partnerId: string;
  secretHash: string;
  env: "live" | "test";
  label: string;
  scopes: PartnerScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface PartnerOAuthClient {
  clientId: string;
  partnerId: string;
  secretHash: string;
  scopes: PartnerScope[];
  createdAt: string;
  revokedAt: string | null;
}

export interface PartnerStore {
  createPartner(name: string, campaignScope: string[] | null): Promise<Partner>;
  getPartner(id: string): Promise<Partner | null>;
  listPartners(): Promise<Partner[]>;
  insertKey(key: PartnerApiKey): Promise<void>;
  findKey(keyId: string): Promise<PartnerApiKey | null>;
  listKeys(partnerId: string): Promise<PartnerApiKey[]>;
  revokeKey(partnerId: string, keyId: string): Promise<boolean>;
  touchKey(keyId: string): Promise<void>;
  insertClient(c: PartnerOAuthClient): Promise<void>;
  findClient(clientId: string): Promise<PartnerOAuthClient | null>;
  audit(partnerId: string, event: string, detail: string): Promise<void>;
  listAudit(partnerId: string): Promise<{ at: string; event: string; detail: string }[]>;
}

// ── In-memory fallback (no DATABASE_URL) ───────────────────────────
class MemoryPartnerStore implements PartnerStore {
  private partners: Partner[] = [];
  private keys: PartnerApiKey[] = [];
  private clients: PartnerOAuthClient[] = [];
  private events: { partnerId: string; at: string; event: string; detail: string }[] = [];

  async createPartner(name: string, campaignScope: string[] | null): Promise<Partner> {
    const p: Partner = {
      id: `ptr_${Math.random().toString(16).slice(2, 14)}`,
      name, status: "active", campaignScope, createdAt: new Date().toISOString(),
    };
    this.partners.push(p);
    return p;
  }
  async getPartner(id: string) { return this.partners.find((p) => p.id === id) ?? null; }
  async listPartners() { return [...this.partners]; }
  async insertKey(key: PartnerApiKey) { this.keys.push(key); }
  async findKey(keyId: string) { return this.keys.find((k) => k.keyId === keyId) ?? null; }
  async listKeys(partnerId: string) { return this.keys.filter((k) => k.partnerId === partnerId); }
  async revokeKey(partnerId: string, keyId: string) {
    const k = this.keys.find((k) => k.keyId === keyId && k.partnerId === partnerId && !k.revokedAt);
    if (!k) return false;
    k.revokedAt = new Date().toISOString();
    return true;
  }
  async touchKey(keyId: string) {
    const k = this.keys.find((k) => k.keyId === keyId);
    if (k) k.lastUsedAt = new Date().toISOString();
  }
  async insertClient(c: PartnerOAuthClient) { this.clients.push(c); }
  async findClient(clientId: string) { return this.clients.find((c) => c.clientId === clientId) ?? null; }
  async audit(partnerId: string, event: string, detail: string) {
    this.events.push({ partnerId, at: new Date().toISOString(), event, detail });
  }
  async listAudit(partnerId: string) {
    return this.events.filter((e) => e.partnerId === partnerId).slice(-100);
  }
}

// ── Neon implementation (db/partner-auth.sql) ──────────────────────
class NeonPartnerStore implements PartnerStore {
  private sql = getSql();

  /** Create the partner tables on first use so provisioning never fails with
   *  'relation does not exist'. Idempotent; db/partner-auth.sql remains the
   *  explicit reference for DBAs who prefer to run migrations by hand. */
  private ready: Promise<void> | null = null;
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.sql`
          CREATE TABLE IF NOT EXISTS partners (
            id             TEXT PRIMARY KEY,
            name           TEXT NOT NULL,
            status         TEXT NOT NULL DEFAULT 'active',
            campaign_scope JSONB,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
          )`;
        await this.sql`
          CREATE TABLE IF NOT EXISTS partner_api_keys (
            key_id       TEXT PRIMARY KEY,
            partner_id   TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            secret_hash  TEXT NOT NULL,
            env          TEXT NOT NULL DEFAULT 'live',
            label        TEXT NOT NULL DEFAULT '',
            scopes       JSONB NOT NULL DEFAULT '["results:read","keys:manage"]',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at   TIMESTAMPTZ,
            last_used_at TIMESTAMPTZ,
            revoked_at   TIMESTAMPTZ
          )`;
        await this.sql`
          CREATE TABLE IF NOT EXISTS partner_oauth_clients (
            client_id   TEXT PRIMARY KEY,
            partner_id  TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            secret_hash TEXT NOT NULL,
            scopes      JSONB NOT NULL DEFAULT '["results:read","keys:manage"]',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            revoked_at  TIMESTAMPTZ
          )`;
        await this.sql`
          CREATE TABLE IF NOT EXISTS partner_audit (
            id         BIGSERIAL PRIMARY KEY,
            partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            at         TIMESTAMPTZ NOT NULL DEFAULT now(),
            event      TEXT NOT NULL,
            detail     TEXT NOT NULL DEFAULT ''
          )`;
        await this.sql`CREATE INDEX IF NOT EXISTS idx_partner_api_keys_partner ON partner_api_keys(partner_id)`;
        await this.sql`CREATE INDEX IF NOT EXISTS idx_partner_audit_partner ON partner_audit(partner_id, at DESC)`;
      })().catch((e) => { this.ready = null; throw e; });
    }
    return this.ready;
  }

  private rowToPartner(r: Record<string, unknown>): Partner {
    return {
      id: String(r.id), name: String(r.name), status: r.status as Partner["status"],
      campaignScope: (r.campaign_scope as string[] | null) ?? null,
      createdAt: String(r.created_at),
    };
  }
  private rowToKey(r: Record<string, unknown>): PartnerApiKey {
    return {
      keyId: String(r.key_id), partnerId: String(r.partner_id), secretHash: String(r.secret_hash),
      env: r.env as "live" | "test", label: String(r.label), scopes: r.scopes as PartnerScope[],
      createdAt: String(r.created_at),
      expiresAt: r.expires_at ? String(r.expires_at) : null,
      lastUsedAt: r.last_used_at ? String(r.last_used_at) : null,
      revokedAt: r.revoked_at ? String(r.revoked_at) : null,
    };
  }

  async createPartner(name: string, campaignScope: string[] | null): Promise<Partner> {
    await this.ensureSchema();
    const id = `ptr_${Math.random().toString(16).slice(2, 14)}`;
    const rows = (await this.sql`
      INSERT INTO partners (id, name, status, campaign_scope)
      VALUES (${id}, ${name}, 'active', ${campaignScope ? JSON.stringify(campaignScope) : null}::jsonb)
      RETURNING *`) as Record<string, unknown>[];
    return this.rowToPartner(rows[0]);
  }
  async getPartner(id: string) {
    await this.ensureSchema();
    const rows = (await this.sql`SELECT * FROM partners WHERE id = ${id}`) as Record<string, unknown>[];
    return rows[0] ? this.rowToPartner(rows[0]) : null;
  }
  async listPartners() {
    await this.ensureSchema();
    const rows = (await this.sql`SELECT * FROM partners ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((r) => this.rowToPartner(r));
  }
  async insertKey(k: PartnerApiKey) {
    await this.ensureSchema();
    await this.sql`
      INSERT INTO partner_api_keys (key_id, partner_id, secret_hash, env, label, scopes, expires_at)
      VALUES (${k.keyId}, ${k.partnerId}, ${k.secretHash}, ${k.env}, ${k.label},
              ${JSON.stringify(k.scopes)}::jsonb, ${k.expiresAt})`;
  }
  async findKey(keyId: string) {
    await this.ensureSchema();
    const rows = (await this.sql`SELECT * FROM partner_api_keys WHERE key_id = ${keyId}`) as Record<string, unknown>[];
    return rows[0] ? this.rowToKey(rows[0]) : null;
  }
  async listKeys(partnerId: string) {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT * FROM partner_api_keys WHERE partner_id = ${partnerId} ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((r) => this.rowToKey(r));
  }
  async revokeKey(partnerId: string, keyId: string) {
    await this.ensureSchema();
    const rows = (await this.sql`
      UPDATE partner_api_keys SET revoked_at = now()
      WHERE key_id = ${keyId} AND partner_id = ${partnerId} AND revoked_at IS NULL
      RETURNING key_id`) as Record<string, unknown>[];
    return rows.length > 0;
  }
  async touchKey(keyId: string) {
    await this.ensureSchema();
    await this.sql`UPDATE partner_api_keys SET last_used_at = now() WHERE key_id = ${keyId}`;
  }
  async insertClient(c: PartnerOAuthClient) {
    await this.ensureSchema();
    await this.sql`
      INSERT INTO partner_oauth_clients (client_id, partner_id, secret_hash, scopes)
      VALUES (${c.clientId}, ${c.partnerId}, ${c.secretHash}, ${JSON.stringify(c.scopes)}::jsonb)`;
  }
  async findClient(clientId: string) {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT * FROM partner_oauth_clients WHERE client_id = ${clientId}`) as Record<string, unknown>[];
    const r = rows[0];
    if (!r) return null;
    return {
      clientId: String(r.client_id), partnerId: String(r.partner_id), secretHash: String(r.secret_hash),
      scopes: r.scopes as PartnerScope[], createdAt: String(r.created_at),
      revokedAt: r.revoked_at ? String(r.revoked_at) : null,
    };
  }
  async audit(partnerId: string, event: string, detail: string) {
    await this.ensureSchema();
    await this.sql`
      INSERT INTO partner_audit (partner_id, event, detail) VALUES (${partnerId}, ${event}, ${detail})`;
  }
  async listAudit(partnerId: string) {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT at, event, detail FROM partner_audit WHERE partner_id = ${partnerId}
      ORDER BY at DESC LIMIT 100`) as Record<string, unknown>[];
    return rows.map((r) => ({ at: String(r.at), event: String(r.event), detail: String(r.detail) }));
  }
}

let _store: PartnerStore | null = null;
export function getPartnerStore(): PartnerStore {
  if (!_store) _store = process.env.DATABASE_URL ? new NeonPartnerStore() : new MemoryPartnerStore();
  return _store;
}
