"use client";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, CalendarRange } from "lucide-react";
import type { PeriodComparison, MetricChange } from "@/lib/periods";
import { formatChange } from "@/lib/periods";

// Week-over-week / month-over-month, side by side. Renders nothing invented:
// when the account lacks the history for a window, it says so instead of
// showing a percentage computed from a partial period.

function Row({ c, currency }: { c: MetricChange; currency: string }) {
  const money = ["Spend", "Revenue", "CPC", "Cost per result"].includes(c.metric);
  const suffix = c.metric === "CTR" ? "%" : c.metric === "ROAS" ? "x" : "";
  const fmt = (v: number | null) =>
    v == null ? "—" : `${money ? currency : ""}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;

  const text = formatChange(c);
  const tone = c.better == null ? "mut" : c.better ? "good" : "bad";
  const Icon = c.changePct == null || c.changePct === 0 ? Minus : c.changePct > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0">
      <span className="text-[12.5px] font-semibold">{c.metric}</span>
      <div className="flex items-center gap-3 num text-[12.5px]">
        <span className="text-mut">{fmt(c.previous)}</span>
        <span className="text-mut">→</span>
        <span className="font-bold">{fmt(c.current)}</span>
        <span
          className="inline-flex items-center gap-0.5 font-bold min-w-[62px] justify-end"
          style={{ color: tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--mut)" }}
        >
          <Icon size={13} />
          {text ?? "n/a"}
        </span>
      </div>
    </div>
  );
}

export default function PeriodCompare({
  wow, mom, currency = "$",
}: { wow: PeriodComparison; mom: PeriodComparison; currency?: string }) {
  const [a, b] = [wow, mom];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[a, b].map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarRange size={15} style={{ color: "var(--accent)" }} />
              <h3 className="text-[14px] font-bold tracking-tight">
                {p.label === "WoW" ? "Week over week" : "Month over month"}
              </h3>
            </div>
            <span className="text-[11px] text-mut font-medium">{p.window}</span>
          </div>

          {p.comparable ? (
            <div>
              {p.changes.map((c) => <Row key={c.metric} c={c} currency={currency} />)}
            </div>
          ) : (
            // Not enough history. Saying so beats a percentage derived from a
            // partial window, which would read as a real swing.
            <div className="text-[12.5px] text-mut font-medium py-6 text-center">
              Not enough history yet for a {p.label === "WoW" ? "weekly" : "monthly"} comparison.
              <div className="text-[11.5px] mt-1">{p.reason}</div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
