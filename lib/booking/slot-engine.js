// lib/booking/slot-engine.js — Fixed: N+1 query, duration overlap detection
const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function isTimeBased(service) {
  if (!service) return false
  if (service.service_type === "package") return false
  return !!(service.duration && service.duration > 0)
}

function matchService(name, services) {
  if (!name || !services?.length) return null
  const n = name.toLowerCase().trim()
  return services.find(s => s.name.toLowerCase() === n)
    || services.find(s => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase()))
    || null
}

// Convert "HH:MM" to minutes since midnight
function toMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

// FIX: Fetch ALL bookings for the date in ONE query, check overlap in memory
// Old code queried DB for every slot = N+1 queries
// Also fixes duration overlap: 60min service at 10:00 blocks 10:00-11:00,
// so another booking at 10:30 should be rejected
async function getBookingsForDate(userId, date) {
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_time, service")
    .eq("user_id", userId)
    .eq("booking_date", date)
    .in("status", ["confirmed", "pending"])
  return data || []
}

async function isSlotAvailable({ userId, date, time, serviceName, services, excludeBookingId }) {
  if (!date || !time) return true

  const svc      = matchService(serviceName, services)
  const capacity = svc?.capacity || 1
  const duration = svc?.duration || 30
  const reqStart = toMinutes(time)
  const reqEnd   = reqStart + duration

  // ONE query for all bookings on this date
  const existing = await getBookingsForDate(userId, date)

  // Check how many bookings overlap with our requested slot
  let overlapCount = 0
  for (const bk of existing) {
    if (excludeBookingId && bk.id === excludeBookingId) continue

    // Get duration of existing booking's service
    const existingSvc      = matchService(bk.service, services)
    const existingDuration = existingSvc?.duration || 30
    const existingStart    = toMinutes(bk.booking_time)
    const existingEnd      = existingStart + existingDuration

    // Two bookings overlap if one starts before the other ends
    const overlaps = reqStart < existingEnd && reqEnd > existingStart
    if (overlaps) overlapCount++
  }

  return overlapCount < capacity
}

async function findNextSlot({ userId, date, serviceName, services }) {
  if (!date) return null

  const svc      = matchService(serviceName, services)
  const duration = svc?.duration || 30

  // ONE query for all bookings on this date
  const existing = await getBookingsForDate(userId, date)

  // Generate all slots for the day
  const slots = []
  let m = 9 * 60
  while (m + duration <= 20 * 60) {
    const h   = String(Math.floor(m/60)).padStart(2, "0")
    const min = String(m % 60).padStart(2, "0")
    slots.push(h + ":" + min)
    m += duration
  }

  const capacity = svc?.capacity || 1

  for (const time of slots) {
    const reqStart = toMinutes(time)
    const reqEnd   = reqStart + duration

    let overlapCount = 0
    for (const bk of existing) {
      const existingSvc      = matchService(bk.service, services)
      const existingDuration = existingSvc?.duration || 30
      const existingStart    = toMinutes(bk.booking_time)
      const existingEnd      = existingStart + existingDuration
      if (reqStart < existingEnd && reqEnd > existingStart) overlapCount++
    }

    if (overlapCount < capacity) {
      const d = new Date(date + "T" + time + ":00")
      return d.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" }) + " at " + time
    }
  }

  return null
}

module.exports = { isTimeBased, matchService, isSlotAvailable, findNextSlot }
