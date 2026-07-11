"use client";
export default function Sparkline({ data, color, h = 30 }: { data: number[]; color: string; h?: number }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 120},${h - 2 - (v / max) * (h - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 120 ${h}`} width="100%" height={h} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`g-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} 120,${h}`} fill={`url(#g-${color.replace(/[^a-zA-Z0-9]/g, "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
