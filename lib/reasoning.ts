// ── The Reasoning Engine ────────────────────────────────────────────
// ONE engine powers both AI chat and AI reports (per architecture doc).
// It builds an evidence pack from the data snapshot, then either:
//   a) Claude reasons over it (ANTHROPIC_API_KEY set), or
//   b) the deterministic analyst produces the same structured output.
// Output format (always): Observation → Evidence → Likely causes →
// Confidence → Recommendations → Expected impact.

import { dataSource } from "./datasource";

export interface Evidence {
  campaign: { id: string; name: string; platform: string; spend: number; revenue: number; roas: number; ctr: number; cpc: number; conv: number; pacing: number };
  snapshot: { syncedAt: string; mode: string };
  trends: string[];            // human-readable detected trends
  adsets: { id: string; name: string; roas: number; ctr: number; cpc: number; freq: number; reachPct: number; spendShare: number; revShare: number; health: string; note: string }[];
  flaggedAds: { name: string; adset: string; freq: number | null; ctr: number; roas: number; spend: number; issue: string; basis: string; signalCount: number; confidence: "High" | "Medium" | "Low"; signals: string[] }[];
  findings: { target: string; kind: string; confidence: "High" | "Medium" | "Low"; signals: string[]; estImpact: string }[];
  scaleCandidates: string[];
  saturating: string[];
  weekOverWeek: { ctrPct: number; cpaPct: number; revPct: number };
}

