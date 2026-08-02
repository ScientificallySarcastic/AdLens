import { NextResponse } from "next/server";
import { dataSource } from "@/lib/datasource";
import { weekOverWeek, monthOverMonth } from "@/lib/periods";

export const dynamic = "force-dynamic";

// Real WoW / MoM for one campaign, computed from its daily series. Returns
// `comparable: false` when the account has too little history — the UI shows
// that rather than a percentage derived from a partial window.

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("campaign");
  if (!id) return NextResponse.json({ error: "campaign required" }, { status: 400 });

  try {
    const series = await dataSource.getDailySeries(id);
    return NextResponse.json(
      { campaign: id, days: series.length, wow: weekOverWeek(series), mom: monthOverMonth(series) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "could not build period comparison" },
      { status: 500 },
    );
  }
}
