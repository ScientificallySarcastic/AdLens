// lib/crm/customer-engine.js
// FIX: saveInboundMessage now accepts `type` as already-normalized dbMessageType
// No change needed here — the fix is in webhook route passing msg.dbMessageType

const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function upsertCustomer({ userId, phone, name, timestamp }) {
  const { data, error } = await supabaseAdmin.from("customers")
    .upsert({
      user_id: userId, phone, name: name || "Customer",
      source: "whatsapp", tag: "new_lead",
      last_visit_at: timestamp, created_at: timestamp
    }, { onConflict: "user_id,phone", ignoreDuplicates: false })
    .select().single()

  if (error) {
    const { data: existing } = await supabaseAdmin.from("customers")
      .select("*").eq("phone", phone).eq("user_id", userId).maybeSingle()
    if (existing) {
      await supabaseAdmin.from("customers").update({ last_visit_at: timestamp }).eq("id", existing.id)
      return { customer: existing, isNew: false }
    }
    const { data: inserted } = await supabaseAdmin.from("customers")
      .insert({ user_id: userId, phone, name: name || "Customer", source: "whatsapp", tag: "new_lead", created_at: timestamp })
      .select().single()
    return { customer: inserted, isNew: true }
  }

  const isNew = data.created_at === timestamp && data.tag === "new_lead"
  return { customer: data, isNew }
}

async function upsertConversation({ userId, phone, customerId, text, timestamp }) {
  const { data: existing } = await supabaseAdmin.from("conversations")
    .select("*").eq("phone", phone).eq("user_id", userId).maybeSingle()

  if (existing) {
    const { data: updated, error } = await supabaseAdmin.from("conversations")
      .update({
        last_message:    text || "[media]",
        last_message_at: timestamp,
        unread_count:    (existing.unread_count || 0) + 1,
        customer_id:     customerId || existing.customer_id,
        status:          "open"
      })
      .eq("id", existing.id).select().single()
    if (error) console.warn("⚠️ Conversation update failed:", error.message)
    return updated || existing
  }

  const { data, error } = await supabaseAdmin.from("conversations")
    .insert({
      user_id: userId, customer_id: customerId || null, phone,
      status: "open", ai_enabled: true,
      last_message: text || "[media]", last_message_at: timestamp, unread_count: 1
    }).select().single()

  if (error) {
    const { data: retry } = await supabaseAdmin.from("conversations")
      .select("*").eq("phone", phone).eq("user_id", userId).maybeSingle()
    return retry
  }
  return data
}

// ── ATOMIC saveInboundMessage ──────────────────────────────────
// `type` param should already be normalized to DB-safe value
// (button/interactive → text) by the time it gets here
// This is handled in webhook/route.js using msg.dbMessageType
async function saveInboundMessage({ userId, phoneNumberId, from, text, type, conversationId, phone, messageId, timestamp }) {
  // Extra safety: normalize type here too in case called from elsewhere
  const ALLOWED_TYPES = ["text", "image", "video", "audio", "document", "sticker", "location", "template"]
  const safeType = ALLOWED_TYPES.includes(type) ? type : "text"

  try {
    const { error } = await supabaseAdmin.from("messages").insert({
      user_id: userId, phone_number_id: phoneNumberId, from_number: from,
      message_text: text || "[" + type + "]", direction: "inbound",
      conversation_id: conversationId || null, customer_phone: phone,
      message_type: safeType,  // ← Always DB-safe
      status: "delivered",
      is_ai: false, wa_message_id: messageId || null, created_at: timestamp
    })
    if (error) {
      if (error.code === "23505") return false // duplicate
      console.error("❌ saveInbound error:", error.message)
      return false
    }
    return true
  } catch(e) {
    console.error("❌ saveInbound exception:", e.message)
    return false
  }
}

async function upsertLead({ userId, customerId, phone, name, text, timestamp, isNew }) {
  try {
    if (isNew && customerId) {
      await supabaseAdmin.from("leads").insert({
        user_id: userId, customer_id: customerId, phone, name,
        source: "whatsapp", status: "open", last_message: text,
        last_message_at: timestamp, ai_score: 60, estimated_value: 600
      })
    } else if (customerId) {
      await supabaseAdmin.from("leads")
        .update({ last_message: text, last_message_at: timestamp })
        .eq("customer_id", customerId).eq("user_id", userId).eq("status", "open")
    }
  } catch(e) { console.warn("⚠️ upsertLead exception:", e.message) }
}

async function isDuplicate(messageId) {
  if (!messageId) return false
  try {
    const { data } = await supabaseAdmin.from("messages")
      .select("id").eq("wa_message_id", messageId).maybeSingle()
    return !!data
  } catch(e) { return false }
}

async function handleCompliance({ userId, phone, text }) {
  const t = (text || "").toLowerCase().trim()
  const stopKw = ["stop","unsubscribe","opt out","optout","don't message","remove me","band karo","rok do"]

  if (stopKw.some(k => t === k || t.includes(k))) {
    try {
      await supabaseAdmin.from("campaign_optouts")
        .upsert({ user_id: userId, phone, created_at: new Date().toISOString() }, { onConflict: "user_id,phone" })
    } catch(e) {}
    return { action: "stop", reply: "You've been unsubscribed from our messages. Reply START to resubscribe anytime 🙏" }
  }

  if (t === "start" || t === "shuru" || t === "subscribe") {
    try {
      await supabaseAdmin.from("campaign_optouts").delete().eq("user_id", userId).eq("phone", phone)
    } catch(e) {}
    return { action: "start", reply: "You've been resubscribed! Welcome back 😊" }
  }

  return { action: null }
}

module.exports = { upsertCustomer, upsertConversation, saveInboundMessage, upsertLead, isDuplicate, handleCompliance }
