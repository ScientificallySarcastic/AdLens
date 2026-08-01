"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Hourglass, TrendingUp, Search, FileText, BookOpen, ArrowRight,
  DollarSign, Target, MousePointerClick, Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { campaigns } from "@/lib/data";
import { KpiHero } from "@/components/KpiHero";
import HealthScore from "@/components/HealthScore";
import AISummary from "@/components/AISummary";

const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const item = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function Home() {
  const router = useRouter();
  const setCampaign = useApp((s) => s.setCampaign);
  const openSummer = () => { setCampaign("summer-sale", "Summer Sale — Broad"); router.push("/analysis/summer-sale"); };

  const active = campaigns.filter((c) => c.status === "Active");
  const spend = active.reduce((s, c) => s + c.spend, 0);
  const rev = active.reduce((s, c) => s + c.revenue, 0);
  const roas = spend > 0 ? rev / spend : 0;
  const critical = active.filter((c) => c.health === "critical").length;
  const watch = active.filter((c) => c.health === "watch").length;
  const healthScore = Math.max(5, Math.round(100 - (critical / active.length) * 220 - (watch / active.length) * 60));

  const actions = [
    {
      icon: AlertTriangle, tone: "bad" as const, tag: "Fix now", impact: "−$83/day burning",
      title: "Summer Sale — ROAS below break-even",
      body: "25–44 Male crashed to 1.2x. One fatigued video ad is the culprit.",
    },
    {
      icon: Hourglass, tone: "warn" as const, tag: "This week", impact: "$4.4k/mo at risk",
      title: "18–34 Female saturating in ~4 days",
      body: "Frequency 8.2, reach 94%. Fresh creative needed before CTR drops.",
    },
    {
      icon: TrendingUp, tone: "good" as const, tag: "Opportunity", impact: "+$720–1,440/wk",
      title: "Lookalike 1% is ready to scale",
      body: "3.6x ROAS with 59% of the audience untouched.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-7">
      {/* ── Hero: greeting + portfolio health ─────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-6 mb-6">
        <div>
          <div className="section-label mb-2">Daily brief · synced 02:00</div>
          <h1 className="font-display text-[40px] leading-[1.05] tracking-tight">
            Good morning.<br /><span className="gradient-text">3 things need you today.</span>
          </h1>
        </div>
        <div className="card px-5 py-4">
          <HealthScore score={healthScore} label="Portfolio health"
            detail={`${critical} critical · ${watch} watching · ${active.length} active campaigns`} />
        </div>
      </motion.div>

      {/* ── AI Summary ────────────────────────────────────────── */}
      <AISummary meta="reasoning engine · verified figures" cta="Review Summer Sale" onCta={openSummer}>
        Your portfolio returns <strong>{roas.toFixed(1)}x blended</strong>, but <strong>$1,780/mo is leaking</strong> into
        below-break-even adsets. Fixing the fatigued video in Summer Sale and scaling Lookalike 1% would swing
        roughly <strong>+$2,500/mo</strong> — both are one-click actions.
      </AISummary>

      {/* ── Portfolio KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiHero i={0} label="Spend / mo" icon={Wallet} value={spend} prefix="$" delta="↑12% MoM" deltaTone="neutral" sub="all active" />
        <KpiHero i={1} label="Revenue / mo" icon={DollarSign} value={rev} prefix="$" delta="↑16% MoM" deltaTone="good" />
        <KpiHero i={2} label="Blended ROAS" icon={Target} value={roas} decimals={1} suffix="x" delta="↓0.2x MoM" deltaTone="warn" />
        <KpiHero i={3} label="Leaking spend" icon={MousePointerClick} value={1780} prefix="$" delta={`${critical} critical`} deltaTone="bad" sub="below break-even" alert />
      </div>

      {/* ── Action queue ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="section-label">Action queue — ranked by impact</div>
        <Link href="/ledger" className="text-[12px] font-bold text-accent inline-flex items-center gap-1 hover:underline">
          <BookOpen size={13} /> Track outcomes in Ledger
        </Link>
      </div>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-3 mb-7">
        {actions.map((a, idx) => {
          const Icon = a.icon;
          const toneColor = a.tone === "bad" ? "var(--bad)" : a.tone === "warn" ? "var(--warn)" : "var(--good)";
          return (
            <motion.button key={idx} variants={item} onClick={openSummer} whileHover={{ y: -4 }}
              className="card p-4 text-left relative overflow-hidden transition-shadow hover:shadow-lift group">
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: toneColor }} />
              <div className="flex items-center justify-between mb-2.5">
                <span className={a.tone === "bad" ? "pill-bad" : a.tone === "warn" ? "pill-warn" : "pill-good"}>
                  <Icon size={11} /> {a.tag}
                </span>
                <span className="text-[11px] font-bold num" style={{ color: toneColor }}>{a.impact}</span>
              </div>
              <div className="font-bold text-[14px] leading-snug mb-1">{a.title}</div>
              <div className="text-[12px] text-mut leading-relaxed">{a.body}</div>
              <div className="mt-3 text-[12px] font-bold text-accent inline-flex items-center gap-1">
                Review <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Quick starts ──────────────────────────────────────── */}
      <div className="section-label mb-3">Workflows</div>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3">
        {[
          { href: "/check", icon: Search, title: "Deep-dive a campaign", body: "Adsets, creatives, frequency, anomalies and AI insights — or compare across platforms." },
          { href: "/reporting", icon: FileText, title: "Generate a client report", body: "Three steps to a client-ready PDF with charts and an AI narrative that cites your data." },
        ].map(({ href, icon: Icon, title, body }) => (
          <motion.div key={href} variants={item}>
            <Link href={href} className="card card-hover p-5 flex items-center gap-4 group">
              <span className="w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 shadow-hero"
                style={{ background: "var(--hero-grad)" }}>
                <Icon size={20} />
              </span>
              <div className="flex-1">
                <div className="font-bold text-[15px] mb-0.5">{title}</div>
                <p className="text-[12px] text-mut leading-relaxed">{body}</p>
              </div>
              <ArrowRight size={17} className="text-mut group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