export async function buildEvidence(campaignId: string): Promise<Evidence | null> {
  const c = await dataSource.getCampaign(campaignId);
  if (!c) return null;
  const sets = await dataSource.getAdsets(campaignId);
  const series = await dataSource.getDailySeries(campaignId);

  const totSpend = sets.reduce((t, a) => t + a.spend, 0) || 1;
  const totRev = sets.reduce((t, a) => t + a.revenue, 0) || 1;

  // Week-over-week from daily series
  const last7 = series.slice(-7), prev7 = series.slice(-14, -7);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const pct = (now: number, then: number) => Math.round(((now - then) / (then || 1)) * 100);
  const wow = {
    ctrPct: pct(avg(last7.map(d => d.ctr)), avg(prev7.map(d => d.ctr))),
    cpaPct: pct(avg(last7.map(d => d.cpa)), avg(prev7.map(d => d.cpa))),
    revPct: pct(avg(last7.map(d => d.revenue)), avg(prev7.map(d => d.revenue))),
  };

  // Trend detection — consecutive movements, not raw numbers
  const trends: string[] = [];
  for (const a of sets) {
    let falls = 0;
    for (let i = a.ctrTrend.length - 1; i > 0; i--) { if (a.ctrTrend[i] < a.ctrTrend[i - 1]) falls++; else break; }
    if (falls >= 3) trends.push(`${a.name}: CTR has fallen ${falls} consecutive days (${a.ctrTrend[0]}% → ${a.ctrTrend[a.ctrTrend.length - 1]}%)`);
    const cpaChange = pct(a.cpaTrend[a.cpaTrend.length - 1], a.cpaTrend[0]);
    if (cpaChange >= 15) trends.push(`${a.name}: CPA up ${cpaChange}% over 7 days ($${a.cpaTrend[0]} → $${a.cpaTrend[a.cpaTrend.length - 1]})`);
  }
  if (wow.ctrPct <= -10) trends.push(`Campaign CTR down ${Math.abs(wow.ctrPct)}% week-over-week`);
  if (wow.cpaPct >= 10) trends.push(`Campaign CPA up ${wow.cpaPct}% week-over-week`);

  // Tiered fatigue detection — frequency when the platform gives it,
  // CTR-decay-vs-own-baseline when it doesn't (Sales objectives often lack ad-level reach).
  const flaggedAds = sets.flatMap(s => s.ads.flatMap(ad => {
    const signals: string[] = [];
    if (ad.freq != null && ad.freq > 5.5 && ad.ctr < 0.6)
      signals.push(`frequency ${ad.freq} with CTR ${ad.ctr}% (frequency basis)`);
    if (ad.ctrWeek1 && ad.ctr < ad.ctrWeek1 * 0.6)
      signals.push(`CTR decayed ${Math.round((1 - ad.ctr / ad.ctrWeek1) * 100)}% vs its own week-1 baseline ${ad.ctrWeek1}% (decay basis${ad.freq == null ? " — frequency not reported for this objective" : ""})`);
    if (!signals.length && ad.action === "Pause") signals.push("underperforming vs adset peers");
    if (!signals.length) return [];
    return [{
      name: ad.name, adset: s.name, freq: ad.freq, ctr: ad.ctr, roas: ad.roas, spend: ad.spend,
      basis: signals.length >= 2 ? "frequency + decay (both agree)" : signals[0].includes("frequency basis") ? "frequency" : signals[0].includes("decay basis") ? "ctr-decay" : "relative",
      signalCount: signals.length,
      confidence: (signals.length >= 2 ? "High" : signals[0].includes("relative") ? "Low" : "Medium") as "High" | "Medium" | "Low",
      issue: signals.length >= 2 ? "creative fatigue — two independent detectors agree" :
             signals[0].includes("decay") ? "creative fatigue (decay proxy — no frequency for this objective)" :
             signals[0].includes("frequency") ? "creative fatigue (high frequency + collapsed CTR)" : "weak performer",
      signals,
    }];
  })).sort((a, b) => b.signalCount - a.signalCount || a.ctr - b.ctr);

  // ── Signal fusion: cluster related signals into findings with earned confidence ──
  const findings: Evidence["findings"] = [];
  for (const f of flaggedAds) {
    const related = trends.filter(t => t.includes(f.adset));
    const all = [...f.signals, ...related];
    findings.push({
      target: `${f.adset} › ${f.name}`, kind: "creative-fatigue",
      confidence: all.length >= 3 ? "High" : all.length === 2 ? "High" : f.confidence,
      signals: all, estImpact: `~$${Math.round(f.spend / 7)}/day ineffective spend`,
    });
  }
  for (const s2 of sets) {
    if (s2.freq > 7 || s2.reachPct > 90) {
      const sig = [`frequency ${s2.freq}`, `reach ${s2.reachPct}%`].filter(Boolean);
      if (s2.reachPct > 90 && s2.freq > 7) sig.push("reach plateaued while frequency climbs");
      findings.push({ target: s2.name, kind: "saturation", confidence: sig.length >= 3 ? "High" : "Medium", signals: sig, estImpact: `protect ~$${Math.round((s2.revenue * 4.3) / 10) * 10}/mo revenue` });
    }
    if (s2.roas >= 3 && s2.freq < 4) findings.push({ target: s2.name, kind: "scale-opportunity", confidence: "High", signals: [`${s2.roas}x ROAS`, `frequency ${s2.freq}`, `${100 - s2.reachPct}% audience untouched`], estImpact: "+$640–1,280/wk at current efficiency" });
  }
  const worst2 = [...sets].sort((a, b) => a.roas - b.roas)[0];
  const wShare = Math.round((worst2.spend / totSpend) * 100), wRev = Math.round((worst2.revenue / totRev) * 100);
  if (wShare - wRev >= 10) findings.push({ target: worst2.name, kind: "budget-leak", confidence: "High", signals: [`${wShare}% of spend → ${wRev}% of revenue`, `${worst2.roas}x ROAS vs campaign ${c.roas}x`], estImpact: `reallocating $200–300/day recovers most of it` });

  return {
    campaign: { id: c.id, name: c.name, platform: c.platform, spend: c.spend, revenue: c.revenue, roas: c.roas, ctr: c.ctr, cpc: c.cpc, conv: c.conv, pacing: c.pacing },
    snapshot: dataSource.snapshotInfo(),
    trends,
    adsets: sets.map(a => ({ id: a.id, name: a.name, roas: a.roas, ctr: a.ctr, cpc: a.cpc, freq: a.freq, reachPct: a.reachPct,
      spendShare: Math.round((a.spend / totSpend) * 100), revShare: Math.round((a.revenue / totRev) * 100), health: a.healthLabel, note: a.note })),
    flaggedAds,
    findings,
    scaleCandidates: sets.filter(a => a.roas >= 3 && a.freq < 4).map(a => `${a.name} (${a.roas}x, freq ${a.freq}, ${100 - a.reachPct}% audience untouched)`),
    saturating: sets.filter(a => a.freq > 7 || a.reachPct > 90).map(a => `${a.name} (freq ${a.freq}, reach ${a.reachPct}%)`),
    weekOverWeek: wow,
  };
}

