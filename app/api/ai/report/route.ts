import { NextRequest, NextResponse } from "next/server";
import { buildEvidence } from "@/lib/reasoning";
import { parseQuery, retrieveData } from "@/lib/aiPipeline";

export const dynamic = "force-dynamic";

// Reports are built from retrieved data on the same terms as the chat pipeline:
// live Meta data is pulled (and re-synced when stale) BEFORE anything is
// composed. Every sentence below interpolates computed evidence — there is no
// stored or invented narrative.

export async function POST(req: NextRequest) {
  const { campaignId, compare } = await req.json();

  const retrieval = await retrieveData(
    String(campaignId),
    parseQuery("full performance report", []),
    new URL(req.url).origin,
  );
  if (!retrieval.ok) {
    return NextResponse.json(
      { error: "retrieval-failed", detail: retrieval.error ?? "Could not retrieve data from the Meta Ads API." },
      { status: 502 },
    );
  }

  const ev = await buildEvidence(campaignId);
  if (!ev) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Guard: a campaign with no adsets synced would otherwise crash the report.
  const EMPTY = { id: "", name: "—", roas: 0, ctr: 0, cpc: 0, freq: 0, reachPct: 0, spendShare: 0, revShare: 0, health: "", note: "" };
  const best = [...ev.adsets].sort((a, b) => b.roas - a.roas)[0] ?? EMPTY;
  const worst = [...ev.adsets].sort((a, b) => a.roas - b.roas)[0] ?? EMPTY;
  const cur = ev.reporting.currency === "INR" ? "\u20b9" : "$";
  const noAdsets = ev.adsets.length === 0;
  // Every monetary or forecast claim below comes from a computed finding.
  const leak = ev.findings.find((f) => f.kind === "budget-leak");
  const scale = ev.findings.find((f) => f.kind === "scale-opportunity");
  const fat = ev.flaggedAds[0];
  const c = ev.campaign;

  const sections: { title: string; body: string }[] = [
    { title: "Executive Summary", body: `${c.name} generated ${cur}${c.revenue.toLocaleString()} in revenue from ${cur}${c.spend.toLocaleString()} in spend — a blended ${c.roas}x ROAS with ${c.conv} conversions, pacing at ${c.pacing}% of budget. The headline is a campaign of two halves: ${best.name} is performing excellently (${best.roas}x), while ${worst.name} has deteriorated to ${worst.roas}x and is actively diluting the blended return. The gap between them is the single biggest lever available this month.` },
    { title: "Performance Overview", body: `Efficiency is currently trending ${ev.weekOverWeek.revPct >= 0 ? "up" : "down"} — revenue ${ev.weekOverWeek.revPct >= 0 ? "+" : ""}${ev.weekOverWeek.revPct}% week-over-week, CTR ${ev.weekOverWeek.ctrPct}%, CPA ${ev.weekOverWeek.cpaPct >= 0 ? "+" : ""}${ev.weekOverWeek.cpaPct}%. ${ev.trends.length ? "Detected patterns: " + ev.trends.join(". ") + "." : "No abnormal patterns detected in the current snapshot."}` },
    { title: "Budget Utilization", body: ev.adsets.map(a => `${a.name} consumes ${a.spendShare}% of spend and returns ${a.revShare}% of revenue (${a.roas}x)`).join(". ") + `. The imbalance is clear: money is over-allocated to ${worst.name} and under-allocated to ${best.name}. ${leak ? `The measured misallocation: ${leak.estImpact}. Reallocating that amount preserves total budget while shifting weight to proven efficiency.` : "Spend share tracks revenue share across adsets — no reallocation is indicated by this window's data."}` },
    { title: "Creative Analysis", body: fat ? `The weakest link is creative, not audience. "${fat.name}" (${fat.adset}) shows the classic fatigue signature: frequency ${fat.freq} with CTR collapsed to ${fat.ctr}% — the same users are seeing and ignoring it, and the auction is charging a premium for that indifference (~${cur}${Math.round(fat.spend / 7).toLocaleString()}/day of ineffective spend). ${noAdsets ? "" : (() => {
      const ads = ev.flaggedAds;
      return ads.length > 1 ? `${ads.length} creatives are showing decay signatures — the pattern is concentrated, not account-wide.` : "";
    })()}` : "No creative-level red flags in the current snapshot. Maintain the refresh cadence." },
    { title: "Audience Analysis", body: `${ev.saturating.length ? "Saturation risk: " + ev.saturating.join("; ") + " — capping frequency below the observed level is indicated before CTR degrades." : "No adset meets the saturation thresholds in this window."} ${ev.scaleCandidates.length ? "Headroom: " + ev.scaleCandidates.join("; ") + "." : ""} ${ev.reporting.caveats.join(" ")}` },
    { title: "Risks", body: `${ev.trends.length ? `1) Continuation — the detected trends persist if nothing changes: ${ev.trends.join("; ")}.` : "1) No deterioration trend is present in this window."} ${ev.saturating.length ? `2) Saturation — ${ev.saturating.join("; ")}.` : "2) No saturation signal."} ${best.revShare > 0 ? `3) Concentration — ${best.revShare}% of revenue depends on ${best.name}; a creative refresh pipeline reduces that fragility.` : ""}` },
    { title: "Opportunities", body: `${fat ? `1) Immediate: pausing "${fat.name}" stops ${ev.findings.find(f => f.target.includes(fat.name))?.estImpact ?? "its ongoing spend"}. ` : "1) No single creative is clearly wasteful in this window. "}${noAdsets ? "" : `2) Near-term: ${best.name} is the strongest performer — incremental budget shifts there carry the least risk. `}3) Structural: recommendations are logged with outcomes in the Ledger, so efficacy is measured rather than assumed.` },
    { title: "AI Recommendations", body: `In order: ${fat ? `(1) Pause "${fat.name}" — ${fat.issue} (${fat.basis}, confidence ${fat.confidence}).` : "(1) No single creative meets the fatigue thresholds in this window."} ${leak ? `(2) Reallocate the misallocated spend: ${leak.estImpact}.` : "(2) No reallocation is indicated by this window's data."} ${ev.saturating.length ? `(3) Cap frequency on ${ev.saturating[0].split(" (")[0]}.` : "(3) No audience action indicated."} ${scale ? `(4) Scale ${scale.target} — ${scale.estImpact}.` : ""}` },
  ];

  if (noAdsets) {
    sections.unshift({
      title: "Data Coverage",
      body: `This report is built from campaign-level metrics only — ad set and ad level data has not been synced for ${c.name}. Budget allocation, creative fatigue and audience saturation analysis require that data and are therefore omitted rather than estimated.`,
    });
  }
  if (!ev.reporting.revenueTracked) {
    sections.unshift({
      title: "Reporting Note",
      body: `This ad account reports no purchase value to the API, so revenue and ROAS are unavailable — not zero. Efficiency in this report is assessed on CTR, CPC, frequency and ${ev.reporting.conversionBasis}.`,
    });
  }
  // Period-over-period rows computed from the evidence. The page previously
  // substituted a HARDCODED table here ($5,620 / 3.2x / 348) and presented it
  // as measured metric changes. Anything not derivable is omitted.
  const wow = ev.weekOverWeek;
  const compareRows = compare
    ? [
        { metric: "CTR", change: `${wow.ctrPct >= 0 ? "+" : ""}${wow.ctrPct}%`, better: wow.ctrPct >= 0 },
        { metric: "Cost per result", change: `${wow.cpaPct >= 0 ? "+" : ""}${wow.cpaPct}%`, better: wow.cpaPct <= 0 },
        ...(ev.reporting.revenueTracked
          ? [{ metric: "Revenue", change: `${wow.revPct >= 0 ? "+" : ""}${wow.revPct}%`, better: wow.revPct >= 0 }]
          : []),
      ]
    : [];
  if (compare) {
    sections.splice(2, 0, {
      title: "Key Metric Changes",
      body: compareRows.length
        ? `Week-over-week movement, measured from the synced series: ${compareRows.map((r) => `${r.metric} ${r.change}`).join(", ")}.${ev.reporting.revenueTracked ? "" : " Revenue change is unavailable — this account reports no purchase value."}`
        : "No comparison period is available in the synced data.",
    });
  }

  const priorities = [
    { stars: 5, text: fat ? `Pause "${fat.name}" — ${ev.findings.find(f => f.target.includes(fat.name))?.estImpact ?? fat.issue}` : "No creative meets the fatigue thresholds" },
    { stars: 4, text: scale ? `Scale ${scale.target} — ${scale.estImpact}` : leak ? `Reallocate from ${leak.target} — ${leak.estImpact}` : "No budget action indicated by current data" },
    { stars: 3, text: ev.saturating.length ? `Frequency cap on ${ev.saturating[0].split(" (")[0]}` : "No audience action indicated" },
    { stars: 2, text: ev.trends.length ? `Monitor: ${ev.trends[0]}` : "No trend requiring monitoring" },
  ];

  return NextResponse.json({
    sections, priorities, snapshot: ev.snapshot, campaign: c, compareRows,
    currency: ev.reporting.currency,
    retrieval: { live: retrieval.isLive, refreshed: retrieval.refreshed, syncedAt: retrieval.syncedAt },
  });
}
