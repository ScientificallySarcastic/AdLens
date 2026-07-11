// ── Deterministic seeded dataset — MockAdapter source of truth ──
export type Platform = "meta" | "li";
export type Health = "good" | "watch" | "critical" | "paused";

export interface Campaign {
  id: string; name: string; platform: Platform; status: "Active" | "Paused";
  objective: string; spend: number; revenue: number; roas: number; ctr: number;
  cpc: number; conv: number; pacing: number; health: Health; note: string;
  spark: number[];
}
export interface AdSet {
  id: string; campaignId: string; name: string; health: Health; healthLabel: string;
  spend: number; revenue: number; roas: number; ctr: number; cpc: number; freq: number;
  conv: number; reachPct: number; note: string;
  ctrTrend: number[]; cpaTrend: number[];
  kpiDeltas: { spend: string; revenue: string; roas: string; ctr: string; cpc: string; freq: string };
  ads: AdItem[];
  insight: { tag: "issue" | "watch" | "rec"; title: string; body: string };
}
export interface AdItem {
  id: string; name: string; format: "Image" | "Video" | "Carousel";
  spend: number; ctr: number; roas: number;
  /** null for objectives where the platform doesn't report reach at ad level (e.g. many Sales campaigns) */
  freq: number | null;
  /** the ad's own first-week CTR — baseline for frequency-free fatigue detection */
  ctrWeek1?: number;
  conv: number;
  action: "Scale" | "Pause" | "Monitor"; rank: "top" | "mid" | "low"; rankLabel: string;
}
export interface Recommendation {
  id: string; date: string; title: string; evidence: string; where: string;
  status: "followed" | "ignored" | "pending"; actionDate?: string;
  outcome: string; outcomeDetail: string; outcomeGood?: boolean;
}
export interface AlertRow {
  severity: "Critical" | "Warning"; campaign: string; rule: string;
  value: string; threshold: string; ago: string;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);

