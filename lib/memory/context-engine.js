// lib/memory/context-engine.js
// FIX: activeBookings now filtered to next 60 days only (prevents 2027 dates confusing Gemini)
// FIX: When campaignContext is active, activeBookings excluded from prompt to prevent Gemini
//      confusing existing bookings with the new campaign booking intent
const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getISTDateString(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  d.setDate(d.getDate() + offsetDays)
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
}

async function loadContext({ userId, conversationId, phone }) {
  try {
    const todayStr  = getISTDateString(0)
    const maxDate   = getISTDateString(60) // Only load bookings within next 60 days

    const [
      { data: bizSettings },
      { data: bizKnowledge },
      { data: servicesList },
      { data: rawHistory },
      { data: activeBookingRows }
    ] = await Promise.all([
      supabaseAdmin.from("business_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("business_knowledge").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("services")
        .select("name,price,duration,category,description,service_type,is_active")
        .eq("user_id", userId),
      supabaseAdmin.from("messages")
        .select("message_text,direction,is_ai,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(12),
      // FIX: Only load bookings within next 60 days — prevents far-future dates (2027 etc)
      // confusing Gemini into thinking customer "already has a booking" when it's stale
      supabaseAdmin.from("bookings")
        .select("service,booking_date,booking_time,status")
        .eq("customer_phone", phone)
        .eq("user_id", userId)
        .in("status", ["confirmed", "pending"])
        .gte("booking_date", todayStr)
        .lte("booking_date", maxDate)  // ← KEY FIX: cap at 60 days ahead
        .order("booking_date", { ascending: true })
        .limit(3)
    ])

    const biz = Object.assign({}, bizKnowledge || {}, bizSettings || {}, {
      ai_instructions: [
        bizSettings?.ai_instructions,
        bizKnowledge?.content,
        bizKnowledge?.knowledge,
        bizKnowledge?.notes
      ].filter(Boolean).join("\n\n") || ""
    })

    const services = (servicesList || []).filter(s => s.is_active !== false)
    const history  = buildHistory(rawHistory || [])

    // Format active bookings — only genuinely upcoming ones
    const bookingsSummary = (activeBookingRows || []).length > 0
      ? (activeBookingRows || []).map(b =>
          b.service + " on " + b.booking_date + (b.booking_time ? " at " + b.booking_time : "")
        ).join(", ")
      : "none"

    return { biz, services, history, chunks: [], activeBookings: bookingsSummary }
  } catch(e) {
    console.error("❌ loadContext failed:", e.message)
    return { biz: {}, services: [], history: [], chunks: [], activeBookings: "none" }
  }
}

function buildHistory(rawHistory) {
  if (!rawHistory?.length) return []
  const chronological = [...rawHistory].reverse()
  const msgs = chronological
    .map(m => ({
      role:    m.direction === "inbound" ? "user" : "assistant",
      content: (m.message_text || "").trim()
    }))
    .filter(m => m.content && m.content !== "[media message]")

  const merged = []
  for (const msg of msgs) {
    if (!merged.length) { merged.push(msg); continue }
    if (merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += "\n" + msg.content
    } else {
      merged.push(msg)
    }
  }
  while (merged.length && merged[0].role !== "user") merged.shift()
  return merged.slice(-12)
}

function retrieveChunks(chunks, topic) {
  if (!chunks?.length || !topic) return ""
  const t = topic.toLowerCase()
  return chunks
    .filter(c =>
      (c.title||"").toLowerCase().includes(t) ||
      (c.content||"").toLowerCase().includes(t) ||
      (c.category||"").toLowerCase().includes(t) ||
      (c.keywords||[]).some(k => t.includes(k.toLowerCase()) || k.toLowerCase().includes(t))
    )
    .slice(0, 4)
    .map(c => "[" + c.category + "] " + c.title + ": " + c.content)
    .join("\n\n")
}

module.exports = { loadContext, retrieveChunks }
