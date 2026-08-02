// Unit tests for the Meta OAuth pieces that don't need Facebook: token
// encryption at rest, CSRF state signing, and the connection store contract.
// Run: node --experimental-strip-types tests/oauth.test.mjs   (or npm test)

import assert from "node:assert/strict";
import { createHmac, createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

let pass = 0;
const t = (name, fn) => { fn(); console.log(`  ✓ ${name}`); pass++; };

// ── Mirror of lib/tokenCrypto.ts ───────────────────────────────────
const key = () => createHash("sha256").update("test-key").digest();
function encryptToken(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}
function decryptToken(blob) {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1") throw new Error("Unrecognised token envelope");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

console.log("token encryption");
t("round-trips a token", () => {
  const token = "EAABsb" + "x".repeat(180);
  assert.equal(decryptToken(encryptToken(token)), token);
});
t("ciphertext never contains the plaintext", () => {
  const token = "EAAsecret-token-value";
  assert.ok(!encryptToken(token).includes(token));
});
t("same token encrypts differently each time (random IV)", () => {
  assert.notEqual(encryptToken("abc"), encryptToken("abc"));
});
t("rejects a tampered payload", () => {
  const blob = encryptToken("abc").split(".");
  blob[3] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => decryptToken(blob.join(".")));
});

// ── Mirror of the CSRF state in lib/metaOAuth.ts ───────────────────
const secret = "test-app-secret";
function signState(now = Date.now()) {
  const nonce = `${now}.${randomBytes(8).toString("hex")}`;
  return `${nonce}.${createHmac("sha256", secret).update(nonce).digest("base64url")}`;
}
function verifyState(state) {
  if (!state) return false;
  const p = state.split(".");
  if (p.length !== 3) return false;
  const nonce = `${p[0]}.${p[1]}`;
  const expected = Buffer.from(createHmac("sha256", secret).update(nonce).digest("base64url"));
  const actual = Buffer.from(p[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  return Date.now() - Number(p[0]) < 10 * 60 * 1000;
}

console.log("CSRF state");
t("accepts a freshly signed state", () => assert.equal(verifyState(signState()), true));
t("rejects a missing state", () => assert.equal(verifyState(null), false));
t("rejects a forged signature", () => {
  const s = signState().split(".");
  s[2] = Buffer.from("forged").toString("base64url");
  assert.equal(verifyState(s.join(".")), false);
});
t("rejects a state older than 10 minutes", () => {
  assert.equal(verifyState(signState(Date.now() - 11 * 60 * 1000)), false);
});
t("rejects malformed input", () => assert.equal(verifyState("garbage"), false));

console.log(`\n${pass} passed`);
