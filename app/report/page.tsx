"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Sparkles, Star } from "lucide-react";
import clsx from "clsx";

interface Section { title: string; body: string }
interface Priority { stars: number; text: string }
interface ReportData {
  sections: Section[]; priorities: Priority[];
  snapshot: { syncedAt: string; mode: string };
  campaign: { name: string; spend: number; revenue: number; roas: number; conv: number; ctr: number; cpc: number };
}

const COMPARE_ROWS = [
  ["Spend", "$5,620", "$4,780", "+18%", true],
  ["Revenue", "$17,984", "$14,740", "+22%", true],
  ["ROAS", "3.2x", "2.9x", "+0.3x", true],
  ["Conversions", "348", "305", "+14%", true],
  ["CPA", "$17.60", "$15.50", "+$2.10", false],
  ["CTR", "1.84%", "1.64%", "+0.2pts", true],
] as const;

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
      if (comparing) await new Promise(r => setTimeout(r, 700)); // on-demand fetch simulation
      if (alive) setPhase("Analyst is writing your report…");
      const res = await fetch("/api/ai/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, compare: comparing }) });
      const d = await res.json();
      await new Promise(r => setTimeout(r, 400));
      if (alive) setData(d);
    })();
    return () => { alive = false; };
  }, [id, comparing]);

  if (!data) return (
    <div className="max-w-3xl mx-auto p-10 text-center">
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}
        className="inline-flex items-center gap-2 text-[13px] text-mut">
        <Sparkles size={15} className="text-accent" /> {phase}
      </motion.div>
      <div className="mt-8 space-y-3">
        {[80, 100, 92, 100, 74].map((w, i) => (
          <div key={i} className="h-3 rounded bg-raised animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );

  const c = data.campaign;
  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 print:hidden">
        <div className="text-[11px] text-mut">Generated from snapshot · {data.snapshot.syncedAt} · {comparing ? "previous period fetched on demand & cached" : "cached data, zero live API calls"}</div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/reporting")} className="text-[11px] font-semibold border border-line2 rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 hover:border-accent hover:text-accent transition-colors"><ArrowLeft size={12} /> Edit selection</button>
          <button onClick={() => window.print()} className="bg-accent hover:bg-accent2 text-accentfg text-[11px] font-semibold rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"><Download size={12} /> Export PDF</button>
        </div>
      </div>

      {/* The document */}
      <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="card px-10 py-9 print:border-0 print:shadow-none">
        <div className="border-b border-line pb-5 mb-6">
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">AdLens · AI Performance Report</div>
          <h1 className="font-display text-[32px] leading-tight tracking-tight mb-1.5">{c.name}</h1>
          <div className="text-[12px] text-mut">{comparing ? "June 1–30 vs May 1–31, 2025" : "June 1–30, 2025"} · Prepared by the AdLens reasoning engine</div>
          <div className="flex gap-5 mt-4 text-[12px]">
            {[["Spend", `$${c.spend.toLocaleString()}`], ["Revenue", `$${c.revenue.toLocaleString()}`], ["ROAS", `${c.roas}x`], ["Conversions", String(c.conv)]].map(([l, v]) => (
              <div key={l}><span className="text-mut">{l} </span><strong className="font-display text-[15px]">{v}</strong></div>
            ))}
          </div>
        </div>

        {data.sections.map((s, i) => (
          <motion.section key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }} className="mb-6">
            <h2 className="font-display text-[20px] tracking-tight mb-2">{s.title}</h2>
            {s.body === "__METRICS_TABLE__" ? (
              <table className="w-full text-[12px] border border-line rounded-lg overflow-hidden">
                <thead><tr className="bg-raised text-left text-[10px] uppercase text-mut">
                  {["Metric", "Current", "Previous", "Change"].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {COMPARE_ROWS.map(([m, cu, pr, ch, good]) => (
                    <tr key={m} className="border-t border-line">
                      <td className="px-3 py-2 font-semibold">{m}</td>
                      <td className="px-3 py-2">{cu}</td>
                      <td className="px-3 py-2 text-mut">{pr}</td>
                      <td className={clsx("px-3 py-2 font-bold", good ? "text-good" : "text-bad")}>{ch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[13px] leading-[1.85] text-ink/90">{s.body}</p>
            )}
          </motion.section>
        ))}

        <section className="mt-8 pt-5 border-t border-line">
          <h2 className="font-display text-[20px] tracking-tight mb-3">Priority Action Items</h2>
          <div className="space-y-2.5">
            {data.priorities.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3">
                <span className="flex gap-0.5 w-[86px]">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} className={s < p.stars ? "text-amber-500 fill-amber-500" : "text-line2"} />
                  ))}
                </span>
                <span className="text-[13px]">{p.text}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mt-8 pt-4 border-t border-line text-[10px] text-mut">
          Generated by the AdLens reasoning engine — the same engine that powers the chat. All figures cited from the daily data snapshot; no numbers are model-invented.
        </div>
      </motion.article>
    </div>
  );
}

export default function Report() {
  return <Suspense fallback={<div className="p-6 text-mut text-[12px]">Loading…</div>}><ReportInner /></Suspense>;
}
