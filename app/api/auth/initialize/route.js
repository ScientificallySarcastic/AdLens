import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = user.id
    const userEmail = user.email

    const { data: existing } = await supabaseAdmin
      .from("business_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: "already_initialized" })
    }

    const { data: earlyAccess, error: rpcError } = await supabaseAdmin
      .rpc("claim_early_access_spot")

    if (rpcError) {
      console.error("claim_early_access_spot RPC failed:", rpcError.message)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    const isEarlyAccess = earlyAccess?.granted === true

    const now = new Date()
    const expiry = new Date()
    if (isEarlyAccess) {
      expiry.setDate(expiry.getDate() + 30)
    } else {
      expiry.setDate(expiry.getDate() + 14)
    }

    const { error: insertError } = await supabaseAdmin.from("business_settings").insert({
      user_id:        userId,
      email:          userEmail,
      plan:           isEarlyAccess ? "starter" : "trial",
      plan_expires_at: expiry.toISOString(),
      reminders_enabled:     false,
      lead_recovery_enabled: false,
      campaigns_enabled:     false,
      created_at:     now.toISOString(),
    })
    if (insertError) {
      console.error("business_settings insert failed:", insertError.message)
      return NextResponse.json({ error: "Account setup failed" }, { status: 500 })
    }

    return NextResponse.json({
      status: "ok",
      plan: isEarlyAccess ? "starter" : "trial",
      earlyAccess: isEarlyAccess,
      spotsLeft: earlyAccess?.spots_left ?? 0
    })

  } catch(e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
