"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, Plus, Bell, Wallet, DollarSign, Target, Activity } from "lucide-react";
import { campaigns, Campaign } from "@/lib/data";
import { useApp } from "@/lib/store";
import Sparkline from "@/components/Sparkline";
import { PlatBadge, HealthDot } from "@/components/Badge";
import { KpiHero } from "@/components/KpiHero";
import PageHeader from "@/components/PageHeader";
import clsx from "clsx";
import { sym, money, commonCurrency, sumByCurrency, formatMixed } from "@/lib/currency";

type SortKey = "spend" | "roas" | "name";
type HealthFilter = "all" | "critical" | "watch" | "good";

export default function Overview() {
  const router = useRouter();
  const setCampaign = useApp((s) => s.setCampaign);
  const [q, setQ] = useState("");
  const [plat, setPlat] = useState<"all" | "meta" | "li">("all");
  const [hf, setHf] = useState<HealthFilter>("all");
  const [sort, setSort] = useState<SortKey>("spend");
  const [showAll, setShowAll] = useState(false);

  // Live campaigns stacked on top of the seeded portfolio; failures → seeded only.
  const [liveCamps, setLiveCamps] = useState<Campaign[]>([]);
  useEffect(() => {
    fetch(`/api/db/accounts?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLiveCamps(Array.isArray(d?.campaigns) ? d.campaigns : []))
      .catch(() => setLiveCamps([]));
  }, []);
  const all = useMemo(() => [...liveCamps, ...campaigns], [liveCamps]);

  const totals = useMemo(() => {
    const act = all.filter((c) => c.status === "Active" || (String(c.id).startsWith("meta_") && c.spend > 0));
    const spend = act.reduce((s, c) => s + c.spend, 0);
    const rev = act.reduce((s, c) => s + c.revenue, 0);
    return {
      spend, rev,
      roas: spend > 0 ? rev / spend : 0,
      active: act.length, total: all.length,
      critical: act.filter((c) => c.health === "critical").length,
      watchN: act.filter((c) => c.health === "watch").length,
      liveCount: liveCamps.length,
      // Amounts in different currencies cannot be summed. When the active set
      // spans more than one, report each separately instead of one fake total.
      currency: commonCurrency(act),
      spendParts: sumByCurrency(act, (c) => c.spend),
      revParts: sumByCurrency(act, (c) => c.revenue),
    };
  }, [all, liveCamps]);

  const list = useMemo(() => {
    let l = all.filter((c) =>
      (plat === "all" || c.platform === plat) &&
      (hf === "all" || c.health === hf) &&
      c.name.toLowerCase().includes(q.toLowerCase()));
    l = [...l].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : (b[sort] as number) - (a[sort] as number));
    return showAll ? l : l.slice(0, 12);
  }, [q, plat, hf, sort, showAll, all]);

  const open = (c: Campaign) => {
    if (c.status === "Paused" && c.spend === 0) return;
    setCampaign(c.id, c.name);
    router.push(`/analysis/${c.id}`);
  };

  const healthCounts: Record<Exclude<HealthFilter, "all">, number> = {
    critical: all.filter((c) => c.health === "critical").length,
    watch: all.filter((c) => c.health === "watch").length,
    good: all.filter((c) => c.health === "good").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-7">
      <PageHeader
        kicker="Portfolio"
        title="Campaigns"
        sub={<>
          {totals.total} campaigns
          {totals.liveCount > 0
            ? <> · <span className="text-good font-bold">{totals.liveCount} live from Meta</span> · {totals.total - totals.liveCount} demo</>
            : <> · demo data</>}
          {!totals.currency && <> · totals span more than one currency, shown separately</>}
        </>}
        right={<button onClick={() => router.push("/check")} className="btn-primary"><Plus size={15} /> Run account check</button>}
      />

      {/* KPI heroes */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {totals.currency ? (
          <KpiHero i={0} label="Total spend" icon={Wallet} value={totals.spend} prefix={sym(totals.currency)} sub="this month" />
        ) : (
          <KpiHero i={0} label="Total spend" icon={Wallet} rawValue={formatMixed(totals.spendParts)} sub="across currencies" />
        )}
        {totals.currency ? (
          <KpiHero i={1} label="Revenue" icon={DollarSign} value={totals.rev} prefix={sym(totals.currency)} />
        ) : (
          <KpiHero i={1} label="Revenue" icon={DollarSign} rawValue={formatMixed(totals.revParts)} sub="across currencies" />
        )}
        {/* Blended ROAS is a ratio, so it is only meaningful within ONE currency. */}
        {totals.currency ? (
          <KpiHero i={2} label="Blended ROAS" icon={Target} value={totals.roas} decimals={1} suffix="x" />
        ) : (
          <KpiHero i={2} label="Blended ROAS" icon={Target} rawValue="—" sub="mixed currencies" />
        )}
        <KpiHero i={3} label="Active" icon={Activity} rawValue={`${totals.active}`} sub={`${totals.total - totals.active} paused`} />
        <motion.button initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onClick={() => router.push("/alerts")}
          className="card p-4 text-left card-hover border-bad/30 relative overflow-hidden">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-bad" />
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "var(--bad-soft)" }}>
              <Bell size={14} className="text-bad" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-mut">Alerts</span>
          </div>
          <div className="font-display num text-[30px] leading-none text-bad">3</div>
          <div className="mt-2"><span className="pill-bad">2 critical →</span></div>
        </motion.button>
      </div>

      {/* Filter bar */}
      <div className="glass sticky top-0 z-10 -mx-2 px-2 py-2 rounded-2xl flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…"
            className="w-full text-[13px] font-medium pl-9 pr-3 py-2.5 rounded-xl border border-line2 bg-surface outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div className="flex rounded-xl border border-line2 bg-surface p-1">
          {(["all", "meta", "li"] as const).map((p) => (
            <button key={p} onClick={() => setPlat(p)} className={clsx("relative text-[12px] font-bold px-3.5 py-1.5 rounded-lg transition-colors", plat === p ? "text-white" : "text-mut hover:text-ink")}>
              {plat === p && <motion.span layoutId="plat-pill" className="absolute inset-0 rounded-lg" style={{ background: "var(--hero-grad)" }} transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative z-10">{p === "all" ? "All" : p === "meta" ? "Meta" : "LinkedIn"}</span>
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-line2 bg-surface p-1 gap-0.5">
          {(["all", "critical", "watch", "good"] as const).map((h) => (
            <button key={h} onClick={() => setHf(h)}
              className={clsx("text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5",
                hf === h ? "bg-raised text-ink" : "text-mut hover:text-ink")}>
              {h !== "all" && <HealthDot h={h} />}
              {h === "all" ? "Any health" : `${h[0].toUpperCase()}${h.slice(1)} ${healthCounts[h]}`}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-[12px] font-bold px-3 py-2.5 rounded-xl border border-line2 bg-surface outline-none cursor-pointer">
          <option value="spend">Sort: Spend</option>
          <option value="roas">Sort: ROAS</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Campaign grid */}
      <LayoutGroup>
        <motion.div layout className="grid grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {list.map((c) => {
              const winner = c.roas >= 3.5 && c.status === "Active";
              const loser = c.health === "critical";
              return (
                <motion.div layout key={c.id}
                  initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  whileHover={c.status === "Active" ? { y: -4 } : undefined}
                  onClick={() => open(c)}
                  className={clsx("card p-4 relative overflow-hidden",
                    c.status === "Active" ? "cursor-pointer hover:shadow-lift hover:border-accent/40 transition-all" : "opacity-55",
                    loser && "border-bad/30")}>
                  <span className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: loser ? "var(--bad)" : c.health === "watch" ? "var(--warn)" : winner ? "var(--good)" : "transparent" }} />

                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] truncate pr-2">{c.name}</div>
                      <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                        <PlatBadge p={c.platform} />
                        {winner && <span className="pill-good">Top performer</span>}
                        {loser && <span className="pill-bad">{c.note.replace("⚠ ", "")}</span>}
                        {c.health === "watch" && <span className="pill-warn">Watch</span>}
                        {c.status === "Paused" && <span className="pill-mut">Paused</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={clsx("font-display num text-[24px] leading-none",
                        c.roas >= 3 ? "text-good" : c.roas < 1.5 && c.roas > 0 ? "text-bad" : "")}>
                        {c.roas > 0 ? `${c.roas}x` : "—"}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-mut mt-0.5">ROAS</div>
                    </div>
                  </div>

                  <Sparkline data={c.spark} color={loser ? "var(--chart-bad)" : c.roas > 3 ? "var(--chart-good)" : "var(--chart1)"} h={34} />

                  <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                    {(() => { const blank = c.spend === 0; return [
                      ["Spend", blank ? "—" : money(c.spend, c.currency)],
                      ["CTR", blank ? "—" : `${c.ctr}%`],
                      ["Conv", blank ? "—" : String(c.conv)]] as [string, string][]; })().map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-raised px-2 py-1.5">
                        <div className="text-[9px] font-bold text-mut uppercase tracking-wide">{l}</div>
                        <div className="font-bold text-[13px] num">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, c.pacing)}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                          className={clsx("h-full rounded-full", c.pacing > 100 || c.pacing < 60 ? "bg-bad" : c.pacing < 80 ? "bg-warn" : "bg-good")} />
                      </div>
                      <div className="text-[10px] text-mut font-semibold mt-1">Pacing {c.pacing}%</div>
                    </div>
                    {c.status === "Active" && <span className="text-[12px] font-bold text-accent whitespace-nowrap">Analyse →</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {!showAll && list.length >= 12 && (
        <div className="text-center mt-5">
          <button onClick={() => setShowAll(true)} className="btn-ghost">
            Show all {all.filter(c => (plat === "all" || c.platform === plat) && (hf === "all" || c.health === hf)).length} campaigns ↓
          </button>
        </div>
      )}
    </div>
  );
}
