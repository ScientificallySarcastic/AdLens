// Client-safe: pure label logic only, no DB imports.

/**
 * What counts as a "result" for a given ad set.
 *
 * The campaign objective is NOT sufficient. Two ad sets under the same
 * objective can produce completely different results depending on where they
 * send people and what they optimise for:
 *
 *   Sales objective + WHATSAPP destination   → messaging conversations
 *   Sales objective + WEBSITE  destination   → purchases
 *   Traffic objective + LANDING_PAGE_VIEWS   → landing page views
 *   Traffic objective + LINK_CLICKS          → link clicks
 *
 * So the ad set's optimization_goal and destination_type take precedence, and
 * the campaign objective is only the fallback when neither is known.
 */
export function resultLadder(
  objective?: string,
  optimizationGoal?: string,
  destinationType?: string
): { types: string[]; label: string; basis: string } {
  const goal = String(optimizationGoal ?? "").toUpperCase();
  const dest = String(destinationType ?? "").toUpperCase();
  const obj = String(objective ?? "").toUpperCase().replace(/^OUTCOME_/, "");

  const MESSAGING = [
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
    "onsite_conversion.messaging_conversation_replied_7d",
  ];
  const PURCHASE = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
  const LEAD = ["lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped"];
  const LPV = ["landing_page_view", "omni_landing_page_view"];
  const CLICK = ["link_click"];
  const INSTALL = ["omni_app_install", "mobile_app_install"];
  const VIDEO = ["video_view"];
  const ENGAGE = ["post_engagement", "page_engagement"];

  // ── 1. Destination is the strongest signal ──────────────────────
  if (dest.includes("WHATSAPP"))
    return { types: MESSAGING, label: "messaging conversations", basis: "WhatsApp destination" };
  if (dest.includes("MESSENGER") || dest.includes("INSTAGRAM_DIRECT"))
    return { types: MESSAGING, label: "messaging conversations", basis: `${dest.toLowerCase()} destination` };
  if (dest.includes("APP"))
    return { types: INSTALL, label: "app installs", basis: "app destination" };

  // ── 2. Then the ad set's optimisation goal ──────────────────────
  if (goal.includes("CONVERSATION") || goal.includes("MESSAG"))
    return { types: MESSAGING, label: "messaging conversations", basis: "optimising for conversations" };
  if (goal.includes("LANDING_PAGE"))
    return { types: LPV, label: "landing page views", basis: "optimising for landing page views" };
  if (goal.includes("LINK_CLICK"))
    return { types: CLICK, label: "link clicks", basis: "optimising for link clicks" };
  if (goal.includes("LEAD"))
    return { types: LEAD, label: "leads", basis: "optimising for leads" };
  if (goal.includes("APP_INSTALL"))
    return { types: INSTALL, label: "app installs", basis: "optimising for app installs" };
  if (goal.includes("THRUPLAY") || goal.includes("VIDEO"))
    return { types: VIDEO, label: "video views", basis: "optimising for video views" };
  if (goal.includes("POST_ENGAGEMENT") || goal.includes("ENGAGED"))
    return { types: ENGAGE, label: "engagements", basis: "optimising for engagement" };
  if (goal.includes("REACH") || goal.includes("IMPRESSIONS") || goal.includes("AD_RECALL"))
    return { types: [], label: "no result metric for this optimisation goal", basis: "awareness optimisation" };
  if (goal.includes("OFFSITE_CONVERSION") || goal.includes("VALUE"))
    return { types: PURCHASE, label: "purchases", basis: "optimising for conversions" };

  // ── 3. Fall back to the campaign objective ──────────────────────
  if (obj.includes("SALES") || obj.includes("CONVERSION"))
    return { types: PURCHASE, label: "purchases", basis: "Sales objective" };
  if (obj.includes("LEAD"))
    return { types: LEAD, label: "leads", basis: "Leads objective" };
  if (obj.includes("TRAFFIC") || obj.includes("LINK_CLICK"))
    return { types: [...LPV, ...CLICK], label: "landing page views", basis: "Traffic objective" };
  if (obj.includes("ENGAGEMENT"))
    return { types: ENGAGE, label: "engagements", basis: "Engagement objective" };
  if (obj.includes("APP"))
    return { types: INSTALL, label: "app installs", basis: "App objective" };
  if (obj.includes("VIDEO"))
    return { types: VIDEO, label: "video views", basis: "Video objective" };
  if (obj.includes("AWARENESS") || obj.includes("REACH"))
    return { types: [], label: "no result metric for this objective", basis: "Awareness objective" };

  return {
    types: [...PURCHASE, ...MESSAGING, ...LEAD, ...LPV, ...CLICK],
    label: "platform-reported results",
    basis: "objective not reported",
  };
}

/** Human label for a raw Meta action type. Client-safe. */
export function actionLabel(t: string): string {
  const map: Record<string, string> = {
    "onsite_conversion.total_messaging_connection": "Messaging conversations",
    "onsite_conversion.messaging_conversation_started_7d": "Messaging conversations started",
    "onsite_conversion.messaging_first_reply": "Messaging first replies",
    "onsite_conversion.messaging_conversation_replied_7d": "Messaging replies",
    "landing_page_view": "Landing page views",
    "omni_landing_page_view": "Landing page views",
    "link_click": "Link clicks",
    "omni_purchase": "Purchases",
    "purchase": "Purchases",
    "offsite_conversion.fb_pixel_purchase": "Purchases (pixel)",
    "omni_add_to_cart": "Adds to cart",
    "add_to_cart": "Adds to cart",
    "offsite_conversion.fb_pixel_add_to_cart": "Adds to cart (pixel)",
    "omni_initiated_checkout": "Checkouts initiated",
    "offsite_conversion.fb_pixel_initiate_checkout": "Checkouts initiated",
    "lead": "Leads",
    "onsite_conversion.lead_grouped": "Leads",
    "offsite_conversion.fb_pixel_lead": "Leads (pixel)",
    "complete_registration": "Registrations",
    "post_engagement": "Post engagements",
    "page_engagement": "Page engagements",
    "post_reaction": "Reactions",
    "comment": "Comments",
    "post": "Shares",
    "onsite_conversion.post_save": "Saves",
    "video_view": "Video views",
    "omni_video_view": "Video views",
    "omni_app_install": "App installs",
    "mobile_app_install": "App installs",
    "omni_view_content": "Content views",
    "view_content": "Content views",
  };
  if (map[t]) return map[t];
  return t
    .replace(/^onsite_conversion\./, "")
    .replace(/^offsite_conversion\.fb_pixel_/, "")
    .replace(/^offsite_conversion\./, "")
    .replace(/^omni_/, "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Metrics a user can choose to display. Availability is decided per entity by
 *  what the platform actually reported — never a fixed list. */
export type MetricKey =
  | "spend" | "impressions" | "reach" | "frequency" | "clicks"
  | "ctr" | "cpc" | "cpm" | "results" | "cost_per_result"
  | "revenue" | "roas" | `action:${string}`;

export const CORE_METRICS: { key: MetricKey; label: string; always?: boolean }[] = [
  { key: "spend", label: "Spend", always: true },
  { key: "results", label: "Results", always: true },
  { key: "cost_per_result", label: "Cost per result", always: true },
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "frequency", label: "Frequency" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "revenue", label: "Revenue" },
  { key: "roas", label: "ROAS" },
];
