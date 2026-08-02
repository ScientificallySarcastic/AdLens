"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/** Gradient hero strip: the AI's one-paragraph verdict, impossible to miss. */
export default function AISummary({ children, cta, onCta, meta }:
  { children: ReactNode; cta?: string; onCta?: () => void; meta?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="hero-card p-5 mb-5">
      <div className="relative z-10 flex items-start gap-3.5 flex-wrap">
        <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur grid place-items-center shrink-0">
          <Sparkles size={17} />
        </span>
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">AI Summary</span>
            {meta && <span className="text-[10px] font-semibold text-white/60">· {meta}</span>}
          </div>
          <div className="text-[14.5px] leading-relaxed font-medium">{children}</div>
        </div>
        {cta && (
          <button onClick={onCta}
            className="shrink-0 self-center text-[12.5px] font-bold bg-white/95 text-indigo-700 rounded-xl px-4 py-2.5 hover:bg-white transition-colors shadow">
            {cta} →
          </button>
        )}
      </div>
    </motion.div>
  );
}
