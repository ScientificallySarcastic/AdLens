#!/usr/bin/env node
// scripts/diagnose-whatsapp.js
// Answers ONE question: why are customers not receiving WhatsApp messages?
//
// Usage (from repo root, needs .env.local or env vars set):
//   node scripts/diagnose-whatsapp.js
//   node scripts/diagnose-whatsapp.js --send 9179XXXXXXXX   # also fire a real test message
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_ENCRYPTION_KEY

const fs = require("fs")
const path = require("path")

// Minimal .env loader so the script works without extra dependencies.
for (const file of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

const { createClient } = require("@supabase/supabase-js")
const { decrypt } = require("../lib/encryption")

const GRAPH = "https://graph.facebook.com/v18.0"

function fail(msg) { console.error("\n❌ " + msg); process.exit(1) }
function section(title) { console.log("\n" + "─".repeat(60) + "\n" + title + "\n" + "─".repeat(60)) }

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")
  if (!process.env.TOKEN_ENCRYPTION_KEY) fail("TOKEN_ENCRYPTION_KEY not set — cannot decrypt stored tokens")

  const sendTo = (() => {
    const i = process.argv.indexOf("--send")
    return i > -1 ? (process.argv[i + 1] || "").replace(/[^0-9]/g, "") : null
  })()

  const supabase = createClient(url, key)

  const { data: connections, error } = await supabase
    .from("whatsapp_connections")
    .select("user_id, phone_number_id, access_token")
  if (error) fail("Could not read whatsapp_connections: " + error.message)
  if (!connections?.length) fail("No rows in whatsapp_connections — WhatsApp was never connected.")

  for (const conn of connections) {
    section("Connection for user " + conn.user_id + " (phone_number_id " + conn.phone_number_id + ")")

    // 1. Can the stored token be decrypted?
    let token
    try {
      token = decrypt(conn.access_token)
      console.log("✅ Stored token decrypts OK (" + (conn.access_token.startsWith("enc:") ? "enc:v1" : conn.access_token.includes(":") ? "legacy-encrypted" : "plaintext") + " format)")
    } catch (e) {
      console.error("❌ TOKEN CANNOT BE DECRYPTED: " + e.message)
      console.error("   → Every send for this user fails. TOKEN_ENCRYPTION_KEY probably changed")
      console.error("     since the token was stored. FIX: reconnect WhatsApp in Settings.")
      continue
    }

    // 2. Is the token still valid with Meta?
    const meRes = await fetch(GRAPH + "/me", { headers: { Authorization: "Bearer " + token } })
    const me = await meRes.json()
    if (me.error) {
      console.error("❌ TOKEN REJECTED BY META: [" + me.error.code + "] " + me.error.message)
      if (me.error.code === 190) {
        console.error("   → The access token is EXPIRED or was invalidated. This is the classic")
        console.error("     cause of 'dashboard shows sent, customer receives nothing'.")
        console.error("     FIX: reconnect WhatsApp in Dashboard → Settings.")
      }
      continue
    }
    console.log("✅ Token is valid with Meta (id: " + me.id + ")")

    // 3. Is the business phone number healthy?
    const numRes = await fetch(
      GRAPH + "/" + conn.phone_number_id + "?fields=display_phone_number,verified_name,quality_rating,code_verification_status",
      { headers: { Authorization: "Bearer " + token } }
    )
    const num = await numRes.json()
    if (num.error) {
      console.error("❌ Cannot read phone number: [" + num.error.code + "] " + num.error.message)
      console.error("   → Token may lack whatsapp_business_messaging permission, or the number")
      console.error("     was removed from the WABA. FIX: reconnect WhatsApp in Settings.")
      continue
    }
    console.log("✅ Number " + num.display_phone_number + " (" + num.verified_name + ") — quality: " + (num.quality_rating || "n/a"))
    if (["RED", "YELLOW"].includes(num.quality_rating)) {
      console.warn("⚠️ Quality rating is " + num.quality_rating + " — Meta throttles or blocks delivery for low-quality numbers.")
    }

    // 4. What does the DB say happened to recent outbound messages?
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const counts = {}
    for (const status of ["sent", "delivered", "read", "failed"]) {
      const { count } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .eq("user_id", conn.user_id).eq("direction", "outbound")
        .eq("status", status).gte("created_at", since)
      counts[status] = count || 0
    }
    console.log("📊 Outbound messages, last 7 days:", JSON.stringify(counts))
    if (counts.sent > 0 && counts.delivered + counts.read === 0) {
      console.warn("⚠️ Messages are stuck at 'sent' — Meta accepted them but NEVER confirmed delivery.")
      console.warn("   Meta reports the reason via the statuses webhook: check server logs for")
      console.warn("   '📵 WA delivery FAILED' lines. Common causes: expired token quality,")
      console.warn("   WABA missing a payment method, or the app stuck in Development Mode")
      console.warn("   (Dev Mode can only message numbers added as test recipients).")
    }

    // 5. Optional live test send.
    if (sendTo) {
      console.log("\n🚀 Sending live test message to " + sendTo + " ...")
      const sendRes = await fetch(GRAPH + "/" + conn.phone_number_id + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: sendTo, type: "text",
          text: { body: "Fastrill delivery test " + new Date().toISOString() },
        }),
      })
      const sendData = await sendRes.json()
      console.log("Meta response:", JSON.stringify(sendData, null, 2))
      if (sendData.error) {
        console.error("❌ Send REJECTED — this is your root cause: [" + sendData.error.code + "] " + sendData.error.message)
      } else {
        console.log("✅ Meta ACCEPTED the message (id " + sendData.messages?.[0]?.id + ").")
        console.log("   If it does not arrive on the phone within a minute, the failure is")
        console.log("   asynchronous — check server logs for '📵 WA delivery FAILED' which")
        console.log("   will contain Meta's exact error code for this message id.")
      }
    }
  }
  console.log("\nDone.\n")
}

main().catch(e => fail(e.message))
