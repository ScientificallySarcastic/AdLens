import { NextRequest, NextResponse } from "next/server";
import { buildEvidence, analyze, formatAnalyst, verifyCitations, ANALYST_SYSTEM } from "@/lib/reasoning";

export async function POST(req: NextRequest) {
  const { campaignId, question } = await req.json();
  const ev = await buildEvidence(campaignId);
  if (!ev) return NextResponse.json({ reply: "Campaign not found." }, { status: 404 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 600,
          system: ANALYST_SYSTEM,
          messages: [{ role: "user", content: `Evidence JSON:\n${JSON.stringify(ev)}\n\nQuestion: ${question}` }],
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).map((b: { type: string; text?: string }) => b.text || "").join("");
      if (reply) {
        const check = verifyCitations(reply, ev);
        if (check.ok) return NextResponse.json({ reply, engine: "claude", verified: true });
        // LLM cited numbers not present in the evidence — refuse to ship it
        console.warn("Citation check failed:", check.unverified);
      }
    } catch { /* fall through to deterministic analyst */ }
  }
  return NextResponse.json({ reply: formatAnalyst(analyze(question, ev)), engine: "analyst", verified: true });
}
