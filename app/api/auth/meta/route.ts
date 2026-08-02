import { NextResponse } from "next/server";
import { authorizeUrl, oauthConfigured } from "@/lib/metaOAuth";

export const dynamic = "force-dynamic";

// Step 1 of "Connect with Facebook": bounce the user to Meta's consent screen.
// They choose which ad accounts to share there — we never ask for a token.

export async function GET(req: Request) {
  if (!oauthConfigured()) {
    return NextResponse.json(
      { error: "oauth_not_configured", message: "Set META_APP_ID and META_APP_SECRET to enable Connect with Facebook." },
      { status: 503 },
    );
  }
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(authorizeUrl(origin));
}
