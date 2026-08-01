// ── Partner API authentication ─────────────────────────────────────
// Replaces the old flow (create App → generate token → register token in
// Partners config → call API) with zero-setup credentials: every partner
// gets an org-scoped API key + OAuth client AUTO-PROVISIONED at creation.
//
// Two front doors, one enforcement point:
//   Authorization: Bearer ak_live_<keyId>_<secret>   → API key (default)
//   Authorization: Bearer <jwt>                      → OAuth client-credentials
// Both resolve to a partnerId; every data read filters on it, so tenant
// isolation falls out of authentication and cannot diverge between paths.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getPartnerStore, Partner, PartnerScope } from "./partnerStore";

export const ACCESS_TOKEN_TTL = 900; // 15 min — revocation blast radius

// Dev conveniences must NEVER become production defaults: these fallback values
// are published in PARTNER-API.md, so shipping them live would let anyone
// provision partners or forge access tokens. Both resolvers fail closed instead.
const IS_PROD = process.env.NODE_ENV === "production";

export const DEV_ADMIN_TOKEN = "dev-admin-token";

function jwtSecret(): string {
  const s = process.env.PARTNER_JWT_SECRET;
  if (s) return s;
  if (IS_PROD) throw new Error("PARTNER_JWT_SECRET must be set in production");
  return "dev-partner-jwt-secret";
}

// ── Secrets: hash-at-rest, constant-time verify ────────────────────
export const hashSecret = (s: string) => createHash("sha256").update(s).digest("hex");

export function verifySecret(secret: string, hash: string): boolean {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── API keys: ak_<env>_<keyId>_<secret> (hex parts, '_' is a safe delimiter)
export function generateApiKey(env: "live" | "test") {
  const keyId = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("hex");
  return { keyId, secretHash: hashSecret(secret), token: `ak_${env}_${keyId}_${secret}` };
}

export function parseApiKey(token: string) {
  const p = token.split("_");
  if (p.length !== 4 || p[0] !== "ak" || (p[1] !== "live" && p[1] !== "test") || !p[2] || !p[3]) return null;
  return { env: p[1] as "live" | "test", keyId: p[2], secret: p[3] };
}

export const maskKey = (env: string, keyId: string) => `ak_${env}_${keyId}_••••••••`;

// ── OAuth clients ──────────────────────────────────────────────────
export function generateOAuthClient() {
  const clientId = `oc_${randomBytes(8).toString("hex")}`;
  const clientSecret = `ocs_${randomBytes(24).toString("hex")}`;
  return { clientId, clientSecret, secretHash: hashSecret(clientSecret) };
}

// ── Minimal HS256 JWT (no deps) for OAuth access tokens ────────────
const b64u = (s: string) => Buffer.from(s).toString("base64url");
const hmac = (data: string) => createHmac("sha256", jwtSecret()).update(data).digest("base64url");

export function issueAccessToken(partnerId: string, scopes: PartnerScope[]) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64u(JSON.stringify({ sub: partnerId, scope: scopes.join(" "), iat: now, exp: now + ACCESS_TOKEN_TTL }));
  return { token: `${header}.${payload}.${hmac(`${header}.${payload}`)}`, expiresIn: ACCESS_TOKEN_TTL };
}

function verifyAccessToken(token: string): { sub: string; scope: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = Buffer.from(hmac(`${parts[0]}.${parts[1]}`));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch { return null; }
}

// ── Unified authentication for partner endpoints ───────────────────
export interface PartnerAuth {
  partner: Partner;
  scopes: PartnerScope[];
  kind: "api_key" | "oauth";
  keyId?: string;
}
export type AuthResult = { ok: true; auth: PartnerAuth } | { ok: false; status: number; code: string; message: string };

const fail = (status: number, code: string, message: string): AuthResult => ({ ok: false, status, code, message });

export async function authenticatePartner(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail(401, "missing_credentials", "Provide Authorization: Bearer <api key or access token>.");

  const store = getPartnerStore();

  if (token.startsWith("ak_")) {
    const parsed = parseApiKey(token);
    if (!parsed) return fail(401, "malformed_key", "API key format is ak_<env>_<keyId>_<secret>.");
    const key = await store.findKey(parsed.keyId);
    if (!key || !verifySecret(parsed.secret, key.secretHash)) return fail(401, "invalid_key", "Unknown or invalid API key.");
    if (key.revokedAt) return fail(401, "revoked_key", "This API key has been revoked.");
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return fail(401, "expired_key", "This API key has expired. Rotate via POST /api/partner/keys.");
    }
    const partner = await store.getPartner(key.partnerId);
    if (!partner || partner.status !== "active") return fail(403, "partner_suspended", "Partner account is not active.");
    void store.touchKey(key.keyId); // last_used_at — powers dead/leaked-key auditing
    return { ok: true, auth: { partner, scopes: key.scopes, kind: "api_key", keyId: key.keyId } };
  }

  const claims = verifyAccessToken(token);
  if (!claims) return fail(401, "invalid_token", "Access token invalid or expired. Get a new one at POST /api/oauth/token.");
  const partner = await store.getPartner(claims.sub);
  if (!partner || partner.status !== "active") return fail(403, "partner_suspended", "Partner account is not active.");
  return { ok: true, auth: { partner, scopes: claims.scope.split(" ") as PartnerScope[], kind: "oauth" } };
}

// ── Per-partner rate limit (token bucket, in-memory per instance) ──
const buckets = new Map<string, { tokens: number; at: number }>();
const RATE_PER_MIN = 120;

export function checkRateLimit(partnerId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(partnerId) ?? { tokens: RATE_PER_MIN, at: now };
  b.tokens = Math.min(RATE_PER_MIN, b.tokens + ((now - b.at) / 60_000) * RATE_PER_MIN);
  b.at = now;
  if (b.tokens < 1) { buckets.set(partnerId, b); return { allowed: false, remaining: 0 }; }
  b.tokens -= 1;
  buckets.set(partnerId, b);
  return { allowed: true, remaining: Math.floor(b.tokens) };
}

// Admin guard for the provisioning endpoint (your onboarding flow, not partners).
export function isAdmin(req: Request): boolean {
  const configured = process.env.PARTNER_ADMIN_TOKEN;
  // No token configured in production ⇒ admin surface is sealed, not open.
  if (!configured && IS_PROD) return false;
  const expected = configured || DEV_ADMIN_TOKEN;
  const a = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