const flagshipAdsets: AdSet[] = [
  {
    id: "female", campaignId: "summer-sale", name: "18–34 Female", health: "watch", healthLabel: "Freq risk",
    spend: 1040, revenue: 4576, roas: 4.4, ctr: 2.3, cpc: 1.1, freq: 8.2, conv: 142, reachPct: 94,
    note: "Best performer — approaching saturation",
    ctrTrend: [1.9, 2.0, 2.1, 2.2, 2.3, 2.35, 2.3], cpaTrend: [12, 11.5, 11, 10.8, 10.8, 11, 11.4],
    kpiDeltas: { spend: "↑10%", revenue: "↑14%", roas: "↑0.3x", ctr: "↑0.2pts", cpc: "↓$0.20", freq: "↑2.1 — cap soon" },
    ads: [
      { id: "a1", name: "Summer 40% — Static", format: "Image", spend: 420, ctr: 2.4, roas: 4.8, freq: 3.1, conv: 96, action: "Scale", rank: "top", rankLabel: "#1" },
      { id: "a2", name: "Lifestyle — Carousel", format: "Carousel", spend: 380, ctr: 2.1, roas: 3.9, freq: 4.2, conv: 38, action: "Monitor", rank: "mid", rankLabel: "#2" },
      { id: "a3", name: "Brand Story — Video", format: "Video", spend: 240, ctr: 1.6, roas: 2.1, freq: 5.8, conv: 8, action: "Pause", rank: "low", rankLabel: "Weak" },
    ],
    insight: { tag: "watch", title: "Frequency warning", body: "Performing well at 4.4x ROAS but frequency 8.2 signals saturation (94% reach). Test fresh creative with the same 40% offer to reset engagement — estimated 4–6 days before CTR starts degrading." },
  },
  {
    id: "male", campaignId: "summer-sale", name: "25–44 Male", health: "critical", healthLabel: "Critical",
    spend: 880, revenue: 1056, roas: 1.2, ctr: 0.8, cpc: 3.8, freq: 3.4, conv: 48, reachPct: 34,
    note: "ROAS crashed — creative fatigue",
    ctrTrend: [1.7, 1.6, 1.4, 1.1, 0.95, 0.85, 0.8], cpaTrend: [14, 15, 16.5, 17.5, 18, 18.2, 18.3],
    kpiDeltas: { spend: "↓2%", revenue: "↓50%", roas: "↓1.2x", ctr: "↓0.8pts", cpc: "↑$2.60", freq: "healthy" },
    ads: [
      { id: "b1", name: "New Collection — Video", format: "Video", spend: 580, ctr: 0.38, roas: 0.9, freq: 6.8, ctrWeek1: 1.6, conv: 7, action: "Pause", rank: "low", rankLabel: "Fatigue" },
      { id: "b2", name: "Product Demo — Video", format: "Video", spend: 200, ctr: 1.1, roas: 1.9, freq: 2.1, conv: 5, action: "Monitor", rank: "mid", rankLabel: "#2" },
      { id: "b3", name: "Promo Static — Image", format: "Image", spend: 100, ctr: 1.8, roas: 2.4, freq: 1.2, conv: 2, action: "Scale", rank: "top", rankLabel: "#1" },
    ],
    insight: { tag: "issue", title: "Creative fatigue confirmed", body: "ROAS crashed 2.4x → 1.2x. Frequency is only 3.4 so this is NOT audience saturation — the \"New Collection\" video (freq 6.8, CTR 0.38%) is the culprit. Pause it and launch a static with a direct offer. Expected recovery: 2.0–2.8x within 7 days." },
  },
  {
    id: "lla", campaignId: "summer-sale", name: "Lookalike 1%", health: "good", healthLabel: "Good",
    spend: 540, revenue: 1944, roas: 3.6, ctr: 1.9, cpc: 1.9, freq: 2.6, conv: 82, reachPct: 41,
    note: "Scale opportunity — 59% untouched",
    ctrTrend: [1.6, 1.65, 1.7, 1.75, 1.8, 1.85, 1.9], cpaTrend: [11, 10.9, 10.7, 10.6, 10.5, 10.4, 10.4],
    kpiDeltas: { spend: "↓3%", revenue: "↑5%", roas: "↑0.2x", ctr: "↑0.1pts", cpc: "stable", freq: "headroom" },
    ads: [
      { id: "c1", name: "Trending Carousel", format: "Carousel", spend: 280, ctr: 2.1, roas: 4.2, freq: 1.8, conv: 34, action: "Scale", rank: "top", rankLabel: "#1" },
      { id: "c2", name: "Summer Static", format: "Image", spend: 180, ctr: 1.8, roas: 3.1, freq: 1.4, conv: 16, action: "Monitor", rank: "mid", rankLabel: "#2" },
      { id: "c3", name: "Video Reel 15s", format: "Video", spend: 80, ctr: 1.2, roas: 2.8, freq: 1.1, conv: 4, action: "Monitor", rank: "mid", rankLabel: "#3" },
      { id: "c4", name: "UGC Testimonial 20s", format: "Video", spend: 210, ctr: 0.52, roas: 1.3, freq: null, ctrWeek1: 1.35, conv: 5, action: "Pause", rank: "low", rankLabel: "Decay" },
    ],
    insight: { tag: "rec", title: "Scale opportunity", body: "Healthiest adset — 59% of the audience untouched and ROAS improving. The carousel performs best here. Increase budget $200–$400/day using spend freed from the fatigued video in 25–44 Male. Projected: $640–$1,280 extra/week." },
  },
  {
    id: "broad", campaignId: "summer-sale", name: "Broad AU", health: "good", healthLabel: "Good",
    spend: 380, revenue: 1102, roas: 2.9, ctr: 1.5, cpc: 2.4, freq: 2.2, conv: 46, reachPct: 22,
    note: "Stable baseline",
    ctrTrend: [1.35, 1.4, 1.42, 1.45, 1.47, 1.5, 1.5], cpaTrend: [12.5, 12.4, 12.3, 12.4, 12.3, 12.2, 12.2],
    kpiDeltas: { spend: "↓13%", revenue: "↑2%", roas: "↑0.1x", ctr: "↑0.1pts", cpc: "stable", freq: "healthy" },
    ads: [
      { id: "d1", name: "Summer Static Wide", format: "Image", spend: 200, ctr: 1.7, roas: 3.4, freq: 1.8, conv: 26, action: "Monitor", rank: "top", rankLabel: "#1" },
      { id: "d2", name: "Brand Video 30s", format: "Video", spend: 180, ctr: 1.2, roas: 2.4, freq: 1.6, conv: 20, action: "Monitor", rank: "mid", rankLabel: "#2" },
    ],
    insight: { tag: "rec", title: "Stable performer", body: "Reliable at 2.9x ROAS and improving slightly despite lower spend — the algorithm is optimising delivery. Static outperforms video 2:1. Test one fresh static next cycle; no urgent action." },
  },
];

