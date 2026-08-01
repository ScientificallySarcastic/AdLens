// ── Single source of truth for money formatting ─────────────────────
// Previously three places did `currency === "INR" ? "₹" : "$"`, which
// silently rendered every non-INR account as dollars. Import this instead.
// Safe for client components: no DB or server-only imports.

const SYMBOLS: Record<string, string> = {
  USD: "$", INR: "\u20b9", EUR: "\u20ac", GBP: "\u00a3", JPY: "\u00a5",
  AUD: "A$", CAD: "C$", SGD: "S$", NZD: "NZ$", AED: "AED ", SAR: "SAR ",
  BRL: "R$", MXN: "MX$", ZAR: "R", CHF: "CHF ", SEK: "kr ", NOK: "kr ",
  DKK: "kr ", PLN: "z\u0142 ", TRY: "\u20ba", IDR: "Rp ", MYR: "RM ",
  PHP: "\u20b1", THB: "\u0e3f", VND: "\u20ab", KRW: "\u20a9", CNY: "CN\u00a5",
  HKD: "HK$", TWD: "NT$", ILS: "\u20aa", NGN: "\u20a6", KES: "KSh ",
};

/** Symbol for an ISO currency code. Unknown codes fall back to the code itself
 *  (e.g. "PKR 1,200") — never to "$", which would misstate the amount. */
export function sym(code: string | null | undefined): string {
  if (!code) return "$";
  return SYMBOLS[String(code).toUpperCase()] ?? `${String(code).toUpperCase()} `;
}

/** Format an amount in the account's currency. */
export function money(n: number, code: string | null | undefined): string {
  return `${sym(code)}${Math.round(n).toLocaleString()}`;
}
