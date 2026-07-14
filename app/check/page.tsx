"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check as CheckIcon } from "lucide-react";
import { campaigns } from "@/lib/data";
import { useApp } from "@/lib/store";
import { PlatBadge, StatusBadge } from "@/components/Badge";
import clsx from "clsx";

const PLATFORMS = [
  { id: "meta", name: "Meta", color: "#1877F2", enabled: true },
  { id: "li", name: "LinkedIn", color: "#0A66C2", enabled: true },
  { id: "google", name: "Google Ads", color: "#EA4335", enabled: false },
  { id: "tiktok", name: "TikTok", color: "#8b93a8", enabled: false },
];
const ACCOUNTS: Record<string, { id: string; name: string; sub: string }[]> = {
  meta: [
    { id: "m1", name: "Acme Corp — Main", sub: "act_12345678 · $4.2k/mo" },
    { id: "m2", name: "Acme Corp — Brand", sub: "act_87654321 · $1.1k/mo" },
  ],
  li: [
    { id: "l1", name: "Acme Corp LinkedIn", sub: "id_509876543 · $2.8k/mo" },
    { id: "l2", name: "Acme Talent Brand", sub: "id_509811111 · $0.9k/mo" },
  ],
};

export default function Check() {
  const router = useRouter();
  const setCampaign = useApp((s) => s.setCampaign);
  const [step, setStep] = useState(0);
  const [plats, setPlats] = useState<string[]>(["meta"]);
  // one account per platform — the cross-platform fix
  const [acctByPlat, setAcctByPlat] = useState<Record<string, string>>({ meta: "m1", li: "l1" });
  const [camp, setCamp] = useState("summer-sale");
  const [campByPlat, setCampByPlat] = useState<Record<string, string>>({ meta: "summer-sale", li: "leadgen" });
  const [search, setSearch] = useState("");
  const cross = plats.length >= 2;

  const singleList = campaigns.filter((c) => plats.includes(c.platform) && c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  const accountsChosen = plats.every((p) => acctByPlat[p]);

  const go = () => {
    if (cross) { router.push(`/compare?meta=${campByPlat.meta}&li=${campByPlat.li}`); return; }
    const c = campaigns.find((x) => x.id === camp)!;
    setCampaign(c.id, c.name);
    router.push(`/analysis/${c.id}`);
  };

  const steps = ["Platform", "Account", "Campaign"];
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="font-display text-[26px] tracking-tight mb-4">Account check</h1>
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={clsx("flex items-center gap-1.5 text-[11px] font-semibold", i < step ? "text-good" : i === step ? "text-ink" : "text-mut")}>
              <span className={clsx("w-6 h-6 rounded-full grid place-items-center text-[10px] border",
                i < step ? "bg-good/15 border-good/40 text-good" : i === step ? "border-accent text-accent" : "border-line2")}>
                {i < step ? <CheckIcon size={11} /> : i + 1}
              </span>{s}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-line2" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="p" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2">Select one or more platforms</div>
            <div className="text-[12px] text-mut bg-accent/5 border border-accent/20 rounded-lg px-3.5 py-2.5 mb-4">
              💡 One platform → single-campaign deep dive. Two+ → cross-platform comparison, one account &amp; campaign per platform.
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {PLATFORMS.map((p) => {
                const on = plats.includes(p.id);
                return (
                  <button key={p.id} disabled={!p.enabled}
                    onClick={() => setPlats(on ? plats.filter((x) => x !== p.id) : [...plats, p.id])}
                    className={clsx("card p-4 flex items-center gap-2.5 text-[13px] font-medium transition-all",
                      !p.enabled && "opacity-40 cursor-not-allowed",
                      on && "border-accent bg-accent/5")}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    {p.name}
                    {p.enabled ? (
                      <span className={clsx("ml-auto w-[18px] h-[18px] rounded-md border grid place-items-center text-accentfg transition-colors", on ? "bg-accent border-accent" : "border-line2 bg-surface")}>
                        {on && <CheckIcon size={11} />}
                      </span>
                    ) : <span className="ml-auto text-[10px] text-mut">soon</span>}
                  </button>
                );
              })}
            </div>
            <motion.p key={plats.length} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={clsx("text-[11px] font-semibold mb-4", plats.length === 0 ? "text-bad" : cross ? "text-accent2" : "text-accent")}>
              {plats.length === 0 ? "⚠ Select at least one platform" : cross ? `✓ ${plats.length} platforms → cross-platform comparison` : "✓ 1 platform → single campaign analysis"}
            </motion.p>
            <div className="flex justify-end">
              <button disabled={plats.length === 0} onClick={() => setStep(1)} className="bg-accent hover:bg-accent2 disabled:opacity-40 text-black text-[12px] font-semibold rounded-lg px-4 py-2 transition-colors">Next: Select account →</button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="a" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            {cross && <div className="text-[12px] text-mut bg-accent/5 border border-accent/20 rounded-lg px-3.5 py-2.5 mb-4">⇄ Cross-platform mode — select <strong className="text-ink">one ad account per platform</strong>.</div>}
            {plats.map((pid) => (
              <div key={pid} className="mb-4">
                <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PLATFORMS.find((p) => p.id === pid)!.color }} />
                  {PLATFORMS.find((p) => p.id === pid)!.name} ad accounts — pick one
                  {acctByPlat[pid] && <span className="ml-1 text-good normal-case tracking-normal">✓ {ACCOUNTS[pid].find(a => a.id === acctByPlat[pid])?.name}</span>}
                </div>
                <div className="card overflow-hidden divide-y divide-line">
                  {ACCOUNTS[pid].map((a) => (
                    <button key={a.id} onClick={() => setAcctByPlat({ ...acctByPlat, [pid]: a.id })} className={clsx("w-full flex items-center gap-2.5 px-3.5 py-3 transition-colors text-left", acctByPlat[pid] === a.id ? "bg-accent/5" : "hover:bg-raised")}>
                      <span className={clsx("w-4 h-4 rounded-full border grid place-items-center", acctByPlat[pid] === a.id ? "border-accent bg-accent" : "border-line2 bg-surface")}>
                        {acctByPlat[pid] === a.id && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                      </span>
                      <div><div className="text-[12px] font-medium">{a.name}</div><div className="text-[10px] text-mut">{a.sub}</div></div>
                      <span className="ml-auto"><StatusBadge s="Active" /></span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-[12px] font-semibold border border-line2 rounded-full px-4 py-2 hover:bg-raised transition-colors">← Back</button>
              <button disabled={!accountsChosen} onClick={() => setStep(2)} className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white text-[12px] font-semibold rounded-lg px-4 py-2">Next: Select campaign →</button>
            </div>
          </motion.div>
        )}

        {step === 2 && !cross && (
          <motion.div key="c" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="text-[12px] text-mut bg-accent/5 border border-accent/20 rounded-lg px-3.5 py-2.5 mb-3">🎯 Single platform — select <strong className="text-ink">one campaign</strong> to analyse in depth.</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search campaigns…"
              className="w-full text-[12px] px-3 py-2 rounded-lg border border-line2 bg-surface outline-none focus:border-accent mb-3" />
            <div className="card overflow-hidden divide-y divide-line mb-4 max-h-[340px] overflow-y-auto">
              {singleList.map((c) => (
                <button key={c.id} onClick={() => setCamp(c.id)} className={clsx("w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors", camp === c.id ? "bg-accent/5" : "hover:bg-raised")}>
                  <span className={clsx("w-4 h-4 rounded-full border grid place-items-center shrink-0", camp === c.id ? "border-accent bg-accent" : "border-line2 bg-surface")}>
                    {camp === c.id && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                  </span>
                  <div className="min-w-0"><div className="text-[12px] font-medium truncate">{c.name}</div><div className="text-[10px] text-mut">${c.spend.toLocaleString()} · ROAS {c.roas}x · CTR {c.ctr}%</div></div>
                  <span className="ml-auto flex gap-1.5 items-center shrink-0"><PlatBadge p={c.platform} /><StatusBadge s={c.status} /></span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-[12px] font-semibold border border-line2 rounded-full px-4 py-2 hover:bg-raised transition-colors">← Back</button>
              <button onClick={go} className="bg-accent hover:bg-accent2 text-accentfg text-[12px] font-semibold rounded-full px-4 py-2">Run analysis →</button>
            </div>
          </motion.div>
        )}

        {step === 2 && cross && (
          <motion.div key="x" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="text-[12px] text-mut bg-accent/5 border border-accent/20 rounded-lg px-3.5 py-2.5 mb-3">⇄ Select <strong className="text-ink">one campaign per platform</strong> from the accounts you chose.</div>
            {plats.map((pid) => (
              <div key={pid} className="mb-4">
                <div className="text-[10px] font-bold text-mut uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PLATFORMS.find((p) => p.id === pid)!.color }} />
                  {PLATFORMS.find((p) => p.id === pid)!.name} · {ACCOUNTS[pid].find(a => a.id === acctByPlat[pid])?.name} — pick one campaign
                </div>
                <div className="card overflow-hidden divide-y divide-line">
                  {campaigns.filter((c) => c.platform === pid && c.status === "Active").slice(0, 3).map((c) => (
                    <button key={c.id} onClick={() => setCampByPlat({ ...campByPlat, [pid]: c.id })} className={clsx("w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors", campByPlat[pid] === c.id ? "bg-accent/5" : "hover:bg-raised")}>
                      <span className={clsx("w-4 h-4 rounded-full border grid place-items-center", campByPlat[pid] === c.id ? "border-accent bg-accent" : "border-line2 bg-surface")}>
                        {campByPlat[pid] === c.id && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                      </span>
                      <div className="text-[12px] font-medium">{c.name}</div>
                      <span className="ml-auto text-[10px] text-mut">${c.spend.toLocaleString()} · {c.roas}x</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-[12px] font-semibold border border-line2 rounded-full px-4 py-2 hover:bg-raised transition-colors">← Back</button>
              <button onClick={go} className="bg-accent hover:bg-accent2 text-accentfg text-[12px] font-semibold rounded-full px-4 py-2">Compare platforms →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
