// lib/sequences/sequence-engine.js
// Drip sequence engine — Meta-template-only, works outside 24hr window

const { createClient } = require("@supabase/supabase-js")
const { decrypt } = require("@/lib/encryption")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function toPhone(p) {
  const d = (p || "").replace(/[^0-9]/g, "")
  if (d.length === 10) return "91" + d
  if (d.length === 12 && d.startsWith("91")) return d
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1)
  return d
}

function dedupe(p) {
  const d = (p || "").replace(/[^0-9]/g, "")
  return d.length >= 12 ? d.slice(-10) : d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function sendTemplate({ accessToken, phoneNumberId, to, templateName, language, components }) {
  const phone = toPhone(to)
  if (phone.length < 10) return { ok: false, error: "invalid phone" }

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name:     templateName,
      language: { code: language || "en" },
    }
  }

  if (components?.length) {
    payload.template.components = components
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method:  "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type":  "application/json"
        },
        body: JSON.stringify(payload)
      }
    )
    const data = await res.json()
    if (data.error) {
      console.error("❌ Template send error:", data.error.message, "to:", phone)
      return { ok: false, error: data.error.message }
    }
    const waId = data?.messages?.[0]?.id
    console.log("✅ Template sent:", templateName, "to:", phone, "waId:", waId)
    return { ok: true, waId }
  } catch (e) {
    console.error("❌ Template send exception:", e.message)
    return { ok: false, error: e.message }
  }
}

function buildComponents(step, leadName) {
  const firstName = (leadName || "there").split(" ")[0]
  const vars      = step.vars || {}
  const allKeys   = Object.keys(vars).sort()
  const bodyParams = []

  if (step.has_name_var !== false) {
    bodyParams.push({ type: "text", text: firstName })
  }

  for (const key of allKeys) {
    if (key !== "var_1") {
      bodyParams.push({ type: "text", text: String(vars[key] || "") })
    }
  }

  if (!bodyParams.length) return []
  return [{ type: "body", parameters: bodyParams }]
}

async function enrollLead({ userId, sequenceId, leadPhone, leadName }) {
  try {
    const phone = dedupe(leadPhone)

    const { data: existing } = await supabaseAdmin
      .from("sequence_enrollments")
      .select("id, status")
      .eq("sequence_id", sequenceId)
      .eq("lead_phone", phone)
      .maybeSingle()

    if (existing?.status === "active") {
      return { ok: false, reason: "already_enrolled" }
    }

    const { data: seq } = await supabaseAdmin
      .from("sequences")
      .select("steps, status")
      .eq("id", sequenceId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!seq || seq.status !== "active") {
      return { ok: false, reason: "sequence_not_found_or_paused" }
    }

    const steps = seq.steps || []
    if (!steps.length) return { ok: false, reason: "no_steps" }

    const firstStep   = steps[0]
    // next_send_at is compared against new Date().toISOString() (true UTC)
    // in processDueEnrollments — the base date must be true UTC too, or
    // every send lands 5.5 hours late.
    const firstSendAt = addDays(new Date(), firstStep.day || 0)

    const { data: enrollment, error } = await supabaseAdmin
      .from("sequence_enrollments")
      .upsert({
        user_id:      userId,
        sequence_id:  sequenceId,
        lead_phone:   phone,
        lead_name:    leadName || "Customer",
        current_step: 0,
        enrolled_at:  new Date().toISOString(),
        next_send_at: firstSendAt.toISOString(),
        status:       "active"
      }, { onConflict: "sequence_id,lead_phone" })
      .select("id")
      .single()

    if (error) {
      console.error("❌ Enroll error:", error.message)
      return { ok: false, error: error.message }
    }

    // Increment enrolled_count via read-then-write (supabase-js has no raw()).
    // Non-critical: a lost increment under concurrency is acceptable here.
    try {
      const { data: seqRow } = await supabaseAdmin
        .from("sequences")
        .select("enrolled_count")
        .eq("id", sequenceId)
        .maybeSingle()
      await supabaseAdmin
        .from("sequences")
        .update({ enrolled_count: (seqRow?.enrolled_count || 0) + 1 })
        .eq("id", sequenceId)
    } catch (e) { /* enrolled_count column may not exist — skip */ }

    console.log("✅ Enrolled:", phone, "in sequence:", sequenceId)
    return { ok: true, enrollmentId: enrollment.id }
  } catch (e) {
    console.error("❌ enrollLead threw:", e.message)
    return { ok: false, error: e.message }
  }
}

async function stopEnrollment({ leadPhone, userId, reason = "manual" }) {
  try {
    const phone = dedupe(leadPhone)
    await supabaseAdmin
      .from("sequence_enrollments")
      .update({
        status:         "stopped",
        stopped_reason: reason,
        updated_at:     new Date().toISOString()
      })
      .eq("lead_phone", phone)
      .eq("user_id", userId)
      .eq("status", "active")

    console.log("🛑 Stopped enrollment for:", phone, "reason:", reason)
    return { ok: true }
  } catch (e) {
    console.error("❌ stopEnrollment threw:", e.message)
    return { ok: false, error: e.message }
  }
}

