// lib/booking/calendar-engine.js
function getDayName(dateStr) {
  if (!dateStr) return null
  try { return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }) }
  catch(e) { return null }
}

function formatDate(dateStr) {
  if (!dateStr) return null
  try { return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }) }
  catch(e) { return dateStr }
}

function formatDateShort(dateStr) {
  if (!dateStr) return null
  try { return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) }
  catch(e) { return dateStr }
}

function getTodayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  return !isNaN(new Date(dateStr + "T12:00:00").getTime())
}

function isPastDate(dateStr) {
  if (!dateStr) return false
  return dateStr < getTodayStr()
}

function normalizeTime(raw) {
  if (!raw) return null
  const s = String(raw).toLowerCase().trim()
  const hhmmMatch = s.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmmMatch) {
    let h = parseInt(hhmmMatch[1])
    const m = hhmmMatch[2]
    if (h >= 1 && h <= 8) h += 12
    return String(h).padStart(2, "0") + ":" + m
  }
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1])
    const m = ampmMatch[2] || "00"
    const period = ampmMatch[3]
    if (period === "pm" && h !== 12) h += 12
    if (period === "am" && h === 12) h = 0
    return String(h).padStart(2, "0") + ":" + m
  }
  const numMatch = s.match(/^(\d{1,2})$/)
  if (numMatch) {
    let h = parseInt(numMatch[1])
    if (h > 12) return String(h).padStart(2, "0") + ":00"
    if (h >= 1 && h <= 8) h += 12
    if (h === 0) h = 12
    return String(h).padStart(2, "0") + ":00"
  }
  return raw
}

function formatTime(timeStr) {
  if (!timeStr) return null
  const normalized = normalizeTime(timeStr)
  if (!normalized) return timeStr
  const [h, m] = normalized.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const display = (h % 12 || 12) + (m > 0 ? ":" + String(m).padStart(2, "0") : "")
  return display + " " + period
}

function resolveOrdinalDate(day) {
  if (!day || isNaN(day)) return null
  const today = new Date(getTodayStr() + "T12:00:00")
  const year = today.getFullYear()
  const month = today.getMonth()
  const thisMonth = new Date(year, month, day)
  if (thisMonth.getDate() === day && thisMonth >= today) {
    return getTodayStr().substring(0, 7) + "-" + String(day).padStart(2, "0")
  }
  const nextMonth = new Date(year, month + 1, day)
  if (nextMonth.getDate() === day) {
    const y = nextMonth.getFullYear()
    const mo = String(nextMonth.getMonth() + 1).padStart(2, "0")
    const d  = String(nextMonth.getDate()).padStart(2, "0")
    return y + "-" + mo + "-" + d
  }
  return null
}

// Multilingual booking confirmation — no emojis
function buildConfirmMsg(service, dateStr, time, bizName, timeBased, language) {
  const dayAndDate  = formatDate(dateStr)
  const displayTime = timeBased && time ? formatTime(normalizeTime(time)) : null

  if (language === "Telugu") {
    let msg = "బుకింగ్ నిర్ధారించబడింది!\n\n"
    msg += "సేవ: " + service + "\n"
    if (dayAndDate)   msg += "తేదీ: " + dayAndDate + "\n"
    if (displayTime)  msg += "సమయం: " + displayTime + "\n"
    msg += "\n*" + (bizName || "మా సంస్థ") + "*లో కలుద్దాం! 😊"
    return msg
  }

  if (language === "Hindi") {
    let msg = "बुकिंग Confirmed!\n\n"
    msg += "सेवा: " + service + "\n"
    if (dayAndDate)   msg += "तारीख: " + dayAndDate + "\n"
    if (displayTime)  msg += "समय: " + displayTime + "\n"
    msg += "\n*" + (bizName || "हमारे यहां") + "* में मिलते हैं! 😊"
    return msg
  }

  if (language === "Tamil") {
    let msg = "முன்பதிவு உறுதிப்படுத்தப்பட்டது!\n\n"
    msg += "சேவை: " + service + "\n"
    if (dayAndDate)   msg += "தேதி: " + dayAndDate + "\n"
    if (displayTime)  msg += "நேரம்: " + displayTime + "\n"
    msg += "\n*" + (bizName || "எங்கள் நிறுவனம்") + "*ல் சந்திப்போம்! 😊"
    return msg
  }

  // Default English
  let msg = "Booking Confirmed!\n\n"
  msg += "Service: " + service + "\n"
  if (dayAndDate)  msg += "Date: " + dayAndDate + "\n"
  if (displayTime) msg += "Time: " + displayTime + "\n"
  msg += "\nSee you soon at *" + (bizName || "us") + "*!"
  return msg
}

function buildConfirmQuestion(service, dateStr, time) {
  const dayAndDate  = formatDate(dateStr)
  const displayTime = time ? formatTime(normalizeTime(time)) : null
  let q = "Shall I confirm your booking for *" + service + "*"
  if (dayAndDate)  q += " on " + dayAndDate
  if (displayTime) q += " at " + displayTime
  q += "?"
  return q
}

// Multilingual reschedule confirmation
function buildRescheduleMsg(service, dateStr, time, language) {
  const dayAndDate  = formatDate(dateStr)
  const displayTime = time ? formatTime(normalizeTime(time)) : null

  if (language === "Telugu") {
    let msg = "రీషెడ్యూల్ అయింది!\n\n"
    msg += "సేవ: " + service + "\n"
    msg += "కొత్త తేదీ: " + (dayAndDate || dateStr) + "\n"
    if (displayTime) msg += "కొత్త సమయం: " + displayTime + "\n"
    msg += "\nమీకోసం ఎదురు చూస్తాం! 😊"
    return msg
  }

  if (language === "Hindi") {
    let msg = "Reschedule हो गया!\n\n"
    msg += "सेवा: " + service + "\n"
    msg += "नई तारीख: " + (dayAndDate || dateStr) + "\n"
    if (displayTime) msg += "नया समय: " + displayTime + "\n"
    msg += "\nआपका इंतजार है! 😊"
    return msg
  }

  let msg = "Rescheduled!\n\n"
  msg += "Service: " + service + "\n"
  msg += "New Date: " + (dayAndDate || dateStr) + "\n"
  if (displayTime) msg += "New Time: " + displayTime + "\n"
  msg += "\nAll updated! See you soon. 😊"
  return msg
}

module.exports = {
  getDayName, formatDate, formatDateShort, getTodayStr,
  isValidDate, isPastDate, normalizeTime, formatTime,
  resolveOrdinalDate, buildConfirmMsg, buildConfirmQuestion, buildRescheduleMsg
}
