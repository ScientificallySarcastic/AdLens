// lib/ai/gemini-client.js — Extracted from orchestrator.js
// Gemini API client with retry, timeout, and improved prompt building

const { todayStr, tomorrowStr, todayFormatted } = require("./date-time-parser")

const GEMINI_TIMEOUT_MS  = 15000
const GEMINI_MAX_RETRIES = 2
const GEMINI_MODEL = "gemini-3.1-flash-lite"

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function formatTimeDisplay(timeStr) {
  if (!timeStr) return timeStr
  const [h, m] = timeStr.split(":").map(Number), period = h >= 12 ? "PM" : "AM"
  return (h % 12 || 12) + (m > 0 ? ":" + String(m).padStart(2, "0") : "") + " " + period
}

async function callGeminiWithRetry(prompt, attempt = 1) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 800, responseMimeType: "application/json" }
        }),
        signal: controller.signal
      }
    )
    clearTimeout(timer)
    const data = await res.json()
    if (data?.error) {
      console.error("Gemini error attempt " + attempt + ":", data.error.message)
      if ((data.error.code === 429 || data.error.code === 503) && attempt <= GEMINI_MAX_RETRIES) { await sleep(1000 * attempt); return callGeminiWithRetry(prompt, attempt + 1) }
      return null
    }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch (e) {
    clearTimeout(timer)
    console.error("Gemini " + (e.name === "AbortError" ? "TIMEOUT" : e.message) + " attempt " + attempt)
    if (attempt <= GEMINI_MAX_RETRIES) { await sleep(1000 * attempt); return callGeminiWithRetry(prompt, attempt + 1) }
    return null
  }
}

function parseJSON(raw) {
  if (!raw) return null
  try {
    let clean = raw.replace(/```json|```/gi, "").trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch (e) { return null }
}

function buildGeminiPrompt({ message, services, history, state, firstName, activeBookings, biz, campaignContext, availableSlots, replyLang, lastOutboundReply }) {
  const bizType = biz?.business_type || "General", bizName = biz?.business_name || "us"
  const aiInstr = biz?.ai_instructions || "", activeOffer = biz?.active_offer || "", workHours = biz?.working_hours || "Mon-Sat 9AM-8PM"
  const svcList = services.map(s => "- " + s.name + " — Rs." + s.price + (s.duration ? " (" + s.duration + " min)" : "")).join("\n") || "No services configured"

  // IMPROVED: Show last 10 messages with 250 char limit (was 6/120)
  const hist = (history || []).slice(-10).map(m => (m.role === "user" ? "Customer" : "You") + ": " + m.content.substring(0, 250)).join("\n")

  const st = [state.service ? "service=" + state.service : "", state.date ? "date=" + state.date : "", state.time ? "time=" + state.time : "", state.stage && state.stage !== "idle" ? "stage=" + state.stage : ""].filter(Boolean).join(", ") || "fresh"
  const slotsInfo = availableSlots?.length > 0 ? "AVAILABLE SLOTS on " + state.date + ": " + availableSlots.map(formatTimeDisplay).join(", ") : ""

  const activeBookingsLine = campaignContext
    ? ""
    : (activeBookings && activeBookings !== "none" ? "CUSTOMER'S UPCOMING BOOKINGS: " + activeBookings : "")

  // IMPROVED: Add last outbound reply to prevent repetition
  const lastReplyLine = lastOutboundReply ? "YOUR LAST REPLY TO THIS CUSTOMER: \"" + lastOutboundReply.substring(0, 200) + "\"" : ""

  return `You are an intelligent WhatsApp assistant for ${bizName}, a ${bizType} business in India.
Reply language: ${replyLang}
${aiInstr ? "BUSINESS INSTRUCTIONS: " + aiInstr : ""}
${activeOffer ? "ACTIVE OFFER: " + activeOffer : ""}

SERVICES:
${svcList}

WORKING HOURS: ${workHours}
TODAY: ${todayStr()} (${todayFormatted()})
TOMORROW: ${tomorrowStr()}
CUSTOMER: ${firstName}
BOOKING STATE: ${st}
${slotsInfo}
${activeBookingsLine}
${lastReplyLine}
${campaignContext ? "CAMPAIGN: Customer replied to campaign. Help them book the service mentioned in the campaign." : ""}

CONVERSATION HISTORY:
${hist || "none"}

CUSTOMER MESSAGE: "${message}"

RULES:
1. Understand casual/mixed language naturally. Read the conversation history to understand context.
2. Booking order is STRICT: service > date > time > confirm. NEVER skip steps.
3. If service known but date missing, ask for date ONLY. Never ask for time yet.
4. If service+date known but time missing, ask for time ONLY.
5. Only say "Shall I confirm" when service + date + time are ALL collected.
6. Reply in ${replyLang}, warm WhatsApp tone, use *bold* for names/services.
7. suggested_reply = null ONLY for do_booking/do_cancel/do_reschedule intents.
8. Keep replies SHORT — max 3 lines. No essays.
9. CRITICAL: NEVER repeat the same question or reply you already sent. Check YOUR LAST REPLY and conversation history.
10. NEVER reference old/past bookings when customer is trying to make a NEW booking.
11. If the customer already answered something (service, date, time), acknowledge it and move to the NEXT step. Do NOT re-ask.
12. Match the customer's energy — short casual reply to short casual message, detailed reply only when asked.

INTENTS: book, cancel, reschedule, confirm, deny, show_services, show_bookings, show_location, show_hours, set_reminder, check_slot, provide_info, qualify_lead, complaint, out_of_scope, unclear

RESPOND JSON ONLY:
{
  "intent": "<intent>",
  "extracted": {
    "service": "<exact name or null>",
    "date": "<YYYY-MM-DD or null>",
    "time": "<HH:MM or null>",
    "confirmed": <true|false>,
    "cancel_scope": "<all|specific|null>",
    "reminder_preference": "<2hrs|24hrs|null>"
  },
  "suggested_reply": "<WhatsApp reply or null>",
  "preferred_language": "<English|Telugu|Hindi|Tamil|null>",
  "sentiment": "<happy|neutral|frustrated|upset>",
  "qualification_data": "<extracted info or null>"
}`
}

module.exports = {
  GEMINI_MODEL,
  callGeminiWithRetry, parseJSON, buildGeminiPrompt, formatTimeDisplay
}
