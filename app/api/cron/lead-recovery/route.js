// app/api/cron/lead-recovery/route.js — v2 TEMPLATE-BASED (works outside 24hr window)
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { enrollLead } from "@/lib/sequences/sequence-engine"
import { verifyCronAuth } from "@/lib/cron-auth"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Cutoffs are compared against last_message_at, which is stored as true
    // UTC (toISOString). The old nowIST() shifted the epoch by +5:30, which
    // moved the whole 24–72h window 5.5 hours off.
    const now         = new Date()
    const cutoffStart = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()
    const cutoffEnd   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Get businesses on growth/pro plan with lead_recovery_enabled
    const { data: businesses } = await supabaseAdmin
      .from("business_settings")
      .select("user_id, business_name, plan, plan_expires_at, lead_recovery_enabled")
      .in("plan", ["growth", "pro"])
      .eq("lead_recovery_enabled", true)

    if (!businesses?.length) {
      return NextResponse.json({ status: "no eligible businesses" })
    }

    let totalEnrolled = 0, totalSkipped = 0

    for (const biz of businesses) {
      if (biz.plan_expires_at && new Date(biz.plan_expires_at) < new Date()) continue

      // Find the default recovery sequence for this business
      // Business must have created a sequence with trigger = 'lead_recovery'
      const { data: seq } = await supabaseAdmin
        .from("sequences")
        .select("id")
        .eq("user_id", biz.user_id)
        .eq("trigger", "lead_recovery")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (!seq) {
        // No sequence set up yet — skip this business
        console.log("⚠️ No lead_recovery sequence for:", biz.business_name)
        totalSkipped++
        continue
      }

      // Find open leads in time window, not yet recovered
      const { data: leads } = await supabaseAdmin
        .from("leads")
        .select("id, name, phone, status, recovery_sent")
        .eq("user_id", biz.user_id)
        .eq("status", "open")
        .eq("recovery_sent", false)
        .gte("last_message_at", cutoffStart)
        .lte("last_message_at", cutoffEnd)

      if (!leads?.length) continue

      // Skip leads that have already booked
      const phones = leads.map(l => l.phone).filter(Boolean)
      const { data: booked } = await supabaseAdmin
        .from("bookings")
        .select("customer_phone")
        .eq("user_id", biz.user_id)
        .in("customer_phone", phones)
        .in("status", ["confirmed", "pending", "completed"])

      const bookedPhones = new Set((booked || []).map(b => b.customer_phone))

      for (const lead of leads) {
        if (!lead.phone) { totalSkipped++; continue }

        if (bookedPhones.has(lead.phone)) {
          await supabaseAdmin.from("leads")
            .update({ recovery_sent: true, status: "converted" })
            .eq("id", lead.id)
          totalSkipped++
          continue
        }

        // Enroll into sequence — sequence engine handles the actual sending
        const result = await enrollLead({
          userId:     biz.user_id,
          sequenceId: seq.id,
          leadPhone:  lead.phone,
          leadName:   lead.name || "Customer"
        })

        if (result.ok) {
          await supabaseAdmin.from("leads")
            .update({
              recovery_sent:    true,
              recovery_sent_at: new Date().toISOString(),
              status:           "contacted"
            })
            .eq("id", lead.id)
          totalEnrolled++
          console.log("✅ Lead enrolled in sequence:", lead.phone)
        } else {
          console.warn("⚠️ Enroll failed:", lead.phone, result.reason || result.error)
          totalSkipped++
        }
      }
    }

    return NextResponse.json({
      status:   "ok",
      enrolled: totalEnrolled,
      skipped:  totalSkipped,
      ranAt:    now.toISOString()
    })

  } catch (e) {
    console.error("❌ Lead recovery cron failed:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
