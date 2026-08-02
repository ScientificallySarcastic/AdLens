// lib/encryption.js
const crypto = require("crypto")

const ALGO = "aes-256-gcm"
const IV_LEN = 16
const TAG_LEN = 16

// Unambiguous marker for encrypted values. Without it, callers had to guess
// with heuristics like value.includes(":"), which mis-detects plaintext Meta
// tokens containing a colon and silently sends garbage Bearer tokens to the
// Graph API (server "sends" fine, customer never receives).
const PREFIX = "enc:v1:"

// Values written before the prefix existed: <32 hex iv>:<32 hex tag>:<hex ct>
const LEGACY_RE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + iv.toString("hex") + ":" + tag.toString("hex") + ":" + enc.toString("hex")
}

// Decrypts prefixed and legacy-format values; passes genuine plaintext
// through untouched. A value that IS in encrypted format but fails to
// decrypt (wrong key, corrupted row) throws instead of being returned
// as-is — the caller must fail loudly, not send ciphertext to Meta.
function decrypt(value) {
  if (!value) return value

  let payload
  if (value.startsWith(PREFIX)) {
    payload = value.slice(PREFIX.length)
  } else if (LEGACY_RE.test(value)) {
    payload = value
  } else {
    return value // plaintext token stored before encryption existed
  }

  const parts = payload.split(":")
  if (parts.length !== 3) {
    throw new Error("Encrypted value is malformed (expected iv:tag:ciphertext)")
  }
  const key = getKey()
  const iv = Buffer.from(parts[0], "hex")
  const tag = Buffer.from(parts[1], "hex")
  const enc = Buffer.from(parts[2], "hex")
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Encrypted value is malformed (bad iv/tag length)")
  }
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc) + decipher.final("utf8")
}

module.exports = { encrypt, decrypt }
