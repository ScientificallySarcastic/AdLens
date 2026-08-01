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

    // Which account this request is about: explicit choice, else the default.
    const requested = new URL(req.url).searchParams.get("account");
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
