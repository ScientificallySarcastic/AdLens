import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "Features — Fastrill | WhatsApp AI for Indian Businesses",
  description: "AI conversations, booking automation, bulk campaigns, smart inbox, lead recovery and appointment reminders — all in one WhatsApp platform built for Indian SMBs."
}

const FEATURES = [
  {
    id: "ai",
    tag: "Core engine",
    title: "AI that actually converses",
    desc: "Most WhatsApp tools send scripted replies. Fastrill reads the customer's intent, asks the right follow-up, and closes the conversation — in any Indian language, at any hour.",
    bullets: [
      "Understands casual, mixed-language messages",
      "Remembers context within a conversation",
      "Handles objections and price queries naturally",
      "Auto-detects language — no setup required",
      "Replies in under 2 seconds, 24/7",
    ],
    stat: "< 2s", statLabel: "average reply time"
  },
  {
    id: "booking",
    tag: "Revenue module",
    title: "Books the appointment, start to finish",
    desc: "A customer messages asking about availability. Fastrill checks your real calendar, offers slots, takes a confirmation, and sends a booking card — without a human touching it.",
    bullets: [
      "Checks real slot availability before confirming",
      "Handles rescheduling and cancellations",
      "Sends booking confirmation card on WhatsApp",
      "Instant owner notification on every booking",
      "Works for services, consultations, and classes",
    ],
    stat: "4", statLabel: "messages to book"
  },
  {
    id: "campaigns",
    tag: "Marketing module",
    title: "Bulk campaigns with revenue tracking",
    desc: "Send WhatsApp template messages to your customer list — segmented by tag, recency, or service. Then see exactly how many replied, booked, and how much revenue came from that send.",
    bullets: [
      "Segment by new / returning / VIP / inactive",
      "Real Meta delivery and read tracking",
      "Revenue and ROI per campaign",
      "Schedule sends for peak engagement times",
      "Available from Starter plan (₹999/month)",
    ],
    stat: "98%", statLabel: "average open rate"
  },
  {
    id: "inbox",
    tag: "Operations module",
    title: "One inbox, every conversation, full control",
    desc: "See every customer conversation live. Take over manually with one tap. Let Fastrill pick back up the moment you're done. You're always in control.",
    bullets: [
      "Real-time conversation updates",
      "AI / Human toggle per conversation",
      "Full customer history and tags",
      "Search and filter across all conversations",
      "Works across 10+ Indian languages",
    ],
    stat: "0", statLabel: "messages missed"
  },
  {
    id: "lead-recovery",
    tag: "Growth module",
    title: "Automatically follow up on silent leads",
    desc: "A lead messages and goes quiet after your reply. Fastrill detects the silence and sends a follow-up sequence — timed, personalized, and stopped automatically the moment they book.",
    bullets: [
      "Multi-step drip sequences via WhatsApp",
      "Auto-stops when lead books or replies",
      "Fully customizable timing and messages",
      "Runs even when you're closed",
      "Available from Growth plan (₹1,999/month)",
    ],
    stat: "3x", statLabel: "more conversions from cold leads"
  },
  {
    id: "reminders",
    tag: "Retention module",
    title: "Reduce no-shows with automatic reminders",
    desc: "Appointment reminders sent via WhatsApp 24h and 2h before. Customers can confirm or reschedule directly in chat — handled automatically by Fastrill.",
    bullets: [
      "Sent at 24h and 2h before appointment",
      "Customer can confirm or reschedule in chat",
      "Reduces no-shows by up to 60%",
      "Customizable message per service type",
      "Available from Growth plan (₹1,999/month)",
    ],
    stat: "60%", statLabel: "reduction in no-shows"
  },
]

export default function FeaturesPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ paddingTop: 130, paddingBottom: 70, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>Platform Features</div>
          <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Everything your business needs to run on WhatsApp
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 36 }}>Not a chatbot. Not just broadcasts. A complete AI revenue system — booking, campaigns, inbox, and recovery — all connected.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "13px 26px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free trial →</Link>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", color: "#fff", padding: "13px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14.5, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)" }}>See pricing</Link>
          </div>
        </div>
      </section>

      {/* FEATURE SECTIONS */}
      {FEATURES.map((f, idx) => (
        <section key={f.id} id={f.id} style={{ padding: "80px clamp(16px,4vw,44px)", background: idx % 2 === 1 ? "#0D0F17" : "#0B0D13", borderTop: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px,5vw,80px)", alignItems: "center" }}>
            <div style={{ order: idx % 2 === 1 ? 2 : 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5FE8", marginBottom: 14 }}>{f.tag}</div>
              <h2 style={{ fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 800, color: "#fff", letterSpacing: "-.025em", lineHeight: 1.2, marginBottom: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{f.title}</h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 24 }}>{f.desc}</p>
              <ul style={{ listStyle: "none" }}>
                {f.bullets.map(b => (
                  <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "rgba(255,255,255,.7)", marginBottom: 11, lineHeight: 1.5 }}>
                    <span style={{ color: "#5A5FE8", fontWeight: 700, flexShrink: 0 }}>✓</span>{b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ order: idx % 2 === 1 ? 1 : 2 }}>
              <div style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "clamp(28px,4vw,44px)", textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,.4)" }}>
                <div style={{ fontSize: "clamp(52px,7vw,80px)", fontWeight: 800, color: "#5A5FE8", letterSpacing: "-.03em", lineHeight: 1, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{f.stat}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginTop: 8 }}>{f.statLabel}</div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section style={{ padding: "80px clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, color: "#fff", marginBottom: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Ready to see it in action?</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", marginBottom: 28 }}>14-day free trial. Full Growth plan. No credit card.</p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
