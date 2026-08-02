// lib/booking/booking-engine.js
const { createClient }   = require("@supabase/supabase-js")
const { matchService, isTimeBased, isSlotAvailable, findNextSlot } = require("./slot-engine")
const { buildConfirmMsg, buildRescheduleMsg, isValidDate, isPastDate } = require("./calendar-engine")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FOOD_SECTORS = ["Food Delivery", "Restaurant"]

function buildFoodConfirmMsg(service, deliveryAddress, amount, bizName, language) {
  const addr = deliveryAddress ? `\n📍 *${deliveryAddress}*` : ""
  const pay  = amount ? `\n💰 Total: ₹${amount}` : ""
  if (language === "Telugu")
    return `✅ *ఆర్డర్ నిర్ధారించబడింది!*\n\nఆర్డర్: *${service}*${addr}${pay}\n\nమీ ఆర్డర్ త్వరలో డెలివరీ అవుతుంది! 🛵`
  if (language === "Hindi")
    return `✅ *ऑर्डर Confirmed!*\n\nOrder: *${service}*${addr}${pay}\n\nआपका ऑर्डर जल्द डिलीवर होगा! 🛵`
  return `✅ *Order Confirmed!*\n\nOrder: *${service}*${addr}${pay}\n\nYour order is on its way! 🛵 Thank you for ordering from *${bizName}*!`
}

async function createBooking({ userId, customerName, customerPhone, customerId, state, services, bizName, language, bizType, deliveryAddress }) {
  const { service, date, time } = state
  const matched   = matchService(service, services)
  const isFood    = FOOD_SECTORS.includes(bizType)

  if (!isFood) {
    if (date && !isValidDate(date)) return { ok: false, error: "invalid_date", message: "That doesn't seem like a valid date 😅 Could you give me the date again?" }
    if (date && isPastDate(date))   return { ok: false, error: "past_date",    message: "That date has already passed 😅 Could you pick a future date?" }
  }

  if (isTimeBased(matched) && date && time) {
    const free = await isSlotAvailable({ userId, date, time, serviceName: service, services })
    if (!free) {
      const next = await findNextSlot({ userId, date, serviceName: service, services })
      return { ok: false, slotFull: true, message: next ? "That slot is taken 😅 Next available: *" + next + "*\n\nShall I book that instead? ✅" : "That slot is fully booked 😅 Could you suggest another time?" }
    }
  }

  if (!customerId && customerPhone) {
    try {
      const { data: cust } = await supabaseAdmin.from("customers")
        .select("id").eq("phone", customerPhone).eq("user_id", userId).maybeSingle()
      if (cust) customerId = cust.id
    } catch(e) {}
  }

  const bookingDate = date || (isFood ? new Date().toISOString().substring(0,10) : null)
  const capacity = matched?.capacity || 1

  if (isTimeBased(matched) && bookingDate && time) {
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc("create_booking_if_available", {
      p_user_id: userId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_id: customerId || null,
      p_service: matched?.name || service || "Order",
      p_booking_date: bookingDate,
      p_booking_time: time,
      p_amount: matched?.price || 0,
      p_status: "confirmed",
      p_ai_booked: true,
      p_capacity: capacity,
    })

    if (rpcErr) {
      console.error("Booking RPC failed:", rpcErr.message)
      return { ok: false, error: rpcErr.message }
    }

    if (!rpcResult?.ok) {
      const next = await findNextSlot({ userId, date: bookingDate, serviceName: service, services })
      return { ok: false, slotFull: true, message: next ? "That slot just got booked 😅 Next available: *" + next + "*\n\nShall I book that? ✅" : "That slot just filled up 😅 Could you suggest another time?" }
    }

    const data = rpcResult

    try {
      const { count } = await supabaseAdmin.from("bookings")
        .select("id", { count: "exact" })
        .eq("customer_phone", customerPhone).eq("user_id", userId)
        .in("status", ["confirmed","completed"])
      const tag = count >= 5 ? "vip" : count >= 2 ? "returning" : "new_lead"
      await supabaseAdmin.from("customers")
        .update({ tag, last_visit_at: new Date().toISOString() })
        .eq("phone", customerPhone).eq("user_id", userId)
    } catch(e) { console.warn("Customer tag update failed:", e.message) }

    if (customerId) {
      try {
        await supabaseAdmin.from("leads")
          .update({ status: "converted", last_message_at: new Date().toISOString() })
          .eq("customer_id", customerId).eq("user_id", userId).eq("status", "open")
          .limit(1)
      } catch(e) { console.warn("Lead conversion failed:", e.message) }
    }

    let confirmMsg
    if (isFood) {
      const addr = deliveryAddress || state.delivery_address || null
      confirmMsg = buildFoodConfirmMsg(matched?.name || service, addr, matched?.price || 0, bizName || "us", language || "English")
    } else {
      confirmMsg = buildConfirmMsg(matched?.name || service, bookingDate, time, bizName || "us", isTimeBased(matched), language || "English")
    }

    return { ok: true, booking: data, confirmMsg }
  }

  // Non-time-based bookings (food orders, etc.) — no race condition risk
  const { data, error } = await supabaseAdmin.from("bookings").insert({
    user_id:          userId,
    customer_name:    customerName,
    customer_phone:   customerPhone,
    customer_id:      customerId || null,
    service:          matched?.name || service || "Order",
    booking_date:     bookingDate,
    booking_time:     time || null,
    amount:           matched?.price || 0,
    status:           "confirmed",
    ai_booked:        true,
    created_at:       new Date().toISOString()
  }).select().single()

  if (error) {
    console.error("Booking insert failed:", error.message)
    return { ok: false, error: error.message }
  }

  try {
    const { count } = await supabaseAdmin.from("bookings")
      .select("id", { count: "exact" })
      .eq("customer_phone", customerPhone).eq("user_id", userId)
      .in("status", ["confirmed","completed"])
    const tag = count >= 5 ? "vip" : count >= 2 ? "returning" : "new_lead"
    await supabaseAdmin.from("customers")
      .update({ tag, last_visit_at: new Date().toISOString() })
      .eq("phone", customerPhone).eq("user_id", userId)
  } catch(e) { console.warn("Customer tag update failed:", e.message) }

  if (customerId) {
    try {
      await supabaseAdmin.from("leads")
        .update({ status: "converted", last_message_at: new Date().toISOString() })
        .eq("customer_id", customerId).eq("user_id", userId).eq("status", "open")
        .limit(1)
    } catch(e) { console.warn("Lead conversion failed:", e.message) }
  }

  let confirmMsg
  if (isFood) {
    const addr = deliveryAddress || state.delivery_address || null
    confirmMsg = buildFoodConfirmMsg(matched?.name || service, addr, matched?.price || 0, bizName || "us", language || "English")
  } else {
    confirmMsg = buildConfirmMsg(matched?.name || service, bookingDate, time, bizName || "us", isTimeBased(matched), language || "English")
  }

  return { ok: true, booking: data, confirmMsg }
}

