"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, Plus, Bell } from "lucide-react";
import { campaigns, Campaign } from "@/lib/data";
import { useApp } from "@/lib/store";
import Sparkline from "@/components/Sparkline";
import Counter from "@/components/Counter";
import { PlatBadge, StatusBadge, HealthDot } from "@/components/Badge";
import clsx from "clsx";

type SortKey = "spend" | "roas" | "name";

export default function Overview() {
  const router = useRouter();
  const setCampaign = useApp((s) => s.setCampaign);
  const [q, setQ] = useState("");
  const [plat, setPlat] = useState<"all" | "meta" | "li">("all");
  const [sort, setSort] = useState<SortKey>("spend");
  const [showAll, setShowAll] = useState(false);

  const totals = useMemo(() => {
    const act = campaigns.filter((c) => c.status === "Active");
    const spend = act.reduce((s, c) => s + c.spend, 0);
    const rev = act.reduce((s, c) => s + c.revenue, 0);
    return { spend, rev, roas: rev / spend, active: act.length, total: campaigns.length };
  }, []);

  const list = useMemo(() => {
    let l = campaigns.filter((c) =>
      (plat === "all" || c.platform === plat) &&
      c.name.toLowerCase().includes(q.toLowerCase()));
    l = [...l].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : (b[sort] as number) - (a[sort] as number));
    return showAll ? l : l.slice(0, 9);
  }, [q, plat, sort, showAll]);

  const open = (c: Campaign) => {
    if (c.status === "Paused") return;
    setCampaign(c.id, c.name);
    router.push(`/analysis/${c.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-display text-[26px] tracking-tight">Campaign overview</h1>
          <p className="text-[12px] text-mut">{totals.total} campaigns across your connected platforms · last synced 12 min ago</p>
        </div>
        <button onClick={() => router.push("/check")} className="text-[11px] font-semibold border border-line2 rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors inline-flex items-center gap-1.5">
          <Plus size={13} /> Run account check
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1">Total spend</div>
          <div className="font-display text-[26px] tracking-tight"><Counter value={totals.spend} prefix="$" /></div>
          <div className="text-[10px] text-mut font-semibold">this month</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1">Revenue</div>
          <div className="font-display text-[26px] tracking-tight"><Counter value={totals.rev} prefix="$" /></div>
          <div className="text-[10px] text-good font-semibold">↑16% MoM</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1">Blended ROAS</div>
          <div className="font-display text-[26px] tracking-tight"><Counter value={totals.roas} decimals={1} suffix="x" /></div>
          <div className="text-[10px] text-warn font-semibold">↓0.2x MoM</div></div>
        <div className="card p-3"><div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1">Active</div>
          <div className="font-display text-[26px] tracking-tight">{totals.active}<span className="text-[12px] text-mut">/{totals.total}</span></div>
          <div className="text-[10px] text-mut font-semibold">{totals.total - totals.active} paused</div></div>
        <button onClick={() => router.push("/alerts")} className="card p-3 text-left hover:border-rose-300 dark:hover:border-rose-500/50 dark:border-rose-500/45 hover:shadow-lift transition-all">
          <div className="text-[10px] font-semibold text-mut uppercase tracking-wide mb-1 flex items-center gap-1"><Bell size={10} /> Open alerts</div>
          <div className="font-display text-[24px] text-bad">3</div>
          <div className="text-[10px] text-bad font-semibold">2 critical →</div></button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…"
            className="w-full text-[12px] pl-8 pr-3 py-2 rounded-lg border border-line2 bg-surface outline-none focus:border-accent transition-colors" />
        </div>
        <div className="flex rounded-lg border border-line2 bg-surface p-0.5">
          {(["all", "meta", "li"] as const).map((p) => (
            <button key={p} onClick={() => setPlat(p)} className={clsx("relative text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors", plat === p ? "text-accentfg" : "text-mut hover:text-ink")}>
              {plat === p && <motion.span layoutId="plat-pill" className="absolute inset-0 bg-accent rounded-md" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative z-10">{p === "all" ? "All" : p === "meta" ? "Meta" : "LinkedIn"}</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-[12px] px-3 py-2 rounded-lg border border-line2 bg-surface outline-none cursor-pointer">
          <option value="spend">Sort: Spend</option>
          <option value="roas">Sort: ROAS</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <LayoutGroup>
        <motion.div layout className="grid grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {list.map((c) => (
              <motion.div layout key={c.id}
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                whileHover={c.status === "Active" ? { y: -3 } : undefined}
                onClick={() => open(c)}
                className={clsx("card p-4", c.status === "Active" ? "cursor-pointer hover:shadow-lift hover:border-indigo-300 dark:hover:border-indigo-400/50 transition-all" : "opacity-60")}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-[13px] truncate pr-2">{c.name}</span>
                  <HealthDot h={c.health} />
                </div>
                <div className="flex gap-1.5 items-center mb-2.5 flex-wrap">
                  <PlatBadge p={c.platform} /><StatusBadge s={c.status} />
                  <span className={clsx("text-[10px] font-semibold", c.health === "critical" ? "text-bad" : c.health === "watch" ? "text-warn" : "text-mut")}>{c.note}</span>
                </div>
                <Sparkline data={c.spark} color={c.health === "critical" ? "#f43f5e" : c.roas > 3 ? "#10b981" : "var(--chart1)"} />
                <div className="text-[9px] text-mut mb-2.5 mt-0.5">Revenue trend · 7 days</div>
                <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                  {[["Spend", c.status === "Paused" ? "—" : `$${c.spend.toLocaleString()}`, ""],
                    ["ROAS", c.status === "Paused" ? "—" : `${c.roas}x`, c.roas >= 3 ? "text-good" : c.roas < 1.5 && c.roas > 0 ? "text-bad" : ""],
                    ["CTR", c.status === "Paused" ? "—" : `${c.ctr}%`, ""],
                    ["Conv", c.status === "Paused" ? "—" : String(c.conv), ""]].map(([l, v, cls]) => (
                    <div key={l as string}><div className="text-[9px] text-mut uppercase">{l}</div><div className={clsx("font-bold text-[12px]", cls)}>{v}</div></div>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <div className="text-[9px] text-mut mb-0.5">Budget pacing · {c.pacing}%</div>
                    <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, c.pacing)}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        className={clsx("h-full rounded-full", c.pacing > 100 || c.pacing < 60 ? "bg-bad" : c.pacing < 80 ? "bg-warn" : "bg-good")} />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-accent whitespace-nowrap">{c.status === "Active" ? "Analyse →" : "Paused"}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {!showAll && campaigns.length > 9 && (
        <div className="text-center mt-4">
          <button onClick={() => setShowAll(true)} className="text-[12px] font-semibold text-accent hover:underline">
            Show all {campaigns.filter(c => plat === "all" || c.platform === plat).length} campaigns ↓
          </button>
        </div>
      )}
    </div>
  );
}