async function processDueEnrollments() {
  const now     = new Date().toISOString()
  let totalSent = 0, totalSkipped = 0, totalCompleted = 0

  try {
    // FIX: Return early cleanly if no active sequences exist at all
    const { data: activeSeqs } = await supabaseAdmin
      .from("sequences")
      .select("id")
      .eq("status", "active")
      .limit(1)

    if (!activeSeqs?.length) {
      console.log("ℹ️ No active sequences — skipping")
      return { ok: true, sent: 0, skipped: 0, completed: 0 }
    }

    const { data: dueEnrollments } = await supabaseAdmin
      .from("sequence_enrollments")
      .select("*")
      .eq("status", "active")
      .lte("next_send_at", now)
      .order("next_send_at", { ascending: true })
      .limit(50)

    if (!dueEnrollments?.length) {
      console.log("ℹ️ No due enrollments")
      return { ok: true, sent: 0, skipped: 0, completed: 0 }
    }

    console.log(`📋 Processing ${dueEnrollments.length} due enrollments`)

    const userIds = [...new Set(dueEnrollments.map(e => e.user_id))]

    const [{ data: connections }, { data: sequences }] = await Promise.all([
      supabaseAdmin.from("whatsapp_connections")
        .select("user_id, access_token, phone_number_id")
        .in("user_id", userIds),
      supabaseAdmin.from("sequences")
        .select("id, steps, status")
        .in("id", [...new Set(dueEnrollments.map(e => e.sequence_id))])
    ])

    const connMap = Object.fromEntries((connections || []).map(c => [c.user_id, c]))
    const seqMap  = Object.fromEntries((sequences  || []).map(s => [s.id, s]))

    for (const enrollment of dueEnrollments) {
      try {
        const conn = connMap[enrollment.user_id]
        const seq  = seqMap[enrollment.sequence_id]

        if (!conn || !seq || seq.status !== "active") {
          totalSkipped++
          continue
        }

        const steps       = seq.steps || []
        const stepIndex   = enrollment.current_step
        const currentStep = steps[stepIndex]

        if (!currentStep) {
          await supabaseAdmin
            .from("sequence_enrollments")
            .update({ status: "completed", updated_at: now })
            .eq("id", enrollment.id)
          totalCompleted++
          continue
        }

        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("user_id", enrollment.user_id)
          .eq("customer_phone", enrollment.lead_phone)
          .in("status", ["confirmed", "pending", "completed"])
          .limit(1)
          .maybeSingle()

        if (booking) {
          await supabaseAdmin
            .from("sequence_enrollments")
            .update({ status: "stopped", stopped_reason: "booked", updated_at: now })
            .eq("id", enrollment.id)
          totalSkipped++
          console.log("⏭ Skipped (booked):", enrollment.lead_phone)
          continue
        }

        const components = buildComponents(currentStep, enrollment.lead_name)
        const result = await sendTemplate({
          accessToken:   decrypt(conn.access_token),
          phoneNumberId: conn.phone_number_id,
          to:            enrollment.lead_phone,
          templateName:  currentStep.template_name,
          language:      currentStep.language || "en",
          components
        })

        if (result.ok) {
          const nextStepIndex = stepIndex + 1
          const nextStep      = steps[nextStepIndex]

          if (nextStep) {
            const dayGap     = nextStep.day - currentStep.day
            const nextSendAt = addDays(new Date(), dayGap > 0 ? dayGap : 1)

            await supabaseAdmin
              .from("sequence_enrollments")
              .update({
                current_step: nextStepIndex,
                last_sent_at: now,
                next_send_at: nextSendAt.toISOString(),
                updated_at:   now
              })
              .eq("id", enrollment.id)
          } else {
            await supabaseAdmin
              .from("sequence_enrollments")
              .update({
                status:       "completed",
                last_sent_at: now,
                updated_at:   now
              })
              .eq("id", enrollment.id)
            totalCompleted++
          }

          try {
            const { data: convo } = await supabaseAdmin
              .from("conversations")
              .select("id")
              .eq("user_id", enrollment.user_id)
              .eq("phone", enrollment.lead_phone)
              .maybeSingle()

            await supabaseAdmin.from("messages").insert({
              user_id:          enrollment.user_id,
              customer_phone:   enrollment.lead_phone,
              conversation_id:  convo?.id || null,
              direction:        "outbound",
              message_type:     "template",
              message_text:     "[Sequence: " + (currentStep.label || currentStep.template_name) + "]",
              status:           "sent",
              is_ai:            false,
              created_at:       now
            })

            if (convo?.id) {
              await supabaseAdmin.from("conversations").update({
                campaign_sent_at: now,
                campaign_message: "Sequence step: " + (currentStep.label || currentStep.template_name),
                state_json: null
              }).eq("id", convo.id)
            }
          } catch (e) { /* non-critical */ }

          totalSent++
        } else {
          totalSkipped++
        }

        // Throttle Meta API calls. Batch is capped at 50, so worst case
        // ~50 × 250ms = 12.5s of delay — safely inside Vercel's 60s limit.
        await new Promise(r => setTimeout(r, 250))

      } catch (enrollErr) {
        console.error("❌ Error processing enrollment:", enrollment.id, enrollErr.message)
        totalSkipped++
      }
    }

    return { ok: true, sent: totalSent, skipped: totalSkipped, completed: totalCompleted }
  } catch (e) {
    console.error("❌ processDueEnrollments failed:", e.message)
    return { ok: false, error: e.message }
  }
}

module.exports = { enrollLead, stopEnrollment, processDueEnrollments, sendTemplate }
