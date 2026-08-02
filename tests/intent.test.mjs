// ── Intent routing suite ────────────────────────────────────────────
// The assistant must not be limited to a fixed list of prewritten questions,
// must answer platform-knowledge questions conceptually, and must decline
// anything outside advertising instead of improvising.
//
//   npm run test:intent

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "adlens-intent-"));
execSync(
  `npx --yes esbuild@0.23.0 lib/intent.ts --format=esm --outfile=${join(dir, "intent.mjs")} --log-level=error`,
  { stdio: "inherit" }
);
const { classifyIntent, glossaryLookup } = await import(join(dir, "intent.mjs"));

// Entity names that would be on screen for a live campaign.
const ENT = ["Puzzles_club_Whatsapp", "PC_Traffic_Parents_Hyd", "PC_TR_Video1", "PC_TR_Carousel"];

// Real user phrasing — typos, partial names, vague asks. A legitimate question
// must never be refused; refusing is worse than answering loosely.
const realWorld = [
  ["account", "can you me what is going i puzzles club whatsapp asdset"],
  ["account", "whats happening here"],
  ["account", "explain this"],
  ["account", "PC_TR_Video1?"],
  ["account", "why is campaing not performing"],
  ["account", "how is the creatve doing"],
  ["account", "puzzles club whatsapp"],
  ["account", "anything wrong?"],
  ["account", "summarise"],
  ["out_of_scope", "what's the weather in Hyderabad"],
  ["out_of_scope", "who won the cricket match"],
];

const cases = [
  // account — about the connected account's data
  ["account", "Why did CTR drop last week?"],
  ["account", "Which adset deserves more budget?"],
  ["account", "What should we pause?"],
  ["account", "How much did we spend this month?"],
  ["account", "Is the audience saturating in this campaign?"],
  ["account", "Compare this period against the previous one"],
  ["account", "What happened to our conversions?"],
  ["account", "Show me the worst performing ad"],
  ["account", "why is my CPC rising"],
  ["account", "creative fatigue in this ad set?"],

  // platform — conceptual, no account data needed
  ["platform", "What is CPM?"],
  ["platform", "What does ROAS mean?"],
  ["platform", "How is CPA calculated?"],
  ["platform", "How does Meta attribution work?"],
  ["platform", "Explain the difference between reach and impressions"],
  ["platform", "What is a lookalike audience?"],
  ["platform", "How should I think about the learning phase?"],
  ["platform", "what counts as a conversion"],

  // out of scope — not advertising
  ["out_of_scope", "What's the capital of France?"],
  ["out_of_scope", "Write me a poem about the sea"],
  ["out_of_scope", "How do I fix my car engine?"],
  ["out_of_scope", "my flight is delayed, what should I do"],
  ["out_of_scope", "who won the cricket match yesterday"],
  ["out_of_scope", ""],
];

let pass = 0;
const failures = [];
console.log("Real-world phrasing (typos, partial names, vague asks):");
for (const [expect, q] of realWorld) {
  const got = classifyIntent(q, ENT);
  const good = got === expect;
  if (good) pass++; else failures.push({ q, expect, got });
  console.log(`${good ? "PASS" : "FAIL"}  ${expect.padEnd(12)} ${JSON.stringify(q)}${good ? "" : `  → got ${got}`}`);
}

console.log("\nStandard routing:");
for (const [expect, q] of cases) {
  const got = classifyIntent(q, ENT);
  const good = got === expect;
  if (good) pass++;
  else failures.push({ q, expect, got });
  console.log(`${good ? "PASS" : "FAIL"}  ${expect.padEnd(12)} ${JSON.stringify(q)}${good ? "" : `  → got ${got}`}`);
}

// Every metric the UI can display must have a stored definition, so a
// platform question works even with no LLM key configured.
const mustDefine = ["CTR", "CPC", "CPM", "CPA", "ROAS", "frequency", "reach",
                    "impressions", "attribution", "objective", "pacing"];
console.log("\nGlossary coverage:");
for (const term of mustDefine) {
  const hit = glossaryLookup(`what is ${term}?`);
  const good = Boolean(hit);
  if (good) pass++; else failures.push({ q: `glossary:${term}`, expect: "defined", got: "missing" });
  console.log(`${good ? "PASS" : "FAIL"}  ${term.padEnd(12)} ${hit ? hit.term : "NOT DEFINED"}`);
}

const total = cases.length + mustDefine.length + realWorld.length;
console.log(`\n${pass}/${total} intent + glossary tests passed`);
if (failures.length) {
  console.error("\nFailures:", JSON.stringify(failures, null, 2));
  process.exit(1);
}
