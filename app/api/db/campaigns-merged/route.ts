// Browser-visible proof of the full live pipeline WITHOUT touching any page:
// live Meta campaigns (ids "meta_…") stacked on top of the seeded portfolio,
// all flowing through the same DataSource seam the reasoning engine will use.
// Your existing /api/db/campaigns stays untouched.

import { NextResponse } from "next/server";
import { MergedDataSource } from "@/lib/datasource";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const src = new MergedDataSource();
    const list = await src.listCampaigns();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "data source not reachable" }, { status: 500 });
  }
}
