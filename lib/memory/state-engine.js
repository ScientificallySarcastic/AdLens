// lib/memory/state-engine.js
const { createClient } = require("@supabase/supabase-js")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function emptyState() {
  return { stage: "idle", primary_intent: null, secondary_intent: null, active_flow: null, service: null, date: null, time: null, staff: null, missing_fields: [], last_user_goal: null, last_ai_question: null, clarification_for: [], confidence: {}, interruption_stack: [], handoff_required: false, turns: 0, failed_clarifications: 0 }
}

async function loadState(conversationId) {
  if (!conversationId) return emptyState()
  try {
    const { data } = await supabaseAdmin.from("conversations").select("state_json").eq("id", conversationId).maybeSingle()
    if (!data?.state_json) return emptyState()
    const parsed = typeof data.state_json === "string" ? JSON.parse(data.state_json) : data.state_json
    return Object.assign({}, emptyState(), parsed)
  } catch(e) { console.warn("⚠️ loadState failed:", e.message); return emptyState() }
}

async function saveState(conversationId, state) {
  if (!conversationId) return
  try { await supabaseAdmin.from("conversations").update({ state_json: state }).eq("id", conversationId) }
  catch(e) { console.warn("⚠️ saveState failed:", e.message) }
}

function clearBookingFields(state) {
  return Object.assign({}, state, { stage: "idle", active_flow: null, service: null, date: null, time: null, staff: null, missing_fields: [], last_ai_question: null, clarification_for: [], confidence: {} })
}

function pushInterruption(state, type, topic) {
  const stack = [...(state.interruption_stack || []), { type, topic, timestamp: Date.now() }]
  return Object.assign({}, state, { interruption_stack: stack })
}

function popInterruption(state) {
  const stack = [...(state.interruption_stack || [])]
  const popped = stack.pop()
  return { newState: Object.assign({}, state, { interruption_stack: stack }), popped }
}

module.exports = { emptyState, loadState, saveState, clearBookingFields, pushInterruption, popInterruption }
