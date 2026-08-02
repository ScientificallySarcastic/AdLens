"use client";
import { motion } from "framer-motion";
import { Gauge, CalendarClock } from "lucide-react";
import clsx from "clsx";

export default function PacingCard({ pacing, spend, cur = "$", daysLeft = 9, budget }:
  { pacing: number; spend: number; cur?: string; daysLeft?: number; budget?: number }) {
  const state = pacing === 0 ? "na" : pacing > 100 ? "over" : pacing < 60 ? "under" : pacing < 80 ? "slow" : "on";
  const color = state === "on" ? "var(--good)" : state === "na" ? "var(--mut)" : state === "over" ? "var(--bad)" : "var(--warn)";
  const label = state === "on" ? "On pace" : state === "over" ? "Overpacing" : state === "slow" ? "Slightly behind" : state === "under" ? "Underpacing" : "Budget not reported";
  const monthBudget = budget ?? (pacing > 0 ? Math.round(spend / (pacing / 100)) : 0);
  const forecast = pacing > 0 ? Math.round(spend + (spend / Math.max(1, 30 - daysLeft)) * daysLeft) : 0;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "var(--accent-soft)" }}>
          <Gauge size={14} className="text-accent" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-mut">Budget pacing</span>
        <span className="ml-auto text-[13px] font-bold num" style={{ color }}>{state === "na" ? "n/a" : `${pacing}%`}</span>
      </div>

      <div className="h-2.5 bg-raised rounded-full overflow-hidden mb-1.5 relative">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pacing)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: color }} />
        <span className="absolute top-[-3px] bottom-[-3px] w-px bg-line2" style={{ left: "80%" }} />
      </div>
      <div className="flex justify-between text-[10px] text-mut font-semibold mb-3">
        <span style={{ color }}>{label}</span>
        <span>target zone 80–100%</span>
      </div>

      {state !== "na" && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line">
          <div>
            <div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-0.5 flex items-center gap-1"><CalendarClock size={10} /> Forecast EOM</div>
            <div className={clsx("text-[15px] font-bold num", forecast > monthBudget && "text-warn")}>{cur}{forecast.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-0.5">Month budget</div>
            <div className="text-[15px] font-bold num">{cur}{monthBudget.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
