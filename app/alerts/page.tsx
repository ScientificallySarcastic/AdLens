"use client";
import { motion } from "framer-motion";
import { alerts } from "@/lib/data";
import clsx from "clsx";

export default function Alerts() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="font-display text-[26px] tracking-tight mb-1">Alerts</h1>
      <p className="text-[12px] text-mut mb-4">Active performance alerts from the rules engine.</p>
      <div className="card overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-[10px] uppercase text-mut">
            {["Severity", "Campaign", "Rule", "Value", "Threshold", "Fired"].map((h) => <th key={h} className="px-3.5 py-2.5 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {alerts.map((a, i) => (
              <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                className={clsx("border-t border-line", a.severity === "Critical" && "bg-rose-50/50 dark:bg-rose-500/[0.07]")}>
                <td className="px-3.5 py-3"><span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", a.severity === "Critical" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300")}>{a.severity}</span></td>
                <td className="px-3.5 py-3 font-semibold">{a.campaign}</td>
                <td className="px-3.5 py-3">{a.rule}</td>
                <td className={clsx("px-3.5 py-3 font-bold", a.severity === "Critical" ? "text-bad" : "text-warn")}>{a.value}</td>
                <td className="px-3.5 py-3 text-mut">{a.threshold}</td>
                <td className="px-3.5 py-3 text-mut">{a.ago}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
