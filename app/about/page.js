import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

export const metadata = {
  title: "About Fastrill — Built for Indian Small Businesses",
  description: "Fastrill is built by Solvabil Pvt. Ltd. to help Indian service businesses stop losing leads in their WhatsApp inbox. Our story, mission, and team."
}

export default function AboutPage() {
  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      {/* HERO */}
      <section style={{ paddingTop: 130, paddingBottom: 80, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>Our story</div>
          <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 20, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>We're building the AI operating system for customer communication</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>Built for the 63 million small businesses in India who run on WhatsApp — and lose revenue every day because nobody replied fast enough.</p>
        </div>
      </section>

      {/* FOUNDER LETTER */}
      <section style={{ padding: "0 clamp(16px,4vw,44px) 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "clamp(32px,5vw,56px)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5FE8", marginBottom: 24 }}>A letter from the founder</div>
          <div style={{ fontFamily: "'Newsreader',serif", fontStyle: "italic", fontSize: "clamp(16px,1.9vw,19px)", color: "rgba(255,255,255,.7)", lineHeight: 1.9 }}>
            <p>I've spent years in digital marketing — running ads, building funnels, optimising campaigns for businesses across India. Every lead costs money. Real money.</p>
            <br />
            <p>And yet, the single most common thing I saw across <strong style={{ color: "#fff", fontStyle: "normal" }}>every single client</strong> — salons, clinics, gyms, coaching centres — was this:</p>
            <br />
            <p style={{ fontSize: "clamp(19px,2.2vw,24px)", color: "#5A5FE8", lineHeight: 1.5 }}>"Leads were arriving. And dying in the WhatsApp inbox."</p>
            <br />
            <p>A customer messages at 10 PM, ready to book. Nobody replies until morning. By then, they've moved on. You spent ₹300 on that click. It just evaporated.</p>
            <br />
            <p>I saw a salon owner in Hyderabad spending <strong style={{ color: "#fff", fontStyle: "normal" }}>₹40,000 a month on Instagram ads</strong>. Almost 60% of the leads who messaged never got a reply within the hour. Not because of bad ads — because of slow replies.</p>
            <br />
            <p><strong style={{ color: "#fff", fontStyle: "normal" }}>The problem was never the ads. It was always the follow-up.</strong></p>
            <br />
            <p>So we built Fastrill — not as another chatbot, but as a revenue recovery system that sits between your ad spend and your bank account, and makes sure every lead gets an instant reply, in their language, at any hour.</p>
          </div>
          <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(37,211,102,.15)", color: "#5A5FE8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>G</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Ganapathi</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Founder, Fastrill · Solvabil Pvt. Ltd.</div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section style={{ padding: "70px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5FE8", marginBottom: 14 }}>Our mission</div>
              <h2 style={{ fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, color: "#fff", letterSpacing: "-.025em", lineHeight: 1.2, marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Make every Indian small business as responsive as a Fortune 500 company</h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.5)", lineHeight: 1.8 }}>Large companies have CRM teams, sales teams, and support teams. A salon owner in Vijayawada has WhatsApp and herself. Fastrill bridges that gap — giving every small business the same 24/7 responsiveness at a fraction of the cost.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { n: "63M+", l: "Small businesses in India" },
                { n: "98%", l: "WhatsApp open rate" },
                { n: "< 2s", l: "Fastrill reply time" },
                { n: "10+", l: "Indian languages supported" },
              ].map(s => (
                <div key={s.l} style={{ background: "#12151E", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "22px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#5A5FE8", letterSpacing: "-.02em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPANY */}
      <section style={{ padding: "70px clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 800, color: "#fff", marginBottom: 28, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>About the company</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Company", value: "Solvabil Pvt. Ltd." },
              { label: "Product", value: "Fastrill — WhatsApp AI for Indian service businesses" },
              { label: "Founded", value: "2024, India" },
              { label: "Contact", value: "team@fastrill.com" },
              { label: "WhatsApp", value: "+91 63092 79265" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", gap: 24, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", fontWeight: 600, minWidth: 100 }}>{r.label}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 clamp(16px,4vw,44px) 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "clamp(40px,5vw,56px)" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: "#fff", marginBottom: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Join us in fixing the follow-up problem</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", marginBottom: 28 }}>14-day free trial. No credit card required.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "13px 24px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start free →</Link>
            <Link href="mailto:team@fastrill.com" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", color: "#fff", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)" }}>Contact us</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
