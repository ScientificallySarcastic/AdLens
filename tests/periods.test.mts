// WoW / MoM comparison. The two properties that matter:
//   1. Ratios are recomputed from totals, never averaged across days.
//   2. A comparison is withheld when either window lacks history, instead of
//      reporting a swing that is really just a short period.
// Run: npx tsx tests/periods.test.mts

import assert from "node:assert/strict";
import { weekOverWeek, monthOverMonth, totalsFor, formatChange } from "../lib/periods.js";
import type { DayPoint } from "../lib/datasource.js";

let pass = 0;
const t = (name: string, fn: () => void) => { fn(); console.log(`  ✓ ${name}`); pass++; };

const day = (o: Partial<DayPoint>): DayPoint => ({
  day: "d", ctr: 0, cpa: 0, spend: 0, revenue: 0,
  impressions: 0, clicks: 0, conversions: 0, ...o,
} as DayPoint);

/** n days, each identical. */
const flat = (n: number, o: Partial<DayPoint>) => Array.from({ length: n }, () => day(o));

console.log("totals");
t("recomputes CTR from totals, not as a mean of daily CTRs", () => {
  // Day 1: 1 click / 10 impressions = 10%. Day 2: 10 clicks / 1000 = 1%.
  // Mean of daily CTR = 5.5%. True CTR = 11/1010 = 1.09%.
  const totals = totalsFor([
    day({ clicks: 1, impressions: 10 }),
    day({ clicks: 10, impressions: 1000 }),
  ]);
  assert.equal(totals.ctr, 1.09, "must be total clicks ÷ total impressions");
  assert.notEqual(totals.ctr, 5.5, "must NOT be the average of daily ratios");
});
t("cost metrics are null rather than zero when the denominator is missing", () => {
  const totals = totalsFor([day({ spend: 100, conversions: 0, clicks: 0 })]);
  assert.equal(totals.cpa, null, "no conversions ⇒ no cost per result, not 0");
  assert.equal(totals.cpc, null);
  assert.equal(totals.roas, null, "no revenue ⇒ ROAS unavailable, not 0");
});

console.log("week over week");
t("computes a real percentage change", () => {
  const series = [...flat(7, { spend: 100 }), ...flat(7, { spend: 150 })];
  const wow = weekOverWeek(series);
  assert.equal(wow.comparable, true);
  const spend = wow.changes.find((c) => c.metric === "Spend")!;
  assert.equal(spend.previous, 700);
  assert.equal(spend.current, 1050);
  assert.equal(spend.changePct, 50);
});
t("knows a cost metric falling is an improvement", () => {
  const series = [
    ...flat(7, { spend: 100, conversions: 5 }),   // CPA 20
    ...flat(7, { spend: 100, conversions: 10 }),  // CPA 10
  ];
  const cpa = weekOverWeek(series).changes.find((c) => c.metric === "Cost per result")!;
  assert.equal(cpa.changePct, -50);
  assert.equal(cpa.better, true, "cheaper results is better");
  assert.equal(cpa.lowerIsBetter, true);
});
t("rising spend is not automatically 'better'", () => {
  const series = [...flat(7, { spend: 100 }), ...flat(7, { spend: 200 })];
  const spend = weekOverWeek(series).changes.find((c) => c.metric === "Spend")!;
  assert.equal(spend.lowerIsBetter, false);
});
t("withholds the comparison when history is too short", () => {
  const wow = weekOverWeek(flat(5, { spend: 100 }));   // only one partial window
  assert.equal(wow.comparable, false);
  assert.deepEqual(wow.changes, [], "no numbers may be shown");
  assert.match(wow.reason ?? "", /history/i);
});

console.log("month over month");
t("compares 28 days against the previous 28", () => {
  const series = [...flat(28, { spend: 10 }), ...flat(28, { spend: 20 })];
  const mom = monthOverMonth(series);
  assert.equal(mom.comparable, true);
  assert.equal(mom.label, "MoM");
  const spend = mom.changes.find((c) => c.metric === "Spend")!;
  assert.equal(spend.previous, 280);
  assert.equal(spend.current, 560);
  assert.equal(spend.changePct, 100);
});
t("a 30-day account cannot fake a month-over-month figure", () => {
  const mom = monthOverMonth(flat(30, { spend: 10 }));
  assert.equal(mom.comparable, false, "30 days is not two months");
});

console.log("formatting");
t("formats with an explicit sign", () => {
  const series = [...flat(7, { spend: 100 }), ...flat(7, { spend: 150 })];
  const spend = weekOverWeek(series).changes.find((c) => c.metric === "Spend")!;
  assert.equal(formatChange(spend), "+50.0%");
});
t("returns null when there is nothing to format", () => {
  assert.equal(formatChange({ metric: "x", current: null, previous: null, changePct: null, better: null, lowerIsBetter: false }), null);
});

console.log(`\n${pass} passed`);
