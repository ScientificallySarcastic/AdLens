import { NextResponse } from "next/server";
import { getConnectionStore } from "@/lib/connections";
import { oauthConfigured } from "@/lib/metaOAuth";

export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };

// What the wizard reads to show connected accounts. Tokens never leave the
// server — only account metadata is returned.

export async function GET() {
  try {
    const store = getConnectionStore();
    const [accounts, connections] = await Promise.all([store.listAccounts(), store.listConnections()]);
    return NextResponse.json({ oauthConfigured: oauthConfigured(), accounts, connections }, NO_STORE);
  } catch {
    return NextResponse.json({ oauthConfigured: oauthConfigured(), accounts: [], connections: [] }, NO_STORE);
  }
}

// Disconnect — revokes the stored grant. Their data stops being readable
// immediately; nothing is deleted on Meta's side.
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await getConnectionStore().disconnect(id);
  return NextResponse.json({ disconnected: ok ? id : null }, { status: ok ? 200 : 404 });
}
