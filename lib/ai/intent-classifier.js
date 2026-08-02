// lib/ai/intent-classifier.js — Extracted from orchestrator.js
// Rule-based intent classification (fallback when Gemini fails)

const CONFIRM_WORDS = /^(yes|ok|okay|sure|haan|avunu|sare|confirm|cofirmed|confirmed|proceed|book it|do it|yes please|ha|ji|ji haan|aanu|otey|done|go ahead|please|correct|right|yep|yup|yeah|ya|deal|lets do it|let's do it|sounds good|perfect|great|fine|book karo|karo|kar do|aavunu|ante|ante avunu|ante ok|s|y)\.?\s*$/i
const PURE_NEGATION = /^(no|nahi|nope|vaddu|vaddhu|don't|dont|wait|hold|stop|not now|cancel it|వద్దు|noo|na|mat karo)\.?\s*$/i

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }

function extractServiceFromMessage(message, services) {
  if (!services?.length || !message) return null
  const m = message.toLowerCase().replace(/[?!.,]/g, "").trim()

  for (const svc of services) {
    const name = svc.name.toLowerCase().trim()
    const pattern = new RegExp("(^|\\s)" + escapeRegex(name) + "($|\\s)", "i")
    if (pattern.test(m)) return svc.name
  }

  for (const svc of services) { if (m.includes(svc.name.toLowerCase())) return svc.name }
  for (const svc of services) { const words = svc.name.toLowerCase().split(" "); if (words.filter(w => w.length > 3).every(w => m.includes(w))) return svc.name }
  for (const svc of services) {
    const svcLower = svc.name.toLowerCase()
    if (svcLower.length < 4) continue
    if (m.includes(svcLower.substring(0, Math.floor(svcLower.length * 0.8)))) return svc.name
  }
  return null
}

function isServiceInquiry(message) {
  const m = (message || "").toLowerCase().trim()
  if (!m) return false
  if (/\b(book|booking|appointment|schedule|confirm|reschedule|cancel|tomorrow|today)\b/i.test(m)) return false
  return (
    /\b(what|which|list|show|tell)\b[\s\S]*\b(service|services|menu|offer|offers|available|provide|providing)\b/i.test(m) ||
    /\b(service|services|menu|offer|offers)\b[\s\S]*\b(offer|offers|available|provide|providing|have|do you)\b/i.test(m) ||
    /\b(available services|services available|service list|list services|show services|show menu)\b/i.test(m) ||
    (/\b(do you (have|do|offer|provide)|got any)\b/i.test(m) && !/\b(slot|time|am|pm|\d{1,2}:\d{2}|available)\b/i.test(m))
  )
}

function quickRoute(message) {
  const m = (message || "").toLowerCase().trim()
  if (/^(hi|hello|hey|hii|hai|namaste|good morning|good evening|good afternoon|howdy)[\s!.]*$/i.test(m)) return "greeting"
  if (/^(thank|thanks|thnx|thx|ty|thank you|thankyou|dhanyavaad|tq)[\s!.]*$/i.test(m)) return "thanks"
  if (/^(bye|goodbye|see you|cya|later|take care|good night|goodnight|ok bye)[\s!.]*$/i.test(m)) return "bye"
  if (/^(good|awesome|amazing|excellent|wonderful|nice|cool|superb|👍|🙏)[\s!.]*$/i.test(m)) return "compliment"
  if (/\b(ipl|cricket|football|worldcup|t20|nba|nfl|epl)\b/i.test(m) && !/\b(book|cancel)\b/i.test(m)) return "sports"
  if (/\b(weather|rainfall|temperature|forecast)\b/i.test(m)) return "weather"
  if (/\b(tell me a joke|crack a joke|make me laugh)\b/i.test(m)) return "joke"
  if (/\b(who is modi|bjp|congress|election|politics)\b/i.test(m)) return "politics"
  if (/\b(fuck|fck|shit|bastard|idiot|stupid|useless|hate you|mf|bc|mc|lavda|luvda|loda|lund|chutiya|chutiye|madarchod|bhosdi|bsdk)\b/i.test(m)) return "abuse"
  return null
}

function ruleBasedClassify(message, state, services) {
  const m = (message || "").toLowerCase().trim()
  const extracted = { service: null, date: null, time: null, confirmed: false, cancel_scope: null, reminder_preference: null }
  let intent = "unclear"
  if (CONFIRM_WORDS.test(m)) { intent = "confirm"; extracted.confirmed = true }
  else if (PURE_NEGATION.test(m)) intent = "deny"
  else if (/\b(cancel|cancle|రద్దు|रद्द)\b/i.test(m)) { intent = "cancel"; extracted.cancel_scope = /everything|all|sab/i.test(m) ? "all" : "specific" }
  else if (/\b(reschedule|postpone|మార్చు)\b/i.test(m)) intent = "reschedule"
  else if (isServiceInquiry(m) || /\b(price|cost|rate|charges|fees|how much|menu)\b/i.test(m)) intent = "show_services"
  else if (/\b(location|address|where|maps)\b/i.test(m)) intent = "show_location"
  else if (/\b(hours|timing|open|close|working|schedule)\b/i.test(m) && !/\b(book|slot)\b/i.test(m)) intent = "show_hours"
  else if (/\b(remind|reminder|notify)\b/i.test(m)) { intent = "set_reminder"; extracted.reminder_preference = /2\s*hr/i.test(m) ? "2hrs" : "24hrs" }
  else if (/\b(booking|appointment|booked)s?\b/i.test(m) && /\b(my|show|upcoming|status)\b/i.test(m)) intent = "show_bookings"
  else if (/\b(claim|interested|book now)\b/i.test(m)) intent = "book"
  else {
    const { extractDateFromMessage } = require("./date-time-parser")
    const { extractTimeFromMessage } = require("./date-time-parser")
    const svc = extractServiceFromMessage(message, services)
    if (svc) { extracted.service = svc; intent = "provide_info" }
    else if (extractDateFromMessage(message)) intent = "provide_info"
    else if (extractTimeFromMessage(message)) intent = "provide_info"
    else if (state?.stage && state.stage !== "idle") intent = "provide_info"
  }
  return { intent, extracted, sentiment: "neutral", preferred_language: null, suggested_reply: null }
}

module.exports = {
  CONFIRM_WORDS, PURE_NEGATION,
  extractServiceFromMessage, isServiceInquiry,
  quickRoute, ruleBasedClassify
}
