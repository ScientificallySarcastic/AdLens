import { NextResponse } from "next/server";
import { authenticatePartner, generateApiKey, maskKey } from "@/lib/partnerAuth";
import { getPartnerStore, DEFAULT_SCOPES } from "@/lib/partnerStore";

export const dynamic = "force-dynamic";

// Partner self-service key management. Multiple keys can be active at once —
// that is what makes rotation a non-event: create new → migrate → revoke old.

export async function GET(req: Request) {
  const result = await authenticatePartner(req);
  if (!result.ok) return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  if (!result.auth.scopes.includes("keys:manage")) {
    return NextResponse.json({ error: { code: "insufficient_scope", message: "Requires 'keys:manage' scope." } }, { status: 403 });
  }

  const keys = await getPartnerStore().listKeys(result.auth.partner.id);
  return NextResponse.json({
    keys: keys.map((k) => ({
      keyId: k.keyId, key: maskKey(k.env, k.keyId), label: k.label, scopes: k.scopes,
      createdAt: k.createdAt, expiresAt: k.expiresAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt,
    })),
  });
}

// Rotation: POST creates a new key alongside the old one — zero downtime.
export async function POST(req: Request) {
  const result = await authenticatePartner(req);
  if (!result.ok) return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  if (!result.auth.scopes.includes("keys:manage")) {
    return NextResponse.json({ error: { code: "insufficient_scope", message: "Requires 'keys:manage' scope." } }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "Rotated key");

  const store = getPartnerStore();
  const key = generateApiKey("live");
  await store.insertKey({
    keyId: key.keyId, partnerId: result.auth.partner.id, secretHash: key.secretHash, env: "live",
    label, scopes: DEFAULT_SCOPES, createdAt: new Date().toISOString(),
    expiresAt: null, lastUsedAt: null, revokedAt: null,
  });
  await store.audit(result.auth.partner.id, "key.created", `Key ${key.keyId} created ('${label}')`);

  return NextResponse.json({
    note: "Store this now — the secret is shown only once. Revoke the old key once you have migrated.",
    apiKey: key.token,
    keyId: key.keyId,
  }, { status: 201 });
}
