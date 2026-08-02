// lib/rate-limit/supabase-rate-limiter.js
// Replaces the in-memory Map-based rate limiter in webhook/route.js.
// Uses a Supabase table so it works across multiple instances and survives restarts.
// Requires: supabase/migrations/003_rate_limit_table.sql
const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WINDOW_MS = 60000
const MAX_REQUESTS = 100

async function isRateLimited(phone) {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_phone: phone,
      p_window_ms: WINDOW_MS,
      p_max_requests: MAX_REQUESTS
    })
    if (error) {
      console.error("⚠️ Rate limit RPC failed:", error.message)
      return false
    }
    return data === true
  } catch (e) {
    console.error("⚠️ Rate limit check failed:", e.message)
    return false
  }
}

module.exports = { isRateLimited }
