// lib/ai/reply-builder.js — Extracted from orchestrator.js
// Builds structured replies for different actions

const { formatDate, formatTime } = require("../booking/calendar-engine")
const { formatTimeDisplay } = require("./gemini-client")

function detectLanguage(msg) {
  if (!msg) return "English"
  if (/[ఀ-౿]/.test(msg)) return "Telugu"
  if (/[ऀ-ॿ]/.test(msg)) return "Hindi"
  if (/[஀-௿]/.test(msg)) return "Tamil"
  if (/[ಀ-೿]/.test(msg)) return "Kannada"
  if (/[ഀ-ൿ]/.test(msg)) return "Malayalam"
  return "English"
}

function t(en, te, hi, lang) { if (lang === "Telugu" && te) return te; if (lang === "Hindi" && hi) return hi; return en }

function stripBadEmojis(text) {
  if (!text) return text
  return text.replace(/📅/g, "").replace(/📆/g, "").replace(/⏰/g, "").replace(/🔔/g, "").replace(/⌚/g, "").replace(/🎊/g, "").replace(/🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛/g, "").replace(/  +/g, " ").trim()
}

function quickReply(type, firstName, bizName) {
  const name = firstName || "there"
  switch (type) {
    case "thanks": return "You're welcome " + name + "! Let me know if you need anything else."
    case "bye": return "Take care " + name + "! See you soon at *" + bizName + "*!"
    case "compliment": return "Thank you " + name + "! Anything I can help you with today?"
    case "sports": return "Ha, wish I was watching too! Can I help you at *" + bizName + "*?"
    case "weather": return "No idea — I'm indoors! Can I help you at *" + bizName + "*?"
    case "joke": return "Why did the customer always come back? Service was too good to cancel\n\nCan I help you today?"
    case "politics": return "Ha, that's above my pay grade! I'm just here to help — what do you need?"
    case "abuse": return "I understand you might be frustrated " + name + ". I'm here to help — what's going on?"
    default: return "Not sure I got that! How can I help you at *" + bizName + "* today?"
  }
}

function buildReply(action, state, services, biz, lang, activeBookings) {
  const bizName = biz?.business_name || "us", svc = state.service
  const displayDate = state.date ? formatDate(state.date) : null, displayTime = state.time ? formatTime(state.time) : null
  const svcList = (services || []).map(s => "- *" + s.name + "* — Rs." + s.price + (s.duration ? " (" + s.duration + " min)" : "")).join("\n")
  switch (action) {
    case "collect_service":
      if (!services?.length) return t("We're updating our menu right now. Please check back shortly!", "మేము మా సేవలను అప్‌డేట్ చేస్తున్నాము.", "हम अभी सेवाएं अपडेट कर रहे हैं।", lang)
      return t("Which would you like to book?\n\n" + svcList, "మీకు ఏది కావాలి?\n\n" + svcList, "कौन सा चाहिए?\n\n" + svcList, lang)
    case "collect_date":
      return t("What date works for your *" + svc + "*?", "*" + svc + "* కోసం తేదీ చెప్పండి?", "*" + svc + "* के लिए तारीख बताइए?", lang)
    case "collect_time":
      return t("What time works on " + (displayDate || state.date) + "?", (displayDate || state.date) + "న ఏ సమయం కావాలి?", (displayDate || state.date) + " को कौन सा समय?", lang)
    case "confirm_booking":
      if (svc && displayDate) {
        const tp = displayTime ? " at " + displayTime : "", tpTe = displayTime ? " " + displayTime + "కి" : "", tpHi = displayTime ? " " + displayTime + " को" : ""
        return t("Shall I confirm *" + svc + "* on " + displayDate + tp + "?", "*" + svc + "* " + displayDate + tpTe + " బుక్ చేయమా?", "*" + svc + "* " + displayDate + tpHi + " बुक करें?", lang)
      }
      return null
    case "show_services":
      if (!services?.length) return t("We're updating our menu right now.", "మేము అప్‌డేట్ చేస్తున్నాము.", "अभी अपडेट कर रहे हैं।", lang)
      return t("*" + bizName + " Services*\n\n" + svcList + "\n\nWant to book any?", "*" + bizName + " సేవలు*\n\n" + svcList + "\n\nబుక్ చేయాలా?", "*" + bizName + " सेवाएं*\n\n" + svcList + "\n\nबुक करना है?", lang)
    case "show_location":
      if (biz?.location) return "*" + bizName + "*\n" + biz.location + (biz.maps_link ? "\n\n" + biz.maps_link : "")
      return t("I'll get our location!", "లొకేషన్ తెలియజేస్తాను!", "लोकेशन बताता हूं!", lang)
    case "show_hours":
      if (biz?.working_hours) return t("*" + bizName + "* is open:\n" + biz.working_hours + "\n\nAnything else?", "*" + bizName + "* తెరిచి ఉంటుంది:\n" + biz.working_hours + "\n\nఇంకేమైనా?", "*" + bizName + "* खुला है:\n" + biz.working_hours + "\n\nकुछ और?", lang)
      return t("We're open Mon–Sat, 9 AM to 8 PM", "మేము సోమ–శని, ఉ. 9 నుండి సా. 8 వరకు", "हम सोम–शनि, सुबह 9 से शाम 8 बजे तक", lang)
    case "show_bookings":
      if (activeBookings && activeBookings !== "no upcoming bookings" && activeBookings !== "none")
        return t("Here are your upcoming bookings:\n\n" + activeBookings + "\n\nNeed to reschedule or cancel?", "మీ రాబోయే బుకింగ్‌లు:\n\n" + activeBookings + "\n\nరీషెడ్యూల్ చేయాలా?", "आपकी upcoming बुकिंग:\n\n" + activeBookings + "\n\nरीशेड्यूल करना है?", lang)
      return t("You don't have any upcoming bookings. Want to book something?", "మీకు బుకింగ్‌లు లేవు. బుక్ చేయాలా?", "कोई upcoming बुकिंग नहीं। कुछ बुक करना है?", lang)
    default: return null
  }
}

function buildSmartDefault(state, bizName, lang) {
  if (state?.stage && state.stage !== "idle") {
    const map = {
      "awaiting_service": t("Which would you like to book?", "ఏది కావాలి?", "कौन सा चाहिए?", lang),
      "awaiting_date": t("What date works for you?", "తేదీ చెప్పండి?", "तारीख बताइए?", lang),
      "awaiting_time": t("What time works for you?", "సమయం చెప్పండి?", "समय बताइए?", lang),
      "awaiting_confirmation": t("Shall I confirm this booking?", "బుకింగ్ నిర్ధారించమా?", "बुकिंग confirm करूं?", lang)
    }
    if (map[state.stage]) return map[state.stage]
  }
  return t("How can I help you at *" + bizName + "* today?", "నేను మీకు ఎలా సహాయం చేయగలను?", "मैं आपकी कैसे मदद कर सकता हूं?", lang)
}

module.exports = {
  detectLanguage, t, stripBadEmojis,
  quickReply, buildReply, buildSmartDefault
}
