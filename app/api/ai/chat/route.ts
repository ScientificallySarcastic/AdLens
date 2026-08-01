import { NextRequest, NextResponse } from "next/server";
import { generateNarrative } from "@/lib/llm";
import { classifyIntent, glossaryLookup, PLATFORM_SYSTEM, OUT_OF_SCOPE_REPLY } from "@/lib/intent";
import {
  parseQuery, retrieveData, buildContext, generateAnswer, knownEntityNames,
} from "@/lib/aiPipeline";

export const dynamic = "force-dynamic";

// Account questions run the retrieval pipeline in order and the model only ever
// sees data that was actually fetched. There is no templated answer path: when
// retrieval or the model fails, this route says so.

export async function POST(req: NextRequest) {
  const { campaignId, question } = await req.json();
  const q = String(question ?? "");
  const stages: string[] = [];

  if (!q.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  /* ── Stage 1: parse ─────────────────────────────────────────────── */
  const entityNames = campaignId ? await knownEntityNames(campaignId) : [];
  const intent = classifyIntent(q, entityNames);
  const parsed = parseQuery(q, entityNames);
  stages.push("parse");

  /* ── Out of scope: decline rather than improvise ────────────────── */
  if (intent === "out_of_scope") {
    return NextResponse.json({ reply: OUT_OF_SCOPE_REPLY, engine: "scope-guard", intent, verified: true, stages });
  }

  /* ── Platform knowledge: definitional, no account data involved ─── */
  if (intent === "platform") {
    const entry = glossaryLookup(q);
    const llm = await generateNarrative(
      PLATFORM_SYSTEM,
      entry
        ? `Question: ${q}\n\nAuthoritative definition to build on (do not contradict it):\n${entry.term} — ${entry.body}`
        : `Question: ${q}`,
    );
    if (llm.ok) {
      return NextResponse.json({
        reply: llm.text, engine: "llm", provider: llm.provider, model: llm.model,
        intent, verified: true, groundedOn: entry?.term ?? null, stages: [...stages, "generate"],
      });
    }
    // A stored definition is a fixed reference, not a fabricated answer about
    // the account, so it remains a legitimate response for platform questions.
    if (entry) {
      return NextResponse.json({
        reply: `**${entry.term}**\n\n${entry.body}`,
        engine: "glossary", intent, verified: true, fallbackReason: llm.reason, stages,
      });
    }
    return NextResponse.json({
      error: "no-model-configured",
      reply: `I can't answer that right now — no narrative model is reachable (${llm.reason}) and I have no stored definition for it. Configure an LLM key to enable free-form platform questions.`,
      engine: "error", intent, verified: false, stages,
    }, { status: 503 });
  }

  /* ── Account question: retrieve BEFORE answering ────────────────── */
  if (!campaignId) {
    return NextResponse.json({
      error: "no-campaign-selected",
      reply: "Select a campaign first — I answer account questions only from that campaign's live data.",
      engine: "error", intent, verified: false, stages,
    }, { status: 400 });
  }

  /* ── Stages 2 + 3: resolve and fetch live Meta data ─────────────── */
  const origin = new URL(req.url).origin;
  const retrieval = await retrieveData(String(campaignId), parsed, origin);
  stages.push("resolve", "fetch");

  if (!retrieval.ok) {
    return NextResponse.json({
      error: "retrieval-failed",
      reply: `I couldn't retrieve this campaign's data from the Meta Ads API, so I have nothing to answer from. ${retrieval.error ?? ""}`.trim(),
      engine: "error", intent, verified: false, stages,
    }, { status: 502 });
  }

  /* ── Stage 4: build the citable context ─────────────────────────── */
  const ctx = await buildContext(String(campaignId), parsed, retrieval);
  stages.push("context", "analyze");
  if (!ctx) {
    return NextResponse.json({
      error: "no-evidence",
      reply: "That campaign returned no usable metrics, so there is nothing to analyse yet. Run a sync once it has delivery.",
      engine: "error", intent, verified: false, stages,
    }, { status: 404 });
  }

  /* ── Stages 5 + 6: analyse and generate ─────────────────────────── */
  const answer = await generateAnswer(ctx, stages);

  if (!answer.ok) {
    const human: Record<string, string> = {
      "no-model-configured":
        "I retrieved this campaign's live data, but no AI model is configured, so I won't guess an answer. Add an LLM API key (e.g. ANTHROPIC_API_KEY) to enable analysis.",
      "model-unreachable":
        "I retrieved this campaign's live data, but the AI model is unreachable right now. Rather than return a canned answer, I'd rather tell you — try again shortly.",
      "citation-check-failed":
        "The model's answer cited figures that aren't in the retrieved data, so I discarded it instead of showing something unverified. Try asking again, more specifically.",
    };
    return NextResponse.json({
      error: answer.reason,
      reply: human[answer.reason] ?? "I couldn't produce a verified answer from the retrieved data.",
      detail: answer.detail,
      engine: "error",
      intent,
      verified: false,
      stages: answer.stages,
      retrieval: { live: retrieval.isLive, refreshed: retrieval.refreshed, syncedAt: retrieval.syncedAt },
    }, { status: 503 });
  }

  return NextResponse.json({
    reply: answer.reply,
    engine: "pipeline",
    provider: answer.provider,
    model: answer.model,
    intent,
    verified: true,
    stages: answer.stages,
    retrieval: answer.retrieval,
  });
}
