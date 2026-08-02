// app/api/test-ai/route.js
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const [{ data: biz }, { data: kn }, { data: svcs }] = await Promise.all([
      supabase.from("business_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("business_knowledge").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("services").select("name,price,duration,description,service_type,is_active").eq("user_id", userId),
    ])

    const services = (svcs || []).filter(s => s.is_active !== false)
    const bizName  = biz?.business_name || "this business"
    const aiInstr  = [biz?.ai_instructions, kn?.content, kn?.knowledge].filter(Boolean).join("\n\n") || ""
    const activeOffer = biz?.active_offer || ""

    const svcBlock = services.map(s =>
      "• " + s.name + ": ₹" + s.price +
      (s.duration ? " (" + s.duration + " min)" : "") +
      (s.description ? " — " + s.description : "")
    ).join("\n")

    const systemPrompt = `You are the WhatsApp AI receptionist for *${bizName}*.
Reply ONLY with the final WhatsApp message. Be warm, human, concise (2-3 lines max).
${svcBlock ? "\nSERVICES:\n" + svcBlock : ""}
${biz?.working_hours ? "\nHOURS: " + biz.working_hours : ""}
${biz?.location ? "\nADDRESS: " + biz.location : ""}
${activeOffer ? "\nACTIVE OFFER: " + activeOffer : ""}
${aiInstr ? "\nOWNER INSTRUCTIONS:\n" + aiInstr : ""}
This is a TEST — reply naturally as if a real customer sent this message.
Do not include any JSON, thinking tags, or meta-commentary. Just the reply.`

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "⚠️ GEMINI_API_KEY not configured." })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\nCustomer: " + message }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
        })
      }
    )

    const data = await res.json()
    if (data?.error) {
      console.error("Gemini test-ai error:", data.error.message)
      return NextResponse.json({ error: "AI error: " + data.error.message }, { status: 500 })
    }

    let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    // Strip any think tags if present
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    if (reply.includes("<think>")) reply = reply.split("<think>")[0].trim()

    return NextResponse.json({ reply: reply || "No reply generated" })
  } catch(e) {
    console.error("test-ai error:", e.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
