// The AI must retrieve before it answers, and must never fall back to canned
// prose. These tests pin the ordering and the no-template guarantee.
// Run: npx tsx tests/ai-pipeline.test.mts

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseQuery } from "../lib/aiPipeline.js";

let pass = 0;
const t = (name: string, fn: () => void) => { fn(); console.log(`  ✓ ${name}`); pass++; };

const ENTITIES = ["Summer Sale — Broad", "Retargeting — Cart", "Lookalike 1%", "Broad 25-45"];

console.log("stage 1 — query parsing");
t("classifies a delivery question", () => {
  const p = parseQuery("Why did Ad Set B stop delivering?", ENTITIES);
  assert.equal(p.kind, "delivery");
});
t("classifies a spend-drop question as delivery", () => {
  assert.equal(parseQuery("Why is Campaign A spending less today?", ENTITIES).kind, "delivery");
});
t("classifies a comparison", () => {
  const p = parseQuery("Compare Lookalike 1% vs Broad 25-45", ENTITIES);
  assert.equal(p.kind, "compare");
  assert.deepEqual(p.entities.sort(), ["Broad 25-45", "Lookalike 1%"]);
});
t("classifies a performance question", () => {
  assert.equal(parseQuery("How is Summer Sale performing?", ENTITIES).kind, "performance");
});
t("classifies a recommendation request", () => {
  assert.equal(parseQuery("What should I pause?", ENTITIES).kind, "recommend");
});
t("resolves an entity mentioned by its leading fragment", () => {
  const p = parseQuery("how is summer sale doing", ENTITIES);
  assert.ok(p.entities.includes("Summer Sale — Broad"), "partial, lower-case name still resolves");
});
t("extracts the metrics asked about", () => {
  const p = parseQuery("Why is CPM up and CTR down?", ENTITIES);
  assert.ok(p.metrics.includes("cpm"));
  assert.ok(p.metrics.includes("ctr"));
});
t("flags time-sensitive questions for a tighter freshness budget", () => {
  assert.equal(parseQuery("Why is spend low today?", ENTITIES).timeSensitive, true);
  assert.equal(parseQuery("How did the campaign do overall?", ENTITIES).timeSensitive, false);
});

console.log("no canned answers anywhere in the codebase");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "tests"].includes(e)) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e)) acc.push(full);
  }
  return acc;
}
const root = new URL("..", import.meta.url).pathname;
const files = sourceFiles(root);

t("lib/ai.ts (the hardcoded template responder) is gone", () => {
  assert.ok(!files.some((f) => f.endsWith("/lib/ai.ts")), "lib/ai.ts must not exist");
});
t("formatAnalyst (the canned prose generator) is gone", () => {
  const hits = files.filter((f) => readFileSync(f, "utf8").includes("formatAnalyst"));
  assert.deepEqual(hits, [], `formatAnalyst still referenced in: ${hits.join(", ")}`);
});
t("no fallbackReply / buildCampaignContext template helpers remain", () => {
  for (const name of ["fallbackReply", "buildCampaignContext"]) {
    const hits = files.filter((f) => readFileSync(f, "utf8").includes(name));
    assert.deepEqual(hits, [], `${name} still referenced in: ${hits.join(", ")}`);
  }
});

console.log("chat route ordering");
const route = readFileSync(join(root, "app/api/ai/chat/route.ts"), "utf8");

t("retrieval happens before generation", () => {
  const retrieve = route.indexOf("retrieveData(");
  const generate = route.indexOf("generateAnswer(");
  assert.ok(retrieve > -1 && generate > -1, "both stages must be present");
  assert.ok(retrieve < generate, "retrieveData must be called before generateAnswer");
});
t("a failed retrieval short-circuits with an error, not an answer", () => {
  assert.ok(route.includes("retrieval-failed"), "must surface a retrieval failure");
  const fail = route.indexOf("retrieval-failed");
  const generate = route.indexOf("generateAnswer(");
  assert.ok(fail < generate, "the failure path must return before generation is reached");
});
t("context is built before the model is asked", () => {
  assert.ok(route.indexOf("buildContext(") < route.indexOf("generateAnswer("));
});
t("an account question with no campaign selected is refused", () => {
  assert.ok(route.includes("no-campaign-selected"));
});
t("an unreachable model yields an error, never a template", () => {
  assert.ok(route.includes("no-model-configured"));
  assert.ok(route.includes("model-unreachable"));
  assert.ok(!/formatAnalyst|fallbackReply/.test(route), "no template path may remain");
});
t("unverifiable citations are discarded rather than shown", () => {
  assert.ok(route.includes("citation-check-failed"));
});

const pipeline = readFileSync(join(root, "lib/aiPipeline.ts"), "utf8");
t("stale live data triggers a Meta sync before answering", () => {
  assert.ok(pipeline.includes("/api/sync/meta"), "must re-sync from Meta when stale");
  assert.ok(pipeline.includes("await fetch("), "the sync must be awaited, not fired and forgotten");
});
t("time-sensitive questions use a tighter freshness budget", () => {
  assert.ok(pipeline.includes("STALE_MS_TIME_SENSITIVE"));
});

console.log(`\n${pass} passed`);
