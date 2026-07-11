"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { campaigns } from "@/lib/data";
import { PlatBadge, StatusBadge } from "@/components/Badge";
import clsx from "clsx";

const ACCOUNTS = [
  { id: "meta", name: "Acme Corp — Main", sub: "act_12345678 · Meta · 3 campaigns", plat: "meta" as const, spend: "$4,200/mo", camps: 3 },
  { id: "li", name: "Acme Corp LinkedIn", sub: "id_509876543 · LinkedIn · 2 campaigns", plat: "li" as const, spend: "$2,800/mo", camps: 2 },
];

export default function Reporting() {
  const router = useRouter();
  const [acct, setAcct] = useState("meta");
  const [q, setQ] = useState("");
  const [camp, setCamp] = useState("summer-sale");
  const [compare, setCompare] = useState(false);
  const [preset, setPreset] = useState("Last month");

  const account = ACCOUNTS.find((a) => a.id === acct)!;
  const list = useMemo(() =>
    campaigns.filter((c) => c.platform === acct && c.status === "Active" && c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6),
    [acct, q]);

  const Step = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="w-5 h-5 rounded-full bg-accent text-accentfg text-[10px] font-bold grid place-items-center">{n}</span>
      <span className="text-[10px] font-bold text-mut uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="font-display text-[26px] tracking-tight mb-1">Reporting</h1>
      <p className="text-[12px] text-mut mb-4">Reports cover one campaign at a time. Pick the account, then the campaign, then generate.</p>

      <Step n={1} label="Select ad account" />
      <div className="card overflow-hidden divide-y divide-line mb-3">
        {ACCOUNTS.map((a) => (
          <button key={a.id} onClick={() => { setAcct(a.id); setCamp(campaigns.find((c) => c.platform === a.id && c.status === "Active")!.id); }}
            className={clsx("w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors", acct === a.id ? "bg-indigo-50/60 dark:bg-indigo-500/10" : "hover:bg-raised")}>
            <span className={clsx("w-4 h-4 rounded-full border grid place-items-center", acct === a.id ? "border-accent bg-accent" : "border-line2 bg-surface")}>
              {acct === a.id && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
            </span>
            <div><div className="text-[12px] font-medium">{a.name}</div><div className="text-[10px] text-mut">{a.sub}</div></div>
            <span className="ml-auto"><PlatBadge p={a.plat} /></span>
          </button>
        ))}
      </div>
      <motion.div key={acct} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="card p-3.5 mb-4 flex gap-6 flex-wrap text-[12px]">
        {[["Account", account.name], ["Platform", account.plat === "meta" ? "Meta" : "LinkedIn"], ["Monthly spend", account.spend], ["Active campaigns", String(account.camps)]].map(([l, v]) => (
          <div key={l}><div className="text-[10px] text-mut mb-0.5">{l}</div><div className="font-semibold">{v}</div></div>
        ))}
        <div><div className="text-[10px] text-mut mb-0.5">Status</div><StatusBadge s="Active" /></div>
      </motion.div>

      <div className="flex items-center justify-between mb-2">
        <Step n={2} label="Select one campaign" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search…" className="text-[11px] px-3 py-1.5 rounded-lg border border-line2 bg-surface outline-none focus:border-accent w-44" />
      </div>
      <div className="card overflow-hidden divide-y divide-line mb-4">
        {list.map((c) => (
          <button key={c.id} onClick={() => setCamp(c.id)} className={clsx("w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors", camp === c.id ? "bg-indigo-50/60 dark:bg-indigo-500/10" : "hover:bg-raised")}>
            <span className={clsx("w-4 h-4 rounded-full border grid place-items-center", camp === c.id ? "border-accent bg-accent" : "border-line2 bg-surface")}>
              {camp === c.id && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
            </span>
            <div className="text-[12px] font-medium">{c.name}</div>
            <span className="ml-auto text-[10px] text-mut">${c.spend.toLocaleString()} · {c.roas}x · {c.ctr}%</span>
          </button>
        ))}
      </div>

      <Step n={3} label="Report period" />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {["Last week", "Last month", "Overall", "Custom"].map((p) => (
            <button key={p} onClick={() => setPreset(p)} className={clsx("relative text-[11px] font-medium px-3 py-1 rounded-md", preset === p ? "text-accentfg" : "text-mut hover:text-ink")}>
              {preset === p && <motion.span layoutId="rep-pill" className="absolute inset-0 bg-accent rounded-md" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative z-10">{p}</span>
            </button>
          ))}
        </div>
        {preset === "Custom" ? <CustomDates /> : <span className="text-[11px] text-mut">{preset === "Last week" ? "Jul 3 – Jul 9" : preset === "Last month" ? "Jun 1 – Jun 30, 2025" : "Mar 1 – Jul 9 (all time)"}</span>}
      </div>

      <div className="card p-3.5 mb-4 flex items-center gap-2.5 flex-wrap">
        <button onClick={() => setCompare(!compare)} className={clsx("w-9 h-5 rounded-full transition-colors relative", compare ? "bg-accent" : "bg-line2")}>
          <motion.span layout className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" animate={{ left: compare ? 18 : 2 }} />
        </button>
        <span className="text-[12px]">Compare against a previous period</span>
        {compare && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-mut ml-1.5">
            vs <span className="font-bold text-emerald-700">May 1 – May 31, 2025</span>
          </motion.span>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={() => router.push(`/report?c=${camp}&cmp=${compare ? 1 : 0}`)} className="bg-accent hover:bg-accent2 text-accentfg text-[12px] font-semibold rounded-full px-4 py-2 transition-colors">Generate report →</button>
      </div>
    </div>
  );
}

function CustomDates() {
  const [from, setFrom] = useState("2025-06-01");
  const [to, setTo] = useState("2025-06-30");
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} className="border border-line2 rounded-lg px-2 py-1 bg-surface" />
      <span className="text-mut">to</span>
      <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value < from ? from : e.target.value)} className="border border-line2 rounded-lg px-2 py-1 bg-surface" />
    </div>
  );
}
