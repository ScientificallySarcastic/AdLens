// app/api/meta/templates/route.js
const { NextResponse } = require("next/server")
const { createClient } = require("@supabase/supabase-js")
const { decrypt } = require("@/lib/encryption")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }
    const userId = user.id

    const { data: wa } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("access_token, phone_number_id, waba_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!wa?.access_token) {
      return NextResponse.json({ error: "no_whatsapp" }, { status: 200 })
    }

    const accessToken = decrypt(wa.access_token)

    let wabaId = wa.waba_id
    if (!wabaId) {
      const r = await fetch(
        `https://graph.facebook.com/v22.0/${wa.phone_number_id}?fields=whatsapp_business_account&access_token=${accessToken}`
      )
      const d = await r.json()
      if (d.error) {
        return NextResponse.json({ error: "Meta API error: " + d.error.message }, { status: 200 })
      }
      wabaId = d?.whatsapp_business_account?.id
      if (wabaId) {
        await supabaseAdmin.from("whatsapp_connections").update({ waba_id: wabaId }).eq("user_id", userId)
      }
    }

    if (!wabaId) {
      return NextResponse.json({ error: "Could not find WhatsApp Business Account ID. Please reconnect WhatsApp in Settings." }, { status: 200 })
    }

    const r2 = await fetch(
      `https://graph.facebook.com/v22.0/${wabaId}/message_templates?limit=100&fields=id,name,category,language,components,status&access_token=${accessToken}`
    )
    const data = await r2.json()
    if (data.error) {
      return NextResponse.json({ error: "Meta API error: " + data.error.message }, { status: 200 })
    }

    return NextResponse.json({ templates: data.data || [] }, { status: 200 })
  } catch (err) {
    console.error("/api/meta/templates error:", err.message)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

module.exports = { GET }
