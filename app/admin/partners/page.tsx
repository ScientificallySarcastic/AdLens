"use client";
import { useState, useEffect } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

interface PartnerRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
  keys: { key: string; label: string; lastUsedAt: string | null; revokedAt: string | null }[];
}

export default function PartnersAdmin() {
  const [adminToken, setAdminToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("");
  const [campaignScope, setCampaignScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [showCreds, setShowCreds] = useState(false);
  const [lastCreds, setLastCreds] = useState<{ apiKey: string; clientId: string; clientSecret: string; name: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/partners", {
      headers: { "X-Admin-Token": adminToken },
    }).catch(() => null);
    if (res?.ok) {
      setAuthed(true);
      setMessage("Authenticated ✓");
      loadPartners();
    } else {
      setMessage("Invalid admin token");
    }
    setLoading(false);
  };

  const loadPartners = async () => {
    const res = await fetch("/api/partners", { headers: { "X-Admin-Token": adminToken } });
    if (res.ok) {
      const data = await res.json();
      setPartners(data.partners);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage("Partner name required");
      return;
    }
    setLoading(true);
    const scope = campaignScope
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "X-Admin-Token": adminToken, "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), campaignScope: scope.length > 0 ? scope : undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setLastCreds({
        apiKey: data.credentials.apiKey,
        clientId: data.credentials.oauth.clientId,
        clientSecret: data.credentials.oauth.clientSecret,
        name: data.partner.name,
      });
      setMessage(`✓ Partner "${name}" created with auto-provisioned credentials`);
      setName("");
      setCampaignScope("");
      loadPartners();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error?.message}`);
    }
    setLoading(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-md mx-auto mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Partner Admin</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your admin token to provision partners</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Admin token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded transition"
            >
              {loading ? "Checking..." : "Login"}
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Partner Provisioning</h1>
          <button
            onClick={() => {
              setAuthed(false);
              setAdminToken("");
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
          >
            Logout
          </button>
        </div>

        {/* Create partner */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Partner</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Partner Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Acme Agency"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Scope (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., summer-sale, retargeting"
                  value={campaignScope}
                  onChange={(e) => setCampaignScope(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">Leave scope empty for access to all campaigns. Comma-separated campaign IDs to restrict.</p>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded transition"
            >
              {loading ? "Creating..." : "Create Partner"}
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-indigo-300">{message}</p>}
        </div>

        {/* Credentials display */}
        {lastCreds && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-amber-100">🔑 Credentials for {lastCreds.name}</h3>
              <button
                onClick={() => setShowCreds(!showCreds)}
                className="p-2 hover:bg-amber-800/30 rounded text-amber-100 transition"
              >
                {showCreds ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-amber-200 mb-4">⚠️ Store these now — they are shown only once and never retrievable again.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-amber-100 mb-1">API Key (easiest)</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showCreds ? "text" : "password"}
                    value={lastCreds.apiKey}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-900 border border-amber-700 rounded text-amber-100 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => copy(lastCreds.apiKey, "key")}
                    className="p-2 hover:bg-amber-700/30 rounded text-amber-100 transition"
                  >
                    {copied === "key" ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-100 mb-1">OAuth Client ID</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={lastCreds.clientId}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-900 border border-amber-700 rounded text-amber-100 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => copy(lastCreds.clientId, "id")}
                    className="p-2 hover:bg-amber-700/30 rounded text-amber-100 transition"
                  >
                    {copied === "id" ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-100 mb-1">OAuth Client Secret</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showCreds ? "text" : "password"}
                    value={lastCreds.clientSecret}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-900 border border-amber-700 rounded text-amber-100 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => copy(lastCreds.clientSecret, "secret")}
                    className="p-2 hover:bg-amber-700/30 rounded text-amber-100 transition"
                  >
                    {copied === "secret" ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Partners list */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Active Partners ({partners.length})</h2>
          {partners.length === 0 ? (
            <p className="text-slate-400">No partners yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {partners.map((p) => (
                <div key={p.id} className="bg-slate-700/50 border border-slate-600 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{p.name}</h3>
                      <p className="text-xs text-slate-400">{p.id}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-600/20 text-green-300 text-xs rounded-full">{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                  {p.keys.length > 0 && (
                    <div className="text-xs text-slate-300">
                      <p className="font-medium mb-1">Keys:</p>
                      <div className="space-y-1 ml-2">
                        {p.keys.map((k, i) => (
                          <div key={i} className="text-slate-400">
                            <span className={k.revokedAt ? "line-through opacity-50" : ""}>{k.key}</span> ({k.label})
                            {k.lastUsedAt && <span className="ml-2 text-slate-500">last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
