"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { getCampaign } from "@/lib/data";
import PageHeader from "@/components/PageHeader";
import AISummary from "@/components/AISummary";
import ChartCard, { TOOLTIP_STYLE, AXIS_TICK } from "@/components/ChartCard";
import clsx from "clsx";
import { money } from "@/lib/currency";

function CompareInner() {
  const sp = useSearchParams();
  const metaId = sp.get("meta") || "summer-sale";
  const liId = sp.get("li") || "leadgen";
  const meta = getCampaign(metaId);
  const li = getCampaign(liId);
  const [shift, setShift] = useState(1500);

  if (!meta || !li) {
    const liveIds = [metaId, liId].filter((x) => x.startsWith("meta_"));
    return (
      <div className="max-w-5xl mx-auto px-8 py-7">
        <PageHeader kicker="Cross-platform" title="Comparison" />
        <div className="card p-6 text-[13px] text-mut">
          {liveIds.length
            ? <>Cross-platform comparison currently works with the demo portfolio. Live campaigns ({liveIds.join(", ")}) are analysed individually — open one from Campaign overview for its full range-scoped analysis.</>
            : <>Couldn&apos;t find one of the selected campaigns ({metaId}, {liId}).</>}
        </div>
      </div>
    );
  }

  const Card = ({ c, win }: { c: typeof meta; win: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className={clsx("card overflow-hidden relative", win ? "border-good/35" : "border-bad/35")}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: win ? "var(--good)" : "var(--bad)" }} />
      <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl grid place-items-center text-white shrink-0" style={{ background: c.platform === "meta" ? "#1877F2" : "#0A66C2" }}>
          <span className="text-[11px] font-bold">{c.platform === "meta" ? "M" : "in"}</span>
        </span>
        <div>
          <div className="font-bold text-[16px] leading-tight">{c.platform === "meta" ? "Meta" : "LinkedIn"}</div>
          <div className="text-[11px] font-semibold text-mut">{c.name}</div>
        </div>
        <span className={clsx("ml-auto", win ? "pill-good" : "pill-bad")}>
          {win ? <><Trophy size={11} /> Winner</> : <><AlertTriangle size={11} /> Losing</>}
        </span>
      </div>
      <div className="p-5 grid grid-cols-3 gap-2.5">
        {([["Spent", money(c.spend, c.currency)], ["ROAS", `${c.roas}x`], ["Sales", String(c.conv)]] as [string, string][]).map(([l, v], i) => (
          <div key={l} className={clsx("rounded-xl p-3 bg-raised", i === 1 && "ring-1", i === 1 && (win ? "ring-good/40" : "ring-bad/40"))}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-mut mb-1">{l}</div>
            <div className={clsx("font-display num text-[22px] leading-none", i === 1 && (win ? "text-good" : "text-bad"))}>{v}</div>
          </div>
        ))}
      </div>
      <div className={clsx("px-5 py-2.5 text-[12px] font-bold", win ? "text-good" : "text-bad")}
        style={{ background: win ? "var(--good-soft)" : "var(--bad-soft)" }}>
        {win ? "Clear winner — more sales, better return" : "Barely breaking even — few sales for the spend"}
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-7">
      <PageHeader kicker="Cross-platform" title="Meta vs LinkedIn"
        sub="Same objective, compared side by side" />

      <AISummary meta="cross-platform verdict">
        Meta returns <strong>{meta.roas}x</strong> against LinkedIn&apos;s <strong>{li.roas}x</strong> on the same objective.
        Moving most of the LinkedIn budget over keeps total spend flat and adds an estimated
        <strong> +${Math.round(shift * 3.2).toLocaleString()}/week</strong> — keep a small LinkedIn test budget for fresh creative.
      </AISummary>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card c={meta} win /><Card c={li} win={false} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <ChartCard title="ROAS" sub="higher is better">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart layout="vertical" data={[{ n: "Meta", v: meta.roas }, { n: "LinkedIn", v: li.roas }]}>
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="n" tick={AXIS_TICK} width={70} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--raised)" }} />
              <Bar dataKey="v" radius={[0, 8, 8, 0]} fill="var(--chart1)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Conversions delivered">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={[{ n: "Meta", v: meta.conv }, { n: "LinkedIn", v: li.conv }]}>
              <XAxis dataKey="n" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} width={36} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--raised)" }} />
              <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="var(--chart-good)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="card p-5 col-span-2">
          <div className="text-[14px] font-bold mb-3">Where the money went</div>
          <div className="flex h-10 rounded-xl overflow-hidden font-bold text-[13px] text-white">
            <motion.div initial={{ width: 0 }} animate={{ width: "62%" }} transition={{ duration: 0.7 }} className="bg-[#1877F2] grid place-items-center">Meta 62%</motion.div>
            <motion.div initial={{ width: 0 }} animate={{ width: "38%" }} transition={{ duration: 0.7 }} className="bg-[#0A66C2] grid place-items-center">LI 38%</motion.div>
          </div>
          <p className="text-[12.5px] text-mut mt-2.5">Meta got most of the spend and returned nearly all the results. LinkedIn&apos;s share is barely paying off.</p>
        </div>
      </div>

      {/* Budget shift simulator */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: "var(--hero-grad)" }}>
            <ArrowLeftRight size={16} />
          </span>
          <div>
            <div className="font-bold text-[15px]">Budget shift simulator</div>
            <div className="text-[12px] text-mut font-medium">Drag to see the impact of moving budget from LinkedIn to Meta</div>
          </div>
        </div>
        <div className="p-5">
          <input type="range" min={0} max={3100} step={100} value={shift} onChange={(e) => setShift(+e.target.value)}
            className="w-full accent-indigo-500 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center border border-warn/30" style={{ background: "var(--warn-soft)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-mut mb-1">Budget moved</div>
              <div className="font-display num text-[28px] text-warn">${shift.toLocaleString()}</div>
            </div>
            <div className="rounded-xl p-4 text-center border border-good/30" style={{ background: "var(--good-soft)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-mut mb-1">Est. extra revenue / week</div>
              <div className="font-display num text-[28px] text-good">+${Math.round(shift * 3.2).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function Compare() {
  return <Suspense fallback={<div className="p-8 text-mut text-[13px]">Loading…</div>}><CompareInner /></Suspense>;
}
