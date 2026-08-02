// lib/meta/oauth-state.js
// HMAC-signed OAuth state for the Meta connect flow.
// Format: <userId>.<expiresAtMs>.<hmacHex>
// Signed with META_APP_SECRET so the callback can verify the state was
// minted by our server for this user, and hasn't expired or been forged.

const crypto = require("crypto")

function signOAuthState(userId, expiresAt) {
  return crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(`${userId}.${expiresAt}`)
    .digest("hex")
}

// Returns the userId when valid, otherwise null.
function verifyOAuthState(state) {
  if (!state || !process.env.META_APP_SECRET) return null
  const parts = state.split(".")
  if (parts.length !== 3) return null
  const [userId, expiresAtStr, sig] = parts

  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

  const expected = signOAuthState(userId, expiresAt)
  const sigBuf = Buffer.from(sig, "hex")
  const expBuf = Buffer.from(expected, "hex")
  if (sigBuf.length !== expBuf.length || sigBuf.length === 0) return null
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null

  return userId
}

module.exports = { signOAuthState, verifyOAuthState }
