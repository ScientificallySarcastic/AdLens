import clsx from "clsx";
import { Trophy, TrendingDown, Pause, ArrowUpRight, Eye } from "lucide-react";

export function PlatBadge({ p }: { p: "meta" | "li" }) {
  return (
    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1",
      p === "meta" ? "bg-blue-500/12 text-blue-600 dark:text-blue-400" : "bg-sky-700/12 text-sky-700 dark:text-sky-400")}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p === "meta" ? "#1877F2" : "#0A66C2" }} />
      {p === "meta" ? "Meta" : "LinkedIn"}
    </span>
  );
}

export function StatusBadge({ s }: { s: string }) {
  return <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md",
    s === "Active" ? "bg-good/12 text-good" : "bg-raised text-mut")}>{s}</span>;
}

export function Delta({ v, dir }: { v: string; dir: "up" | "dn" | "flat" }) {
  return <span className={clsx("text-[11px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 num",
    dir === "up" ? "bg-good/12 text-good" : dir === "dn" ? "bg-bad/12 text-bad" : "bg-raised text-mut")}>{v}</span>;
}

export function HealthDot({ h }: { h: string }) {
  const c = h === "good" ? "bg-good" : h === "watch" ? "bg-warn" : h === "critical" ? "bg-bad" : "bg-line2";
  return (
    <span className="relative inline-flex w-2.5 h-2.5">
      {h === "critical" && <span className="absolute inline-flex h-full w-full rounded-full bg-bad opacity-60 animate-ping" />}
      <span className={clsx("relative inline-flex w-2.5 h-2.5 rounded-full", c)} />
    </span>
  );
}

/** Winner / loser / action badges for ads & adsets */
export function RankBadge({ rank, label }: { rank: "top" | "mid" | "low"; label?: string }) {
  if (rank === "top") return <span className="pill-good"><Trophy size={10} /> {label ?? "Winner"}</span>;
  if (rank === "low") return <span className="pill-bad"><TrendingDown size={10} /> {label ?? "Loser"}</span>;
  return <span className="pill-mut">{label ?? "Mid"}</span>;
}

export function ActionPill({ a }: { a: "Scale" | "Pause" | "Monitor" }) {
  if (a === "Scale") return <span className="pill-good"><ArrowUpRight size={10} /> Scale</span>;
  if (a === "Pause") return <span className="pill-bad"><Pause size={10} /> Pause</span>;
  return <span className="pill-warn"><Eye size={10} /> Monitor</span>;
}

/** Creative score 0-100 chip, derived from CTR/ROAS/fatigue */
export function CreativeScore({ score }: { score: number }) {
  const color = score >= 70 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative w-7 h-7 shrink-0">
        <svg viewBox="0 0 28 28" className="-rotate-90 w-7 h-7">
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--grid)" strokeWidth="3.5" />
          <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 11} strokeDashoffset={2 * Math.PI * 11 * (1 - score / 100)} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[8px] font-bold num" style={{ color }}>{score}</span>
      </span>
    </span>
  );
}
