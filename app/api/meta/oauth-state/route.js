// app/api/meta/oauth-state/route.js
// Mints a short-lived, HMAC-signed OAuth state for the Meta connect flow.
// The state is bound to the authenticated user's session, so a callback
// crafted with someone else's userId fails signature verification.
// Format: <userId>.<expiresAtMs>.<hmacHex>

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { signOAuthState } from "@/lib/meta/oauth-state"

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7))
    if (error || !user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }

    if (!process.env.META_APP_SECRET) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 })
    }

    const expiresAt = Date.now() + STATE_TTL_MS
    const sig = signOAuthState(user.id, expiresAt)
    return NextResponse.json({ state: `${user.id}.${expiresAt}.${sig}` })
  } catch (e) {
    console.error("❌ oauth-state error:", e.message)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
