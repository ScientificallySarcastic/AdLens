import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campaign = (await getSql()`SELECT * FROM campaigns WHERE id = ${params.id}`) as Record<string, unknown>[];
    if (campaign.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const adsets = (await getSql()`SELECT * FROM adsets WHERE campaign_id = ${params.id}`) as Record<string, unknown>[];
    const ads = (await getSql()`
      SELECT ads.* FROM ads JOIN adsets ON ads.adset_id = adsets.id
      WHERE adsets.campaign_id = ${params.id}`) as Record<string, unknown>[];
    return NextResponse.json({ ...campaign[0], adsets, ads });
  } catch {
    return NextResponse.json({ error: "DB not reachable" }, { status: 500 });
  }
}
