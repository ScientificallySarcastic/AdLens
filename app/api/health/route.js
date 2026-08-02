import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const checks = { status: "ok", timestamp: new Date().toISOString() }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { error } = await supabase.from("app_config").select("key").limit(1)
    checks.database = error ? "error" : "ok"
  } catch {
    checks.database = "unreachable"
  }

  checks.gemini = process.env.GEMINI_API_KEY ? "configured" : "missing"
  checks.meta = process.env.META_APP_SECRET ? "configured" : "missing"
  checks.razorpay = process.env.RAZORPAY_KEY_ID ? "configured" : "missing"

  const allOk = checks.database === "ok"
  checks.status = allOk ? "ok" : "degraded"

  return NextResponse.json(checks, { status: allOk ? 200 : 503 })
}
