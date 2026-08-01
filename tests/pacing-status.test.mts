// Pacing and status regressions.
//   Pacing was last-night's spend ÷ daily budget: no elapsed time, and 0% for
//   every account whose budgets sit at ad set level.
//   Status collapsed everything non-ACTIVE into "Paused", so archived campaigns
//   looked merely paused and an account with nothing running still read Active.
// Run: npx tsx tests/pacing-status.test.mts

import assert from "node:assert/strict";
import { computePacing, daysBetween, daysElapsedSince, pacingState } from "../lib/pacing.js";
import { mapMetaStatus, isDelivering, isArchivedLike } from "../lib/status.js";

let pass = 0;
const t = (name: string, fn: () => void) => { fn(); console.log(`  ✓ ${name}`); pass++; };

console.log("pacing — daily budget");
t("on track when spend matches budget × elapsed days", () => {
  const p = computePacing({ spend: 700, dailyBudget: 100, daysElapsed: 7 });
  assert.equal(p.percent, 100);
  assert.equal(p.basis, "daily");
  assert.equal(p.expected, 700);
  assert.equal(p.state, "on-track");
});
t("under-pacing is detected", () => {
  const p = computePacing({ spend: 350, dailyBudget: 100, daysElapsed: 7 });
  assert.equal(p.percent, 50);
  assert.equal(p.state, "under");
});
t("over-pacing is detected", () => {
  const p = computePacing({ spend: 1400, dailyBudget: 100, daysElapsed: 7 });
  assert.equal(p.percent, 200);
  assert.equal(p.state, "over");
});
t("elapsed time is respected — one day of a 7-day window is not 14%", () => {
  // The old formula divided total spend by ONE day's budget.
  const p = computePacing({ spend: 100, dailyBudget: 100, daysElapsed: 1 });
  assert.equal(p.percent, 100, "one day at budget is 100%, not 14%");
});

console.log("pacing — lifetime budget");
t("prorates a lifetime budget across the schedule", () => {
  const p = computePacing({ spend: 500, lifetimeBudget: 1000, daysElapsed: 5, totalDays: 10 });
  assert.equal(p.basis, "lifetime");
  assert.equal(p.expected, 500);
  assert.equal(p.percent, 100);
});
t("halfway through the schedule having spent everything is 200%", () => {
  const p = computePacing({ spend: 1000, lifetimeBudget: 1000, daysElapsed: 5, totalDays: 10 });
  assert.equal(p.percent, 200);
  assert.equal(p.state, "over");
});
t("lifetime wins over daily when both are present", () => {
  const p = computePacing({ spend: 100, dailyBudget: 50, lifetimeBudget: 1000, daysElapsed: 5, totalDays: 10 });
  assert.equal(p.basis, "lifetime");
});

console.log("pacing — no budget (the old 0% bug)");
t("reports unknown, not 0%, when no budget is set", () => {
  const p = computePacing({ spend: 900, daysElapsed: 9 });
  assert.equal(p.percent, null, "must be null so the UI can say 'no budget' instead of 0%");
  assert.equal(p.basis, "none");
  assert.equal(p.state, "unknown");
  assert.match(p.reason ?? "", /No budget/i);
});
t("zero elapsed days does not divide by zero", () => {
  const p = computePacing({ spend: 0, dailyBudget: 100, daysElapsed: 0 });
  assert.equal(p.percent, null);
  assert.equal(p.state, "unknown");
});

console.log("pacing — helpers");
t("daysBetween is inclusive of the start day", () => {
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z"), 10);
  assert.equal(daysBetween(null, "2026-01-10T00:00:00Z"), 0);
});
t("daysElapsedSince caps at the stop time", () => {
  const past = daysElapsedSince("2020-01-01T00:00:00Z", "2020-01-05T00:00:00Z");
  assert.equal(past, 5, "a finished flight counts its own length, not time since");
});
t("thresholds: ±10% is on track", () => {
  assert.equal(pacingState(95), "on-track");
  assert.equal(pacingState(89), "under");
  assert.equal(pacingState(111), "over");
});

console.log("status");
t("effective_status wins over status", () => {
  assert.equal(mapMetaStatus("PAUSED", "ACTIVE"), "Paused");
  assert.equal(mapMetaStatus("ACTIVE", "ACTIVE"), "Active");
});
t("ARCHIVED is Archived, not Paused", () => {
  assert.equal(mapMetaStatus("ARCHIVED", "PAUSED"), "Archived");
  assert.equal(isArchivedLike(mapMetaStatus("ARCHIVED")), true);
});
t("DELETED is distinct too", () => assert.equal(mapMetaStatus("DELETED"), "Deleted"));
t("review states surface as In Review", () => {
  assert.equal(mapMetaStatus("PENDING_REVIEW"), "In Review");
  assert.equal(mapMetaStatus("IN_PROCESS"), "In Review");
  assert.equal(mapMetaStatus("WITH_ISSUES"), "In Review");
});
t("ADSET_PAUSED reads as Paused", () => assert.equal(mapMetaStatus("ADSET_PAUSED"), "Paused"));
t("an unknown status never becomes Active", () => {
  assert.equal(mapMetaStatus("SOMETHING_NEW"), "Incomplete");
  assert.notEqual(mapMetaStatus("SOMETHING_NEW"), "Active");
});
t("only Active counts as delivering", () => {
  assert.equal(isDelivering("Active"), true);
  for (const s of ["Paused", "Archived", "Deleted", "In Review", "Incomplete"] as const) {
    assert.equal(isDelivering(s), false, `${s} must not count as delivering`);
  }
});

console.log(`\n${pass} passed`);
