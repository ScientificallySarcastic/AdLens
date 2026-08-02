// ── Date range suite ────────────────────────────────────────────────
// Every selectable range, resolved against a FIXED clock so the expected
// boundaries are exact. Covers timezone offsets, month and year boundaries,
// leap years and invalid input.
//
//   npm run test:dates

import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "adlens-dates-"));
execSync(
  `npx --yes esbuild@0.23.0 lib/daterange.ts --format=esm --outfile=${join(dir, "d.mjs")} --log-level=error`,
  { stdio: "inherit" }
);
const { resolveRange, withinRange, addDays, parseISO, toISO } = await import(join(dir, "d.mjs"));

let pass = 0;
const failures = [];
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else failures.push({ label, got, want });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
}
const range = (key, tz, now, custom) => {
  const r = resolveRange(key, tz, custom, new Date(now));
  return r.error ? { error: r.error } : { since: r.since, until: r.until, days: r.days, metaPreset: r.metaPreset };
};

// ── Mid-month, IST (UTC+5:30). 2026-07-15 14:00 IST = 08:30 UTC.
const IST = "Asia/Kolkata";
const t = "2026-07-15T08:30:00Z";
check("today (IST)",        range("today", IST, t),      { since: "2026-07-15", until: "2026-07-15", days: 1,  metaPreset: "today" });
check("yesterday (IST)",    range("yesterday", IST, t),  { since: "2026-07-14", until: "2026-07-14", days: 1,  metaPreset: "yesterday" });
check("last 7 days (IST)",  range("last_7", IST, t),     { since: "2026-07-08", until: "2026-07-14", days: 7,  metaPreset: "last_7d" });
check("last 30 days (IST)", range("last_30", IST, t),    { since: "2026-06-15", until: "2026-07-14", days: 30, metaPreset: "last_30d" });
check("this month (IST)",   range("this_month", IST, t), { since: "2026-07-01", until: "2026-07-15", days: 15, metaPreset: "this_month" });
check("last month (IST)",   range("last_month", IST, t), { since: "2026-06-01", until: "2026-06-30", days: 30, metaPreset: "last_month" });

// ── TIMEZONE OFF-BY-ONE: 2026-07-15 20:00 UTC is already 16 Jul in IST but
//    still 15 Jul in New York. The same instant must yield different days.
const evening = "2026-07-15T20:00:00Z";
check("tz boundary — IST is already tomorrow", range("today", IST, evening),
      { since: "2026-07-16", until: "2026-07-16", days: 1, metaPreset: "today" });
check("tz boundary — New York is still today", range("today", "America/New_York", evening),
      { since: "2026-07-15", until: "2026-07-15", days: 1, metaPreset: "today" });

// ── MONTH BOUNDARY: on the 1st, "yesterday" and "last month" must roll back.
const firstOfMonth = "2026-07-01T06:00:00Z";
check("yesterday on the 1st rolls to previous month", range("yesterday", IST, firstOfMonth),
      { since: "2026-06-30", until: "2026-06-30", days: 1, metaPreset: "yesterday" });
check("this month on the 1st is a single day", range("this_month", IST, firstOfMonth),
      { since: "2026-07-01", until: "2026-07-01", days: 1, metaPreset: "this_month" });

// ── YEAR BOUNDARY
const jan1 = "2026-01-01T06:00:00Z";
check("last month on 1 Jan is December of the prior year", range("last_month", IST, jan1),
      { since: "2025-12-01", until: "2025-12-31", days: 31, metaPreset: "last_month" });
check("last 7 days crosses the year boundary", range("last_7", IST, jan1),
      { since: "2025-12-25", until: "2025-12-31", days: 7, metaPreset: "last_7d" });

// ── LEAP YEAR
check("last month in March 2028 has 29 days", range("last_month", "UTC", "2028-03-10T00:00:00Z"),
      { since: "2028-02-01", until: "2028-02-29", days: 29, metaPreset: "last_month" });
check("last month in March 2027 has 28 days", range("last_month", "UTC", "2027-03-10T00:00:00Z"),
      { since: "2027-02-01", until: "2027-02-28", days: 28, metaPreset: "last_month" });

// ── DST: US clocks change 8 Mar 2026. A 7-day window must stay 7 days.
check("last 7 days across a DST change is still 7 days",
      range("last_7", "America/New_York", "2026-03-10T12:00:00Z"),
      { since: "2026-03-03", until: "2026-03-09", days: 7, metaPreset: "last_7d" });

// ── CUSTOM
check("custom range is used exactly", range("custom", IST, t, { since: "2026-07-02", until: "2026-07-06" }),
      { since: "2026-07-02", until: "2026-07-06", days: 5, metaPreset: null });
check("custom single day", range("custom", IST, t, { since: "2026-07-02", until: "2026-07-02" }),
      { since: "2026-07-02", until: "2026-07-02", days: 1, metaPreset: null });

// ── INVALID INPUT must be reported, never silently corrected
const inverted = range("custom", IST, t, { since: "2026-07-10", until: "2026-07-02" });
check("start after end is rejected", Boolean(inverted.error) && /after end date/.test(inverted.error), true);
const future = range("custom", IST, t, { since: "2026-07-10", until: "2026-12-31" });
check("end date in the future is rejected", Boolean(future.error) && /future/.test(future.error), true);
const malformed = range("custom", IST, t, { since: "15/07/2026", until: "2026-07-20" });
check("malformed date is rejected", Boolean(malformed.error), true);
const missing = range("custom", IST, t, { since: null, until: null });
check("missing custom dates are rejected", Boolean(missing.error), true);
check("impossible date (31 Feb) is rejected", parseISO("2026-02-31"), null);

// ── withinRange is what filters stored rows; boundaries are INCLUSIVE
const r = { since: "2026-07-08", until: "2026-07-14" };
check("range start is included",     withinRange("2026-07-08", r), true);
check("range end is included",       withinRange("2026-07-14", r), true);
check("day before is excluded",      withinRange("2026-07-07", r), false);
check("day after is excluded",       withinRange("2026-07-15", r), false);

// ── civil arithmetic
check("addDays across month end", toISO(addDays({ y: 2026, m: 1, d: 31 }, 1)), "2026-02-01");
check("addDays backwards across year", toISO(addDays({ y: 2026, m: 1, d: 1 }, -1)), "2025-12-31");

console.log(`\n${pass}/${pass + failures.length} date range tests passed`);
if (failures.length) {
  console.error("\nFailures:", JSON.stringify(failures, null, 2));
  process.exit(1);
}