const authored: Campaign[] = [
  { id: "summer-sale", name: "Summer Sale — Broad", platform: "meta", status: "Active", objective: "Sales", spend: 4960, revenue: 13890, roas: 2.3, ctr: 1.42, cpc: 2.18, conv: 318, pacing: 72, health: "critical", note: "⚠ 1 adset critical", spark: [86, 82, 84, 70, 55, 44, 40] },
  { id: "retargeting", name: "Retargeting — Cart", platform: "meta", status: "Active", objective: "Sales", spend: 1980, revenue: 11484, roas: 5.8, ctr: 1.9, cpc: 1.1, conv: 180, pacing: 94, health: "good", note: "Top performer", spark: [30, 36, 42, 50, 58, 70, 78] },
  { id: "prospecting", name: "Traffic — Prospecting", platform: "meta", status: "Active", objective: "Traffic", spend: 3200, revenue: 7680, roas: 2.4, ctr: 1.4, cpc: 1.9, conv: 96, pacing: 88, health: "good", note: "Stable", spark: [48, 50, 46, 52, 50, 54, 52] },
  { id: "leadgen", name: "Lead Gen Q3", platform: "li", status: "Active", objective: "Leads", spend: 3100, revenue: 3410, roas: 1.1, ctr: 0.75, cpc: 8.2, conv: 14, pacing: 101, health: "critical", note: "⚠ Below break-even", spark: [55, 50, 44, 46, 38, 32, 28] },
  { id: "brand-li", name: "Brand Awareness", platform: "li", status: "Active", objective: "Awareness", spend: 980, revenue: 2058, roas: 2.1, ctr: 0.9, cpc: 6.4, conv: 11, pacing: 64, health: "good", note: "Stable", spark: [40, 42, 44, 44, 48, 46, 50] },
  { id: "holiday", name: "Holiday Teaser", platform: "meta", status: "Paused", objective: "Awareness", spend: 0, revenue: 0, roas: 0, ctr: 0, cpc: 0, conv: 0, pacing: 0, health: "paused", note: "Paused Jun 18", spark: [0, 0, 0, 0, 0, 0, 0] },
];

const OBJ = ["Sales", "Traffic", "Leads", "Awareness"];
const tail: Campaign[] = Array.from({ length: 49 }, (_, i) => {
  const plat: Platform = rnd() > 0.3 ? "meta" : "li";
  const roas = +(0.8 + rnd() * 4.5).toFixed(1);
  const spend = Math.round(300 + rnd() * 5200);
  const health: Health = roas < 1.5 ? "critical" : roas < 2.2 ? "watch" : "good";
  const base = 30 + rnd() * 30;
  return {
    id: `c${i + 7}`, name: `${OBJ[i % 4]} ${plat === "meta" ? "Meta" : "LI"} #${i + 7}`,
    platform: plat, status: rnd() > 0.28 ? "Active" : "Paused", objective: OBJ[i % 4],
    spend, revenue: Math.round(spend * roas), roas,
    ctr: +((plat === "meta" ? 0.9 : 0.4) + rnd() * 2).toFixed(2),
    cpc: +((plat === "meta" ? 0.8 : 6) + rnd() * 3).toFixed(2),
    conv: Math.round(spend / (20 + rnd() * 60)), pacing: Math.round(55 + rnd() * 50),
    health, note: health === "critical" ? "⚠ Needs attention" : health === "watch" ? "Watch" : "Stable",
    spark: Array.from({ length: 7 }, (_, d) => Math.round(base + (roas > 2.4 ? d * 4 : -d * 3) + rnd() * 8)),
  } as Campaign;
});

