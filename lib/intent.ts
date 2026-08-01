// ── Question routing ────────────────────────────────────────────────
// The assistant answers three different kinds of question and must not
// conflate them:
//
//   account      → about the connected account's actual data. Answered from
//                  the evidence pack, with citation verification.
//   platform     → advertising / Meta platform knowledge: what a metric means,
//                  how it's calculated, how attribution works. No account
//                  figures are involved, so nothing to verify against data.
//   out_of_scope → not about advertising, analytics, the platform or AdLens.
//                  Declined politely instead of answered.
//
// Classification is deterministic (no model call): the same input always
// routes the same way, and the behaviour is unit-testable.

export type Intent = "account" | "platform" | "out_of_scope";

/** Advertising / platform vocabulary. Presence of ANY of these makes a
 *  question plausibly in-scope. */
const DOMAIN = [
  "ctr", "cpc", "cpm", "cpa", "cpl", "roas", "roi", "aov", "ltv",
  "spend", "budget", "pacing", "bid", "bidding", "impression", "impressions",
  "click", "clicks", "conversion", "conversions", "purchase", "purchases",
  "lead", "leads", "reach", "frequency", "audience", "audiences", "lookalike",
  "retarget", "retargeting", "remarketing", "creative", "creatives", "ad set",
  "adset", "ad sets", "adsets", "campaign", "campaigns", "ad ", "ads",
  "pixel", "attribution", "objective", "optimisation", "optimization",
  "funnel", "landing page", "engagement", "video view", "app install",
  "meta", "facebook", "instagram", "ads manager", "graph api",
  "placement", "delivery", "learning phase", "fatigue", "saturation",
  "anomaly", "anomalies", "trend", "benchmark", "kpi", "metric", "metrics",
  "revenue", "performance", "analytics", "advertis", "marketing",
  "period", "performing", "underperforming", "efficiency", "waste",
];

/** Actions a user takes on ads. On their own these words are ambiguous
 *  ("pause the video"), so they only put a question in scope when combined
 *  with a reference to this account. */
const ACTION = [
  "pause", "unpause", "scale", "reallocate", "shift budget", "shift spend",
  "turn off", "turn on", "increase budget", "reduce budget", "cut budget",
  "optimi", "kill", "double down",
];

/** Phrasing that signals a request for a definition or a concept rather than
 *  a reading of the account's numbers. */
const DEFINITIONAL = [
  "what is", "what's a", "what does", "what do you mean", "define", "definition",
  "how is", "how are", "how do you calculate", "how is it calculated",
  "how does", "explain", "difference between", "meaning of", "stand for",
  "should i", "best practice", "how to", "how should", "when should",
  "why is it", "what counts as", "formula",
];

/** Phrasing that ties the question to THIS account's data. */
const ACCOUNT_REF = [
  "my", "our", "we ", "this campaign", "this adset", "this ad set", "this ad",
  "the campaign", "this account", "here", "currently", "right now",
  "last week", "last month", "yesterday", "today", "this period",
  "compare", "comparison", "vs previous", "week over week", "wow",
  "which adset", "which ad set", "which ad", "which campaign",
  "what happened", "why did", "why has", "why is my", "how much did",
  "how many", "top performer", "worst", "best", "underperform",
];

/** Subjects that are genuinely not this product's job. Only a POSITIVE match
 *  here can push a question out of scope — absence of ad vocabulary cannot,
 *  because a user inside a campaign view routinely asks "what's going on here?"
 *  with no keyword at all. */
const OFF_TOPIC = [
  "weather", "recipe", "cook", "football", "cricket", "movie", "song", "lyrics",
  "capital of", "translate", "poem", "joke", "horoscope", "flight", "hotel",
  "medicine", "symptom", "doctor", "president", "election", "stock price",
  "crypto", "bitcoin", "who won", "birthday", "restaurant", "homework",
];

/** Core vocabulary matched with a one-character tolerance, so "asdset",
 *  "campaing" or "creatve" are understood rather than refused. */
const FUZZY_CORE = [
  "adset", "adsets", "campaign", "campaigns", "creative", "creatives",
  "audience", "budget", "spend", "impressions", "conversions", "frequency",
  "performance", "results", "clicks",
];

/** Levenshtein distance capped at 2 — enough for a single typo. */
function within1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function hasFuzzyDomain(q: string): boolean {
  return q.split(/[^a-z0-9]+/).some((w) => w.length >= 4 && FUZZY_CORE.some((k) => within1(w, k)));
}

/**
 * Route a question.
 *
 * Default is `account`: the user is looking at a campaign, so an ambiguous
 * question is about that campaign. Refusing a legitimate question is far worse
 * than answering a loosely-phrased one, so out-of-scope requires positive
 * evidence of a different subject — never merely the absence of a keyword.
 *
 * `entities` are the campaign / ad set / ad names currently in view. A question
 * naming one of them is definitively about the account, whatever else it says.
 */
