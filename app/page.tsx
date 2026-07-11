"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Hourglass, TrendingUp, Search, FileText, BookOpen, ArrowRight } from "lucide-react";
import Counter from "@/components/Counter";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";

const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const item = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function Home() {
  const router = useRouter();
  const setCampaign = useApp((s) => s.setCampaign);
  const openSummer = () => { setCampaign("summer-sale", "Summer Sale — Broad"); router.push("/analysis/summer-sale"); };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
        <h1 className="font-display text-[46px] leading-[1.02] mb-3">See what&apos;s working.<br />Fix what isn&apos;t.</h1>
        <p className="text-mut text-[13.5px] max-w-md">Your AI performance analyst read the snapshot at 02:00. Here&apos;s what needs attention today.</p>
      </motion.div>

      <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">Today&apos;s brief</div>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-3 mb-4">
        <motion.button variants={item} onClick={openSummer} whileHover={{ y: -3 }} className="card p-4 text-left border-rose-200 dark:border-rose-500/35 hover:shadow-lift transition-shadow">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-bold uppercase tracking-wide mb-2"><AlertTriangle size={13} /> Needs action</div>
          <div className="font-semibold text-[12px] mb-1">Summer Sale — ROAS below break-even</div>
          <div className="text-[11px] text-mut leading-relaxed">25–44 Male crashed to 1.2x. One video ad is burning <span className="text-rose-600 dark:text-rose-400 font-bold">~$83/day</span>. Review →</div>
        </motion.button>
        <motion.button variants={item} onClick={openSummer} whileHover={{ y: -3 }} className="card p-4 text-left border-amber-200 dark:border-amber-500/35 hover:shadow-lift transition-shadow">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wide mb-2"><Hourglass size={13} /> Watch</div>
          <div className="font-semibold text-[12px] mb-1">18–34 Female — saturating in ~4 days</div>
          <div className="text-[11px] text-mut leading-relaxed">Frequency 8.2, reach 94%. Fresh creative needed before CTR drops. Review →</div>
        </motion.button>
        <motion.button variants={item} onClick={openSummer} whileHover={{ y: -3 }} className="card p-4 text-left border-emerald-200 dark:border-emerald-500/35 hover:shadow-lift transition-shadow">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wide mb-2"><TrendingUp size={13} /> Opportunity</div>
          <div className="font-semibold text-[12px] mb-1">Lookalike 1% ready to scale</div>
          <div className="text-[11px] text-mut leading-relaxed">3.6x ROAS, 59% untouched. Worth <span className="text-emerald-600 dark:text-emerald-400 font-bold">+$720–1,440/wk</span>. Review →</div>
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="text-2xl">💸</div>
        <div className="flex-1 min-w-[220px]">
          <div className="font-bold text-[13px]"><Counter value={1780} prefix="$" />/mo currently going to below-break-even adsets</div>
          <div className="text-[11px] text-mut">Following this week&apos;s open recommendations would recover most of it — track them in the Ledger.</div>
        </div>
        <Link href="/ledger" className="text-[11px] font-semibold border border-line2 rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors inline-flex items-center gap-1.5"><BookOpen size={13} /> Open ledger</Link>
      </motion.div>

      <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">Get started</div>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Link href="/check" className="card p-6 block hover:border-accent hover:shadow-lift transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 grid place-items-center mb-3"><Search size={18} className="text-accent" /></div>
            <div className="font-bold text-[14px] mb-1">Account check</div>
            <p className="text-[11px] text-mut leading-relaxed mb-3">Analyse one campaign deeply, or compare across platforms. Adsets, creatives, frequency, AI insights.</p>
            <span className="text-[11px] text-accent font-semibold inline-flex items-center gap-1">Get started <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></span>
          </Link>
        </motion.div>
        <motion.div variants={item}>
          <Link href="/reporting" className="card p-6 block hover:border-accent hover:shadow-lift transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 grid place-items-center mb-3"><FileText size={18} className="text-accent" /></div>
            <div className="font-bold text-[14px] mb-1">Reporting</div>
            <p className="text-[11px] text-mut leading-relaxed mb-3">Generate client-ready reports with charts, text summaries and AI narrative. Export PDF.</p>
            <span className="text-[11px] text-accent font-semibold inline-flex items-center gap-1">Get started <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
