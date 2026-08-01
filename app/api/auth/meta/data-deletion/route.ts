import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getConnectionStore } from "@/lib/connections";

export const dynamic = "force-dynamic";

// Meta's Data Deletion Callback — REQUIRED for any Live app.
// Meta POSTs a signed_request when a user removes AdLens from their Facebook
// settings; we must delete their data and return a status URL + confirmation
// code. Docs: developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback

interface SignedRequest { user_id?: string; algorithm?: string; issued_at?: number }

/** Meta signs with HMAC-SHA256 over the base64url payload, keyed by app secret. */
function parseSignedRequest(signed: string, appSecret: string): SignedRequest | null {
  const [encodedSig, payload] = signed.split(".");
  if (!encodedSig || !payload) return null;

  const expected = createHmac("sha256", appSecret).update(payload).digest();
  const actual = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SignedRequest;
    if (data.algorithm && data.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Meta sends application/x-www-form-urlencoded with a signed_request field.
  let signed = "";
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    signed = String((await req.json().catch(() => ({}))).signed_request ?? "");
  } else {
    signed = new URLSearchParams(await req.text().catch(() => "")).get("signed_request") ?? "";
  }
  if (!signed) return NextResponse.json({ error: "missing signed_request" }, { status: 400 });

  const data = parseSignedRequest(signed, appSecret);
  if (!data?.user_id) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });

  // Deleting the connection cascades to its stored accounts and token.
  const connectionId = `conn_${data.user_id}`;
  await getConnectionStore().disconnect(connectionId).catch(() => false);

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    url: `${origin}/api/auth/meta/data-deletion?id=${encodeURIComponent(data.user_id)}`,
    confirmation_code: connectionId,
  });
}

// Meta (and the user) can GET this to confirm the deletion happened.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const conns = await getConnectionStore().listConnections().catch(() => []);
  const stillPresent = conns.some((c) => c.fbUserId === id);

  return NextResponse.json({
    user_id: id,
    deleted: !stillPresent,
    detail: stillPresent
      ? "Deletion is still in progress."
      : "All stored Meta credentials and ad account records for this user have been deleted.",
  });
}
