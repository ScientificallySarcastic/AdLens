// lib/ai/reply-engine.js
// DEPRECATED — orchestrator.js handles all AI replies via Gemini directly
// This file is kept only as a safety fallback for edge cases
// Sarvam dependency removed

const { getFallbackReply } = require("./fallback-engine")

async function generateReply({ message, biz, services, history, firstName, classification, state }) {
  // All AI replies now go through orchestrator.js → Gemini
  // This is only called as last-resort fallback
  console.warn("⚠️ reply-engine called — should be using orchestrator directly")
  return getFallbackReply({ intent: classification, state, biz, services, firstName, message })
}

module.exports = { generateReply }
