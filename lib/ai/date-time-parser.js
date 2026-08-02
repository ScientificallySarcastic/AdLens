// lib/ai/date-time-parser.js — Extracted from orchestrator.js
// Date and time extraction from natural language messages

function pad(n) { return String(n).padStart(2, "0") }
function nowIST() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })) }
function todayStr() { const d = nowIST(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) }
function tomorrowStr() { const d = nowIST(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) }
function todayFormatted() { return nowIST().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }
function pad2(n) { return String(n).padStart(2, "0") }
function toMinutes(t) { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m }

function extractDateFromMessage(message) {
  if (!message) return null
  const m = message.toLowerCase().trim()
  if (/\btoday\b|\baaj\b|\bee roju\b/.test(m)) return todayStr()
  if (/\btomm?orr?ow\b|\bkal\b|\bnale\b|\breyyi\b|\bnaale\b/.test(m)) return tomorrowStr()
  const MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 }
  const withMonth = m.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i) || m.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i)
  if (withMonth) {
    let day, monthStr
    if (/^\d/.test(withMonth[1])) { day = parseInt(withMonth[1]); monthStr = withMonth[2] } else { monthStr = withMonth[1]; day = parseInt(withMonth[2]) }
    const mIdx = MONTHS[monthStr.toLowerCase().substring(0, 3)]
    if (mIdx !== undefined && day >= 1 && day <= 31) {
      let yr = nowIST().getFullYear()
      const cand = new Date(yr, mIdx, day)
      if (cand < new Date(todayStr() + "T00:00:00")) yr++
      const d = new Date(yr, mIdx, day)
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
    }
  }
  const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
  const dayMatch = m.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
  if (dayMatch) {
    const target = DAYS[dayMatch[1].toLowerCase()]
    const d = nowIST(); let diff = target - d.getDay(); if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
  }
  const ordinal = m.match(/\b(\d{1,2})(st|nd|rd|th)\b/)
  if (ordinal) {
    const day = parseInt(ordinal[1])
    if (day >= 1 && day <= 31) {
      const now = nowIST(); let mo = now.getMonth(), yr = now.getFullYear()
      let d = new Date(yr, mo, day)
      if (d <= now) { mo++; if (mo > 11) { mo = 0; yr++ } }
      d = new Date(yr, mo, day)
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
    }
  }
  return null
}

function extractTimeFromMessage(message) {
  if (!message) return null
  const m = message.toLowerCase().trim()
  const ampm = m.match(/\b(\d{1,2})(?:[:.:](\d{2}))?\s*(am|pm)\b/i)
  if (ampm) { let h = parseInt(ampm[1]); const min = ampm[2] || "00", p = ampm[3].toLowerCase(); if (p === "pm" && h !== 12) h += 12; if (p === "am" && h === 12) h = 0; return pad(h) + ":" + min }
  const exp24 = m.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (exp24) return pad(parseInt(exp24[1])) + ":" + exp24[2]
  const baje = m.match(/\b(\d{1,2})\s*baje\b/i)
  if (baje) { let h = parseInt(baje[1]); if (h >= 1 && h <= 8) h += 12; return pad(h) + ":00" }
  const { normalizeTime } = require("../booking/calendar-engine")
  const plain = m.match(/\bat\s+(\d{1,2})\b/) || m.match(/\b(\d{1,2})\s+o'?clock\b/i)
  if (plain) return normalizeTime(String(parseInt(plain[1])))
  return null
}

module.exports = {
  pad, pad2, nowIST, todayStr, tomorrowStr, todayFormatted, toMinutes,
  extractDateFromMessage, extractTimeFromMessage
}
