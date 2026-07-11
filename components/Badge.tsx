import clsx from "clsx";
export function PlatBadge({ p }: { p: "meta" | "li" }) {
  return <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", p === "meta" ? "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" : "bg-indigo-100 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-400/15 dark:text-indigo-300")}>{p === "meta" ? "Meta" : "LinkedIn"}</span>;
}
export function StatusBadge({ s }: { s: string }) {
  return <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", s === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-400/15 dark:text-slate-400")}>{s}</span>;
}
export function Delta({ v, dir }: { v: string; dir: "up" | "dn" | "flat" }) {
  return <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5",
    dir === "up" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : dir === "dn" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-slate-100 text-slate-500 dark:bg-slate-400/15 dark:text-slate-400")}>{v}</span>;
}
export function HealthDot({ h }: { h: string }) {
  const c = h === "good" ? "bg-emerald-500" : h === "watch" ? "bg-amber-500" : h === "critical" ? "bg-rose-500" : "bg-slate-300";
  return <span className={clsx("inline-block w-2 h-2 rounded-full", c, h === "critical" && "animate-pulse")} />;
}
