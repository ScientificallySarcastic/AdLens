// app/api/meta/webhook/route.js
// v9.2 — SECURITY: Meta POST signature verification added
//
// CHANGES FROM v9.1:
// 1. NEW: verifySignature() — validates X-Hub-Signature-256 header against
//    raw request body using META_APP_SECRET, before any JSON parsing or
//    DB calls happen. Requests that fail verification are rejected with
//    401 and never reach processMessage/orchestrate.
// 2. POST handler now reads req.text() FIRST (raw body needed for HMAC),
//    then JSON.parse()s it manually — req.json() can't be used here because
//    it consumes the body stream before we can read it raw.
// Everything else — campaign flow, hard-confirm guard, dedup, rate limiting —
// is byte-for-byte unchanged from the version you're running now.

const { NextResponse } = require("next/server")
const { createClient } = require("@supabase/supabase-js")
const crypto = require("crypto")
const { normalizeMessage }   = require("@/lib/messaging/normalizer")
const { orchestrate }        = require("@/lib/ai/orchestrator")
const { sendAndSave }        = require("@/lib/messaging/wa-send")
const { isDuplicate, upsertCustomer, upsertConversation, saveInboundMessage, upsertLead, handleCompliance } = require("@/lib/crm/customer-engine")
const { stopEnrollment }     = require("@/lib/sequences/sequence-engine")
const { decrypt }            = require("@/lib/encryption")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX = 100

async function isRateLimited(phone) {
  // Fast path: per-instance memory (only effective while the serverless
  // instance stays warm — cheap first line of defense).
  const now  = Date.now()
  const data = rateLimitMap.get(phone) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
  if (now > data.resetAt) { rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }) }
  else {
    if (data.count >= RATE_LIMIT_MAX) return true
    data.count++
    rateLimitMap.set(phone, data)
  }

  // Authoritative check: count this phone's inbound messages in the last
  // window from the DB, which is shared across all serverless instances.
  // Rate-limited messages are never saved, so the count self-caps.
  try {
    const since = new Date(now - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .eq("direction", "inbound")
      .gte("created_at", since)
    return (count || 0) >= RATE_LIMIT_MAX
  } catch (e) {
    return false // fail open — don't drop real customer messages on a DB blip
  }
}

// ── CONTENT-BASED DEDUP ──────────────────────────────────────
// Per-instance only: two serverless instances won't share this map, so it
// can miss. That's acceptable — this is just a courtesy guard against a
// user double-sending identical text. Actual webhook RETRY dedup (Meta
// redelivering the same message) is handled by isDuplicate(), which
// checks messages.wa_message_id in the DB and works across instances.
const recentMessages = new Map()
function isDuplicateContent(phone, text) {
  const key  = phone + "|" + (text || "").toLowerCase().trim()
  const last = recentMessages.get(key)
  if (last && Date.now() - last < 10000) return true
  recentMessages.set(key, Date.now())
  setTimeout(() => recentMessages.delete(key), 15000)
  return false
}

// ── NEW: META SIGNATURE VERIFICATION ─────────────────────────
// Meta signs every webhook POST with HMAC-SHA256 of the raw body,
// using your app secret as the key, sent as the X-Hub-Signature-256
// header in the form "sha256=<hex digest>". We recompute it and
// compare using a timing-safe check. If it doesn't match, or the
// header/secret is missing, we reject the request before any
// parsing, DB writes, or AI calls happen.
function verifySignature(rawBody, signatureHeader) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error("❌ META_APP_SECRET not set — rejecting all webhook POSTs for safety")
    return false
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    console.error("❌ Missing or malformed X-Hub-Signature-256 header")
    return false
  }
  const receivedSig = signatureHeader.slice(7) // strip "sha256="
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")

  const receivedBuf = Buffer.from(receivedSig, "hex")
  const expectedBuf = Buffer.from(expectedSig, "hex")

  // timingSafeEqual throws if buffers are different lengths — guard that
  if (receivedBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(receivedBuf, expectedBuf)
}