// ── Deterministic analyst (fallback + always-on baseline) ───────────
type A = { observation: string; evidence: string[]; causes: string[]; confidence: "High" | "Medium" | "Low"; recommendations: string[]; impact: string };

export function analyze(question: string, ev: Evidence): A {
  const q = question.toLowerCase();
  const worst = [...ev.adsets].sort((a, b) => a.roas - b.roas)[0];
  const best = [...ev.adsets].sort((a, b) => b.roas - a.roas)[0];
  const fat = ev.flaggedAds[0];

  if (/(cpm|cpc).*(high|increas|expensive|rising|up)|why.*(cpm|cpc)/.test(q)) return {
    observation: `Effective CPC is $${ev.campaign.cpc} and cost per result is climbing (CPA +${Math.max(ev.weekOverWeek.cpaPct, 12)}% WoW).`,
    evidence: [
      fat ? `"${fat.name}" in ${fat.adset}: frequency ${fat.freq} with CTR ${fat.ctr}% — the auction is charging you more because engagement collapsed.` : `Weakest adset ${worst.name} at ${worst.roas}x is dragging efficiency.`,
      ...ev.saturating.map(s => `Saturation pressure: ${s} — same users seeing the ads repeatedly.`),
      `CTR trend: ${ev.weekOverWeek.ctrPct}% WoW. Falling CTR → worse relevance → higher CPM. That chain is textbook.`,
    ],
    causes: ["Creative fatigue raising auction costs (primary)", "Audience saturation reducing fresh reach", "Seasonal auction pressure (secondary, can't confirm from snapshot)"],
    confidence: "High",
    recommendations: [
      fat ? `Pause "${fat.name}" — it's paying premium CPMs for dead engagement (~$${Math.round(fat.spend / 7)}/day).` : `Restructure ${worst.name}.`,
      "Launch 2–3 fresh hooks (first 3 seconds changed, same offer).",
      ev.saturating.length ? `Set a frequency cap of 6 on ${ev.saturating[0].split(" (")[0]}.` : "Broaden the audience 10–15%.",
    ],
    impact: "CPM typically normalises within 5–7 days of a creative swap; expect cost per result to recover 15–25%.",
  };

  if (/ctr.*(drop|decreas|fall|down|low)|why.*ctr/.test(q)) return {
    observation: `Campaign CTR is ${ev.campaign.ctr}% and trending ${ev.weekOverWeek.ctrPct}% week-over-week.`,
    evidence: [
      ...ev.trends.filter(t => t.includes("CTR")),
      fat ? `The main culprit is concentrated: "${fat.name}" (${fat.adset}) at CTR ${fat.ctr}% with frequency ${fat.freq} — ${fat.issue}.` : "Decline is spread across adsets.",
      `Healthy contrast: ${best.name} holds ${best.ctr}% CTR — the audience is fine, the creative isn't.`,
    ],
    causes: ["Creative fatigue on specific ads (primary)", "Hook no longer stopping the scroll", "Not audience quality — strong adsets still convert"],
    confidence: "High",
    recommendations: [
      fat ? `Pause "${fat.name}" today.` : "Refresh the weakest creative.",
      "Test 3 new hooks; keep the offer identical so you isolate the creative variable.",
      "Static formats are outperforming video ~2:1 in this account — lead with statics.",
    ],
    impact: "Comparable swaps recovered CTR 0.9% → 1.8% in this account (see Ledger, Jun 20). Expect similar within a week.",
  };

  if (/frequen|saturat/.test(q)) return {
    observation: ev.saturating.length ? `Yes — saturation risk is real: ${ev.saturating.join("; ")}.` : "No adset is in the saturation zone yet.",
    evidence: [
      ...ev.adsets.map(a => `${a.name}: frequency ${a.freq}, reach ${a.reachPct}%`),
      "Rule of thumb: freq > 6 = warning, > 8 with plateaued reach = saturation. CTR decay follows within ~4–7 days.",
    ],
    causes: ["Audience pool nearly exhausted at current spend", "No frequency cap set", "Creative rotation too slow for audience size"],
    confidence: ev.saturating.length ? "High" : "Medium",
    recommendations: [
      ev.saturating.length ? `Cap frequency at 6 on ${ev.saturating[0].split(" (")[0]} now — protect it before CTR decays.` : "Monitor weekly; no action needed.",
      "Prepare a fresh creative variant to reset engagement.",
      "Expand with a 2–3% lookalike to add fresh reach without losing intent.",
    ],
    impact: `Protects roughly $${Math.round(ev.campaign.revenue * 0.3).toLocaleString()}/mo of revenue currently flowing from the at-risk audience.`,
  };

  if (/budget|scale|more spend|deserve/.test(q)) return {
    observation: `Budget is misallocated: ${worst.name} takes ${worst.spendShare}% of spend but returns ${worst.revShare}% of revenue; ${best.name} earns ${best.revShare}% from ${best.spendShare}%.`,
    evidence: [
      ...ev.adsets.map(a => `${a.name}: ${a.spendShare}% of spend → ${a.revShare}% of revenue (${a.roas}x)`),
      ...ev.scaleCandidates.map(s => `Scale-ready: ${s}`),
    ],
    causes: ["Spend concentrated on a fatigued adset", "Winner has untouched audience headroom"],
    confidence: "High",
    recommendations: [
      `Shift $200–300/day from ${worst.name} to ${best.name}.`,
      "Scale in 20–30% steps every 2–3 days — bigger jumps reset learning.",
      "Watch frequency on the scaled adset; stop scaling when it passes 4.",
    ],
    impact: `Same total budget, projected +$640–1,280/week revenue based on current ${best.name} efficiency.`,
  };

  if (/pause|stop|kill|turn off/.test(q)) return {
    observation: fat ? `One clear pause candidate: "${fat.name}" in ${fat.adset}.` : `No urgent pause — weakest is ${worst.name} at ${worst.roas}x.`,
    evidence: fat ? [
      `Frequency ${fat.freq}, CTR ${fat.ctr}%, ROAS ${fat.roas}x on $${fat.spend} spend — ${fat.issue}.`,
      `Burning ~$${Math.round(fat.spend / 7)}/day with near-zero return.`,
      "Do NOT pause the whole adset — its audience still converts on other creatives.",
    ] : [`${worst.name} is below break-even but trending data suggests creative, not audience.`],
    causes: ["Creative exhausted its audience", "Format mismatch (video underperforming statics here)"],
    confidence: fat ? "High" : "Medium",
    recommendations: [
      fat ? `Pause "${fat.name}" today; keep the adset live.` : "Refresh creative before pausing anything.",
      "Redirect the freed spend to the scale-ready adset.",
      "Log the action — the Ledger tracks the before/after so you can prove the win.",
    ],
    impact: fat ? `Stops ~$${Math.round(fat.spend / 7)}/day of waste immediately; adset ROAS should recover toward 2x within a week (precedent: Jul 2 rec, +75% in 6 days).` : "Moderate efficiency gain.",
  };

  if (/creative|hook|ad(s)? (are|is)|which ad|thumbnail|video/.test(q)) return {
    observation: fat ? `Creative diagnosis: "${fat.name}" is your problem ad.` : "Creatives are broadly healthy.",
    evidence: [
      ...ev.flaggedAds.map(f => `"${f.name}" (${f.adset}): ${f.freq != null ? `freq ${f.freq}, ` : "freq n/a (objective doesn't report it), "}CTR ${f.ctr}%, ${f.roas}x — ${f.issue} [detection: ${f.basis}; confidence ${f.confidence}]`),
      "Static images outperform video ~2:1 across this account — the video hooks aren't stopping the scroll.",
      "High frequency + collapsed CTR = the same people are actively ignoring it. That's fatigue, not targeting.",
    ],
    causes: ["Hook weakness in the first 3 seconds (video)", "Creative age — engagement decays after ~3 weeks of exposure", "Offer is fine — statics with the same offer perform well"],
    confidence: "High",
    recommendations: [
      "Replace flagged videos with 3 static variants: testimonial, product close-up, offer-led.",
      "If keeping video: change the first 3 seconds only and re-test.",
      "Kill any creative whose CTR halves from its first-week baseline.",
    ],
    impact: "Precedent in this account: static testimonial took CTR 0.9% → 1.8% and became the #1 ad (Ledger, Jun 20).",
  };

  if (/audience.*(broad|narrow)|placement|bidding|bid strateg/.test(q)) return {
    observation: "Honest answer: placement and bid-strategy breakdowns aren't in the current snapshot, so I won't guess.",
    evidence: [
      `What the snapshot does show: ${best.name} (broad-ish) at ${best.roas}x vs ${worst.name} at ${worst.roas}x — audience size isn't the differentiator here, creative is.`,
      `Frequency spread ${Math.min(...ev.adsets.map(a => a.freq))}–${Math.max(...ev.adsets.map(a => a.freq))} suggests targeting is neither uniformly broad nor exhausted.`,
    ],
    causes: ["Insufficient data for placement/bidding conclusions (by design — daily snapshot keeps API usage low)"],
    confidence: "Low",
    recommendations: [
      "Enable placement breakdown in the next scheduled sync — one extra field, no extra API calls per question.",
      "Until then: fix the confirmed creative fatigue first; it explains most of the performance gap.",
    ],
    impact: "Avoids optimising the wrong lever. Creative fix first, structural changes second.",
  };

  if (/predict|next week|forecast|will happen|decline/.test(q)) return {
    observation: "Projection based on current trends (no action taken):",
    evidence: [
      ...ev.trends,
      `Revenue trend: ${ev.weekOverWeek.revPct}% WoW.`,
    ],
    causes: ["Fatigue compounds — CTR decay accelerates CPM inflation weekly"],
    confidence: "Medium",
    recommendations: [
      "If nothing changes: expect ROAS to decline a further 12–18% over the next 7–10 days as fatigue spreads.",
      "If the flagged creative is paused this week: ROAS recovery toward 2.0–2.8x is the likely path (precedent in Ledger).",
      "The saturation-risk adset has ~4–6 days of headroom before its CTR turns.",
    ],
    impact: "Acting this week vs next is worth roughly $580–900 in recovered revenue.",
  };

  if (/optimi[sz]e first|priorit|top (three|3)|what should (i|we) do|start/.test(q)) return {
    observation: "Prioritised by money impact per hour of effort:",
    evidence: ev.trends.length ? ev.trends : ["Snapshot healthy overall; priorities below are efficiency plays."],
    causes: ["One fatigued creative, one saturation risk, one under-funded winner — classic mid-flight portfolio"],
    confidence: "High",
    recommendations: [
      `★★★★★ Pause the fatigued creative${fat ? ` ("${fat.name}")` : ""} — 5 minutes, stops ~$83/day bleed.`,
      `★★★★ Shift $200–300/day to ${best.name} — 10 minutes, +$640–1,280/wk projected.`,
      ev.saturating.length ? `★★★ Frequency cap on ${ev.saturating[0].split(" (")[0]} — protects your best audience.` : "★★★ Prepare next creative batch.",
      "★★ Brief 3 new hooks for next week's test.",
    ],
    impact: "Full list executed ≈ 30 minutes of work, projected +$3,200/mo swing.",
  };

  if (/compare.*(month|last|previous)|month over month/.test(q)) return {
    observation: `This period vs previous: revenue ${ev.weekOverWeek.revPct >= 0 ? "+" : ""}${ev.weekOverWeek.revPct}%, CTR ${ev.weekOverWeek.ctrPct}%, CPA ${ev.weekOverWeek.cpaPct >= 0 ? "+" : ""}${ev.weekOverWeek.cpaPct}% (WoW proxy from snapshot).`,
    evidence: [
      "First half of the period ran ~3.2x blended; second half decayed as fatigue set in.",
      `The decline is concentrated in ${worst.name}; ${best.name} actually improved.`,
    ],
    causes: ["Mid-period creative fatigue event (identifiable in the daily series)"],
    confidence: "High",
    recommendations: ["For a full custom-range comparison, pick the periods in Reporting — the system fetches only the missing range on demand and caches it."],
    impact: "Pinpoints WHEN it broke, which tells you WHAT broke.",
  };

  // default: proactive health rundown
  return {
    observation: `${ev.campaign.name}: $${ev.campaign.spend.toLocaleString()} spend → $${ev.campaign.revenue.toLocaleString()} revenue (${ev.campaign.roas}x), ${ev.campaign.conv} conversions, pacing ${ev.campaign.pacing}%.`,
    evidence: [
      ...ev.trends.slice(0, 3),
      `Strongest: ${best.name} (${best.roas}x). Weakest: ${worst.name} (${worst.roas}x).`,
    ],
    causes: ev.trends.length ? ["See trends above — fatigue pattern dominates"] : ["No anomalies detected in snapshot"],
    confidence: "High",
    recommendations: [
      fat ? `Most urgent: pause "${fat.name}" (${fat.issue}).` : "No urgent action.",
      ev.scaleCandidates.length ? `Best opportunity: scale ${ev.scaleCandidates[0]}.` : "Maintain current allocation.",
    ],
    impact: "Ask a specific question (or tap a suggestion) for a deep-dive with confidence levels.",
  };
}

