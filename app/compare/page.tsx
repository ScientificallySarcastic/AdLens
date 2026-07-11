"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, Trophy, AlertTriangle } from "lucide-react";
import { getCampaign } from "@/lib/data";
import Counter from "@/components/Counter";
import clsx from "clsx";

function CompareInner() {
  const sp = useSearchParams();
  const meta = getCampaign(sp.get("meta") || "summer-sale")!;
  const li = getCampaign(sp.get("li") || "leadgen")!;
  const [shift, setShift] = useState(1500);

  const Card = ({ c, win }: { c: typeof meta; win: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className={clsx("card overflow-hidden", win ? "border-emerald-200 dark:border-emerald-500/35" : "border-rose-200 dark:border-rose-500/35")}>
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 bg-raised/60">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.platform === "meta" ? "#1877F2" : "#0A66C2" }} />
        <span className="font-bold text-[14px]">{c.platform === "meta" ? "Meta" : "LinkedIn"}</span>
        <span className="text-[10px] font-semibold text-mut">{c.name}</span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2">
        {[["Spent", `$${c.spend.toLocaleString()}`], ["Return (ROAS)", `${c.roas}x`], ["Sales", String(c.conv)]].map(([l, v], i) => (
          <div key={l} className={clsx("rounded-lg p-2.5 bg-raised", i === 1 && (win ? "ring-1 ring-emerald-200 dark:ring-emerald-500/35" : "ring-1 ring-rose-200 dark:ring-rose-500/35"))}>
            <div className="text-[10px] text-mut">{l}</div>
            <div className={clsx("text-[16px] font-bold", i === 1 && (win ? "text-good" : "text-bad"))}>{v}</div>
          </div>
        ))}
      </div>
      <div className={clsx("px-4 py-2 text-[11px] font-bold flex items-center gap-1.5", win ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300")}>
        {win ? <><Trophy size={12} /> Clear winner — more sales, better return</> : <><AlertTriangle size={12} /> Barely breaking even — few sales for the spend</>}
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="font-display text-[26px] tracking-tight mb-1">Cross-platform comparison</h1>
      <p className="text-[12px] text-mut mb-4">Meta vs LinkedIn — same objective, compared side by side.</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card c={meta} win /><Card c={li} win={false} />
      </div>
      <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">Visual comparison</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-[12px] font-semibold mb-2">ROAS — higher is better</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart layout="vertical" data={[{ n: "Meta", v: meta.roas }, { n: "LinkedIn", v: li.roas }]}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--mut)" }} /><YAxis type="category" dataKey="n" tick={{ fontSize: 11, fill: "var(--mut)" }} width={64} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} /><Bar dataKey="v" radius={[0, 6, 6, 0]} fill="var(--chart1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <div className="text-[12px] font-semibold mb-2">Conversions delivered</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={[{ n: "Meta", v: meta.conv }, { n: "LinkedIn", v: li.conv }]}>
              <XAxis dataKey="n" tick={{ fontSize: 11, fill: "var(--mut)" }} /><YAxis tick={{ fontSize: 10, fill: "var(--mut)" }} width={34} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 11, color: "var(--ink)" }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4 col-span-2">
          <div className="text-[12px] font-semibold mb-2.5">Where the money went</div>
          <div className="flex h-8 rounded-lg overflow-hidden font-bold text-[11px] text-white">
            <motion.div initial={{ width: 0 }} animate={{ width: "62%" }} transition={{ duration: 0.7 }} className="bg-[#1877F2] grid place-items-center">Meta 62%</motion.div>
            <motion.div initial={{ width: 0 }} animate={{ width: "38%" }} transition={{ duration: 0.7 }} className="bg-[#0A66C2] grid place-items-center">LI 38%</motion.div>
          </div>
          <p className="text-[11px] text-mut mt-2">Meta got most of the spend and returned nearly all the results. LinkedIn&apos;s share is barely paying off.</p>
        </div>
      </div>

      <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">What AdLens recommends</div>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line flex gap-3">
          <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent grid place-items-center"><Sparkles size={13} className="text-accentfg" /></div>
          <p className="text-[12px] leading-relaxed"><span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 mr-1.5">Recommendation</span>
            Meta is doing the heavy lifting. Move most of the LinkedIn budget over — same total spend, far more results. Keep a small amount on LinkedIn to test fresh creative.</p>
        </div>
        <div className="p-4 bg-raised/50">
          <div className="text-[11px] text-mut mb-2.5">Drag to see the impact of moving budget from LinkedIn to Meta</div>
          <input type="range" min={0} max={3100} step={100} value={shift} onChange={(e) => setShift(+e.target.value)} className="w-full accent-indigo-600 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 text-center !shadow-none"><div className="text-[10px] text-mut mb-0.5">Budget moved</div><div className="text-[20px] font-bold text-warn">${shift.toLocaleString()}</div></div>
            <div className="card p-3 text-center !shadow-none ring-1 ring-emerald-100 dark:ring-emerald-500/25"><div className="text-[10px] text-mut mb-0.5">Estimated extra revenue / week</div><div className="text-[20px] font-bold text-good">+${Math.round(shift * 3.2).toLocaleString()}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function Compare() {
  return <Suspense fallback={<div className="p-6 text-mut text-[12px]">Loading…</div>}><CompareInner /></Suspense>;
}
