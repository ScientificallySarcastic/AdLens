// ── Date ranges ─────────────────────────────────────────────────────
// ONE definition of every selectable range, used by the UI, the API, the
// database filter and the platform fetch. If these three disagree, the numbers
// on screen are for a different period than the label claims.
//
// Two rules make this correct rather than approximately correct:
//
//  1. All arithmetic is on CIVIL dates (year/month/day integers), never on
//     Date objects. Adding "-7 days" to a Date crosses DST transitions and UTC
//     boundaries and silently shifts the answer by a day.
//
//  2. For every named range the platform itself defines, we send the
//     platform's own `date_preset` rather than our computed boundaries. The
//     platform's definition is authoritative — "last 7 days" excludes today on
//     Meta — so deferring to it removes off-by-one risk by construction. Only
//     Custom uses an explicit time_range.

export type PresetKey =
  | "today" | "yesterday" | "last_7" | "last_30"
  | "this_month" | "last_month" | "custom";

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7", label: "Last 7 days" },
  { key: "last_30", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

/** Meta's own preset identifier, so the platform defines the boundaries. */
export function metaDatePreset(key: PresetKey): string | null {
  switch (key) {
    case "today": return "today";
    case "yesterday": return "yesterday";
    case "last_7": return "last_7d";
    case "last_30": return "last_30d";
    case "this_month": return "this_month";
    case "last_month": return "last_month";
    case "custom": return null; // explicit time_range instead
  }
}

/* ── civil date helpers (no Date arithmetic) ─────────────────────── */

type Civil = { y: number; m: number; d: number }; // m is 1-12

const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (c: Civil) => `${c.y}-${pad(c.m)}-${pad(c.d)}`;

export function parseISO(s: string): Civil | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const c = { y: +m[1], m: +m[2], d: +m[3] };
  if (c.m < 1 || c.m > 12) return null;
  if (c.d < 1 || c.d > daysInMonth(c.y, c.m)) return null;
  return c;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Add days to a civil date, rolling months and years correctly. */
export function addDays(c: Civil, n: number): Civil {
  let { y, m, d } = c;
  d += n;
  while (d > daysInMonth(y, m)) { d -= daysInMonth(y, m); m++; if (m > 12) { m = 1; y++; } }
  while (d < 1) { m--; if (m < 1) { m = 12; y--; } d += daysInMonth(y, m); }
  return { y, m, d };
}

/** "Today" as the CONNECTED ACCOUNT sees it. Meta reports insights in the ad
 *  account's timezone, so using the server's clock can be a day out. */
export function todayInTz(tz: string, now: Date = new Date()): Civil {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/* ── resolution ─────────────────────────────────────────────────── */

export type Range = {
  key: PresetKey;
  since: string;      // inclusive, YYYY-MM-DD, in the account timezone
  until: string;      // inclusive
  label: string;      // exactly what the UI shows
  metaPreset: string | null;
  days: number;
  timezone: string;
};

export type RangeError = { error: string };

/**
 * Resolve a selection into concrete inclusive boundaries.
 * Mirrors Meta's definitions: "last 7 days" is the 7 days ENDING YESTERDAY,
 * which is what the platform returns for last_7d.
 */
export function resolveRange(
  key: PresetKey,
  tz: string,
  custom?: { since?: string | null; until?: string | null },
  now: Date = new Date()
): Range | RangeError {
  const today = todayInTz(tz, now);
  const yesterday = addDays(today, -1);
  let since: Civil, until: Civil;

  switch (key) {
    case "today":
      since = today; until = today; break;
    case "yesterday":
      since = yesterday; until = yesterday; break;
    case "last_7":
      since = addDays(today, -7); until = yesterday; break;
    case "last_30":
      since = addDays(today, -30); until = yesterday; break;
    case "this_month":
      since = { y: today.y, m: today.m, d: 1 }; until = today; break;
    case "last_month": {
      const prev = today.m === 1 ? { y: today.y - 1, m: 12 } : { y: today.y, m: today.m - 1 };
      since = { ...prev, d: 1 };
      until = { ...prev, d: daysInMonth(prev.y, prev.m) };
      break;
    }
    case "custom": {
      const a = parseISO(custom?.since ?? "");
      const b = parseISO(custom?.until ?? "");
      if (!a || !b) return { error: "Custom range needs a valid start and end date (YYYY-MM-DD)." };
      if (toISO(a) > toISO(b)) return { error: `Start date (${toISO(a)}) is after end date (${toISO(b)}).` };
      if (toISO(b) > toISO(today)) return { error: `End date (${toISO(b)}) is in the future for this account's timezone (${tz}); today is ${toISO(today)}.` };
      since = a; until = b; break;
    }
  }

  const dayCount = daysBetween(since, until);
  return {
    key,
    since: toISO(since),
    until: toISO(until),
    label: labelFor(key, toISO(since), toISO(until)),
    metaPreset: metaDatePreset(key),
    days: dayCount,
    timezone: tz || "UTC",
  };
}

export function daysBetween(a: Civil, b: Civil): number {
  // Count forward on civil dates — no Date maths, so DST cannot affect it.
  let n = 1, cur = a;
  const target = toISO(b);
  while (toISO(cur) < target && n < 1000) { cur = addDays(cur, 1); n++; }
  return toISO(cur) === target ? n : 0;
}

function labelFor(key: PresetKey, since: string, until: string): string {
  const base = PRESETS.find((p) => p.key === key)?.label ?? "Range";
  return since === until ? `${base} · ${since}` : `${base} · ${since} → ${until}`;
}

/** Is an ISO date inside the range (inclusive)? String comparison is safe for
 *  zero-padded ISO dates and avoids constructing Date objects. */
export function withinRange(dateISO: string, r: { since: string; until: string }): boolean {
  return dateISO >= r.since && dateISO <= r.until;
}
