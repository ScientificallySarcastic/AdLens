import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { decrypt } from "@/lib/encryption"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const cookieStore = cookies()
    const authHeader  = req.headers.get("authorization") || ""
    const token       = authHeader.replace("Bearer ", "").trim()

    let userId = null

    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) userId = user.id
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { to, message, conversationId, customerPhone } = await req.json()

    if (!to || !message) {
      return NextResponse.json({ error: "Missing required fields: to, message" }, { status: 400 })
    }
    if (message.length > 4096) {
      return NextResponse.json({ error: "Message exceeds 4096 character limit" }, { status: 400 })
    }

    const cleanPhone = to.replace(/[^0-9]/g, "")
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }

    const { data: conn, error: connErr } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("access_token, phone_number_id")
      .eq("user_id", userId)
      .single()

    if (connErr || !conn) {
      return NextResponse.json({ error: "WhatsApp not connected. Go to Settings." }, { status: 400 })
    }

    // decrypt() handles prefixed, legacy-encrypted, and plaintext values
    // itself and throws on corrupted ciphertext — no format guessing here.
    const accessToken = decrypt(conn.access_token)

    const waRes = await fetch(
      "https://graph.facebook.com/v22.0/" + conn.phone_number_id + "/messages",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type":  "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to:   cleanPhone,
          type: "text",
          text: { body: message, preview_url: false }
        })
      }
    )

    const data = await waRes.json()

    if (data.error) {
      console.error("[whatsapp/send] API error:", data.error)
      return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 400 })
    }

    const waMessageId = data?.messages?.[0]?.id || null
    try {
      await supabaseAdmin.from("messages").insert({
        user_id:         userId,
        phone_number_id: conn.phone_number_id,
        from_number:     conn.phone_number_id,
        message_text:    message,
        direction:       "outbound",
        conversation_id: conversationId || null,
        customer_phone:  customerPhone  || cleanPhone,
        message_type:    "text",
        status:          "sent",
        is_ai:           false,
        wa_message_id:   waMessageId,
        created_at:      new Date().toISOString()
      })
    } catch(e) {
      console.warn("[whatsapp/send] Message log failed:", e.message)
    }

    return NextResponse.json({ success: true, messageId: waMessageId })

  } catch(err) {
    console.error("[whatsapp/send] Unexpected error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
