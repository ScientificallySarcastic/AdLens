"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Eye, EyeOff, KeyRound, Plus, ShieldCheck, Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface PartnerRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  campaignScope: string[] | null;
  createdAt: string;
  keys: { key: string; label: string; lastUsedAt: string | null; revokedAt: string | null }[];
}

interface Creds { apiKey: string; clientId: string; clientSecret: string; name: string }

// Inlined at build time by Next — the dev hint never ships in a production bundle.
const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_TOKEN = "dev-admin-token";

export default function PartnersAdmin() {
  const [adminToken, setAdminToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [reveal, setReveal] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load(token = adminToken) {
    const res = await fetch("/api/partners", { headers: { "X-Admin-Token": token } });
    if (res.ok) setPartners((await res.json()).partners);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/partners", { headers: { "X-Admin-Token": adminToken } }).catch(() => null);
    if (res?.ok) { setAuthed(true); await load(); }
    else setError("That admin token was rejected.");
    setBusy(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    const list = scope.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "X-Admin-Token": adminToken, "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), ...(list.length ? { campaignScope: list } : {}) }),
    });
    if (res.ok) {
      const d = await res.json();
      setCreds({ apiKey: d.credentials.apiKey, clientId: d.credentials.oauth.clientId, clientSecret: d.credentials.oauth.clientSecret, name: d.partner.name });
      setReveal(false); setName(""); setScope(""); await load();
    } else {
      setError((await res.json()).error?.message ?? "Could not create partner.");
    }
    setBusy(false);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  }

  // ── Gate ────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="px-7 py-8 max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-7 mt-16">
          <div className="w-11 h-11 rounded-xl grid place-items-center mb-4" style={{ background: "var(--accent-soft)" }}>
            <Lock size={19} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="font-display text-[24px] leading-tight">Partner admin</h1>
          <p className="text-[13px] text-mut mt-1.5 mb-6 font-medium">
            Enter the admin token to provision partner API access.
          </p>
          <form onSubmit={login} className="space-y-3">
            <input
              type="password" placeholder="Admin token" value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-raised border border-line2 rounded-xl text-[13px] outline-none focus:border-accent transition-colors"
            />
            <button type="submit" disabled={busy || !adminToken} className="btn-primary w-full justify-center">
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
          {error && <p className="mt-3 text-[12px] font-semibold" style={{ color: "var(--bad)" }}>{error}</p>}

          {/* Where the token comes from — dev shows it, production explains it. */}
          {IS_DEV ? (
            <div className="mt-5 pt-4 border-t border-line">
              <div className="section-label mb-1.5">Running locally</div>
              <p className="text-[12px] text-mut font-medium mb-2">Use the development token:</p>
              <button
                type="button"
                onClick={() => { setAdminToken(DEV_TOKEN); navigator.clipboard?.writeText(DEV_TOKEN); }}
                className="w-full text-left num text-[12px] px-3 py-2 rounded-xl border border-line bg-raised hover:border-accent transition-colors"
              >
                {DEV_TOKEN} <span className="text-mut font-medium">— click to fill</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-[12px] text-mut font-medium">
                Your token is the <span className="num">PARTNER_ADMIN_TOKEN</span> set in this deployment&rsquo;s
                environment variables. Ask whoever set up the deployment — it is shared once with the team,
                not created per partner.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Console ─────────────────────────────────────────────────────
  return (
    <div className="px-7 py-7 max-w-[1100px]">
      <PageHeader
        kicker="Admin"
        title="Partner access"
        sub="Create a partner and their API credentials are provisioned automatically — no app setup, no manual tokens."
        right={<button onClick={() => { setAuthed(false); setAdminToken(""); setPartners([]); setCreds(null); }} className="btn-ghost">Lock</button>}
      />

      {/* Create */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={15} style={{ color: "var(--accent)" }} />
          <h2 className="text-[15px] font-bold tracking-tight">Add a partner</h2>
        </div>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="section-label block mb-1.5">Partner name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Agency"
              className="w-full px-3.5 py-2.5 bg-raised border border-line2 rounded-xl text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="section-label block mb-1.5">Campaign access</label>
            <input
              value={scope} onChange={(e) => setScope(e.target.value)} placeholder="All campaigns (leave empty)"
              className="w-full px-3.5 py-2.5 bg-raised border border-line2 rounded-xl text-[13px] outline-none focus:border-accent transition-colors"
            />
          </div>
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary h-[42px]">
            {busy ? "Creating…" : "Create partner"}
          </button>
        </form>
        <p className="text-[12px] text-mut mt-2.5 font-medium">
          Leave campaign access empty for every campaign, or list ids separated by commas — e.g. <span className="num">summer-sale, retargeting</span>.
        </p>
        {error && <p className="mt-3 text-[12px] font-semibold" style={{ color: "var(--bad)" }}>{error}</p>}
      </div>

      {/* Credentials — shown once */}
      <AnimatePresence>
        {creds && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="card p-6 mb-5" style={{ borderColor: "rgba(var(--warn-rgb),0.35)", background: "var(--warn-soft)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: "var(--warn)" }} />
                <h3 className="text-[15px] font-bold tracking-tight">Credentials for {creds.name}</h3>
              </div>
              <button onClick={() => setReveal(!reveal)} className="btn-ghost">
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}{reveal ? "Hide" : "Reveal"}
              </button>
            </div>
            <p className="text-[12px] font-semibold mb-4" style={{ color: "var(--warn)" }}>
              Copy these now — secrets are shown once and can never be retrieved again.
            </p>
            <div className="space-y-2.5">
              <Field label="API key — the whole integration" value={creds.apiKey} secret hidden={!reveal} onCopy={() => copy(creds.apiKey, "k")} copied={copied === "k"} />
              <Field label="OAuth client id" value={creds.clientId} onCopy={() => copy(creds.clientId, "i")} copied={copied === "i"} />
              <Field label="OAuth client secret" value={creds.clientSecret} secret hidden={!reveal} onCopy={() => copy(creds.clientSecret, "s")} copied={copied === "s"} />
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <div className="section-label mb-1.5">Send this to the partner</div>
              <code className="block text-[11.5px] num bg-raised border border-line rounded-xl px-3 py-2.5 overflow-x-auto whitespace-pre">
{`curl ${typeof window !== "undefined" ? window.location.origin : ""}/api/partner/results \\
  -H "Authorization: Bearer ${reveal ? creds.apiKey : "ak_live_••••••••"}"`}
              </code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partners */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={15} style={{ color: "var(--accent)" }} />
          <h2 className="text-[15px] font-bold tracking-tight">Partners</h2>
          <span className="pill-mut ml-1">{partners.length}</span>
        </div>
        {partners.length === 0 ? (
          <p className="text-[13px] text-mut font-medium py-6 text-center">No partners yet — create one above.</p>
        ) : (
          <div className="space-y-2.5">
            {partners.map((p) => (
              <div key={p.id} className="border border-line rounded-xl px-4 py-3.5 bg-raised/40">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[14px] font-bold tracking-tight">{p.name}</div>
                    <div className="text-[11.5px] text-mut num mt-0.5">{p.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill-accent">{p.campaignScope ? `${p.campaignScope.length} campaign${p.campaignScope.length > 1 ? "s" : ""}` : "All campaigns"}</span>
                    <span className={p.status === "active" ? "pill-good" : "pill-mut"}>{p.status}</span>
                  </div>
                </div>
                {p.keys.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line space-y-1">
                    {p.keys.map((k, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-[11.5px] flex-wrap">
                        <span className={`num ${k.revokedAt ? "line-through text-mut opacity-60" : ""}`}>{k.key}</span>
                        <span className="text-mut font-medium">
                          {k.revokedAt ? "revoked" : k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "never used"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, secret, hidden, onCopy, copied }:
  { label: string; value: string; secret?: boolean; hidden?: boolean; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <label className="section-label block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          readOnly value={secret && hidden ? "•".repeat(Math.min(value.length, 48)) : value}
          className="flex-1 px-3 py-2 bg-surface border border-line rounded-xl text-[11.5px] num outline-none"
        />
        <button onClick={onCopy} className="btn-ghost shrink-0" aria-label={`Copy ${label}`}>
          {copied ? <Check size={14} style={{ color: "var(--good)" }} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
