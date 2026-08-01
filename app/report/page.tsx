"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Sparkles, Star } from "lucide-react";
import clsx from "clsx";
import { sym } from "@/lib/currency";

interface Section { title: string; body: string }
interface Priority { stars: number; text: string }
interface CompareRow { metric: string; change: string; better: boolean }
interface ReportData {
  sections: Section[]; priorities: Priority[];
  snapshot: { syncedAt: string; mode: string };
  campaign: { name: string; spend: number; revenue: number; roas: number; conv: number; ctr: number; cpc: number };
  compareRows?: CompareRow[];
  currency?: string;
}

function ReportInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("c") || "summer-sale";
  const comparing = sp.get("cmp") === "1";
  const [data, setData] = useState<ReportData | null>(null);
  const [phase, setPhase] = useState(comparing ? "Fetching previous period on demand…" : "Reading the snapshot…");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (comparing) await new Promise(r => setTimeout(r, 700));
      if (alive) setPhase("Analyst is writing your report…");
      const res = await fetch("/api/ai/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, compare: comparing }) });
      const d = await res.json();
      await new Promise(r => setTimeout(r, 400));
      if (alive) setData(d);
    })();
    return () => { alive = false; };
  }, [id, comparing]);

  if (!data) return (
    <div className="max-w-3xl mx-auto px-8 py-16 text-center">
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-mut">
        <Sparkles size={17} className="text-accent" /> {phase}
      </motion.div>
      <div className="mt-10 space-y-3">
        {[80, 100, 92, 100, 74].map((w, i) => (
          <div key={i} className="h-4 rounded-lg bg-raised animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );

  const c = data.campaign;
  return (
    <div className="max-w-3xl mx-auto px-8 py-7 print:p-0">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 print:hidden no-print">
        <div className="text-[12px] text-mut font-medium">Generated from snapshot · {data.snapshot.syncedAt} · {comparing ? "previous period fetched on demand & cached" : "cached data, zero live API calls"}</div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/reporting")} className="btn-ghost !py-1.5 !text-[12px]"><ArrowLeft size={13} /> Edit selection</button>
          <button onClick={() => window.print()} className="btn-primary !py-1.5 !text-[12px]"><Download size={13} /> Export PDF</button>
        </div>
      </div>

      {/* The document */}
      <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="card px-10 py-9 print:border-0 print:shadow-none">
        <div className="border-b border-line pb-6 mb-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white" style={{ background: "var(--hero-grad)" }}>
              <Sparkles size={13} />
            </span>
            <span className="text-[11px] font-bold text-accent uppercase tracking-[0.16em]">AdLens · AI Performance Report</span>
          </div>
          <h1 className="font-display text-[34px] leading-tight tracking-tight mb-1.5">{c.name}</h1>
          <div className="text-[13px] text-mut font-medium">{data.snapshot?.syncedAt ? `Data as of ${data.snapshot.syncedAt}` : "Data snapshot"} · Prepared by the AdLens reasoning engine</div>
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[["Spend", `${sym(data.currency)}${c.spend.toLocaleString()}`], ["Revenue", c.revenue > 0 ? `${sym(data.currency)}${c.revenue.toLocaleString()}` : "N/A"], ["ROAS", c.roas > 0 ? `${c.roas}x` : "N/A"], ["Results", String(c.conv)]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-raised px-3.5 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-mut mb-1">{l}</div>
                <div className="font-display num text-[20px] leading-none">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {data.sections.map((s, i) => (
          <motion.section key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }} className="mb-7">
            <h2 className="font-display text-[21px] tracking-tight mb-2.5">{s.title}</h2>
            {s.body === "__METRICS_TABLE__" ? (
              (data.compareRows?.length ?? 0) > 0 ? (
                <table className="w-full text-[13px] border border-line rounded-xl overflow-hidden">
                  <thead><tr className="bg-raised text-left text-[10px] uppercase tracking-wider text-mut">
                    {["Metric", "Change vs previous period"].map(h => <th key={h} className="px-3.5 py-2.5 font-bold">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.compareRows!.map((r) => (
                      <tr key={r.metric} className="border-t border-line">
                        <td className="px-3.5 py-2.5 font-bold">{r.metric}</td>
                        <td className={clsx("px-3.5 py-2.5 font-bold num", r.better ? "text-good" : "text-bad")}>{r.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[13px] text-mut">No comparison period is available in the synced data.</p>
              )
            ) : (
              <p className="text-[14px] leading-[1.85] text-ink/90">{s.body}</p>
            )}
          </motion.section>
        ))}

        <section className="mt-8 pt-6 border-t border-line">
          <h2 className="font-display text-[21px] tracking-tight mb-4">Priority Action Items</h2>
          <div className="space-y-3">
            {data.priorities.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3.5 rounded-xl bg-raised/60 px-3.5 py-2.5">
                <span className="flex gap-0.5 w-[92px] shrink-0">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} className={s < p.stars ? "text-warn fill-current" : "text-line2"} />
                  ))}
                </span>
                <span className="text-[13.5px] font-medium">{p.text}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mt-9 pt-4 border-t border-line text-[11px] text-mut">
          Generated by the AdLens reasoning engine — the same engine that powers the chat. All figures cited from the daily data snapshot; no numbers are model-invented.
        </div>
      </motion.article>
    </div>
  );
}

export default function Report() {
  return <Suspense fallback={<div className="p-8 text-mut text-[13px]">Loading…</div>}><ReportInner /></Suspense>;
}