async function rescheduleBooking({ userId, customerPhone, date, time, services, serviceName, language }) {
  if (date && !isValidDate(date)) return { ok: false, message: "That doesn't seem like a valid date 😅 Could you give me the date again?" }
  if (date && isPastDate(date))   return { ok: false, message: "That date has already passed 😅 Could you pick a future date?" }

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

  let existing = null
  if (serviceName) {
    const { data: byService } = await supabaseAdmin.from("bookings").select("*")
      .eq("customer_phone", customerPhone).eq("user_id", userId)
      .ilike("service", "%" + serviceName + "%")
      .in("status", ["confirmed","pending"])
      .gte("booking_date", todayStr)
      .order("booking_date", { ascending: true })
      .limit(1).maybeSingle()
    existing = byService
  }

  if (!existing) {
    const { data: fallback } = await supabaseAdmin.from("bookings").select("*")
      .eq("customer_phone", customerPhone).eq("user_id", userId)
      .in("status", ["confirmed","pending"])
      .gte("booking_date", todayStr)
      .order("booking_date", { ascending: true })
      .limit(1).maybeSingle()
    existing = fallback
  }

  if (!existing) {
    return { ok: false, notFound: true, message: "I couldn't find an upcoming booking for you. Would you like to make a new booking? 😊" }
  }

  const free = await isSlotAvailable({
    userId, date, time,
    serviceName: existing.service, services,
    excludeBookingId: existing.id
  })
  if (!free) {
    const next = await findNextSlot({ userId, date, serviceName: existing.service, services })
    return { ok: false, slotFull: true, message: next ? "That slot is taken 😅 Next available: *" + next + "*\n\nShall I reschedule to that? ✅" : "That slot is fully booked 😅 Please suggest another time?" }
  }

  const { data: updated, error } = await supabaseAdmin.from("bookings")
    .update({ booking_date: date, booking_time: time, status: "confirmed" })
    .eq("id", existing.id).eq("user_id", userId)
    .select().single()

  if (error) {
    console.error("Reschedule update failed:", error.message)
    return { ok: false, message: "Sorry, had trouble rescheduling 😅 Please try again." }
  }

  return {
    ok: true,
    message: buildRescheduleMsg(existing.service, date, time, language || "English")
  }
}

module.exports = { createBooking, rescheduleBooking }
