"use client";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { useApp } from "@/lib/store";

interface Msg { role: "user" | "ai"; text: string; verified?: boolean }

const SUGGESTIONS = [
  "Why is CPM increasing?",
  "Why did CTR drop?",
  "Is creative fatigue occurring?",
  "Is the audience saturating?",
  "Which adset deserves more budget?",
  "What should we pause?",
  "What should we optimize first?",
  "Predict next week's performance",
];

function render(t: string) {
  return t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

export default function AIPanel() {
  const { aiOpen, setAiOpen, campaignId, campaignName } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs, aiOpen, busy]);
  useEffect(() => {
    if (campaignId) setMsgs([{ role: "ai", text: `Good morning 👋 **${campaignName}** loaded from the daily snapshot (synced today 02:00).\n\nI'm your performance analyst — I reason from the data, cite the numbers, and tell you what to do. Tap a question below or ask anything.` }]);
  }, [campaignId, campaignName]);

  async function ask(q: string) {
    if (!q.trim() || !campaignId || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, question: q }) });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "ai", text: data.reply, verified: data.verified }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Something went wrong — try again." }]);
    } finally { setBusy(false); }
  }

  if (!campaignId) return null;
  return (
    <>
      <button onClick={() => setAiOpen(!aiOpen)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-accent hover:bg-accent2 text-accentfg text-[12px] font-semibold px-4 py-2.5 rounded-full shadow-lift transition-colors">
        <Sparkles size={14} /> Ask AI
      </button>
      <AnimatePresence>
        {aiOpen && (
          <motion.div initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 w-[440px] z-50 bg-surface border-l border-line shadow-lift flex flex-col">
            <div className="p-4 border-b border-line flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <div className="flex-1">
                <h3 className="font-bold text-[14px] leading-tight">AI Performance Analyst</h3>
                <div className="text-[10px] text-mut">Snapshot · Today 02:00 · answers cite your data</div>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-mut hover:text-ink"><X size={16} /></button>
            </div>
            <div ref={bodyRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-[26px] h-[26px] min-w-[26px] rounded-full grid place-items-center text-[10px] font-bold ${m.role === "user" ? "bg-slate-500 text-white" : "bg-accent text-accentfg"}`}>
                    {m.role === "user" ? "U" : "AI"}
                  </div>
                  <div className="flex-1">
                    <div className={`text-[12px] leading-relaxed rounded-xl px-3 py-2 border ${m.role === "user" ? "bg-accent text-accentfg border-accent" : "bg-raised border-line"}`}
                      dangerouslySetInnerHTML={{ __html: render(m.text) }} />
                    {m.role === "ai" && m.verified && i > 0 && (
                      <div className="text-[9.5px] text-mut mt-1 pl-1">✓ every figure verified against the data snapshot</div>
                    )}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex gap-2 items-center pl-9 text-[11px] text-mut">
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />)}
                  </span>
                  Analysing the snapshot…
                </div>
              )}
            </div>
            <div className="px-3.5 pb-2">
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button key={q} onClick={() => ask(q)} disabled={busy}
                    className="text-[10.5px] text-left px-2.5 py-1.5 rounded-lg border border-line2 text-mut hover:border-accent hover:text-accent transition-colors disabled:opacity-40">
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3.5 border-t border-line flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)}
                placeholder="Ask like you'd ask your media buyer…" className="flex-1 text-[12px] px-3 py-2 rounded-lg border border-line2 bg-surface outline-none focus:border-accent" />
              <button onClick={() => ask(input)} className="bg-accent hover:bg-accent2 text-accentfg rounded-full px-3 grid place-items-center"><Send size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
