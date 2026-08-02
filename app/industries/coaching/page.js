import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "WhatsApp Automation for Coaching & Education — Fastrill",
  description: "Fastrill enrolls students, answers fee queries, and follows up on leads for coaching centres and tutors via WhatsApp — in 10+ Indian languages. Start free."
}

export default function CoachingPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      <section style={{ paddingTop: 130, paddingBottom: 80, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>📚 Coaching & Education</div>
            <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Turn every parent inquiry into an enrolled student.</h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 28 }}>Parents message about your coaching centre at all hours — batch timings, fees, subjects, demo class availability. Fastrill answers all of it instantly and books the demo class automatically.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "13px 24px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free trial →</Link>
              <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", color: "#fff", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)" }}>See pricing</Link>
            </div>
          </div>
          <div style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginBottom: 14, fontWeight: 600 }}>WhatsApp · Bright Minds Coaching</div>
            {[
              { side: "left", msg: "Hi, meri beti class 8 mein hai. Maths aur Science ke liye kya fees hai?" },
              { side: "right", msg: "Namaste! Bright Minds mein Class 8 ke liye:\n\nMaths + Science combo: ₹3,500/month\n• 5 days/week · 2 hours/day\n• Batches: 4 PM, 6 PM, 8 AM\n\nEk free demo class bhi hai. Kab aana chahenge?" },
              { side: "left", msg: "6 PM wala batch dekh sakte hai kal?" },
              { side: "right", msg: "Kal 6 PM demo class confirmed! Bright Minds, Kondapur.\n\nBeti ka naam batayein? 📚" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.side === "right" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "82%", background: m.side === "right" ? "rgba(37,211,102,.12)" : "rgba(255,255,255,.07)", border: `1px solid ${m.side === "right" ? "rgba(37,211,102,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: m.side === "right" ? "#5A5FE8" : "rgba(255,255,255,.8)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.msg}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", marginBottom: 44, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>What Fastrill does for coaching centres</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {[
              { title: "Answers fee and batch queries instantly", desc: "Parents ask about fees, subjects, batch timings at all hours. Fastrill gives accurate answers based on your coaching programme." },
              { title: "Books demo classes automatically", desc: "From inquiry to confirmed demo class in one conversation. Parent picks a time, Fastrill confirms it and sends a reminder." },
              { title: "Follows up on cold leads", desc: "A parent inquired but never enrolled. Fastrill sends a follow-up sequence — stops the moment they book a demo or enrol." },
              { title: "Handles re-enrollment campaigns", desc: "Summer batch starting? Send a campaign to last year's students with one click. Fastrill handles all the replies." },
            ].map(s => (
              <div key={s.title} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "26px 24px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "80px clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", marginBottom: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Never miss an enrollment inquiry again.</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>14-day free trial. No credit card. Cancel anytime.</p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free for coaching →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
