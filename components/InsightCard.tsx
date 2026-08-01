"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, AlertTriangle, Eye, TrendingUp } from "lucide-react";
import clsx from "clsx";

export type InsightTag = "issue" | "watch" | "rec";

const TAG_META: Record<InsightTag, { label: string; icon: typeof AlertTriangle; cls: string; bar: string }> = {
  issue: { label: "Issue", icon: AlertTriangle, cls: "pill-bad", bar: "var(--bad)" },
  watch: { label: "Watch", icon: Eye, cls: "pill-warn", bar: "var(--warn)" },
  rec: { label: "Opportunity", icon: TrendingUp, cls: "pill-good", bar: "var(--good)" },
};

export default function InsightCard({ tag, title, body, action, defaultOpen = false, onAction }:
  { tag: InsightTag; title: string; body: string; action?: string; defaultOpen?: boolean; onAction?: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const m = TAG_META[tag];
  const Icon = m.icon;
  return (
    <div className="card overflow-hidden relative">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: m.bar }} />
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="w-8 h-8 rounded-xl grid place-items-center text-white shrink-0" style={{ background: "var(--hero-grad)" }}>
          <Sparkles size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={m.cls}><Icon size={11} /> {m.label}</span>
            <span className="font-bold text-[14px]">{title}</span>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-mut shrink-0"><ChevronDown size={16} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="px-4 pb-4 pl-[60px]">
              <p className="text-[13px] leading-relaxed text-ink/85">{body}</p>
              {action && (
                <button onClick={onAction} className={clsx("mt-3 text-[12px] font-bold rounded-lg px-3 py-1.5 border transition-colors",
                  tag === "issue" ? "border-bad/40 text-bad hover:bg-bad/10" :
                  tag === "watch" ? "border-warn/40 text-warn hover:bg-warn/10" :
                  "border-good/40 text-good hover:bg-good/10")}>
                  {action} →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
