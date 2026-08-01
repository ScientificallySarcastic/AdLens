import { NextRequest, NextResponse } from "next/server";
import { buildEvidence, analyze, formatAnalyst, verifyCitations, ANALYST_SYSTEM } from "@/lib/reasoning";
import { generateNarrative } from "@/lib/llm";
import { classifyIntent, glossaryLookup, PLATFORM_SYSTEM, OUT_OF_SCOPE_REPLY } from "@/lib/intent";

export async function POST(req: NextRequest) {
  const { campaignId, question } = await req.json();
  const q = String(question ?? "");

  // Names currently on screen — campaign, ad sets, ads. A question mentioning
  // any of them is unambiguously about this account, however it is phrased.
  // Fetched before routing so a typo or a bare entity name cannot be refused.
  let entityNames: string[] = [];
  let preEv: Awaited<ReturnType<typeof buildEvidence>> = null;
  try {
    preEv = await buildEvidence(campaignId);
    if (preEv) {
      entityNames = [
        preEv.campaign.name,
        ...preEv.adsets.map((a) => a.name),
        ...preEv.ads.map((a) => a.name),
      ].filter(Boolean);
    }
  } catch {
    // Evidence unavailable — routing still works, just without entity names.
  }

  const intent = classifyIntent(q, entityNames);

  /* ── Out of scope: decline, don't improvise ─────────────────────── */
  if (intent === "out_of_scope") {
    return NextResponse.json({ reply: OUT_OF_SCOPE_REPLY, engine: "scope-guard", intent, verified: true });
  }

  /* ── Platform knowledge: no account data involved ───────────────── */
  if (intent === "platform") {
    // Fixed definitions first — deterministic, identical every time, and they
    // work with no LLM key configured.
    const entry = glossaryLookup(q);
    const llm = await generateNarrative(
      PLATFORM_SYSTEM,
      entry
        ? `Question: ${q}\n\nAuthoritative definition to build on (do not contradict it):\n${entry.term} — ${entry.body}`
        : `Question: ${q}`
    );
    if (llm.ok) {
      return NextResponse.json({
        reply: llm.text, engine: "llm", provider: llm.provider, model: llm.model,
        intent, verified: true, groundedOn: entry?.term ?? null,
      });
    }
    if (entry) {
      return NextResponse.json({
        reply: `**${entry.term}**\n\n${entry.body}`,
        engine: "glossary", intent, verified: true, fallbackReason: llm.reason,
      });
    }
    return NextResponse.json({
      reply: `I don't have a stored definition for that, and the narrative model isn't reachable right now (${llm.reason}). Ask about a metric like CTR, CPC, CPM, CPA, ROAS, frequency, reach, attribution, pacing, creative fatigue or audience saturation and I can answer from the built-in reference.`,
      engine: "glossary", intent, verified: true, fallbackReason: llm.reason,
    });
  }

  /* ── Account question: answer strictly from the evidence pack ───── */
  let ev = preEv;
  if (!ev) {
    try {
      ev = await buildEvidence(campaignId);
    } catch (e: any) {
      console.error("buildEvidence failed:", e?.message);
      return NextResponse.json({
        reply: `I couldn't assemble evidence for this campaign: ${e?.message ?? "unknown error"}. If this is a live campaign, run /api/sync/meta first.`,
        engine: "error", intent, verified: false,
      });
    }
  }
  if (!ev) return NextResponse.json({ reply: "Campaign not found.", intent }, { status: 404 });

  let fallbackReason: string | null = null;
  let unverified: string[] = [];
  let misattributed: string[] = [];

  const llm = await generateNarrative(
    ANALYST_SYSTEM,
    `Evidence JSON:\n${JSON.stringify(ev)}\n\nQuestion: ${q}`
  );

  if (llm.ok) {
    const check = verifyCitations(llm.text, ev);
    if (check.ok) {
      return NextResponse.json({
        reply: llm.text, engine: "llm", provider: llm.provider, model: llm.model,
        intent, verified: true,
      });
    }
    fallbackReason = check.misattributed.length ? "misattributed" : "citation-rejected";
    unverified = check.unverified;
    misattributed = check.misattributed;
    console.warn("Citation check failed:", { unverified: check.unverified, misattributed: check.misattributed });
  } else {
    fallbackReason = llm.reason;
    if (llm.detail) console.warn("LLM error:", llm.detail);
  }

  return NextResponse.json({
    reply: formatAnalyst(analyze(q, ev)),
    engine: "analyst",
    intent,
    verified: true,
    fallbackReason,
    ...(unverified.length ? { unverified } : {}),
    ...(misattributed.length ? { misattributed } : {}),
  });
}
