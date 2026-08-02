import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "WhatsApp Automation for Salons & Spas — Fastrill",
  description: "Fastrill auto-replies, books appointments, and follows up with salon and spa clients on WhatsApp — in Hindi, Telugu, Tamil and 10+ Indian languages. Start free."
}

export default function SalonsPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ paddingTop: 130, paddingBottom: 80, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>
              💇 Salons & Spas
            </div>
            <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Your salon never sleeps.<br />Your bookings shouldn't either.
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 28 }}>Customers message at 11 PM about Saturday appointments. Fastrill replies instantly, checks availability, and confirms the booking — in their language — while you sleep.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "13px 24px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free trial →</Link>
              <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", color: "#fff", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)" }}>See pricing</Link>
            </div>
          </div>
          <div style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 24, boxShadow: "0 16px 48px rgba(0,0,0,.4)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginBottom: 14, fontWeight: 600 }}>WhatsApp · Riya Beauty Parlour</div>
            {[
              { side: "left", msg: "Hi, do you have a slot for keratin tomorrow evening?" },
              { side: "right", msg: "Yes! Tomorrow evening we have 5 PM and 7 PM free for Keratin Treatment (₹2,800 · 90 min). Which works?" },
              { side: "left", msg: "7 PM please" },
              { side: "right", msg: "Confirmed! Keratin Treatment · Tomorrow · 7:00 PM · ₹2,800\n\nSee you then! 💐" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.side === "right" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "80%", background: m.side === "right" ? "rgba(37,211,102,.12)" : "rgba(255,255,255,.07)", border: `1px solid ${m.side === "right" ? "rgba(37,211,102,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: m.side === "right" ? "#5A5FE8" : "rgba(255,255,255,.8)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.msg}</div>
              </div>
            ))}
            <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 8 }}>Replied in 1.4 seconds • 11:43 PM</div>
          </div>
        </div>
      </section>

      {/* PROBLEMS */}
      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, color: "#fff", marginBottom: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Sound familiar?</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", marginBottom: 44, maxWidth: 520 }}>These are the real problems salon owners tell us about every week.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { title: "Missed Saturday night bookings", desc: "Customers message after 9 PM when you're done for the day. By morning they've booked your competitor." },
              { title: "Staff glued to WhatsApp", desc: "Your stylist is doing a blowout with one hand and typing booking confirmations with the other. Something always gets missed." },
              { title: "No-shows cost real money", desc: "A customer books a bridal package and doesn't show. You blocked 3 hours and lost ₹4,000." },
            ].map(p => (
              <div key={p.title} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "24px 22px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{p.title}</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW FASTRILL HELPS */}
      <section style={{ padding: "70px clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, color: "#fff", marginBottom: 44, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>How Fastrill works for salons</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {[
              { num: "01", title: "Replies instantly, any time", desc: "Customer messages at 2 AM about a Sunday facial. Fastrill replies in 2 seconds, offers slots, takes a confirmation. Owner sees a new booking notification in the morning." },
              { num: "02", title: "Books in the customer's language", desc: "Hindi, Telugu, Tamil, Kannada — auto-detected. A customer typing 'Kal shaam ko facial ho sakta hai?' gets a perfect reply in Hindi without any setup from you." },
              { num: "03", title: "Sends reminders to cut no-shows", desc: "24 hours before the appointment, Fastrill sends a reminder. 2 hours before, another one. Customer can confirm or reschedule directly in chat." },
              { num: "04", title: "Wins back inactive clients", desc: "A client hasn't visited in 6 weeks. Fastrill sends a personalized win-back message with a special offer — stops automatically when they book." },
            ].map(s => (
              <div key={s.num} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "26px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#5A5FE8", marginBottom: 10 }}>{s.num}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#5A5FE8", letterSpacing: "-.02em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>+43%</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>bookings in month one</div>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.7)", lineHeight: 1.8, fontStyle: "italic", marginBottom: 28 }}>"I was losing Saturday night bookings because nobody replied after 8 PM. Customers now book at midnight and wake up to a confirmation. It paid for itself in the first week."</p>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Priya Nair</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Glow Parlour, Hyderabad</div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", marginBottom: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Set up in 10 minutes. Bookings start tonight.</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>14-day free trial. No credit card. Cancel anytime.</p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free for salons →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
