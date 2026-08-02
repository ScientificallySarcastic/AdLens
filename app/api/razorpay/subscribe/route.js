// app/api/razorpay/subscribe/route.js
const { NextResponse } = require("next/server")
const { createClient } = require("@supabase/supabase-js")
const Razorpay = require("razorpay")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_MAP = {
  starter: process.env.RAZORPAY_PLAN_STARTER,
  growth:  process.env.RAZORPAY_PLAN_GROWTH,
  pro:     process.env.RAZORPAY_PLAN_PRO,
}

async function POST(req) {
  try {
    // Auth check — derive userId from JWT, never trust request body
    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = user.id
    const userEmail = user.email

    const { plan, userName } = await req.json()
    if (!plan) return NextResponse.json({ error: "Missing plan" }, { status: 400 })

    const planId = PLAN_MAP[plan]
    if (!planId) return NextResponse.json({ error: "Invalid plan: " + plan }, { status: 400 })

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    let razorpayCustomerId = null
    const { data: biz } = await supabaseAdmin
      .from("business_settings")
      .select("razorpay_customer_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (biz?.razorpay_customer_id) {
      razorpayCustomerId = biz.razorpay_customer_id
    } else {
      const customer = await razorpay.customers.create({
        name:  userName  || "Fastrill User",
        email: userEmail || "",
        notes: { user_id: userId }
      })
      razorpayCustomerId = customer.id
      await supabaseAdmin.from("business_settings")
        .update({ razorpay_customer_id: razorpayCustomerId })
        .eq("user_id", userId)
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id:         planId,
      customer_notify: 1,
      quantity:        1,
      total_count:     12,
      notes: { user_id: userId, plan, user_email: userEmail || "" }
    })

    await supabaseAdmin.from("business_settings")
      .update({ razorpay_subscription_id: subscription.id })
      .eq("user_id", userId)

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan
    })
  } catch(e) {
    console.error("Subscribe API error:", e.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

module.exports = { POST }