// ── DELIVERY STATUS TRACKING ─────────────────────────────────
// Meta accepts a send with HTTP 200 (so we record "sent"), then delivery
// can still fail ASYNCHRONOUSLY — expired token quality, WABA payment
// issue, tier limits, number blocks. The failure reason only ever arrives
// here, as a status event with an errors[] array. Log it loudly and flip
// the message row to "failed" so the dashboard stops showing replies the
// customer never received.
async function recordStatusUpdate(s) {
  if (!s?.id || !["delivered", "read", "failed"].includes(s.status)) return

  if (s.status === "failed") {
    console.error("📵 WA delivery FAILED:", JSON.stringify({
      waMessageId: s.id,
      recipient:   s.recipient_id,
      errors:      s.errors || [],
    }))
  }

  // Update status on its own first — it must never be blocked by the
  // timestamp column below.
  const { error } = await supabaseAdmin.from("messages")
    .update({ status: s.status })
    .eq("wa_message_id", s.id)
  if (error) {
    console.error("⚠️ Could not record status", s.status, "for", s.id, ":", error.message)
    return
  }

  // Timestamp column (delivered_at / read_at / failed_at) is best-effort:
  // if the column doesn't exist this fails alone instead of silently
  // killing the status update too, which is what happened before.
  const { error: tsError } = await supabaseAdmin.from("messages")
    .update({ [s.status + "_at"]: new Date().toISOString() })
    .eq("wa_message_id", s.id)
  if (tsError) console.warn("⚠️ Could not set " + s.status + "_at for", s.id, ":", tsError.message)
}

async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

