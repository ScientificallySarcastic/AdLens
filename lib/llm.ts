// ── Narrative provider layer ────────────────────────────────────────
// The reasoning engine (rules) and verifyCitations (guard) are provider-agnostic
// by design: the LLM only ever WRITES PROSE from evidence it was handed, and
// every number it emits is checked afterwards. So the narrative provider is
// swappable — Anthropic, Gemini, Groq or OpenRouter — with no change to
// detection, no change to ANALYST_SYSTEM, and no change to verification.
//
// Whichever key is present is used, in this order. Force one with LLM_PROVIDER.

export type Provider = "anthropic" | "openai" | "gemini" | "groq" | "openrouter" | "sarvam" | "kimi" | "custom";

export type LLMResult =
  | { ok: true; text: string; provider: Provider; model: string }
  | { ok: false; reason: "no-api-key" | "api-error" | "empty-reply"; detail?: string };

// Every provider below except Anthropic and Gemini speaks the OpenAI chat format,
// so they share one code path. `custom` exists because base URLs and model names
// change: point LLM_BASE_URL at ANY OpenAI-compatible endpoint and it works
// without a code change.
const OAI: Record<string, { url: string; keyEnv: string; modelEnv: string; model: string }> = {
  openai: {
    url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", model: "gpt-4o",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL", model: "llama-3.3-70b-versatile",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", model: "meta-llama/llama-3.3-70b-instruct:free",
  },
  sarvam: {
    url: process.env.SARVAM_BASE_URL || "https://api.sarvam.ai/v1/chat/completions",
    keyEnv: "SARVAM_API_KEY", modelEnv: "SARVAM_MODEL", model: "sarvam-m",
  },
  kimi: {
    url: process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1/chat/completions",
    keyEnv: "KIMI_API_KEY", modelEnv: "KIMI_MODEL", model: "kimi-k2-0711-preview",
  },
  custom: {
    url: process.env.LLM_BASE_URL || "",
    keyEnv: "LLM_API_KEY", modelEnv: "LLM_MODEL", model: "",
  },
};

function pickProvider(): Provider | null {
  const forced = process.env.LLM_PROVIDER as Provider | undefined;
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.SARVAM_API_KEY) return "sarvam";
  if (process.env.KIMI_API_KEY) return "kimi";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY) return "custom";
  return null;
}

/** Human-readable label for the UI badge. */
export function providerLabel(p: string | null | undefined): string {
  return (
    {
      anthropic: "Claude", openai: "OpenAI", gemini: "Gemini", groq: "Groq",
      openrouter: "OpenRouter", sarvam: "Sarvam", kimi: "Kimi", custom: "LLM",
    } as Record<string, string>
  )[String(p)] ?? "AI";
}

export function llmConfigured(): boolean {
  return pickProvider() !== null;
}

// 600 was tight for a structured analyst answer — truncation reads as poor
// quality. Tune per provider with LLM_MAX_TOKENS without a code change.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || 1200;

export async function generateNarrative(system: string, user: string): Promise<LLMResult> {
  const provider = pickProvider();
  if (!provider) return { ok: false, reason: "no-api-key" };

  try {
    if (provider === "anthropic") {
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system, messages: [{ role: "user", content: user }] }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) return { ok: false, reason: "api-error", detail: data?.error?.message ?? String(res.status) };
      const text = (data.content || []).map((b: { text?: string }) => b.text || "").join("");
      return text ? { ok: true, text, provider, model } : { ok: false, reason: "empty-reply" };
    }

    if (provider === "gemini") {
      // Free tier via Google AI Studio (aistudio.google.com/apikey) — no card required.
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          process.env.GEMINI_API_KEY as string
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.3 },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || data?.error) return { ok: false, reason: "api-error", detail: data?.error?.message ?? String(res.status) };
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
      return text ? { ok: true, text, provider, model } : { ok: false, reason: "empty-reply" };
    }

    // Table-driven OpenAI-compatible path: groq | openrouter | sarvam | kimi | custom
    const cfg = OAI[provider];
    if (!cfg || !cfg.url) return { ok: false, reason: "api-error", detail: `no base URL configured for provider "${provider}" (set LLM_BASE_URL)` };
    const apiKey = process.env[cfg.keyEnv];
    if (!apiKey) return { ok: false, reason: "no-api-key" };
    const model = process.env[cfg.modelEnv] || cfg.model;
    if (!model) return { ok: false, reason: "api-error", detail: `no model configured (set ${cfg.modelEnv})` };

    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const call = (body: Record<string, unknown>) =>
      fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });

    let res = await call({ model, max_tokens: MAX_TOKENS, temperature: 0.3, messages });
    let data = await res.json();

    // Newer OpenAI-family models reject `max_tokens` in favour of
    // `max_completion_tokens`, and some only accept the default temperature.
    // Retry once with a compliant body instead of falling back for a schema
    // difference that has nothing to do with the answer.
    const msg = String(data?.error?.message ?? "");
    if ((!res.ok || data?.error) && /max_tokens|max_completion_tokens|temperature/i.test(msg)) {
      res = await call({ model, max_completion_tokens: MAX_TOKENS, messages });
      data = await res.json();
    }

    if (!res.ok || data?.error) return { ok: false, reason: "api-error", detail: data?.error?.message ?? `HTTP ${res.status}` };
    const text = String(data?.choices?.[0]?.message?.content ?? "");
    return text ? { ok: true, text, provider, model } : { ok: false, reason: "empty-reply" };
  } catch (e: any) {
    return { ok: false, reason: "api-error", detail: e?.message };
  }
}
