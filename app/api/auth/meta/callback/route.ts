import { NextResponse } from "next/server";
import { exchangeCodeForToken, fetchGrantedAdAccounts, fetchMe, verifyState, oauthConfigured, OAUTH_SCOPES } from "@/lib/metaOAuth";
import { getConnectionStore } from "@/lib/connections";

export const dynamic = "force-dynamic";

// Step 2: Meta redirects back here with a code. We exchange it for a
// long-lived token, discover every ad account the user granted, store it all,
// and drop them back on the wizard with their accounts already listed.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(`${url.origin}/check?${new URLSearchParams(params)}`);

  if (!oauthConfigured()) return back({ connect: "error", reason: "OAuth is not configured on this deployment." });

  // The user pressed Cancel on Facebook's dialog.
  const denied = url.searchParams.get("error");
  if (denied) {
    return back({ connect: "cancelled", reason: url.searchParams.get("error_description") ?? denied });
  }

  // CSRF: the state we signed on the way out must come back intact.
  if (!verifyState(url.searchParams.get("state"))) {
    return back({ connect: "error", reason: "Security check failed — please start the connection again." });
  }

  const code = url.searchParams.get("code");
  if (!code) return back({ connect: "error", reason: "Meta did not return an authorization code." });

  try {
    const { token, expiresIn } = await exchangeCodeForToken(code, url.origin);
    const me = await fetchMe(token);
    const accounts = await fetchGrantedAdAccounts(token);

    if (accounts.length === 0) {
      return back({ connect: "empty", reason: "No ad accounts were shared. Re-connect and tick at least one account." });
    }

    await getConnectionStore().save(
      { fbUserId: me.id, fbUserName: me.name, token, expiresIn, scopes: OAUTH_SCOPES },
      accounts,
    );

    return back({ connect: "success", accounts: String(accounts.length), who: me.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not complete the connection.";
    return back({ connect: "error", reason: msg });
  }
}
