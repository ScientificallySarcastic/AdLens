import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = (await getSql()`SELECT * FROM campaigns ORDER BY spend DESC`) as Record<string, unknown>[];
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: "DB not reachable" }, { status: 500 });
  }
}
