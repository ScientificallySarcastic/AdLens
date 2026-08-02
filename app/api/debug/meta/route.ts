// Raw Meta probe. Returns the Graph API's own response, unmodified, so we can
// see exactly what Meta says instead of inferring it from stored rows.
//
//   /api/debug/meta                      → campaigns, then adsets per campaign
//   /api/debug/meta?campaign=<id>        → that campaign's adsets + each one's ads
//
// The access token is never echoed back.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const V = () => process.env.META_API_VERSION || "v23.0";

async function probe(path: string, fields: string) {
  const token = process.env.META_ACCESS_TOKEN as string;
  const url = `https://graph.facebook.com/${V()}/${path}?fields=${fields}&limit=200&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return {
    path,
    httpStatus: res.status,
    ok: res.ok && !json?.error,
    error: json?.error ?? null,
    count: Array.isArray(json?.data) ? json.data.length : null,
    data: json?.data ?? json,
  };
}

export async function GET(req: Request) {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN / META_AD_ACCOUNT_ID not set" }, { status: 400 });
  }
  const acct = process.env.META_AD_ACCOUNT_ID as string;
  const only = new URL(req.url).searchParams.get("campaign");

  const out: Record<string, unknown> = { adAccount: `act_${acct}`, apiVersion: V() };

  // 1. account-wide ad sets — the OLD approach, for comparison
  out.accountWideAdsets = await probe(`act_${acct}/adsets`, "id,name,campaign_id,status");

  // 2. campaigns
  const campaigns = await probe(`act_${acct}/campaigns`, "id,name,status,objective");
  out.campaigns = campaigns;

  // 3. per-campaign ad sets — the CURRENT approach
  const ids: string[] = only
    ? [only]
    : (Array.isArray(campaigns.data) ? campaigns.data : []).map((c: { id: string }) => String(c.id));

  const perCampaign: unknown[] = [];
  for (const id of ids) {
    const adsets = await probe(`${id}/adsets`, "id,name,status,daily_budget");
    const ads: unknown[] = [];
    if (Array.isArray(adsets.data)) {
      for (const a of adsets.data as { id: string }[]) {
        ads.push(await probe(`${a.id}/ads`, "id,name,status"));
      }
    }
    perCampaign.push({ campaignId: id, adsets, ads });
  }
  out.perCampaign = perCampaign;

  return NextResponse.json(out);
}