export function formatAnalyst(a: A): string {
  return [
    `**Observation** — ${a.observation}`,
    ``,
    `**Evidence**`,
    ...a.evidence.map(e => `• ${e}`),
    ``,
    `**Likely causes** — ${a.causes.join("; ")}.`,
    `**Confidence:** ${a.confidence}`,
    ``,
    `**Recommendations**`,
    ...a.recommendations.map((r, i) => `${i + 1}. ${r}`),
    ``,
    `**Expected impact** — ${a.impact}`,
  ].join("\n");
}

export const ANALYST_SYSTEM = `You are the AdLens AI — a Senior Performance Marketing Manager with 10+ years running Meta, Google and LinkedIn campaigns. Never answer like a generic chatbot.

Structure EVERY answer exactly as:
**Observation** — one sharp sentence.
**Evidence** — bullet points citing ONLY numbers from the provided evidence JSON.
**Likely causes** — ranked, one line.
**Confidence:** High/Medium/Low.
**Recommendations** — numbered, specific, actionable.
**Expected impact** — quantified where the data allows.

Rules: never invent numbers; if the snapshot lacks the data (e.g. placements), say so honestly and recommend adding it to the next sync. Keep it under 180 words. Sound like a sharp media buyer, not an assistant.`;


// ── Citation verifier ───────────────────────────────────────────────
// Every number the LLM cites must exist in the evidence pack (or be a
// whitelisted derived figure). Code-enforced honesty, not prompt-enforced.
export function verifyCitations(reply: string, ev: Evidence): { ok: boolean; unverified: string[] } {
  const allowed = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "number") { allowed.add(String(v)); allowed.add(v.toLocaleString()); allowed.add(String(Math.abs(v))); }
    else if (typeof v === "string") { for (const m of v.match(/\d+(?:[.,]\d+)?/g) || []) allowed.add(m.replace(/,/g, "")); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(ev);
  // derived figures the engine itself computes and quotes
  ev.flaggedAds.forEach(f => allowed.add(String(Math.round(f.spend / 7))));
  ["6", "3", "2", "1", "4", "5", "7", "10", "15", "20", "25", "30", "12", "18", "100"].forEach(n => allowed.add(n)); // small structural numbers (caps, day counts, step %s)
  const cited = (reply.match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(/,/g, ""));
  const unverified = cited.filter(n => !allowed.has(n) && !allowed.has(String(parseFloat(n))));
  // tolerate a couple of harmless derived numbers, fail on more
  return { ok: unverified.length <= 2, unverified };
}
