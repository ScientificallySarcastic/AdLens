import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "WhatsApp Automation for Gyms & Fitness — Fastrill",
  description: "Fastrill fills gym memberships, books trial sessions and sends renewal reminders via WhatsApp. Built for gyms, yoga studios and fitness centres in India."
}

export default function GymsPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />
      <section style={{ paddingTop: 130, paddingBottom: 80, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>🏋️ Gyms & Fitness</div>
          <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Fill every slot. Renew every membership. Automatically.</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 36 }}>New member inquiries, trial session bookings, membership renewals, class reminders — Fastrill handles all of it on WhatsApp so your team focuses on training, not admin.</p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free trial →</Link>
        </div>
      </section>
      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { title: "Trial session bookings", desc: "Someone inquires about membership. Fastrill explains plans, books a free trial session, and sends the timing — all in one chat." },
              { title: "Renewal reminders", desc: "7 days before membership expires, Fastrill sends a renewal reminder. Member renews via link. No awkward front-desk conversation needed." },
              { title: "Class reminders", desc: "Automated reminders before every class. Members can confirm attendance or cancel — Fastrill handles the waitlist automatically." },
            ].map(p => (
              <div key={p.title} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "24px 22px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{p.title}</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: "80px clamp(16px,4vw,44px)", textAlign: "center" }}>
        <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free for gyms →</Link>
      </section>
      <MarketingFooter />
    </div>
  )
}
