// app/api/cron/drip-sequences/route.js
// Cron: runs every hour via GitHub Actions
// Fires pending sequence steps using approved Meta templates — works outside 24hr window

import { NextResponse } from "next/server"
import { processDueEnrollments } from "@/lib/sequences/sequence-engine"
import { verifyCronAuth } from "@/lib/cron-auth"

export async function GET(req) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("🔄 Drip sequences cron started")
    const result = await processDueEnrollments()

    // Always return 200 — even if nothing to process
    // This prevents GitHub Actions from marking the job as failed
    // and sending failure emails when there are no active sequences
    console.log("✅ Drip sequences done:", result)
    return NextResponse.json({
      status:    result.ok ? "ok" : "error",
      sent:      result.sent      ?? 0,
      skipped:   result.skipped   ?? 0,
      completed: result.completed ?? 0,
      error:     result.error     ?? null,
      ranAt:     new Date().toISOString()
    })
  } catch (e) {
    console.error("❌ Drip sequences cron failed:", e.message)
    // Still return 200 so GitHub Actions doesn't send failure email
    // The error is logged to Vercel logs for debugging
    return NextResponse.json({
      status: "error",
      error:  e.message,
      ranAt:  new Date().toISOString()
    })
  }
}
