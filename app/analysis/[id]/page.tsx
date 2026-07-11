"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, AreaChart, Area } from "recharts";
import { FileText, ArrowRight } from "lucide-react";
import { getCampaign, adsetsFor, series30 } from "@/lib/data";
import { useApp } from "@/lib/store";
import { PlatBadge, StatusBadge, HealthDot, Delta } from "@/components/Badge";
import Sparkline from "@/components/Sparkline";

// which direction is GOOD for each metric — so colours mean something, not math
const GOOD_UP: Record<string, boolean | null> = { spend: null, revenue: true, roas: true, ctr: true, cpc: false, freq: false };
function tone(key: string, delta: string): "good" | "bad" | "flat" {
  const up = delta.includes("\u2191"); const dn = delta.includes("\u2193");
  if (!up && !dn) return "flat";
  const g = GOOD_UP[key];
  if (g === null || g === undefined) return "flat";
  return (up && g) || (dn && !g) ? "good" : "bad";
}
const VERDICT: Record<string, { text: string; cls: string }> = {
  female: { text: "Best return — but audience tiring", cls: "bg-amber-400/15 text-amber-600 dark:text-amber-400 dark:text-amber-300" },
  male: { text: "Burning cash — fix first", cls: "bg-rose-400/15 text-rose-600 dark:text-rose-400 dark:text-rose-300" },
  lla: { text: "Ready to scale", cls: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 dark:text-emerald-300" },
  broad: { text: "Steady — leave it running", cls: "bg-sky-400/15 text-sky-600 dark:text-sky-300" },
};
import clsx from "clsx";

const PRESETS = ["Daily", "Weekly", "Monthly", "Overall", "Custom"] as const;

export default function Analysis({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { setCampaign } = useApp();
  const c = getCampaign(id);
  const [tab, setTab] = useState<"overview" | "adsets" | "ads" | "audience">("overview");
  const [compare, setCompare] = useState(false);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("Monthly");
  const [from, setFrom] = useState("2025-06-01");
  const [to, setTo] = useState("2025-06-30");
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const onDemand = (f: string, t: string) => {
    setFetchNote(`Fetching ${f} → ${t} on demand…`);
    setTimeout(() => setFetchNote("Range cached ✓ — future queries are instant"), 800);
    setTimeout(() => setFetchNote(null), 3200);
  };

  useEffect(() => { if (c) setCampaign(c.id, c.name); }, [c, setCampaign]);

  const full = useMemo(() => series30(id), [id]);
  const data = useMemo(() => {
    if (preset === "Daily") return full.slice(-1 * 2);
    if (preset === "Weekly") return full.slice(-7);
    return full;
  }, [full, preset]);
  const sets = adsetsFor(id);
  if (!c) return <div className="p-6">Campaign not found.</div>;

  const perA = full.slice(0, 15), perB = full.slice(15);
  const roasA = perA.reduce((s, d) => s + d.revenue, 0) / perA.reduce((s, d) => s + d.spend, 0);
  const roasB = perB.reduce((s, d) => s + d.revenue, 0) / perB.reduce((s, d) => s + d.spend, 0);

  const onTo = (v: string) => setTo(v < from ? from : v);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <h1 className="font-display text-[24px] tracking-tight">{c.name}</h1>
        <PlatBadge p={c.platform} /><StatusBadge s={c.status} />
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[11px] text-mut">Compare periods</span>
          <button onClick={() => { setCompare(!compare); if (!compare) setTab("overview"); }}
            className={clsx("w-9 h-5 rounded-full transition-colors relative", compare ? "bg-accent" : "bg-line2")}>
            <motion.span layout className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" animate={{ left: compare ? 18 : 2 }} />
          </button>
          <button onClick={() => router.push("/reporting")} className="bg-accent hover:bg-accent2 text-accentfg text-[11px] font-semibold rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"><FileText size={12} /> Report</button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        {!compare ? (
          <>
            <div className="flex rounded-lg border border-line bg-surface p-0.5">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setPreset(p)} className={clsx("relative text-[11px] font-medium px-3 py-1 rounded-md", preset === p ? "text-accentfg" : "text-mut hover:text-ink")}>
                  {preset === p && <motion.span layoutId="preset-pill" className="absolute inset-0 bg-accent rounded-md" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className="relative z-10">{p}</span>
                </button>
              ))}
            </div>
            {preset === "Custom" ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); onDemand(e.target.value, to); }} className="border border-line2 rounded-lg px-2 py-1 bg-surface" />
                <span className="text-mut">to</span>
                <input type="date" value={to} min={from} onChange={(e) => { onTo(e.target.value); onDemand(from, e.target.value); }} className="border border-line2 rounded-lg px-2 py-1 bg-surface" />
              </div>
            ) : (
              <span className="text-[11px] text-mut">{preset === "Daily" ? "Today · hourly" : preset === "Weekly" ? "Last 7 days" : preset === "Monthly" ? "Jun 1 – Jun 30, 2025" : "All time"}</span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-raised border border-line text-mut">Snapshot · Today 02:00</span>
            {fetchNote && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={clsx("text-[10px] font-semibold", fetchNote.includes("✓") ? "text-good" : "text-accent")}>{fetchNote}</motion.span>}
          </>
        ) : (
          <span className="text-[11px] font-semibold text-accent">Comparing Period A (Jun 1–15) vs Period B (Jun 16–30)</span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {[["Spend", `$${c.spend.toLocaleString()}`, "↑12%", "up", false],
          ["Revenue", `$${c.revenue.toLocaleString()}`, "↑7%", "up", false],
          ["ROAS", `${c.roas}x`, "↓0.9x", "dn", c.roas < 1.5 || id === "summer-sale"],
          ["CTR", `${c.ctr}%`, "↓0.3pts", "dn", false],
          ["CPC", `$${c.cpc}`, "↑$0.62", "dn", false],
          ["Conv.", String(c.conv), "↑8%", "up", false]].map(([l, v, d, dir, alert], i) => (
          <motion.div key={l as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={clsx("card p-3", alert && "border-rose-200 dark:border-rose-500/35 bg-rose-50/40 dark:bg-rose-500/[0.07]")}>
            <div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1">{l}</div>
            <div className="font-display text-[23px]">{v}</div>
            <Delta v={d as string} dir={dir as "up" | "dn"} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-[150px_1fr] gap-3 mb-4">
        <div className="card p-3 grid place-items-center text-center">
          <div className="text-[10px] font-semibold text-mut uppercase">Pacing</div>
          <svg viewBox="0 0 80 46" width="84">
            <path d="M10,42 A32,32 0 0,1 70,42" fill="none" stroke="var(--grid)" strokeWidth="8" strokeLinecap="round" />
            <motion.path d="M10,42 A32,32 0 0,1 70,42" fill="none" stroke={c.pacing < 80 ? "#f59e0b" : "#10b981"} strokeWidth="8" strokeLinecap="round"
              strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - c.pacing }} transition={{ duration: 1, ease: "easeOut" }} pathLength={100} />
          </svg>
          <div className={clsx("text-[17px] font-bold", c.pacing < 80 ? "text-warn" : "text-good")}>{c.pacing}%</div>
          <div className={clsx("text-[9px] font-bold uppercase", c.pacing < 80 ? "text-warn" : "text-good")}>{c.pacing < 80 ? "Underpacing" : "On pace"}</div>
        </div>
        <div className="rounded-xl2 border border-rose-200 dark:border-rose-500/35 bg-rose-50/50 dark:bg-rose-500/[0.07] p-3.5">
          <div className="text-[11px] font-bold text-bad mb-2">⚠ 3 anomalies detected</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTab("adsets")} className="text-[11px] px-2.5 py-1 rounded-full border border-rose-300 dark:border-rose-500/45 text-bad hover:bg-rose-100 dark:hover:bg-rose-500/15 transition-colors">25–44 Male ROAS crashed ↓68%</button>
            <button className="text-[11px] px-2.5 py-1 rounded-full border border-rose-300 dark:border-rose-500/45 text-bad">CTR down 0.9pts WoW</button>
            <button onClick={() => setTab("audience")} className="text-[11px] px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-500/45 text-warn hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors">18–34 Female freq 8.2</button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line mb-4">
        {(["overview", "adsets", "ads", "audience"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("relative px-4 py-2 text-[12px] font-medium capitalize", tab === t ? "text-accent font-bold" : "text-mut hover:text-ink")}>
            {t === "adsets" ? "Adset comparison" : t === "ads" ? "Ad creatives" : t === "audience" ? "Audience & frequency" : "Overview"}
            {tab === t && <motion.span layoutId="tab-line" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab + String(compare)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === "overview" && (
            <>
              {compare && (
                <div className="mb-4">
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 px-3.5 py-2.5 text-[12px] mb-3">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">Period A</span> Jun 1–15 &nbsp;vs&nbsp; <span className="font-bold text-emerald-700">Period B</span> Jun 16–30
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="card p-4">
                      <div className="text-[12px] font-semibold mb-2">Revenue trend — A vs B</div>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={perA.map((d, i) => ({ i: i + 1, a: d.revenue, b: perB[i]?.revenue }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                          <XAxis dataKey="i" tick={{ fontSize: 10, fill: "var(--mut)" }} /><YAxis tick={{ fontSize: 10, fill: "var(--mut)" }} width={38} />
                          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} />
                          <Line dataKey="a" name="Period A" stroke="var(--chart1)" strokeWidth={2} dot={false} />
                          <Line dataKey="b" name="Period B" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card p-4">
                      <div className="text-[12px] font-semibold mb-2">ROAS by period</div>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={[{ n: "Period A", v: +roasA.toFixed(2) }, { n: "Period B", v: +roasB.toFixed(2) }]}>
                          <XAxis dataKey="n" tick={{ fontSize: 11, fill: "var(--mut)" }} /><YAxis tick={{ fontSize: 10, fill: "var(--mut)" }} width={30} />
                          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="var(--chart1)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="card p-4 text-[12px] leading-relaxed text-mut">
                    <span className="font-bold text-ink">What changed: </span>
                    Period B ROAS ({roasB.toFixed(1)}x) vs Period A ({roasA.toFixed(1)}x). {roasB < roasA ? "The second half declined — the 25–44 Male creative fatigue hit mid-month and dragged blended efficiency down." : "The second half improved as top adsets scaled."}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <div className="text-[12px] font-semibold mb-2">CTR & CPA — {preset.toLowerCase()} view</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--mut)" }} interval={preset === "Weekly" ? 0 : 5} />
                      <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "var(--mut)" }} width={28} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "var(--mut)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} />
                      <Line yAxisId="l" dataKey="ctr" stroke="var(--chart1)" strokeWidth={2} dot={false} name="CTR %" />
                      <Line yAxisId="r" dataKey="cpa" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" name="CPA $" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4">
                  <div className="text-[12px] font-semibold mb-2">Revenue vs spend</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--mut)" }} interval={preset === "Weekly" ? 0 : 5} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--mut)" }} width={38} />
                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} />
                      <Area dataKey="revenue" stroke="#10b981" fill="#10b98122" strokeWidth={2} name="Revenue" />
                      <Area dataKey="spend" stroke="var(--chart1)" fill="var(--chart1soft)" strokeWidth={2} name="Spend" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {tab === "adsets" && (() => {
            const totSpend = sets.reduce((t, a) => t + a.spend, 0);
            const totRev = sets.reduce((t, a) => t + a.revenue, 0);
            const ranked = [...sets].sort((x, y) => y.roas - x.roas);
            return (
              <div className="space-y-4">
                {/* Leaderboard — who's winning, who's bleeding */}
                <div className="grid grid-cols-2 gap-3">
                  {ranked.map((a, i) => {
                    const deltas: [string, string][] = [["roas", a.kpiDeltas.roas], ["revenue", a.kpiDeltas.revenue], ["ctr", a.kpiDeltas.ctr], ["cpc", a.kpiDeltas.cpc]];
                    return (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -3 }} onClick={() => router.push(`/adset/${a.id}`)}
                        className={clsx("card p-4 cursor-pointer hover:shadow-lift transition-all group",
                          a.health === "critical" ? "border-rose-300/60 dark:border-rose-500/40" : "hover:border-accent/50")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={clsx("w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold",
                            i === 0 ? "bg-amber-400/20 text-amber-600 dark:text-amber-400 dark:text-amber-300" : "bg-raised text-mut")}>#{i + 1}</span>
                          <span className="font-semibold text-[13px]">{a.name}</span>
                          <HealthDot h={a.health} />
                          <span className="ml-auto text-[11px] text-accent opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Deep dive →</span>
                        </div>
                        <span className={clsx("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2.5", VERDICT[a.id]?.cls || "bg-raised text-mut")}>{VERDICT[a.id]?.text || a.note}</span>
                        <div className="flex items-end gap-4 mb-2.5">
                          <div>
                            <div className={clsx("font-display text-[34px] leading-none", a.roas >= 3 ? "text-good" : a.roas < 1.5 ? "text-bad" : "")}>{a.roas}x</div>
                            <div className="text-[9px] text-mut uppercase tracking-wide mt-1">return on spend</div>
                          </div>
                          <div className="flex-1 pb-1"><Sparkline data={a.ctrTrend} color={a.health === "critical" ? "#fb7185" : a.roas >= 3 ? "#34d399" : "var(--chart1)"} h={26} /></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {deltas.map(([k, v]) => {
                            const t = tone(k, v);
                            return (
                              <span key={k} className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md",
                                t === "good" ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 dark:text-emerald-300" :
                                t === "bad" ? "bg-rose-400/15 text-rose-600 dark:text-rose-400 dark:text-rose-300" : "bg-raised text-mut")}>
                                {k.toUpperCase()} {v}
                              </span>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Money in vs money out — zero maths required */}
                <div className="card p-4">
                  <div className="text-[13px] font-semibold mb-0.5">Where the money goes vs where it comes back</div>
                  <div className="text-[11px] text-mut mb-4">Grey bar = share of spend · coloured bar = share of revenue. A coloured bar longer than its grey bar = earning more than its share.</div>
                  <div className="space-y-3.5">
                    {ranked.map((a) => {
                      const sp = Math.round((a.spend / totSpend) * 100);
                      const rv = Math.round((a.revenue / totRev) * 100);
                      const winning = rv >= sp;
                      return (
                        <div key={a.id}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold">{a.name}</span>
                            <span className={clsx("font-bold", winning ? "text-good" : "text-bad")}>
                              {winning ? `earns ${rv}% from ${sp}% of spend ✓` : `takes ${sp}% of spend, returns only ${rv}% ⚠`}
                            </span>
                          </div>
                          <div className="h-2 bg-raised rounded-full overflow-hidden mb-1">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${sp}%` }} transition={{ duration: 0.7 }} className="h-full bg-line2 rounded-full" />
                          </div>
                          <div className="h-2 bg-raised rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${rv}%` }} transition={{ duration: 0.7, delay: 0.15 }}
                              className={clsx("h-full rounded-full", winning ? "bg-good" : "bg-bad")} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-lg bg-rose-400/10 border border-rose-300/40 dark:border-rose-500/30 px-3.5 py-2.5 text-[12px]">
                    <strong className="text-bad">The leak:</strong> 25–44 Male takes <strong>{Math.round((sets.find(x=>x.id==="male")!.spend/totSpend)*100)}%</strong> of the budget but returns just <strong>{Math.round((sets.find(x=>x.id==="male")!.revenue/totRev)*100)}%</strong> of revenue — ~$83/day going nowhere. Click it above to see exactly which ad is responsible.
                  </div>
                </div>
              </div>
            );
          })()}

          {tab === "ads" && (
            <div className="card overflow-hidden">
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase text-mut">
                  {["Ad", "Format", "Adset", "Spend", "CTR", "ROAS", "Freq", "Action"].map((h) => <th key={h} className="px-3.5 py-2.5 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {sets.flatMap((s) => s.ads.map((ad) => ({ ...ad, adset: s.name }))).map((ad) => (
                    <tr key={ad.id} className={clsx("border-t border-line", ad.action === "Pause" && "bg-rose-50/50 dark:bg-rose-500/[0.07]")}>
                      <td className="px-3.5 py-2.5 font-semibold">{ad.name}</td>
                      <td className="px-3.5 py-2.5 text-mut">{ad.format}</td>
                      <td className="px-3.5 py-2.5 text-mut">{ad.adset}</td>
                      <td className="px-3.5 py-2.5">${ad.spend}</td>
                      <td className={clsx("px-3.5 py-2.5", ad.ctr > 1.5 ? "text-good" : ad.ctr < 0.8 ? "text-bad" : "")}>{ad.ctr}%</td>
                      <td className={clsx("px-3.5 py-2.5 font-bold", ad.roas > 3 ? "text-good" : ad.roas < 1.5 ? "text-bad" : "")}>{ad.roas}x</td>
                      <td className={clsx("px-3.5 py-2.5", (ad.freq ?? 0) > 5 ? "text-bad font-bold" : "")}>{ad.freq ?? <span className="text-mut" title="Not reported for this objective">—</span>}</td>
                      <td className="px-3.5 py-2.5"><span className={clsx("text-[10px] font-bold px-2.5 py-1 rounded-full",
                        ad.action === "Scale" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : ad.action === "Pause" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300")}>{ad.action}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "audience" && (
            <div className="grid grid-cols-3 gap-3">
              {sets.slice(0, 3).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[12px]">{a.name}</span>
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      a.freq > 8 ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" : a.health === "critical" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300")}>
                      {a.freq > 8 ? "Saturating" : a.health === "critical" ? "Critical" : "Healthy"}</span>
                  </div>
                  <div className={clsx("text-[22px] font-bold my-1.5", a.freq > 8 ? "text-warn" : a.health === "critical" ? "text-bad" : "text-good")}>{a.freq}</div>
                  <div className="h-1.5 bg-raised rounded-full overflow-hidden mb-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${a.freq * 10}%` }} transition={{ duration: 0.8 }}
                      className={clsx("h-full rounded-full", a.freq > 8 ? "bg-warn" : a.freq > 5 ? "bg-bad" : "bg-good")} />
                  </div>
                  <p className="text-[10px] text-mut leading-relaxed">{a.freq > 8 ? `Cap at 6. Reach ${a.reachPct}%. ~4 days to saturation.` : a.health === "critical" ? "Freq OK — issue is creative fatigue, not audience." : `${100 - a.reachPct}% untouched. Room to scale.`}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
