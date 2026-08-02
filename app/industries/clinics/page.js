import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "WhatsApp Automation for Clinics & Healthcare — Fastrill",
  description: "Fastrill handles patient appointment booking, reminders and follow-ups on WhatsApp in Telugu, Tamil, Hindi and 10+ languages. Built for Indian clinics and doctors."
}

export default function ClinicsPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      <section style={{ paddingTop: 130, paddingBottom: 80, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>🏥 Clinics & Healthcare</div>
            <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Your patients message in Telugu. Fastrill replies in Telugu.</h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 28 }}>Patients message in their native language asking about appointments, fees, and availability. Fastrill responds instantly, books the slot, and sends a reminder — no receptionist needed after hours.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "13px 24px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free trial →</Link>
              <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", color: "#fff", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)" }}>See pricing</Link>
            </div>
          </div>
          <div style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginBottom: 14, fontWeight: 600 }}>WhatsApp · Skin First Clinic</div>
            {[
              { side: "left", msg: "Doctor gari appointment book cheyyalante emi cheyyali?" },
              { side: "right", msg: "Namaste! Dr. Ravi Sharma gari skin consultation ₹500 (30 min).\n\nReplying in Telugu as requested.\n\nReppude available slots: 11 AM, 3 PM, 5 PM. Meeru prefer chese time?" },
              { side: "left", msg: "3 PM baguntundi" },
              { side: "right", msg: "Confirmed! Dr. Sharma · Skin Consultation · Reppu 3:00 PM · ₹500\n\nReminder pampistaamu ✓" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.side === "right" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "82%", background: m.side === "right" ? "rgba(37,211,102,.12)" : "rgba(255,255,255,.07)", border: `1px solid ${m.side === "right" ? "rgba(37,211,102,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: m.side === "right" ? "#5A5FE8" : "rgba(255,255,255,.8)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.msg}</div>
              </div>
            ))}
            <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 8 }}>Replied in 1.8s · Language auto-detected</div>
          </div>
        </div>
      </section>

      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", marginBottom: 44, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Built for how clinics actually work</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { title: "After-hours bookings", desc: "Patients look for appointments in the evening. Fastrill handles them instantly, so you wake up to a full schedule." },
              { title: "Multi-language patients", desc: "Telugu, Tamil, Kannada, Hindi — auto-detected. Every patient gets a reply in their language with zero setup." },
              { title: "Appointment reminders", desc: "Automated reminders 24h and 2h before. Patients confirm in one tap. No-shows drop significantly." },
              { title: "Fee and service queries", desc: "Train Fastrill on your consultation fees, services, and doctor availability. It answers accurately every time." },
              { title: "Follow-up sequences", desc: "Post-appointment follow-up automatically. Recovery check, review request, next visit nudge — all automated." },
              { title: "Compliance-safe", desc: "Opt-out handled automatically. STOP replies are processed immediately and that patient is never messaged again." },
            ].map(p => (
              <div key={p.title} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "24px 22px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{p.title}</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "70px clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#5A5FE8", letterSpacing: "-.02em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>₹22k</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>saved per month on receptionist time</div>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.7)", lineHeight: 1.8, fontStyle: "italic", marginBottom: 28 }}>"My patients message in Telugu and Fastrill replies in Telugu, books the slot, and follows up if they go quiet. I had to see it to believe it wasn't a person."</p>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Dr. Ravi Sharma</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 48 }}>Skin First Clinic, Vijayawada</div>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free for clinics →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