export function classifyIntent(question: string, entities: string[] = []): Intent {
  const q = ` ${question.toLowerCase().trim()} `;
  if (!q.trim()) return "out_of_scope";

  // Naming an entity on screen is the strongest possible signal.
  const namesEntity = entities.some((n) => {
    const name = String(n || "").toLowerCase().trim();
    if (name.length < 3) return false;
    if (q.includes(name)) return true;
    // Also match on distinctive words from the name ("whatsapp" for
    // "Puzzles_club_Whatsapp"), so partial references still resolve.
    return name.split(/[^a-z0-9]+/).filter((w) => w.length >= 5).some((w) => q.includes(w));
  });
  if (namesEntity) return "account";

  // Short tokens must match whole words — "ad" otherwise matches inside
  // "Hyderabad" and drags an off-topic question back in scope.
  const hitsDomain = (k: string) => {
    const t = k.trim();
    return t.length <= 4
      ? new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)
      : q.includes(k);
  };
  const hasDomain = DOMAIN.some(hitsDomain) || hasFuzzyDomain(q);
  const hasAccountRef = ACCOUNT_REF.some((k) => q.includes(k));
  const isDefinitional = DEFINITIONAL.some((k) => q.includes(k));
  const hasAction = ACTION.some((k) => q.includes(k));
  const offTopic = OFF_TOPIC.some((k) => q.includes(k));

  // Contextual phrasing: the user is looking at a campaign and asking about
  // "this" / "here" / "what's going on" without naming anything. These are
  // legitimate questions about the view, not off-topic ones.
  const isContextual = /\b(this|these|here|it|going on|happening|anything|everything|summar\w*|overview|explain|status|wrong|now)\b/.test(q);

  // Out of scope requires a concrete subject that is not ours: no ad
  // vocabulary, no entity named, no ads action, and not a contextual ask.
  // A weak possessive like "my" is not enough to keep a question in scope.
  if (!hasDomain && !hasAction && !isContextual) return "out_of_scope";
  if (offTopic && !hasDomain && !hasAction) return "out_of_scope";

  // "How is X doing / performing / trending" asks about THIS account even
  // though it starts like a definition. Performance verbs win over phrasing.
  const asksPerformance = /\b(doing|performing|perform|going|trend|trending|looking|compare|compares|working)\b/.test(q);

  // Definitional phrasing, no account reference, no performance verb.
  if (isDefinitional && !hasAccountRef && !asksPerformance && hasDomain) return "platform";

  // Everything else is treated as a question about the campaign in view.
  // Citation verification protects this default.
  return "account";
}

/* ── Deterministic metric glossary ──────────────────────────────────
   Platform questions must work even with no LLM key configured, and a
   definition should never be a paraphrase generated on the fly. These are
   fixed, checkable definitions — the same role the rules play elsewhere. */

type Entry = { keys: string[]; term: string; body: string };

