// app/api/cron/appointment-reminders/route.js
// FIX: Removed setCampaignContext call after sending reminders
// Setting campaign_sent_at on reminder sends was causing reminder CONFIRM
// button taps to be treated as campaign replies → duplicate bookings

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendAndSave } from "@/lib/messaging/wa-send"
import { decrypt } from "@/lib/encryption"
import { verifyCronAuth } from "@/lib/cron-auth"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function formatTime(timeStr) {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const display = (h % 12 || 12) + (m > 0 ? ":" + String(m).padStart(2, "0") : "")
  return display + " " + period
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
      timeZone: "Asia/Kolkata"
    })
  } catch(e) { return dateStr }
}

function getISTDateString(utcDate, offsetDays = 0) {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istMs = utcDate.getTime() + istOffsetMs + (offsetDays * 24 * 60 * 60 * 1000)
  const istDate = new Date(istMs)
  const y = istDate.getUTCFullYear()
  const m = String(istDate.getUTCMonth() + 1).padStart(2, "0")
  const d = String(istDate.getUTCDate()).padStart(2, "0")
  return y + "-" + m + "-" + d
}

function getISTHour(utcDate) {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istMs = utcDate.getTime() + istOffsetMs
  return new Date(istMs).getUTCHours()
}

function getISTTimeString(utcDate, offsetMs = 0) {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istMs = utcDate.getTime() + istOffsetMs + offsetMs
  const d = new Date(istMs)
  return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0")
}

// Sends via the shared wa-send module so the reminder is also saved to the
// messages table and appears in the conversation inbox.
async function sendWhatsApp(accessToken, phoneNumberId, to, message, userId) {
  const phone = (to || "").replace(/[^0-9]/g, "")
  if (phone.length < 10) return false
  const result = await sendAndSave({
    phoneNumberId, accessToken, to: phone, message,
    userId, conversationId: null, isAI: false
  })
  return result.ok
}

function buildReminderMessage(name, service, dateStr, timeStr, bizName, type) {
  const displayDate = formatDate(dateStr)
  const displayTime = formatTime(timeStr)

  if (type === "2hrs") {
    return [
      "Hi " + name + "! 👋",
      "",
      "Your appointment is in 2 hours:",
      "",
      "Service: " + service,
      displayTime ? "Time: " + displayTime : "",
      "At: " + (bizName || "our salon"),
      "",
      "See you soon! If you need to reschedule, just reply here. 😊"
    ].filter(Boolean).join("\n")
  }

  return [
    "Hi " + name + "! 👋",
    "",
    "Reminder — you have an appointment tomorrow:",
    "",
    "Service: " + service,
    displayDate ? "Date: " + displayDate : "",
    displayTime ? "Time: " + displayTime : "",
    "At: " + (bizName || "our salon"),
    "",
    "See you tomorrow! If you need to reschedule or cancel, just reply here. 😊"
  ].filter(Boolean).join("\n")
}

