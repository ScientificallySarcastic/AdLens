// app/api/meta/send-message/route.js
const { NextResponse } = require("next/server")
const { createClient } = require("@supabase/supabase-js")
const { decrypt } = require("@/lib/encryption")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[send-message] Missing auth header")
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error("[send-message] Auth failed:", authError?.message)
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }

    console.log("[send-message] userId:", user.id)

    const userId = user.id
    const body = await req.json()
    const { to, templateName, language, components } = body

    console.log("[send-message] to:", to, "template:", templateName)

    if (!to || !templateName) {
      return NextResponse.json({ error: "Missing 'to' or 'templateName'" }, { status: 400 })
    }

    const { data: wa, error: waErr } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("access_token, phone_number_id")
      .eq("user_id", userId)
      .maybeSingle()

    console.log("[send-message] wa connection:", wa ? "found" : "not found", waErr?.message)

    if (!wa?.access_token || !wa?.phone_number_id) {
      return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 })
    }

    // decrypt() handles prefixed, legacy-encrypted, and plaintext values
    // itself and throws on corrupted ciphertext — no format guessing here.
    const accessToken = decrypt(wa.access_token)

    console.log("[send-message] phone_number_id:", wa.phone_number_id)

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language || "en" }
      }
    }

    if (components && components.length > 0) {
      payload.template.components = components
    }

    console.log("[send-message] sending to Meta:", JSON.stringify(payload))

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${wa.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    )

    const data = await res.json()
    console.log("[send-message] Meta response:", JSON.stringify(data))

    if (data.error) {
      console.error("[send-message] Meta error:", data.error)
      return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 200 })
    }

    const waMessageId = data?.messages?.[0]?.id || null
    return NextResponse.json({ ok: true, waMessageId }, { status: 200 })

  } catch (err) {
    console.error("[send-message] Unexpected error:", err.message)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

module.exports = { POST }
