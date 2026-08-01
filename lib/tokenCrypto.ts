import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Access tokens are bearer credentials for someone else's ad account — they are
// encrypted at rest (AES-256-GCM) so a database dump is not a pile of live
// Meta tokens. Key derives from TOKEN_ENCRYPTION_KEY; in production it is
// required, mirroring the fail-closed rule used for the partner secrets.

const IS_PROD = process.env.NODE_ENV === "production";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    if (IS_PROD) throw new Error("TOKEN_ENCRYPTION_KEY must be set in production");
    return createHash("sha256").update("dev-token-encryption-key").digest();
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptToken(blob: string): string {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1") throw new Error("Unrecognised token envelope");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
