import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getConnectionStore } from "@/lib/connections";

export const dynamic = "force-dynamic";

// Meta's Deauthorize Callback — fired when a user removes AdLens from their
// Facebook apps. Distinct from data deletion: this revokes access immediately.
// Stale tokens must not keep working after someone disconnects on Meta's side.

export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await req.text().catch(() => "");
  const signed = new URLSearchParams(body).get("signed_request") ?? "";
  const [encodedSig, payload] = signed.split(".");
  if (!encodedSig || !payload) return NextResponse.json({ ok: false }, { status: 400 });

  const expected = createHmac("sha256", appSecret).update(payload).digest();
  const actual = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const { user_id } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (user_id) await getConnectionStore().disconnect(`conn_${user_id}`).catch(() => false);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
