// lib/messaging/wa-send.js
const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendWAMessage({ phoneNumberId, accessToken, to, message }) {
  try {
    const res = await fetch("https://graph.facebook.com/v22.0/" + phoneNumberId + "/messages", {
      method:  "POST",
      headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
      body:    JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/[^0-9]/g,""), type: "text", text: { body: message, preview_url: false } })
    })
    const data = await res.json()
    if (data.error) { console.error("❌ WA send error:", data.error.message); return { ok: false, error: data.error.message, waMessageId: null } }
    return { ok: true, waMessageId: data?.messages?.[0]?.id || null }
  } catch(e) {
    console.error("❌ WA send exception:", e.message)
    return { ok: false, error: e.message, waMessageId: null }
  }
}

async function sendAndSave({ phoneNumberId, accessToken, to, message, userId, conversationId, isAI }) {
  const result = await sendWAMessage({ phoneNumberId, accessToken, to, message })
  if (!result.ok) {
    console.error("❌ WA send FAILED — saving with status 'failed':", { to: to.replace(/[^0-9]/g,""), userId, error: result.error })
  }
  try {
    // Record the REAL outcome. Saving failures as "sent" made the dashboard
    // show replies the customer never received; the conversations UI already
    // renders status "failed" distinctly.
    await supabaseAdmin.from("messages").insert({
      user_id: userId, phone_number_id: phoneNumberId, from_number: phoneNumberId,
      message_text: message, direction: "outbound", conversation_id: conversationId || null,
      customer_phone: to.replace(/[^0-9]/g,""), message_type: "text",
      status: result.ok ? "sent" : "failed",
      is_ai: isAI !== false, wa_message_id: result.waMessageId || null, created_at: new Date().toISOString()
    })
  } catch(e) { console.warn("⚠️ saveOutbound failed:", e.message) }
  return result
}

module.exports = { sendWAMessage, sendAndSave }
