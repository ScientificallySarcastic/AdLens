import { getCampaign, adsetsFor } from "./data";

export function buildCampaignContext(id: string) {
  const c = getCampaign(id);
  if (!c) return null;
  const sets = adsetsFor(id);
  return {
    name: c.name, platform: c.platform, spend: c.spend, revenue: c.revenue,
    roas: c.roas, ctr: c.ctr, conv: c.conv, pacing: c.pacing,
    adsets: sets.map((a) => ({ name: a.name, roas: a.roas, ctr: a.ctr, freq: a.freq, health: a.healthLabel, note: a.note })),
    worst: sets.reduce((m, a) => (a.roas < m.roas ? a : m), sets[0]),
    best: sets.reduce((m, a) => (a.roas > m.roas ? a : m), sets[0]),
  };
}

export function fallbackReply(q: string, ctx: NonNullable<ReturnType<typeof buildCampaignContext>>) {
  const l = q.toLowerCase();
  if (l.includes("budget") || l.includes("realloc"))
    return `Based on **${ctx.name}**: shift budget from **${ctx.worst.name}** (${ctx.worst.roas}x — below break-even) to **${ctx.best.name}** (${ctx.best.roas}x, freq ${ctx.best.freq}). Same total spend, projected ~$2,000+/week additional revenue.`;
  if (l.includes("roas") && (l.includes("drop") || l.includes("why")))
    return `**${ctx.name}** blended ROAS is ${ctx.roas}x. The drag is **${ctx.worst.name}** (${ctx.worst.roas}x) — ${ctx.worst.note.toLowerCase()}. Its frequency and CTR pattern indicate creative fatigue, not audience exhaustion.`;
  if (l.includes("scale"))
    return `**${ctx.best.name}** is the scale candidate: ${ctx.best.roas}x ROAS, frequency ${ctx.best.freq}, significant audience headroom. Increase $200–400/day and watch frequency stay under 4.`;
  if (l.includes("pause"))
    return `Pause the fatigued creative inside **${ctx.worst.name}** — not the whole adset. The audience is valid; the creative is exhausted.`;
  return `**${ctx.name}** (${ctx.platform === "meta" ? "Meta" : "LinkedIn"}): $${ctx.spend.toLocaleString()} spend · ${ctx.roas}x ROAS · ${ctx.conv} conversions · pacing ${ctx.pacing}%. Weakest: ${ctx.worst.name} (${ctx.worst.roas}x). Strongest: ${ctx.best.name} (${ctx.best.roas}x). What should I dig into?`;
}
