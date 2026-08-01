import { NextResponse } from "next/server";
import { authenticatePartner, checkRateLimit } from "@/lib/partnerAuth";
import { dataSource } from "@/lib/datasource";

export const dynamic = "force-dynamic";

// The endpoint partners actually want: their campaign results, one call,
// zero setup. Works with either credential type:
//   curl -H "Authorization: Bearer ak_live_..."           /api/partner/results
//   curl -H "Authorization: Bearer <oauth access token>"  /api/partner/results
//
// Tenant isolation: results are filtered by the partner's campaign_scope
// (null = all campaigns of this AdLens workspace). Reads go through the same
// dataSource as the dashboard, so partners see exactly what the UI shows.

export async function GET(req: Request) {
  const result = await authenticatePartner(req);
  if (!result.ok) {
    return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  }
  const { partner, scopes, kind } = result.auth;

  if (!scopes.includes("results:read")) {
    return NextResponse.json({ error: { code: "insufficient_scope", message: "Requires 'results:read' scope." } }, { status: 403 });
  }

  const rate = checkRateLimit(partner.id);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Rate limit exceeded — retry shortly." } },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  const url = new URL(req.url);
  const includeDaily = url.searchParams.get("include") === "daily";

  const all = await dataSource.listCampaigns();
  const scope = partner.campaignScope;
  const visible = scope ? all.filter((c) => scope.includes(c.id)) : all;

  const campaigns = [];
  for (const c of visible) {
    campaigns.push({
      id: c.id, name: c.name, platform: c.platform, status: c.status, objective: c.objective,
      spend: c.spend, revenue: c.revenue, roas: c.roas, ctr: c.ctr, cpc: c.cpc,
      conversions: c.conv, pacing: c.pacing, health: c.health,
      ...(includeDaily ? { daily: await dataSource.getDailySeries(c.id) } : {}),
    });
  }

  const totals = visible.reduce(
    (t, c) => ({ spend: t.spend + c.spend, revenue: t.revenue + c.revenue, conversions: t.conversions + c.conv }),
    { spend: 0, revenue: 0, conversions: 0 },
  );

  return NextResponse.json(
    {
      partner: { id: partner.id, name: partner.name },
      auth: { via: kind },
      snapshot: dataSource.snapshotInfo(),
      totals: { ...totals, roas: totals.spend > 0 ? Number((totals.revenue / totals.spend).toFixed(2)) : 0 },
      campaigns,
    },
    { headers: { "X-RateLimit-Remaining": String(rate.remaining) } },
  );
}
