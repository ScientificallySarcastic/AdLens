// ── Connected Meta accounts store ──────────────────────────────────
// Neon-backed when DATABASE_URL is set, in-memory otherwise (same dual-adapter
// pattern as the rest of the app, so the OAuth flow is demoable with no DB).

import { getSql } from "./db";
import { encryptToken, decryptToken } from "./tokenCrypto";
import type { GrantedAccount } from "./metaOAuth";

export interface Connection {
  id: string;
  owner: string;
  fbUserId: string;
  fbUserName: string;
  tokenExpires: string | null;
  scopes: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface ConnectedAccount extends GrantedAccount {
  connectionId: string;
}

const DEFAULT_OWNER = "default";

export interface ConnectionStore {
  save(conn: { fbUserId: string; fbUserName: string; token: string; expiresIn: number | null; scopes: string }, accounts: GrantedAccount[]): Promise<string>;
  listAccounts(owner?: string): Promise<ConnectedAccount[]>;
  listConnections(owner?: string): Promise<Connection[]>;
  /** Decrypted token for a given ad account — used by the Graph API layer. */
  tokenForAccount(accountId: string, owner?: string): Promise<string | null>;
  disconnect(connectionId: string, owner?: string): Promise<boolean>;
}

// ── In-memory ──────────────────────────────────────────────────────
class MemoryConnectionStore implements ConnectionStore {
  private conns: (Connection & { token: string })[] = [];
  private accounts: ConnectedAccount[] = [];

  async save(c: { fbUserId: string; fbUserName: string; token: string; expiresIn: number | null; scopes: string }, accounts: GrantedAccount[]) {
    // Re-connecting the same Facebook user replaces the old grant rather than
    // stacking duplicates.
    this.conns = this.conns.filter((x) => x.fbUserId !== c.fbUserId);
    this.accounts = this.accounts.filter((a) => !this.conns.every(() => false) && a.connectionId !== c.fbUserId);

    const id = `conn_${c.fbUserId}`;
    this.accounts = this.accounts.filter((a) => a.connectionId !== id);
    this.conns.push({
      id, owner: DEFAULT_OWNER, fbUserId: c.fbUserId, fbUserName: c.fbUserName,
      token: encryptToken(c.token),
      tokenExpires: c.expiresIn ? new Date(Date.now() + c.expiresIn * 1000).toISOString() : null,
      scopes: c.scopes, createdAt: new Date().toISOString(), revokedAt: null,
    });
    this.accounts.push(...accounts.map((a) => ({ ...a, connectionId: id })));
    return id;
  }
  async listAccounts() {
    const live = new Set(this.conns.filter((c) => !c.revokedAt).map((c) => c.id));
    return this.accounts.filter((a) => live.has(a.connectionId));
  }
  async listConnections() {
    return this.conns.filter((c) => !c.revokedAt).map(({ token, ...c }) => c);
  }
  async tokenForAccount(accountId: string) {
    const acct = this.accounts.find((a) => a.id === String(accountId).replace(/^act_/, ""));
    if (!acct) return null;
    const conn = this.conns.find((c) => c.id === acct.connectionId && !c.revokedAt);
    return conn ? decryptToken(conn.token) : null;
  }
  async disconnect(connectionId: string) {
    const c = this.conns.find((x) => x.id === connectionId);
    if (!c) return false;
    this.conns = this.conns.filter((x) => x.id !== connectionId);
    this.accounts = this.accounts.filter((a) => a.connectionId !== connectionId);
    return true;
  }
}

// ── Neon ───────────────────────────────────────────────────────────
class NeonConnectionStore implements ConnectionStore {
  private sql = getSql();