export async function GET(req) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const nowUTC = new Date()

    const currentHourIST  = getISTHour(nowUTC)
    const todayStr        = getISTDateString(nowUTC, 0)
    const tomorrowStr     = getISTDateString(nowUTC, 1)
    const windowStartTime = getISTTimeString(nowUTC, 90  * 60 * 1000)
    const windowEndTime   = getISTTimeString(nowUTC, 150 * 60 * 1000)

    console.log("⏰ Cron running — IST hour:", currentHourIST, "today:", todayStr, "tomorrow:", tomorrowStr)

    const { data: businesses } = await supabaseAdmin
      .from("business_settings")
      .select("user_id, business_name, reminders_enabled, plan, plan_expires_at")
      .eq("reminders_enabled", true)
      .in("plan", ["growth", "pro"])

    if (!businesses?.length) {
      console.log("No businesses with reminders enabled")
      return NextResponse.json({ status: "no businesses with reminders enabled" })
    }

    console.log("✅ Found", businesses.length, "businesses with reminders enabled")

    let totalSent = 0, totalSkipped = 0

    for (const biz of businesses) {
      if (biz.plan_expires_at && new Date(biz.plan_expires_at) < nowUTC) {
        console.log("⚠️ Skipping expired plan:", biz.business_name)
        continue
      }

      const { data: conn } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("access_token, phone_number_id")
        .eq("user_id", biz.user_id)
        .single()

      if (!conn) {
        console.log("⚠️ No WhatsApp connection for:", biz.business_name)
        continue
      }

      console.log("Processing business:", biz.business_name, "user:", biz.user_id)

      // ── 24HR REMINDERS ─────────────────────────────────────────
      if (currentHourIST >= 7 && currentHourIST <= 9) {
        console.log("🔔 Checking 24hr reminders for tomorrow:", tomorrowStr)

        const { data: bookings24, error: err24 } = await supabaseAdmin
          .from("bookings")
          .select("id, customer_name, customer_phone, service, booking_date, booking_time, reminder_preference")
          .eq("user_id", biz.user_id)
          .eq("booking_date", tomorrowStr)
          .eq("status", "confirmed")
          .eq("reminder_sent", false)

        if (err24) console.error("❌ bookings24 query error:", err24.message)
        console.log("📋 bookings24 found:", bookings24?.length || 0)

        for (const booking of (bookings24 || [])) {
          const pref = booking.reminder_preference || "24hrs"
          if (pref !== "24hrs") {
            console.log("⏭️ Skipping non-24hr preference:", pref)
            continue
          }
          if (!booking.customer_phone) { totalSkipped++; continue }

          const name    = (booking.customer_name || "there").split(" ")[0]
          const message = buildReminderMessage(
            name, booking.service,
            booking.booking_date, booking.booking_time,
            biz.business_name, "24hrs"
          )

          console.log("📤 Sending 24hr reminder to:", booking.customer_phone, "for:", booking.service)
          const sent = await sendWhatsApp(decrypt(conn.access_token), conn.phone_number_id, booking.customer_phone, message, biz.user_id)

          if (sent) {
            await supabaseAdmin.from("bookings")
              .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
              .eq("id", booking.id)

            // FIX: Do NOT set campaign_sent_at on conversations for reminders
            // Previously this was calling setCampaignContext() here which caused
            // reminder CONFIRM taps to be treated as campaign replies
            // → creating duplicate bookings from old booking data
            // Reminders are NOT campaigns — do not pollute campaign context

            totalSent++
            console.log("✅ Reminder sent to:", booking.customer_phone)
          } else {
            totalSkipped++
            console.log("❌ Reminder failed for:", booking.customer_phone)
          }
        }
      } else {
        console.log("⏭️ Outside 24hr window, hourIST:", currentHourIST)
      }

      // ── 2HR REMINDERS ──────────────────────────────────────────
      console.log("🔔 Checking 2hr reminders, window:", windowStartTime, "to", windowEndTime)

      const { data: bookings2hr, error: err2hr } = await supabaseAdmin
        .from("bookings")
        .select("id, customer_name, customer_phone, service, booking_date, booking_time, reminder_preference")
        .eq("user_id", biz.user_id)
        .eq("booking_date", todayStr)
        .eq("status", "confirmed")
        .eq("reminder_sent", false)
        .eq("reminder_preference", "2hrs")
        .gte("booking_time", windowStartTime)
        .lte("booking_time", windowEndTime)

      if (err2hr) console.error("❌ bookings2hr query error:", err2hr.message)
      console.log("📋 bookings2hr found:", bookings2hr?.length || 0)

      for (const booking of (bookings2hr || [])) {
        if (!booking.customer_phone) { totalSkipped++; continue }

        const name    = (booking.customer_name || "there").split(" ")[0]
        const message = buildReminderMessage(
          name, booking.service,
          booking.booking_date, booking.booking_time,
          biz.business_name, "2hrs"
        )

        const sent = await sendWhatsApp(decrypt(conn.access_token), conn.phone_number_id, booking.customer_phone, message, biz.user_id)
        if (sent) {
          await supabaseAdmin.from("bookings")
            .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
            .eq("id", booking.id)

          // FIX: Do NOT set campaign_sent_at for reminders
          // Same reason as above — reminders are not campaigns

          totalSent++
        } else {
          totalSkipped++
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      sent: totalSent,
      skipped: totalSkipped,
      checkedAt: nowUTC.toISOString(),
      hourIST: currentHourIST,
      todayStr,
      tomorrowStr,
      windows: {
        "24hr_active": currentHourIST >= 7 && currentHourIST <= 9,
        "2hr_window": windowStartTime + " to " + windowEndTime
      }
    })

  } catch(e) {
    console.error("❌ Reminders cron failed:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
