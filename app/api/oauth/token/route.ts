import { NextResponse } from "next/server";
import { issueAccessToken, verifySecret, ACCESS_TOKEN_TTL } from "@/lib/partnerAuth";
import { getPartnerStore } from "@/lib/partnerStore";

export const dynamic = "force-dynamic";

// OAuth 2.0 client-credentials grant (RFC 6749 §4.4) — the enterprise door.
// The client secret never rides on data requests; it is exchanged here for a
// short-lived JWT, so leakage blast radius is bounded by the token TTL.
// Accepts credentials via JSON body, form body, or HTTP Basic auth.

export async function POST(req: Request) {
  let grantType = "", clientId = "", clientSecret = "";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    grantType = String(body.grant_type ?? "");
    clientId = String(body.client_id ?? "");
    clientSecret = String(body.client_secret ?? "");
  } else {
    const text = await req.text().catch(() => "");
    const form = new URLSearchParams(text);
    grantType = form.get("grant_type") ?? "";
    clientId = form.get("client_id") ?? "";
    clientSecret = form.get("client_secret") ?? "";
  }

  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    const [id, secret] = Buffer.from(basic.slice(6), "base64").toString().split(":");
    clientId = clientId || id || "";
    clientSecret = clientSecret || secret || "";
  }

  if (grantType !== "client_credentials") {
    return NextResponse.json({ error: "unsupported_grant_type", error_description: "Use grant_type=client_credentials." }, { status: 400 });
  }
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "invalid_request", error_description: "client_id and client_secret are required." }, { status: 400 });
  }

  const store = getPartnerStore();
  const client = await store.findClient(clientId);
  if (!client || client.revokedAt || !verifySecret(clientSecret, client.secretHash)) {
    return NextResponse.json({ error: "invalid_client", error_description: "Unknown client or bad secret." }, { status: 401 });
  }
  const partner = await store.getPartner(client.partnerId);
  if (!partner || partner.status !== "active") {
    return NextResponse.json({ error: "invalid_client", error_description: "Partner account is not active." }, { status: 403 });
  }

  const { token } = issueAccessToken(partner.id, client.scopes);
  await store.audit(partner.id, "token.issued", `OAuth access token issued to ${clientId}`);

  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    scope: client.scopes.join(" "),
  });
}
