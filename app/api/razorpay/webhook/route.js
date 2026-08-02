// app/api/razorpay/webhook/route.js
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_FEATURES = {
  starter: {
    plan:                  "starter",
    reminders_enabled:     false,
    lead_recovery_enabled: false,
    campaigns_enabled:     false,
  },
  growth: {
    plan:                  "growth",
    reminders_enabled:     true,
    lead_recovery_enabled: true,
    campaigns_enabled:     false,
  },
  pro: {
    plan:                  "pro",
    reminders_enabled:     true,
    lead_recovery_enabled: true,
    campaigns_enabled:     true,
  },
}

function verifySignature(body, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set — cannot verify webhook")
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")
  if (!signature || expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

function getPlanFromId(planId) {
  if (planId === process.env.RAZORPAY_PLAN_STARTER) return "starter"
  if (planId === process.env.RAZORPAY_PLAN_GROWTH)  return "growth"
  if (planId === process.env.RAZORPAY_PLAN_PRO)     return "pro"
  return null
}

export async function POST(req) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature")

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const eventType = event.event
    const payload   = event.payload?.subscription?.entity

    if (!payload) return NextResponse.json({ status: "no_payload" })

    const subscriptionId = payload.id
    const notes          = payload.notes || {}
    const userId         = notes.user_id
    const planId         = payload.plan_id

    if (!userId) return NextResponse.json({ status: "no_user_id" })

    if (eventType === "subscription.activated" || eventType === "subscription.charged") {
      const planName = notes.plan || getPlanFromId(planId)
      if (!planName) return NextResponse.json({ status: "unknown_plan" })

      const features = PLAN_FEATURES[planName]
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 33)

      await supabaseAdmin.from("business_settings")
        .update({
          ...features,
          plan_expires_at: expiry.toISOString(),
          razorpay_subscription_id: subscriptionId,
        })
        .eq("user_id", userId)

      await supabaseAdmin.from("ai_event_log").insert({
        user_id:    userId,
        stage:      "plan_" + eventType,
        input_json: { plan: planName, subscription_id: subscriptionId, event: eventType },
        success:    true,
        created_at: new Date().toISOString()
      }).catch(() => {})
    }

    if (eventType === "subscription.cancelled") {
      await supabaseAdmin.from("business_settings")
        .update({ razorpay_subscription_id: null })
        .eq("user_id", userId)
    }

    if (eventType === "subscription.halted") {
      await supabaseAdmin.from("business_settings")
        .update({
          plan:                    "trial",
          reminders_enabled:       false,
          lead_recovery_enabled:   false,
          campaigns_enabled:       false,
          razorpay_subscription_id: null,
        })
        .eq("user_id", userId)
    }

    return NextResponse.json({ status: "ok", event: eventType })

  } catch(e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
