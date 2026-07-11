"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowLeft, ImageIcon, Video, LayoutGrid, Sparkles } from "lucide-react";
import { getAdset } from "@/lib/data";
import { HealthDot } from "@/components/Badge";
import clsx from "clsx";

export default function AdsetDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const a = getAdset(id);
  if (!a) return <div className="p-6">Adset not found.</div>;

  const trend = a.ctrTrend.map((v, i) => ({ d: `D${i + 1}`, ctr: v, cpa: a.cpaTrend[i] }));
  const K = [
    ["Spend", `$${a.spend.toLocaleString()}`, a.kpiDeltas.spend],
    ["Revenue", `$${a.revenue.toLocaleString()}`, a.kpiDeltas.revenue],
    ["ROAS", `${a.roas}x`, a.kpiDeltas.roas],
    ["CTR", `${a.ctr}%`, a.kpiDeltas.ctr],
    ["CPC", `$${a.cpc}`, a.kpiDeltas.cpc],
    ["Freq", String(a.freq), a.kpiDeltas.freq],
  ];
  const FmtIcon = ({ f }: { f: string }) => f === "Video" ? <Video size={22} className="text-mut/50" /> : f === "Carousel" ? <LayoutGrid size={22} className="text-mut/50" /> : <ImageIcon size={22} className="text-mut/50" />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <div>
          <div className="text-[11px] text-mut mb-0.5">Summer Sale — Broad › {a.name}</div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[26px] tracking-tight">{a.name}</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold"><HealthDot h={a.health} />{a.healthLabel}</span>
          </div>
        </div>
        <button onClick={() => router.back()} className="ml-auto text-[11px] font-semibold border border-line2 rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {K.map(([l, v, d], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={clsx("card p-3", l === "ROAS" && a.roas < 1.5 && "border-rose-200 dark:border-rose-500/35 bg-rose-50/40 dark:bg-rose-500/[0.07]", l === "Freq" && a.freq > 6 && "border-amber-200 dark:border-amber-500/35 bg-amber-50/40 dark:bg-amber-500/[0.07]")}>
            <div className="text-[10px] font-semibold text-mut uppercase mb-1">{l}</div>
            <div className="font-display text-[24px] tracking-tight">{v}</div>
            <div className="text-[10px] text-mut font-semibold">{d}</div>
          </motion.div>
        ))}
      </div>

      <div className="card p-4 mb-4">
        <div className="text-[12px] font-semibold mb-2">CTR & CPA — {a.name}</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--mut)" }} />
            <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "var(--mut)" }} width={28} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "var(--mut)" }} width={30} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} />
            <Line yAxisId="l" dataKey="ctr" stroke="var(--chart1)" strokeWidth={2} dot={false} name="CTR %" />
            <Line yAxisId="r" dataKey="cpa" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} name="CPA $" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">Ads in this adset</div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {a.ads.map((ad, i) => (
          <motion.div key={ad.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }} className="card overflow-hidden hover:shadow-lift transition-shadow">
            <div className="h-20 bg-raised grid place-items-center relative border-b border-line">
              <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold bg-surface border border-line rounded-md px-1.5 py-0.5 text-mut">{ad.format}</span>
              <span className={clsx("absolute top-1.5 right-1.5 text-[9px] font-bold rounded-md px-1.5 py-0.5",
                ad.rank === "top" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : ad.rank === "low" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300")}>{ad.rankLabel}</span>
              <FmtIcon f={ad.format} />
            </div>
            <div className="p-3">
              <div className="font-semibold text-[12px] mb-2">{ad.name}</div>
              <div className="grid grid-cols-3 gap-1 mb-2 text-center">
                {[["Spend", `$${ad.spend}`], ["CTR", `${ad.ctr}%`], ["ROAS", `${ad.roas}x`]].map(([l, v]) => (
                  <div key={l}><div className="font-bold text-[12px]">{v}</div><div className="text-[9px] text-mut">{l}</div></div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-mut">Freq {ad.freq ?? "—"}</span>
                <span className={clsx("text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                  ad.action === "Scale" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : ad.action === "Pause" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300")}>{ad.action}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card p-4 flex gap-3">
        <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent grid place-items-center"><Sparkles size={13} className="text-accentfg" /></div>
        <div className="text-[12px] leading-relaxed">
          <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md mr-1.5",
            a.insight.tag === "issue" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : a.insight.tag === "watch" ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300")}>{a.insight.title}</span>
          {a.insight.body}
        </div>
      </div>
    </div>
  );
}
