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
    const id = `ptr_${Math.random().toString(16).slice(2, 14)}`;
    const rows = (await this.sql`
      INSERT INTO partners (id, name, status, campaign_scope)
      VALUES (${id}, ${name}, 'active', ${campaignScope ? JSON.stringify(campaignScope) : null}::jsonb)
      RETURNING *`) as Record<string, unknown>[];
    return this.rowToPartner(rows[0]);
  }
  async getPartner(id: string) {
    const rows = (await this.sql`SELECT * FROM partners WHERE id = ${id}`) as Record<string, unknown>[];
    return rows[0] ? this.rowToPartner(rows[0]) : null;
  }
  async listPartners() {
    const rows = (await this.sql`SELECT * FROM partners ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((r) => this.rowToPartner(r));
  }
  async insertKey(k: PartnerApiKey) {
    await this.sql`
      INSERT INTO partner_api_keys (key_id, partner_id, secret_hash, env, label, scopes, expires_at)
      VALUES (${k.keyId}, ${k.partnerId}, ${k.secretHash}, ${k.env}, ${k.label},
              ${JSON.stringify(k.scopes)}::jsonb, ${k.expiresAt})`;
  }
  async findKey(keyId: string) {
    const rows = (await this.sql`SELECT * FROM partner_api_keys WHERE key_id = ${keyId}`) as Record<string, unknown>[];
    return rows[0] ? this.rowToKey(rows[0]) : null;
  }
  async listKeys(partnerId: string) {
    const rows = (await this.sql`
      SELECT * FROM partner_api_keys WHERE partner_id = ${partnerId} ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((r) => this.rowToKey(r));
  }
  async revokeKey(partnerId: string, keyId: string) {
    const rows = (await this.sql`
      UPDATE partner_api_keys SET revoked_at = now()
      WHERE key_id = ${keyId} AND partner_id = ${partnerId} AND revoked_at IS NULL
      RETURNING key_id`) as Record<string, unknown>[];
    return rows.length > 0;
  }
  async touchKey(keyId: string) {
    await this.sql`UPDATE partner_api_keys SET last_used_at = now() WHERE key_id = ${keyId}`;
  }
  async insertClient(c: PartnerOAuthClient) {
    await this.sql`
      INSERT INTO partner_oauth_clients (client_id, partner_id, secret_hash, scopes)
      VALUES (${c.clientId}, ${c.partnerId}, ${c.secretHash}, ${JSON.stringify(c.scopes)}::jsonb)`;
  }
  async findClient(clientId: string) {
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
    await this.sql`
      INSERT INTO partner_audit (partner_id, event, detail) VALUES (${partnerId}, ${event}, ${detail})`;
  }
  async listAudit(partnerId: string) {
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
