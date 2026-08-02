// lib/cron-auth.js
// Shared auth check for /api/cron/* routes. These routes are whitelisted in
// middleware.js, so this header check is the ONLY gate in front of
// service-role DB access — it must fail closed.
const crypto = require("crypto")

function verifyCronAuth(req) {
  const secret = process.env.CRON_SECRET
  // Fail closed: an unset secret must never turn into a matchable
  // "Bearer undefined" string.
  if (!secret) {
    console.error("❌ CRON_SECRET not set — rejecting all cron requests")
    return false
  }
  const received = Buffer.from(req.headers.get("authorization") || "")
  const expected = Buffer.from("Bearer " + secret)
  if (received.length !== expected.length) return false
  return crypto.timingSafeEqual(received, expected)
}

module.exports = { verifyCronAuth }
