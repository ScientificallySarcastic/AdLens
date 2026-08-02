// Verifies the /me/adaccounts fallback: an OAuth token without
// business_management must still list accounts, by retrying without the
// `business` field instead of failing the whole call.
// Run: npx tsx tests/adaccounts-fallback.test.mts

import assert from "node:assert/strict";

process.env.META_ACCESS_TOKEN = "test-token";
process.env.META_AD_ACCOUNT_ID = "111";

const calls: string[] = [];
const ok = (data: unknown) =>
  new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });

// #100 is what Meta returns for `business` without business_management.
const permissionError = () =>
  new Response(
    JSON.stringify({ error: { message: "(#100) Requires business_management permission to access the field.", code: 100 } }),
    { status: 400, headers: { "content-type": "application/json" } },
  );

globalThis.fetch = (async (url: unknown) => {
  const u = String(url);
  calls.push(u);
  if (u.includes("business")) return permissionError();
  return ok([
    { account_id: "555", name: "Puzzles Club Business", currency: "INR", timezone_name: "Asia/Kolkata", account_status: 1 },
  ]);
}) as typeof fetch;

const { fetchAccessibleAdAccounts } = await import("../lib/meta.js");

const accounts = await fetchAccessibleAdAccounts();

assert.equal(calls.length, 2, "should try with `business`, then retry without it");
assert.ok(calls[0].includes("business"), "first attempt requests the business field");
assert.ok(!calls[1].includes("business"), "retry drops the business field");
assert.equal(accounts.length, 1, "accounts are returned despite the #100 error");
assert.equal(accounts[0].id, "555");
assert.equal(accounts[0].name, "Puzzles Club Business");
assert.equal(accounts[0].business, null, "business label is simply absent");

console.log("  ✓ retries without `business` on #100 and still lists accounts");
console.log("1 passed");
