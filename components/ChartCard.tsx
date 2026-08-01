"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--line2)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--ink)",
  boxShadow: "var(--shadow-lift)",
  padding: "8px 12px",
} as const;

export const AXIS_TICK = { fontSize: 11, fill: "var(--mut)", fontWeight: 600 } as const;

export default function ChartCard({ title, sub, right, icon: Icon, children }:
  { title: string; sub?: string; right?: ReactNode; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "var(--accent-soft)" }}>
              <Icon size={14} className="text-accent" />
            </span>
          )}
          <div>
            <div className="text-[13px] font-bold">{title}</div>
            {sub && <div className="text-[11px] text-mut font-medium">{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
