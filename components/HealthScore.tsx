"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

export function healthColor(score: number) {
  return score >= 70 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--bad)";
}

export default function HealthScore({ score, size = 108, label = "Health score", detail }:
  { score: number; size?: number; label?: string; detail?: string }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const color = healthColor(score);
  const verdict = score >= 70 ? "Healthy" : score >= 45 ? "Needs attention" : "Critical";
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid)" strokeWidth={9} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={9}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - score / 100) }}
            transition={{ duration: 1.1, ease: "easeOut" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display num text-[26px] leading-none" style={{ color }}>{score}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-mut mt-0.5">/100</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-mut mb-1">{label}</div>
        <div className={clsx("text-[16px] font-bold")} style={{ color }}>{verdict}</div>
        {detail && <div className="text-[12px] text-mut leading-snug mt-1 max-w-[220px]">{detail}</div>}
      </div>
    </div>
  );
}
