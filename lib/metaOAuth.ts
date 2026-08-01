// ── Meta OAuth: "Connect with Facebook" ────────────────────────────
// The user clicks Connect → Facebook's own consent screen → they pick which ad
// accounts to share → we receive a code and exchange it for a long-lived token.
// No developer console, no System User, no copy-pasted token, and one AdLens
// deployment can serve unlimited accounts.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const VERSION = () => process.env.META_API_VERSION || "v23.0";
const GRAPH = () => `https://graph.facebook.com/${VERSION()}`;

// ads_read is the whole ask: it covers campaigns, ad sets, ads AND their
// /insights edges. (read_insights is a Page-insights permission and is NOT a
// valid Login scope — requesting it makes Meta reject the dialog outright.)
export const OAUTH_SCOPES = "ads_read";

export function oauthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function redirectUri(origin: string): string {
  return process.env.META_OAUTH_REDIRECT_URI || `${origin}/api/auth/meta/callback`;
}

// ── CSRF state: signed, self-verifying, no server-side session needed ──
function stateSecret(): string {
  return process.env.META_APP_SECRET || "dev-state-secret";
}

export function signState(): string {
  const nonce = `${Date.now()}.${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", stateSecret()).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

export function verifyState(state: string | null): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const nonce = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(createHmac("sha256", stateSecret()).update(nonce).digest("base64url"));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  return Date.now() - Number(parts[0]) < 10 * 60 * 1000; // 10-minute window
}

export function authorizeUrl(origin: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID as string,
    redirect_uri: redirectUri(origin),
    state: signState(),
    scope: OAUTH_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${VERSION()}/dialog/oauth?${p}`;
}

async function graph(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH()}${path}?${new URLSearchParams(params)}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message ?? `Meta returned ${res.status}`);
  }
  return json;
}

/** Authorization code → short-lived token → long-lived (~60 day) token. */
export async function exchangeCodeForToken(code: string, origin: string): Promise<{ token: string; expiresIn: number | null }> {
  const short = await graph("/oauth/access_token", {
    client_id: process.env.META_APP_ID as string,
    client_secret: process.env.META_APP_SECRET as string,
    redirect_uri: redirectUri(origin),
    code,
  });

  // Short-lived tokens die in ~1–2 h; immediately upgrade so the connection lasts.
  const long = await graph("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID as string,
    client_secret: process.env.META_APP_SECRET as string,
    fb_exchange_token: short.access_token,
  });

  return { token: long.access_token as string, expiresIn: (long.expires_in as number) ?? null };
}

export async function fetchMe(token: string): Promise<{ id: string; name: string }> {
  const me = await graph("/me", { access_token: token, fields: "id,name" });
  return { id: String(me.id), name: String(me.name ?? "") };
}

export interface GrantedAccount {
  id: string; name: string; currency: string; timezone: string; business: string; status: number;
}

/** Every ad account the user granted on the consent screen. */
export async function fetchGrantedAdAccounts(token: string): Promise<GrantedAccount[]> {
  const out: GrantedAccount[] = [];
  let url = `${GRAPH()}/me/adaccounts?${new URLSearchParams({
    access_token: token,
    fields: "id,account_id,name,currency,timezone_name,account_status,business",
    limit: "200",
  })}`;

  // Follow paging — agencies routinely have more than one page of accounts.
  for (let page = 0; page < 10 && url; page++) {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json?.error?.message ?? `Meta returned ${res.status}`);
    for (const a of json.data ?? []) {
      out.push({
        id: String(a.account_id ?? a.id).replace(/^act_/, ""),
        name: String(a.name ?? ""),
        currency: String(a.currency ?? ""),
        timezone: String(a.timezone_name ?? ""),
        business: String(a.business?.name ?? ""),
        status: Number(a.account_status ?? 1),
      });
    }
    url = json.paging?.next ?? "";
  }
  return out;
}