  /** Create the tables on first use so connecting an account never fails with
   *  'relation does not exist'. Idempotent (IF NOT EXISTS) and run once per
   *  process — db/meta-oauth.sql stays as the explicit reference. */
  private ready: Promise<void> | null = null;
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.sql`
          CREATE TABLE IF NOT EXISTS meta_connections (
            id             TEXT PRIMARY KEY,
            owner          TEXT NOT NULL DEFAULT 'default',
            fb_user_id     TEXT NOT NULL,
            fb_user_name   TEXT NOT NULL DEFAULT '',
            access_token   TEXT NOT NULL,
            token_expires  TIMESTAMPTZ,
            scopes         TEXT NOT NULL DEFAULT '',
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            revoked_at     TIMESTAMPTZ
          )`;
        await this.sql`
          CREATE TABLE IF NOT EXISTS meta_connected_accounts (
            account_id     TEXT NOT NULL,
            connection_id  TEXT NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
            name           TEXT NOT NULL DEFAULT '',
            currency       TEXT NOT NULL DEFAULT '',
            timezone       TEXT NOT NULL DEFAULT '',
            business       TEXT NOT NULL DEFAULT '',
            status         INT  NOT NULL DEFAULT 1,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (account_id, connection_id)
          )`;
        await this.sql`CREATE INDEX IF NOT EXISTS idx_meta_connections_owner ON meta_connections(owner)`;
        await this.sql`CREATE INDEX IF NOT EXISTS idx_meta_connected_accounts_conn ON meta_connected_accounts(connection_id)`;
      })().catch((e) => {
        this.ready = null; // let the next request retry rather than caching failure
        throw e;
      });
    }
    return this.ready;
  }

  async save(c: { fbUserId: string; fbUserName: string; token: string; expiresIn: number | null; scopes: string }, accounts: GrantedAccount[]) {
    await this.ensureSchema();
    const id = `conn_${c.fbUserId}`;
    const expires = c.expiresIn ? new Date(Date.now() + c.expiresIn * 1000).toISOString() : null;
    await this.sql`
      INSERT INTO meta_connections (id, owner, fb_user_id, fb_user_name, access_token, token_expires, scopes, revoked_at)
      VALUES (${id}, ${DEFAULT_OWNER}, ${c.fbUserId}, ${c.fbUserName}, ${encryptToken(c.token)}, ${expires}, ${c.scopes}, NULL)
      ON CONFLICT (id) DO UPDATE
      SET access_token = EXCLUDED.access_token, token_expires = EXCLUDED.token_expires,
          fb_user_name = EXCLUDED.fb_user_name, scopes = EXCLUDED.scopes, revoked_at = NULL`;

    // Refresh the account set — accounts de-selected on re-consent must disappear.
    await this.sql`DELETE FROM meta_connected_accounts WHERE connection_id = ${id}`;
    for (const a of accounts) {
      await this.sql`
        INSERT INTO meta_connected_accounts (account_id, connection_id, name, currency, timezone, business, status)
        VALUES (${a.id}, ${id}, ${a.name}, ${a.currency}, ${a.timezone}, ${a.business}, ${a.status})
        ON CONFLICT (account_id, connection_id) DO UPDATE
        SET name = EXCLUDED.name, currency = EXCLUDED.currency, timezone = EXCLUDED.timezone,
            business = EXCLUDED.business, status = EXCLUDED.status`;
    }
    return id;
  }

  async listAccounts(owner = DEFAULT_OWNER): Promise<ConnectedAccount[]> {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT a.* FROM meta_connected_accounts a
      JOIN meta_connections c ON c.id = a.connection_id
      WHERE c.owner = ${owner} AND c.revoked_at IS NULL
      ORDER BY a.name`) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.account_id), connectionId: String(r.connection_id), name: String(r.name),
      currency: String(r.currency), timezone: String(r.timezone), business: String(r.business),
      status: Number(r.status),
    }));
  }

  async listConnections(owner = DEFAULT_OWNER): Promise<Connection[]> {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT * FROM meta_connections WHERE owner = ${owner} AND revoked_at IS NULL
      ORDER BY created_at DESC`) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id), owner: String(r.owner), fbUserId: String(r.fb_user_id),
      fbUserName: String(r.fb_user_name), tokenExpires: r.token_expires ? String(r.token_expires) : null,
      scopes: String(r.scopes), createdAt: String(r.created_at), revokedAt: null,
    }));
  }

  async tokenForAccount(accountId: string, owner = DEFAULT_OWNER): Promise<string | null> {
    await this.ensureSchema();
    const clean = String(accountId).replace(/^act_/, "");
    const rows = (await this.sql`
      SELECT c.access_token FROM meta_connected_accounts a
      JOIN meta_connections c ON c.id = a.connection_id
      WHERE a.account_id = ${clean} AND c.owner = ${owner} AND c.revoked_at IS NULL
      LIMIT 1`) as Record<string, unknown>[];
    return rows[0] ? decryptToken(String(rows[0].access_token)) : null;
  }

  async disconnect(connectionId: string, owner = DEFAULT_OWNER): Promise<boolean> {
    await this.ensureSchema();
    const rows = (await this.sql`
      UPDATE meta_connections SET revoked_at = now()
      WHERE id = ${connectionId} AND owner = ${owner} AND revoked_at IS NULL
      RETURNING id`) as Record<string, unknown>[];
    return rows.length > 0;
  }
}

let _store: ConnectionStore | null = null;
export function getConnectionStore(): ConnectionStore {
  if (!_store) _store = process.env.DATABASE_URL ? new NeonConnectionStore() : new MemoryConnectionStore();
  return _store;
}
