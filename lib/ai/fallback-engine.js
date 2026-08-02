// lib/ai/fallback-engine.js — v2.2 MULTILINGUAL
function getFallbackReply({ intent, state, biz, services, firstName, message }) {
  const name     = firstName || "there"
  const bizName  = biz?.business_name || "us"
  const location = biz?.location      || ""
  const hours    = biz?.working_hours || ""
  const mapsLink = biz?.maps_link     || ""
  const svcPrev  = (services||[]).slice(0,3).map(s => s.name).join(", ")
  const primary  = intent?.primary_intent || "out_of_scope"
  const sentiment= intent?.sentiment      || "neutral"
  const stage    = state?.stage           || "idle"
  const isUpset  = sentiment === "angry" || sentiment === "annoyed"
  const msg      = (message||"").toLowerCase().trim()

  // Script detection
  const isTeluguScript = /[\u0C00-\u0C7F]/.test(message)
  const isHindiScript  = /[\u0900-\u097F]/.test(message)
  const isTamilScript  = /[\u0B80-\u0BFF]/.test(message)

  // Language helpers
  function reply(en, te, hi) {
    if (isTeluguScript && te) return te
    if (isHindiScript  && hi) return hi
    return en
  }

  // Language capability question
  const langQuestion = /^(do you (know|speak|understand)|can you (speak|understand))\s+(telugu|hindi|tamil|kannada|malayalam|marathi|bengali|gujarati|punjabi)/i.test(msg)
  if (langQuestion) {
    return "Yes " + name + "! 😊 I can communicate in Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and English.\n\nHow can I help you? / మీకు ఎలా సహాయం చేయగలను?"
  }

  if (isUpset && (primary === "complaint" || primary === "frustration")) {
    return reply(
      "I'm really sorry, " + name + " 😔 Let me help you right away.\n\nWhat exactly can I assist you with?",
      "చాలా క్షమించండి " + name + " 😔 మీకు వెంటనే సహాయం చేస్తాను.\n\nమీకు ఏమి కావాలి?",
      "मुझे बहुत खेद है " + name + " 😔 मैं अभी आपकी मदद करता हूं।\n\nआप क्या चाहते हैं?"
    )
  }

  if (primary === "greeting") {
    return reply(
      "Hi " + name + "! 👋 Welcome to *" + bizName + "*!" + (svcPrev ? "\n\nWe offer: " + svcPrev + " and more." : "") + "\n\nHow can I help you today? 😊",
      "నమస్కారం " + name + "! 👋 *" + bizName + "*కి స్వాగతం!" + (svcPrev ? "\n\nమేము అందిస్తున్నాము: " + svcPrev + " మరియు మరిన్ని." : "") + "\n\nమీకు ఎలా సహాయం చేయగలను? 😊",
      "नमस्ते " + name + "! 👋 *" + bizName + "* में आपका स्वागत है!" + (svcPrev ? "\n\nहम देते हैं: " + svcPrev + " और भी।" : "") + "\n\nमैं आपकी कैसे मदद कर सकता हूं? 😊"
    )
  }

  if (primary === "frustration") {
    return reply(
      "I understand " + name + ", let me help! 😊\n\nWhat would you like to know or do?",
      "అర్థమైంది " + name + ", సహాయం చేస్తాను! 😊\n\nమీకు ఏమి కావాలి?",
      "समझ गया " + name + ", मैं मदद करता हूं! 😊\n\nआप क्या जानना चाहते हैं?"
    )
  }

  if (primary === "pricing" || primary === "service_inquiry") {
    if (services?.length) {
      const list = services.slice(0,5).map(s =>
        "• *" + s.name + "* — ₹" + s.price + (s.duration ? " (" + s.duration + " min)" : "")
      ).join("\n")
      return reply(
        "*" + bizName + " Services*\n\n" + list + "\n\nWant to book any? 😊",
        "*" + bizName + " సేవలు*\n\n" + list + "\n\nబుక్ చేయాలా? 😊",
        "*" + bizName + " सेवाएं*\n\n" + list + "\n\nबुक करना चाहते हैं? 😊"
      )
    }
    return reply(
      "I'll get our latest pricing for you shortly! 😊",
      "ధరల వివరాలు తెలియజేస్తాను! 😊",
      "मैं आपको जल्द कीमत बताता हूं! 😊"
    )
  }

  if (primary === "location_query") {
    if (location && mapsLink) return "📍 *" + bizName + "*:\n" + location + "\n\n" + mapsLink + "\n\nSee you soon! 😊"
    if (location)             return "📍 " + location
    return reply("I'll share our location shortly! 😊", "లొకేషన్ పంపిస్తాను! 😊", "लोकेशन भेजता हूं! 😊")
  }

  if (primary === "hours_query") {
    return hours
      ? reply(
          "*" + bizName + "* is open:\n\n" + hours + "\n\nAnything else? 😊",
          "*" + bizName + "* తెరిచి ఉంటుంది:\n\n" + hours + "\n\nఇంకేమైనా? 😊",
          "*" + bizName + "* खुला है:\n\n" + hours + "\n\nकुछ और? 😊"
        )
      : reply("I'll confirm our hours shortly! 😊", "సమయాలు తెలియజేస్తాను! 😊", "समय बताता हूं! 😊")
  }

  if (primary === "booking_reschedule") {
    if (!state?.date && !state?.time) return reply(
      "Sure " + name + "! What new date and time works for you?",
      "సరే " + name + "! కొత్త తేదీ మరియు సమయం చెప్పండి?",
      "ठीक है " + name + "! नई तारीख और समय बताइए?"
    )
    if (state?.date && !state?.time) return reply(
      "Got the date! What time works for you?",
      "తేదీ వచ్చింది! సమయం చెప్పండి?",
      "तारीख मिल गई! समय बताइए?"
    )
    if (!state?.date && state?.time) return reply(
      "Got the time! Which date works for you?",
      "సమయం వచ్చింది! తేదీ చెప్పండి?",
      "समय मिल गया! तारीख बताइए?"
    )
    return reply(
      "Rescheduling to " + state.date + " at " + state.time + " — shall I confirm? ✅",
      state.date + " తేదీన " + state.time + "కి మార్చాలా? ✅",
      state.date + " को " + state.time + " पर बदलें? ✅"
    )
  }

  if (primary === "booking_cancel") {
    return reply(
      "I understand you want to cancel 😔\n\nWould you prefer to reschedule instead? We'd love to have you at *" + bizName + "*!",
      "క్యాన్సిల్ చేయాలని అర్థమైంది 😔\n\nబదులుగా రీషెడ్యూల్ చేయాలా? *" + bizName + "*లో మీకోసం ఎదురు చూస్తాం!",
      "रद्द करना समझ आया 😔\n\nक्या आप रीशेड्यूल करना चाहेंगे? *" + bizName + "* में आपका इंतजार है!"
    )
  }

  if (primary === "complaint") {
    return reply(
      "I'm really sorry to hear this, " + name + " 😔 Your feedback matters to us.\n\nI'm flagging this to our team right away — someone will reach out shortly. 🙏",
      "చాలా క్షమించండి " + name + " 😔 మీ అభిప్రాయం మాకు ముఖ్యం.\n\nమా టీమ్‌కి తెలియజేస్తాను — త్వరలో ఎవరైనా సంప్రదిస్తారు. 🙏",
      "बहुत खेद है " + name + " 😔 आपकी बात हमारे लिए महत्वपूर्ण है।\n\nहमारी टीम जल्द आपसे संपर्क करेगी। 🙏"
    )
  }

  if (primary === "human_handoff") {
    return reply(
      "Of course! 🙌 I'll notify our team right away and someone will be with you shortly.",
      "తప్పకుండా! 🙌 మా టీమ్‌కి తెలియజేస్తాను — త్వరలో ఎవరైనా మీతో మాట్లాడతారు.",
      "बिल्कुल! 🙌 हमारी टीम को अभी सूचित करता हूं।"
    )
  }

  if (primary === "gratitude") {
    return reply(
      "You're welcome! 😊 Looking forward to seeing you at *" + bizName + "*!",
      "సంతోషం! 😊 *" + bizName + "*లో మీకోసం ఎదురు చూస్తాం!",
      "खुशी हुई! 😊 *" + bizName + "* में आपका इंतजार है!"
    )
  }

  if (primary === "booking_new" || primary === "booking_confirm" || stage !== "idle") {
    if (!state?.service) return reply(
      svcPrev ? "I'd love to help you book! 😊\n\nWe offer: " + svcPrev + ".\n\nWhich service would you like?" : "I'd love to help you book! 😊 Which service are you interested in?",
      svcPrev ? "బుక్ చేయడానికి సహాయం చేస్తాను! 😊\n\nమేము అందిస్తున్నాము: " + svcPrev + ".\n\nఏ సేవ కావాలి?" : "బుక్ చేయడానికి సహాయం చేస్తాను! 😊 ఏ సేవ కావాలి?",
      svcPrev ? "बुकिंग में मदद करता हूं! 😊\n\nहम देते हैं: " + svcPrev + ".\n\nकौन सी सेवा चाहिए?" : "बुकिंग में मदद करता हूं! 😊 कौन सी सेवा चाहिए?"
    )
    if (!state?.date) return reply(
      "Great choice! What date works for your *" + state.service + "*?",
      "మంచి ఎంపిక! *" + state.service + "* కోసం తేదీ చెప్పండి?",
      "अच्छा विकल्प! *" + state.service + "* के लिए तारीख बताइए?"
    )
    if (!state?.time) return reply(
      "Almost there! What time works for you on " + state.date + "?",
      "దాదాపు అయింది! " + state.date + "న ఏ సమయం?",
      "लगभग हो गया! " + state.date + " को कौन सा समय?"
    )
    return reply(
      "Shall I confirm your booking for *" + state.service + "* on " + state.date + (state.time ? " at " + state.time : "") + "? ✅",
      "*" + state.service + "* " + state.date + (state.time ? " " + state.time + "కి" : "") + " బుక్ చేయమా? ✅",
      "*" + state.service + "* " + state.date + (state.time ? " " + state.time + " को" : "") + " बुक करें? ✅"
    )
  }

  return reply(
    "Hi " + name + "! 😊 How can I help you today? I can assist with bookings, pricing, or any questions about *" + bizName + "*.",
    "నమస్కారం " + name + "! 😊 మీకు ఎలా సహాయం చేయగలను? బుకింగ్, ధరలు లేదా *" + bizName + "* గురించి ఏదైనా అడగండి.",
    "नमस्ते " + name + "! 😊 मैं आपकी कैसे मदद कर सकता हूं? बुकिंग, कीमत या *" + bizName + "* के बारे में कुछ भी पूछें।"
  )
}

module.exports = { getFallbackReply }
