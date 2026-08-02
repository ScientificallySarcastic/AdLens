"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PageHeader({ title, sub, right, kicker }:
  { title: ReactNode; sub?: ReactNode; right?: ReactNode; kicker?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-end justify-between flex-wrap gap-3 mb-5">
      <div>
        {kicker && <div className="section-label mb-1.5">{kicker}</div>}
        <h1 className="font-display text-[30px] leading-tight tracking-tight">{title}</h1>
        {sub && <div className="text-[13px] text-mut mt-1 font-medium">{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </motion.div>
  );
}
