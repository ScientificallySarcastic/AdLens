"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { alerts } from "@/lib/data";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import clsx from "clsx";

export default function Alerts() {
  const router = useRouter();
  const activeCampaign = useApp((st) => st.campaignId);
  const liveMode = Boolean(activeCampaign && activeCampaign.startsWith("meta_"));
  if (liveMode) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-7">
        <PageHeader kicker="Monitoring" title="Alerts" sub="Live Mode — Meta Graph API" />
        <div className="card p-8 text-center">
          <Bell size={28} className="mx-auto text-mut mb-3" />
          <div className="font-bold text-[15px] mb-1">No threshold alerts have fired</div>
          <p className="text-[13px] text-mut max-w-md mx-auto">Alerts are raised from synced live metrics against your rule thresholds. Demo Mode retains its seeded alert examples.</p>
        </div>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.severity === "Critical");
  const warning = alerts.filter((a) => a.severity === "Warning");

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      <PageHeader kicker="Monitoring" title="Alerts"
        sub={<><span className="text-bad font-bold">{critical.length} critical</span> · {warning.length} warning · rules engine evaluated hourly</>} />

      <div className="space-y-3">
        {alerts.map((a, i) => {
          const isCrit = a.severity === "Critical";
          return (
            <motion.button key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              onClick={() => router.push("/analysis/summer-sale")}
              className={clsx("card w-full p-4 flex items-center gap-4 text-left card-hover relative overflow-hidden",
                isCrit && "border-bad/30")}>
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: isCrit ? "var(--bad)" : "var(--warn)" }} />
              <span className={clsx("w-11 h-11 rounded-2xl grid place-items-center shrink-0")}
                style={{ background: isCrit ? "var(--bad-soft)" : "var(--warn-soft)" }}>
                <AlertTriangle size={19} className={isCrit ? "text-bad" : "text-warn"} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={isCrit ? "pill-bad" : "pill-warn"}>{a.severity}</span>
                  <span className="font-bold text-[15px]">{a.campaign}</span>
                  <span className="text-[12px] text-mut font-medium">· {a.ago}</span>
                </div>
                <div className="text-[13px] text-mut font-medium">{a.rule}</div>
              </div>
              <div className="text-right shrink-0 mr-2">
                <div className={clsx("font-display num text-[24px] leading-none", isCrit ? "text-bad" : "text-warn")}>{a.value}</div>
                <div className="text-[11px] text-mut font-semibold mt-1">threshold {a.threshold}</div>
              </div>
              <ArrowRight size={17} className="text-mut shrink-0" />
            </motion.button>
          );
        })}
      </div>

      <div className="card p-4 mt-5 flex items-center gap-3">
        <Bell size={16} className="text-accent shrink-0" />
        <p className="text-[13px] text-mut">Alert rules run against every synced snapshot. Add or tune thresholds per campaign from the analysis view — critical alerts also surface in the sidebar badge.</p>
      </div>
    </div>
  );
}