export const campaigns: Campaign[] = [...authored, ...tail];
export const adsets: AdSet[] = flagshipAdsets;
export const getCampaign = (id: string) => campaigns.find((c) => c.id === id);
export const getAdset = (id: string) => adsets.find((a) => a.id === id);
export const adsetsFor = (cid: string) =>
  cid === "summer-sale" ? adsets : adsets.map((a) => ({ ...a, campaignId: cid }));

export const recommendations: Recommendation[] = [
  { id: "r1", date: "Jul 2", title: "Pause \"New Collection\" video", evidence: "Creative fatigue — freq 6.8, CTR 0.38%", where: "Summer Sale › 25–44 M", status: "followed", actionDate: "Jul 3", outcome: "ROAS 1.2x → 2.1x", outcomeDetail: "+75% in 6 days · saved ~$83/day", outcomeGood: true },
  { id: "r2", date: "Jul 2", title: "Shift $300/day to Lookalike 1%", evidence: "Scale opportunity — 59% audience untouched", where: "Summer Sale › LLA 1%", status: "followed", actionDate: "Jul 4", outcome: "+$618/wk revenue", outcomeDetail: "ROAS held at 3.5x while scaling", outcomeGood: true },
  { id: "r3", date: "Jul 8", title: "Frequency cap at 6 for 18–34 Female", evidence: "Saturation risk — freq 8.2, reach 94%", where: "Summer Sale › 18–34 F", status: "pending", outcome: "Awaiting action", outcomeDetail: "Est. impact: protect $4.4k/mo revenue" },
  { id: "r4", date: "Jun 24", title: "Reduce LinkedIn Lead Gen budget 40%", evidence: "Below break-even — ROAS 1.1x, CPA $217", where: "Lead Gen Q3", status: "ignored", outcome: "−$1,240 since", outcomeDetail: "ROAS still 1.1x — rec stands", outcomeGood: false },
  { id: "r5", date: "Jun 20", title: "Test static testimonial creative", evidence: "Video underperforming for 25–44 M", where: "Summer Sale › 25–44 M", status: "followed", actionDate: "Jun 23", outcome: "CTR 0.9% → 1.8%", outcomeDetail: "New static is now #1 ad in adset", outcomeGood: true },
];

export const alerts: AlertRow[] = [
  { severity: "Critical", campaign: "Summer Sale", rule: "ROAS too low", value: "1.2x", threshold: "1.5x", ago: "2h ago" },
  { severity: "Critical", campaign: "Summer Sale", rule: "CTR too low", value: "0.6%", threshold: "1.0%", ago: "2h ago" },
  { severity: "Warning", campaign: "Lead Gen Q3", rule: "CPC spike", value: "$8.20", threshold: "$5.00", ago: "5h ago" },
];

export function series30(id: string) {
  const r = mulberry32(id.length * 97 + 7);
  const crash = id === "summer-sale";
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const ctr = crash && i > 14 ? 2.0 - (i - 14) * 0.055 : 1.6 + Math.sin(i / 4) * 0.25 + r() * 0.15;
    const cpa = crash && i > 14 ? 12 + (i - 14) * 0.7 : 13 + Math.cos(i / 5) * 1.5 + r();
    const spend = 140 + Math.sin(i / 3) * 25 + r() * 30;
    const revenue = spend * (crash && i > 14 ? 3.4 - (i - 14) * 0.14 : 3.1 + r() * 0.5);
    return { day: `Jun ${day}`, ctr: +ctr.toFixed(2), cpa: +cpa.toFixed(1), spend: Math.round(spend), revenue: Math.round(revenue) };
  });
}
