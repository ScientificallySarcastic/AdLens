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

    // All provisioning logic lives in the provision_business_settings SQL
    // function (migration 004): it takes a per-user advisory lock so this
    // route can't race the auth-signup trigger, and the early-access slot
    // is claimed in a single atomic UPDATE so concurrent signups can't
    // over-grant slots or lose counter increments.
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "provision_business_settings",
      { p_user_id: user.id, p_email: user.email }
    )

    if (rpcError) {
      console.error("provision_business_settings failed:", rpcError.message)
      return NextResponse.json({ error: "Account setup failed" }, { status: 500 })
    }

    if (result?.status === "already_initialized") {
      return NextResponse.json({ status: "already_initialized" })
    }

    return NextResponse.json({
      status:      "ok",
      plan:        result?.plan || "trial",
      earlyAccess: result?.early_access || false,
      spotsLeft:   result?.spots_left ?? 0,
    })

  } catch(e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