async function POST(req) {
  try {
    // ── Read RAW body first — required for signature verification.
    // req.json() would consume the stream before we can hash it raw.
    const rawBody = await req.text()
    const signatureHeader = req.headers.get("x-hub-signature-256")

    if (!verifySignature(rawBody, signatureHeader)) {
      console.error("🚫 Webhook signature verification FAILED — rejecting request")
      return NextResponse.json({ status: "invalid_signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)

    // Meta batches webhooks: one POST can carry MULTIPLE entries/changes,
    // and statuses can arrive in the same batch as messages. The old code
    // only looked at entry[0].changes[0] and skipped statuses entirely
    // whenever a message was present — so delivery-failure notifications
    // (the only place Meta says WHY a customer didn't receive a message)
    // were being dropped on the floor.
    const values = []
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        if (change?.value) values.push(change.value)
      }
    }

    let sawMessages = false
    for (const value of values) {
      for (const s of value.statuses || []) {
        await recordStatusUpdate(s)
      }

      const phoneNumberId = value?.metadata?.phone_number_id
      const messages      = value?.messages || []
      const contacts      = value?.contacts || []
      if (!messages.length) continue
      sawMessages = true

      console.log("📞 Inbound phoneNumberId:", phoneNumberId)

      const { data: connection } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("user_id, access_token")
        .eq("phone_number_id", phoneNumberId)
        .single()

      if (!connection) {
        console.error("❌ No WA connection for phoneNumberId:", phoneNumberId)
        continue
      }
      console.log("✅ Found connection for userId:", connection.user_id, "token starts:", connection.access_token?.slice(0,10))

      for (const message of messages) {
        try {
          await processMessage({
            message, contacts,
            userId: connection.user_id,
            accessToken: decrypt(connection.access_token),
            phoneNumberId
          })
        } catch(e) {
          console.error("❌ processMessage error:", e.message)
        }
      }
    }

    return NextResponse.json({ status: sawMessages ? "ok" : "no_message" })
  } catch(err) {
    console.error("❌ Webhook fatal:", err.message)
    return NextResponse.json({ status: "error" }, { status: 200 })
  }
}

const USER_MESSAGE_TYPES = new Set([
  "text","image","video","audio","document","sticker","location",
  "button","interactive","contacts","order"
])

async function processMessage({ message, contacts, userId, accessToken, phoneNumberId }) {
  if (!USER_MESSAGE_TYPES.has(message.type)) {
    console.log("⏭️ Skipping non-user message type:", message.type, "from:", message.from)
    return
  }

  const msg = normalizeMessage(message, contacts)

  if (await isDuplicate(msg.messageId)) return

  if (msg.effectiveText && isDuplicateContent(msg.phone, msg.effectiveText)) {
    console.log("⚠️ Duplicate content within 10s, skipping:", msg.phone, JSON.stringify(msg.effectiveText))
    return
  }

  if (await isRateLimited(msg.phone)) {
    console.error("🚫 Rate limited:", msg.phone)
    return
  }

  const { customer, isNew } = await upsertCustomer({
    userId, phone: msg.phone, name: msg.contactName, timestamp: msg.timestamp
  })

  const conversation = await upsertConversation({
    userId, phone: msg.phone, customerId: customer?.id,
    text: msg.effectiveText, timestamp: msg.timestamp
  })

  const saved = await saveInboundMessage({
    userId, phoneNumberId, from: msg.from,
    text: msg.effectiveText || "[" + msg.type + "]",
    type: msg.dbMessageType,
    conversationId: conversation?.id,
    phone: msg.phone, messageId: msg.messageId, timestamp: msg.timestamp
  })

  if (!saved) {
    console.log("⚡ Atomic dedup blocked duplicate:", msg.messageId)
    return
  }

  if (msg.isText) {
    const compliance = await handleCompliance({
      userId, phone: msg.phone,
      text: msg.effectiveText,
      conversationId: conversation?.id
    })
    if (compliance.action) {
      await sendAndSave({
        phoneNumberId, accessToken, to: msg.from,
        message: compliance.reply, userId,
        conversationId: conversation?.id, isAI: true
      })
      return
    }
  }

  if (conversation?.ai_enabled === false) return

  try {
    const { data: bizFlag } = await supabaseAdmin
      .from("business_settings")
      .select("ai_enabled")
      .eq("user_id", userId)
      .maybeSingle()
    if (bizFlag?.ai_enabled === false) {
      console.log("⏸️ AI globally paused for user:", userId)
      return
    }
  } catch(e) {}

  try {
    await stopEnrollment({ leadPhone: msg.phone, userId, reason: "replied" })
  } catch(e) {}

  let campaignContext = null
  let campaignService = null
  let matchedCampaignId = null

  try {
    if (conversation?.campaign_sent_at && conversation?.campaign_message) {
      const hoursSince = (Date.now() - new Date(conversation.campaign_sent_at).getTime()) / 3600000
      if (hoursSince < 48) {
        campaignContext = conversation.campaign_message

        const cutoff = new Date(Date.now() - 48 * 3600000).toISOString()
        const { data: matchedCampaign } = await supabaseAdmin
          .from("campaigns")
          .select("id, replied_count, campaign_service")
          .eq("user_id", userId)
          .in("status", ["done", "completed"])
          .gte("sent_at", cutoff)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (matchedCampaign) {
          matchedCampaignId = matchedCampaign.id
          campaignService = matchedCampaign.campaign_service || null

          await supabaseAdmin
            .from("campaigns")
            .update({ replied_count: (matchedCampaign.replied_count || 0) + 1 })
            .eq("id", matchedCampaign.id)

          console.log("📢 Campaign context loaded | service:", campaignService, "| campaign:", matchedCampaign.id)
        }
      }
    }
  } catch(e) {
    console.warn("⚠️ Campaign context error:", e.message)
  }

  const reply = await orchestrate({
    userId, conversationId: conversation?.id, phone: msg.phone,
    contactName: msg.contactName, message: msg.effectiveText || "",
    isMediaOnly: msg.isMediaOnly, phoneNumberId,
    campaignContext,
    campaignService,
    campaignId: matchedCampaignId
  })

  if (msg.effectiveText) {
    await upsertLead({
      userId, customerId: customer?.id, phone: msg.phone,
      name: msg.contactName, text: msg.effectiveText,
      timestamp: msg.timestamp, isNew
    }).catch(() => {})
  }

  if (reply) {
    await sendAndSave({
      phoneNumberId, accessToken, to: msg.from,
      message: reply, userId,
      conversationId: conversation?.id, isAI: true
    })
    await supabaseAdmin.from("conversations")
      .update({ last_message: reply, last_message_at: new Date().toISOString() })
      .eq("id", conversation?.id)
  } else {
    console.error("🚨 Orchestrator returned empty reply:", msg.effectiveText)
  }
}

module.exports = { GET, POST }
