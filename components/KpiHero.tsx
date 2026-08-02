"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import Counter from "./Counter";
import Sparkline from "./Sparkline";

export type KpiTone = "good" | "bad" | "warn" | "neutral";

export function KpiHero({
  label, value, prefix = "", suffix = "", decimals = 0, rawValue, delta, deltaTone = "neutral",
  icon: Icon, spark, sparkColor, sub, alert, i = 0,
}: {
  label: string;
  value?: number;
  rawValue?: string;
  prefix?: string; suffix?: string; decimals?: number;
  delta?: string; deltaTone?: KpiTone;
  icon?: LucideIcon;
  spark?: number[]; sparkColor?: string;
  sub?: string;
  alert?: boolean;
  i?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 28 }}
      className={clsx("card p-4 relative overflow-hidden", alert && "border-bad/40 ring-1 ring-bad/20")}>
      {alert && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-bad animate-pulse" />}
      <div className="flex items-center gap-2 mb-2.5">
        {Icon && (
          <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "var(--accent-soft)" }}>
            <Icon size={14} className="text-accent" />
          </span>
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-mut">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className={clsx("font-display num text-[30px] leading-none", alert && "text-bad")}>
          {rawValue != null ? rawValue : <Counter value={value ?? 0} prefix={prefix} suffix={suffix} decimals={decimals} />}
        </div>
        {spark && spark.length > 1 && (
          <div className="w-[76px] shrink-0 pb-0.5">
            <Sparkline data={spark} color={sparkColor ?? "var(--chart1)"} h={26} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span className={clsx(
            deltaTone === "good" ? "pill-good" : deltaTone === "bad" ? "pill-bad" : deltaTone === "warn" ? "pill-warn" : "pill-mut"
          )}>{delta}</span>
        )}
        {sub && <span className="text-[11px] text-mut font-medium">{sub}</span>}
      </div>
    </motion.div>
  );
}
