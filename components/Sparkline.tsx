"use client";
import { useId } from "react";

export default function Sparkline({ data, color, h = 30 }: { data: number[]; color: string; h?: number }) {
  const gid = useId().replace(/[:]/g, "");
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * 120},${h - 2 - ((v - min) / span) * (h - 6)}`).join(" ");
  const last = data[data.length - 1];
  const lastY = h - 2 - ((last - min) / span) * (h - 6);
  return (
    <svg viewBox={`0 0 120 ${h}`} width="100%" height={h} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} 120,${h}`} fill={`url(#g-${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={120} cy={lastY} r="2.6" fill={color} />
    </svg>
  );
}
