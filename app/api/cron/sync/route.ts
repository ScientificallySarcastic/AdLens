// ── Nightly sync ────────────────────────────────────────────────────
// Triggered by the platform scheduler (see vercel.json). Syncs EVERY ad
// account the credential can reach, not just a configured one, so adding a
// client via Partner access needs no scheduler change.
//
// Window: a trailing 7 days rather than "yesterday". Meta restates
// conversions for roughly 72 hours after the fact, so re-pulling the tail is
// what keeps stored figures matching Ads Manager. Rows upsert, so overlap is
// free.
//
// Auth: the platform sends `Authorization: Bearer $CRON_SECRET`. A manual run
// can pass ?key=$CRON_SECRET. With neither configured the route still works,
// which keeps local development simple.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured — no lock
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

function baseUrl(req: Request): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { fetchAccessibleAdAccounts } = await import("@/lib/meta");
  const { getConnectionStore } = await import("@/lib/connections");

  const preset = new URL(req.url).searchParams.get("preset") || "last_7";
  const startedAt = new Date().toISOString();

  // EVERY account gets synced, from both sources:
  //   • OAuth connections — each carries its own token
  //   • the env System-User credential — whatever it can reach
  // Deduped by ad account id, so an account present in both is synced once.
  const byId = new Map<string, { id: string; name: string; source: "oauth" | "env" }>();
  let discoveryError: string | null = null;

  try {
    for (const a of await getConnectionStore().listAccounts()) {
      byId.set(a.id, { id: a.id, name: a.name || `act_${a.id}`, source: "oauth" });
    }
  } catch (e: any) {
    discoveryError = e?.message ?? "connected-account lookup failed";
  }

  try {
    for (const a of await fetchAccessibleAdAccounts()) {
      if (!byId.has(a.id)) byId.set(a.id, { id: a.id, name: a.name, source: "env" });
    }
  } catch (e: any) {
    // Discovery failing must not skip OAuth accounts that were found above.
    discoveryError = discoveryError ?? e?.hint ?? e?.message ?? "account discovery failed";
  }

  // Last resort so a permissions blip never skips the night entirely.
  if (!byId.size && process.env.META_AD_ACCOUNT_ID) {
    const id = String(process.env.META_AD_ACCOUNT_ID);
    byId.set(id, { id, name: "configured account", source: "env" });
  }

  const accounts = Array.from(byId.values());
  if (!accounts.length) {
    return NextResponse.json({ ran: false, reason: "no-accounts-connected", accounts: [], discoveryError });
  }

  // Sequential, not parallel: the Graph API rate-limits per account and the
  // sync already backs off. Racing them would just trigger throttling.
  const results: Record<string, unknown>[] = [];
  for (const acct of accounts) {
    try {
      const url = `${baseUrl(req)}/api/sync/meta?account=${encodeURIComponent(acct.id)}&preset=${encodeURIComponent(preset)}`;
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      results.push({
        account: acct.id,
        name: acct.name,
        source: acct.source,
        ok: Boolean(body?.synced),
        campaigns: body?.campaigns ?? 0,
        adsets: body?.adsets ?? 0,
        ads: body?.ads ?? 0,
        error: body?.synced ? null : body?.error ?? body?.reason ?? `HTTP ${res.status}`,
      });
    } catch (e: any) {
      // One account failing must not stop the rest of the schedule.
      results.push({ account: acct.id, name: acct.name, source: acct.source, ok: false, error: e?.message ?? "sync failed" });
    }
  }

  return NextResponse.json({
    ran: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    preset,
    discoveryError,
    accounts: results,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });
}
