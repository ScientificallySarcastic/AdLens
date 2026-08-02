// The connected ad account + its live campaigns — what the account picker shows.
// Never throws: if Meta isn't configured or unreachable, returns configured:false
// and the picker falls back to its seeded account list.

import { NextResponse } from "next/server";
import { MergedDataSource } from "@/lib/datasource";
import { fetchAccountInfo, metaConfigured, LIVE_PREFIX } from "@/lib/meta";

export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  // An OAuth-connected account supplies its own token, so "configured" is true
  // for any user who clicked Connect — no env vars, no redeploy.
  const requestedAccount = new URL(req.url).searchParams.get("account");
  const { useConnectedAccount } = await import("@/lib/meta");
  await useConnectedAccount(requestedAccount);

  if (!metaConfigured()) {
    return NextResponse.json({ configured: false, campaigns: [], reason: "no-credentials" }, NO_STORE);
  }
  try {
    // Discover everything this token can read. A client who grants Partner
    // access appears here on the next request — no config change, no redeploy.
    const { fetchAccessibleAdAccounts, setActiveAccount } = await import("@/lib/meta");
    let accessible: Awaited<ReturnType<typeof fetchAccessibleAdAccounts>> = [];
    let discoveryError: string | null = null;
    try {
      accessible = await fetchAccessibleAdAccounts();
    } catch (e: any) {
      discoveryError = e?.hint ?? e?.message ?? "could not list ad accounts";
    }

    // Accounts connected through OAuth are first-class here too.
    try {
      const { getConnectionStore } = await import("@/lib/connections");
      const connected = await getConnectionStore().listAccounts();
      const byId = new Map(connected.map((c) => [c.id, c.connectionId]));
      const seen = new Set(accessible.map((a) => String(a.id)));
      for (const c of connected) {
        if (!seen.has(c.id)) {
          accessible.push({ id: c.id, name: c.name, currency: c.currency, timezone: c.timezone, business: c.business, status: c.status } as typeof accessible[number]);
        }
      }
      // Tag each account with the connection that owns it, so the UI can offer
      // a per-account Disconnect for OAuth accounts and omit it for env ones.
      accessible = accessible.map((a) => ({ ...a, connectionId: byId.get(String(a.id)) ?? null })) as typeof accessible;
    } catch { /* connection store unavailable — env credentials still work */ }

    // Which account this request is about: explicit choice, else the default.
    const requested = requestedAccount;
    if (requested) setActiveAccount(requested);

    const account = await fetchAccountInfo();
    // Deliberately NOT caught here: if live data can't be read we must say so
    // rather than quietly returning an empty list that looks like "no campaigns".
    const all = await new MergedDataSource().listCampaigns();
    const campaigns = all.filter((c) => String(c.id).startsWith(LIVE_PREFIX));
    const { getLastSynced } = await import("@/lib/meta");
    const lastSynced = await getLastSynced();
    return NextResponse.json({
      configured: true,
      account,
      // Every ad account reachable with the current credential.
      accessibleAccounts: accessible,
      discoveryError,
      activeAccount: account?.id ?? null,
      campaigns,
      lastSynced,
      liveError: campaigns.length === 0 ? "no-live-campaigns-synced" : null,
    }, NO_STORE);
  } catch (e: any) {
    // Credentials exist but live data is unreachable — an explicit error state,
    // not a silent downgrade to demo data.
    return NextResponse.json({
      configured: true,
      campaigns: [],
      liveError: e?.message ?? "live data unavailable",
    }, NO_STORE);
  }
}
