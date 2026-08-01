import { NextResponse } from "next/server";
import { generateApiKey, generateOAuthClient, isAdmin, maskKey } from "@/lib/partnerAuth";
import { getPartnerStore, DEFAULT_SCOPES } from "@/lib/partnerStore";

export const dynamic = "force-dynamic";

// Internal provisioning endpoint — called by YOUR onboarding flow, not partners.
// Creating a partner IS provisioning their access: the API key and OAuth client
// come back in the same response, ready to use. No App, no token registration.

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: { code: "admin_auth_failed", message: "Missing or invalid X-Admin-Token header." } }, { status: 401 });
  }
  let body: { name?: string; campaignScope?: string[] };
  try { body = await req.json(); } catch { body = {}; }
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Body must include { name }." } }, { status: 400 });
  }
  const campaignScope = Array.isArray(body.campaignScope) && body.campaignScope.length > 0 ? body.campaignScope.map(String) : null;

  const store = getPartnerStore();
  const partner = await store.createPartner(name, campaignScope);

  const key = generateApiKey("live");
  await store.insertKey({
    keyId: key.keyId, partnerId: partner.id, secretHash: key.secretHash, env: "live",
    label: "Default key (auto-provisioned at onboarding)", scopes: DEFAULT_SCOPES,
    createdAt: new Date().toISOString(), expiresAt: null, lastUsedAt: null, revokedAt: null,
  });

  const client = generateOAuthClient();
  await store.insertClient({
    clientId: client.clientId, partnerId: partner.id, secretHash: client.secretHash,
    scopes: DEFAULT_SCOPES, createdAt: new Date().toISOString(), revokedAt: null,
  });

  await store.audit(partner.id, "partner.created", `Auto-provisioned API key ${key.keyId} + OAuth client ${client.clientId}`);

  return NextResponse.json({
    partner,
    credentials: {
      note: "Store these now — secrets are shown only once and are never retrievable again.",
      apiKey: key.token,
      oauth: { clientId: client.clientId, clientSecret: client.clientSecret, tokenUrl: "/api/oauth/token" },
    },
  }, { status: 201 });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: { code: "admin_auth_failed", message: "Missing or invalid X-Admin-Token header." } }, { status: 401 });
  }
  const store = getPartnerStore();
  const partners = await store.listPartners();
  const out = [];
  for (const p of partners) {
    const keys = await store.listKeys(p.id);
    out.push({
      ...p,
      keys: keys.map((k) => ({ key: maskKey(k.env, k.keyId), label: k.label, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt })),
    });
  }
  return NextResponse.json({ partners: out });
}
