"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { recommendations } from "@/lib/data";
import Counter from "@/components/Counter";
import clsx from "clsx";

export default function Ledger() {
  const [filter, setFilter] = useState<"all" | "followed" | "ignored" | "pending">("all");
  const rows = recommendations.filter((r) => filter === "all" || r.status === filter);
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-display text-[26px] tracking-tight">Recommendation ledger</h1>
          <p className="text-[12px] text-mut">Every AI recommendation, what you did with it, and what happened after. Proof, not promises.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="text-[12px] px-3 py-2 rounded-lg border border-line2 bg-surface outline-none cursor-pointer">
          <option value="all">All statuses</option><option value="followed">Followed</option><option value="ignored">Ignored</option><option value="pending">Pending</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-4">
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase mb-1">Recommendations</div><div className="font-display text-[26px] tracking-tight"><Counter value={14} /></div><div className="text-[10px] text-mut">last 30 days</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase mb-1">Followed</div><div className="font-display text-[24px] text-good"><Counter value={9} /></div><div className="text-[10px] text-good font-semibold">64% action rate</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase mb-1">Avg improvement</div><div className="font-display text-[24px] text-good">+<Counter value={31} suffix="%" /></div><div className="text-[10px] text-mut">on followed recs</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase mb-1">Value recovered</div><div className="font-display text-[24px] text-good"><Counter value={4210} prefix="$" /></div><div className="text-[10px] text-mut">this month</div></div>
      </div>

      <div className="card overflow-hidden mb-4">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-[10px] uppercase text-mut">
            {["Date", "Recommendation", "Where", "Status", "Outcome"].map((h) => <th key={h} className="px-3.5 py-2.5 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            <AnimatePresence>
              {rows.map((r) => (
                <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-line">
                  <td className="px-3.5 py-3 text-mut whitespace-nowrap">{r.date}</td>
                  <td className="px-3.5 py-3"><div className="font-semibold">{r.title}</div><div className="text-[10px] text-mut">{r.evidence}</div></td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-mut">{r.where}</td>
                  <td className="px-3.5 py-3">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      r.status === "followed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : r.status === "ignored" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300")}>
                      {r.status === "followed" ? "✓ Followed" : r.status === "ignored" ? "✕ Ignored" : "⏳ Pending"}</span>
                    {r.actionDate && <div className="text-[10px] text-mut mt-0.5">{r.actionDate}</div>}
                  </td>
                  <td className="px-3.5 py-3">
                    <div className={clsx("font-bold", r.outcomeGood === true ? "text-good" : r.outcomeGood === false ? "text-bad" : "text-mut")}>{r.outcome}</div>
                    <div className="text-[10px] text-mut">{r.outcomeDetail}</div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="w-7 h-7 min-w-[28px] rounded-full bg-accent grid place-items-center"><Sparkles size={13} className="text-accentfg" /></div>
        <p className="text-[12px] leading-relaxed">Your action rate is <strong>64%</strong> and followed recommendations improved their target metric by <strong className="text-good">+31% on average</strong>. Biggest open upside: the frequency cap on <strong>18–34 Female</strong>. The ignored LinkedIn recommendation has now cost ~$1,240 — still worth acting on.</p>
      </div>
    </div>
  );
}