const GLOSSARY: Entry[] = [
  { keys: ["ctr", "click through", "click-through"], term: "CTR (click-through rate)",
    body: "Clicks ÷ impressions, as a percentage. It measures how compelling the creative and targeting combination is. A falling CTR at stable frequency usually points to creative decay; a falling CTR alongside rising frequency points to audience saturation." },
  { keys: ["cpc", "cost per click"], term: "CPC (cost per click)",
    body: "Spend ÷ clicks. It is an outcome of the auction, not a lever you set directly: as CTR falls, the platform charges more per click for the same audience, so a rising CPC is often a symptom of declining creative relevance." },
  { keys: ["cpm", "cost per mille", "cost per thousand"], term: "CPM (cost per 1,000 impressions)",
    body: "Spend ÷ impressions × 1,000. It reflects auction competition for the audience you are buying rather than the quality of your creative. Rising CPM with stable CTR usually means competition increased, not that your ads got worse." },
  { keys: ["cpa", "cost per acquisition", "cost per action", "cost per result"],
    term: "CPA (cost per action/result)",
    body: "Spend ÷ the number of results, where 'result' depends on the campaign objective — purchases for a Sales campaign, leads for a Leads campaign, landing page views for a Traffic campaign. Comparing CPA across campaigns with different objectives is not meaningful." },
  { keys: ["roas", "return on ad spend"], term: "ROAS (return on ad spend)",
    body: "Reported conversion value ÷ spend. It requires the platform to report a purchase value, which needs conversion tracking configured. An account without purchase tracking has no ROAS — that is unavailable, not zero, and a campaign should not be judged on it." },
  { keys: ["frequency"], term: "Frequency",
    body: "Impressions ÷ reach: the average number of times each person saw the ad. Rising frequency with flat reach means you are re-showing ads to the same people. High frequency alongside falling CTR is the signature of audience saturation." },
  { keys: ["reach"], term: "Reach",
    body: "The number of unique people who saw the ad at least once. Reach cannot be summed across days — the same person recurs — so a multi-day figure must come from the platform or be reported as a peak single-day value." },
  { keys: ["impression"], term: "Impressions",
    body: "The number of times an ad was displayed, including repeat views to the same person. Impressions divided by reach gives frequency." },
  { keys: ["attribution", "attribution window", "click window", "view window"],
    term: "Attribution",
    body: "The rule deciding which ad gets credit for a conversion. Meta's default is a 7-day click and 1-day view window. Two consequences matter in practice: conversions are restated for roughly 72 hours after the fact, so recent days keep changing; and platform-attributed conversions will not match a last-click analytics tool." },
  { keys: ["objective"], term: "Campaign objective",
    body: "What the campaign is optimised for — Sales, Leads, Traffic, Engagement, Awareness, App installs. The objective determines which metric counts as a 'result' and therefore how the campaign should be judged. An Awareness campaign has no purchases by design and is not failing for lacking them." },
  { keys: ["pacing", "budget utilisation", "budget utilization"], term: "Pacing",
    body: "Spend relative to the budget over the same period. Underpacing means the campaign cannot spend its budget — usually too narrow an audience, too low a bid, or limited delivery. Pacing requires a known budget; when budgets sit at ad set level, the campaign figure is the sum of its ad sets." },
  { keys: ["lookalike", "lal"], term: "Lookalike audience",
    body: "An audience Meta builds by finding people similar to a source list (customers, site visitors, engagers). A 1% lookalike is the closest match and the smallest; widening the percentage increases size and decreases similarity." },
  { keys: ["retarget", "remarket"], term: "Retargeting",
    body: "Advertising to people who already interacted with you. It typically shows a much higher ROAS than prospecting, but its audience is capped by the size of your existing traffic, so it usually cannot absorb large budget increases without frequency rising sharply." },
  { keys: ["creative fatigue", "fatigue", "decay"], term: "Creative fatigue",
    body: "Performance decline caused by the creative wearing out rather than by the audience being exhausted. The distinguishing test is frequency: if CTR is falling while frequency stays low, the creative is the problem; if frequency is high, saturation is the more likely cause. Comparing an ad's current CTR against its own first-week CTR isolates fatigue without needing frequency data." },
  { keys: ["saturation", "audience exhaust"], term: "Audience saturation",
    body: "Performance decline caused by having reached most of the available audience, so the platform re-shows ads to the same people. Signature: high and rising frequency, high share of the audience reached, and falling CTR. The fix is a wider or fresh audience, not new creative." },
  { keys: ["learning phase"], term: "Learning phase",
    body: "The period after a change while Meta's delivery system gathers enough conversions to optimise reliably (roughly 50 optimisation events per ad set per week). Performance is unstable during it, so edits made inside the learning phase restart it and make results harder to read." },
  { keys: ["pixel", "conversion tracking", "capi", "conversions api"], term: "Pixel / conversion tracking",
    body: "The mechanism reporting on-site events (view content, add to cart, purchase) back to Meta. Without it the platform can report spend, impressions, clicks and CTR, but no conversion value — which means no revenue and no ROAS." },
];

/** A fixed definition for a metric or concept, or null if not covered. */
export function glossaryLookup(question: string): { term: string; body: string } | null {
  const q = question.toLowerCase();
  let best: { entry: Entry; score: number } | null = null;
  for (const entry of GLOSSARY) {
    for (const k of entry.keys) {
      if (q.includes(k) && (!best || k.length > best.score)) best = { entry, score: k.length };
    }
  }
  return best ? { term: best.entry.term, body: best.entry.body } : null;
}

/** System prompt for platform-knowledge answers. Separate from the analyst
 *  prompt, which is reproduced verbatim in the technical documentation and
 *  must not change. */
export const PLATFORM_SYSTEM = `You are AdLens's advertising platform expert. You answer conceptual questions about digital advertising and the Meta ads platform: what metrics mean, how they are calculated, how attribution works, how delivery and optimisation behave, and how to interpret data.

Rules:
- Answer conceptually. You have NOT been given this user's account data, so never state any figure as if it came from their account, and never name their campaigns or ad sets.
- If a definition depends on the campaign objective or on tracking setup, say so.
- If you are not confident, say you are not sure rather than guessing.
- Be concise and concrete. No preamble.
- If the user seems to be asking about their own numbers, tell them to ask it as a question about the campaign they are viewing, so the answer can be grounded in their data.`;

/** The refusal for questions outside advertising and analytics. */
export const OUT_OF_SCOPE_REPLY = `That's outside what I can help with — I'm an advertising analyst for this ad account, so I stick to campaign performance and platform questions.

I can help with:
- **This account's data** — performance, spend, pacing, trends, anomalies, ad set and ad comparisons, period-over-period changes
- **Platform concepts** — what a metric means, how it's calculated, attribution, objectives, creative fatigue vs audience saturation`;
