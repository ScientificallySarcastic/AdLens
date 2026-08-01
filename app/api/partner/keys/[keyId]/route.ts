import { NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partnerAuth";
import { getPartnerStore } from "@/lib/partnerStore";

export const dynamic = "force-dynamic";

// Instant revocation. Partners can only revoke their OWN keys — the store
// filters by partner_id, so a stolen credential can't disable someone else's.

export async function DELETE(req: Request, { params }: { params: { keyId: string } }) {
  const result = await authenticatePartner(req);
  if (!result.ok) return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  if (!result.auth.scopes.includes("keys:manage")) {
    return NextResponse.json({ error: { code: "insufficient_scope", message: "Requires 'keys:manage' scope." } }, { status: 403 });
  }

  const store = getPartnerStore();
  const ok = await store.revokeKey(result.auth.partner.id, params.keyId);
  if (!ok) {
    return NextResponse.json({ error: { code: "not_found", message: "No active key with that id under your account." } }, { status: 404 });
  }
  await store.audit(result.auth.partner.id, "key.revoked", `Key ${params.keyId} revoked`);
  return NextResponse.json({ revoked: params.keyId });
}
