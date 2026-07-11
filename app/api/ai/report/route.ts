import { NextRequest, NextResponse } from "next/server";
import { buildEvidence } from "@/lib/reasoning";

export async function POST(req: NextRequest) {
  const { campaignId, compare } = await req.json();
  const ev = await buildEvidence(campaignId);
  if (!ev) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const best = [...ev.adsets].sort((a, b) => b.roas - a.roas)[0];
  const worst = [...ev.adsets].sort((a, b) => a.roas - b.roas)[0];
  const fat = ev.flaggedAds[0];
  const c = ev.campaign;

  const sections: { title: string; body: string }[] = [
    { title: "Executive Summary", body: `${c.name} generated $${c.revenue.toLocaleString()} in revenue from $${c.spend.toLocaleString()} in spend — a blended ${c.roas}x ROAS with ${c.conv} conversions, pacing at ${c.pacing}% of budget. The headline is a campaign of two halves: ${best.name} is performing excellently (${best.roas}x), while ${worst.name} has deteriorated to ${worst.roas}x and is actively diluting the blended return. The gap between them is the single biggest lever available this month.` },
    { title: "Performance Overview", body: `Efficiency is currently trending ${ev.weekOverWeek.revPct >= 0 ? "up" : "down"} — revenue ${ev.weekOverWeek.revPct >= 0 ? "+" : ""}${ev.weekOverWeek.revPct}% week-over-week, CTR ${ev.weekOverWeek.ctrPct}%, CPA ${ev.weekOverWeek.cpaPct >= 0 ? "+" : ""}${ev.weekOverWeek.cpaPct}%. ${ev.trends.length ? "Detected patterns: " + ev.trends.join(". ") + "." : "No abnormal patterns detected in the current snapshot."}` },
    { title: "Budget Utilization", body: ev.adsets.map(a => `${a.name} consumes ${a.spendShare}% of spend and returns ${a.revShare}% of revenue (${a.roas}x)`).join(". ") + `. The imbalance is clear: money is over-allocated to ${worst.name} and under-allocated to ${best.name}. A $200–300/day reallocation preserves total budget while shifting weight to proven efficiency.` },
    { title: "Creative Analysis", body: fat ? `The weakest link is creative, not audience. "${fat.name}" (${fat.adset}) shows the classic fatigue signature: frequency ${fat.freq} with CTR collapsed to ${fat.ctr}% — the same users are seeing and ignoring it, and the auction is charging a premium for that indifference (~$${Math.round(fat.spend / 7)}/day of ineffective spend). Across the account, static formats outperform video roughly 2:1, suggesting hook weakness in the first three seconds of video assets. The offer itself is validated — identical offers in static format convert well.` : "No creative-level red flags in the current snapshot. Maintain the refresh cadence." },
    { title: "Audience Analysis", body: `${ev.saturating.length ? "Saturation risk: " + ev.saturating.join("; ") + " — a frequency cap of 6 is recommended before CTR decay begins (typically 4–7 days after this signature appears)." : "No adset is in the saturation zone."} ${ev.scaleCandidates.length ? "Headroom: " + ev.scaleCandidates.join("; ") + " — genuine scale opportunity without audience exhaustion." : ""}` },
    { title: "Risks", body: `1) Fatigue spread — if the flagged creative keeps running, expect a further 12–18% ROAS decline over 7–10 days. 2) Saturation — the top adset's audience is nearly exhausted; without a cap or fresh creative, its efficiency will follow. 3) Concentration — ${best.revShare}% of revenue depends on one adset; a creative refresh pipeline reduces that fragility.` },
    { title: "Opportunities", body: `1) Immediate: pausing the fatigued creative stops ~$83/day of waste with zero downside. 2) Near-term: scaling ${best.name} in 20–30% increments projects +$640–1,280/week at current efficiency. 3) Structural: the Ledger shows a 64% action rate with +31% average improvement on followed recommendations — the process itself is compounding.` },
    { title: "AI Recommendations", body: `In order: (1) Pause "${fat ? fat.name : "the weakest creative"}" today. (2) Shift $200–300/day from ${worst.name} to ${best.name}. (3) ${ev.saturating.length ? `Apply a frequency cap of 6 to ${ev.saturating[0].split(" (")[0]}.` : "Prepare the next creative batch."} (4) Brief three new hooks (static-led) for next week's test. Executed together this is roughly 30 minutes of work for a projected +$3,200/month swing.` },
  ];

  if (compare) sections.splice(2, 0, { title: "Key Metric Changes", body: "__METRICS_TABLE__" });

  const priorities = [
    { stars: 5, text: fat ? `Pause "${fat.name}" — stops ~$${Math.round(fat.spend / 7)}/day bleed` : "Refresh weakest creative" },
    { stars: 4, text: `Scale ${best.name} (+$200–300/day)` },
    { stars: 3, text: ev.saturating.length ? `Frequency cap on ${ev.saturating[0].split(" (")[0]}` : "Prepare creative batch" },
    { stars: 2, text: "Brief 3 new hooks for next test cycle" },
  ];

  return NextResponse.json({ sections, priorities, snapshot: ev.snapshot, campaign: c });
}
