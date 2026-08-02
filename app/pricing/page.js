"use client"
import { useState } from "react"
import Link from "next/link"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

const PLANS = [
  {
    tier: "Starter", monthly: 999, tag: "Perfect for solo operators just getting started",
    cta: "Start free trial", href: "/signup", pop: false,
    feats: [
      "1 WhatsApp number",
      "300 AI conversations / month",
      "Booking automation",
      "10+ Indian languages",
      "Bulk WhatsApp campaigns",
      "Basic analytics dashboard",
    ],
    missing: ["Lead recovery sequences", "Appointment reminders", "Revenue analytics", "Multi-branch support"]
  },
  {
    tier: "Growth", monthly: 1999, tag: "For businesses serious about converting every lead",
    cta: "Start free trial", href: "/signup", pop: true,
    feats: [
      "1 WhatsApp number",
      "Unlimited AI conversations",
      "Customer memory & context",
      "Lead recovery sequences",
      "Appointment reminders",
      "Revenue analytics",
      "Bulk WhatsApp campaigns",
      "Priority email support",
    ],
    missing: ["Multi-branch management", "Dedicated onboarding"]
  },
  {
    tier: "Pro", monthly: 4999, tag: "For multi-branch businesses and agencies",
    cta: "Contact sales", href: "mailto:team@fastrill.com", pop: false,
    feats: [
      "Up to 5 WhatsApp numbers",
      "Everything in Growth",
      "Multi-branch management",
      "Dedicated onboarding",
      "Priority support (phone + email)",
      "Custom AI training",
      "API access",
    ],
    missing: []
  },
]

const FAQS = [
  { q: "Is there a free trial?", a: "Yes — 14 days on the Growth plan, no credit card required. If Fastrill doesn't pay for itself in 14 days, you don't pay." },
  { q: "Can I switch plans later?", a: "Yes, upgrade or downgrade anytime from your dashboard. Billing is prorated automatically." },
  { q: "What counts as a conversation?", a: "A conversation is a unique customer interaction within a 24-hour window. One customer messaging multiple times in a day = one conversation." },
  { q: "Does pricing include WhatsApp API charges?", a: "The Fastrill subscription covers our platform. WhatsApp Cloud API charges from Meta are separate — they're typically ₹0.35–₹0.85 per conversation depending on category." },
  { q: "What if I go over my conversation limit on Starter?", a: "We'll notify you before you hit the limit. You can upgrade to Growth or we'll pause new AI replies (manual replies still work) until the next billing cycle." },
  { q: "Is there a setup fee?", a: "No setup fee on Starter or Growth. Pro includes dedicated onboarding at no extra cost." },
]

export default function PricingPage() {
  const [billing, setBilling] = useState("monthly")
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: "#0B0D13", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#C7CBD3" }}>
      <MarketingNav />

      <style>{`
        .chk{color:#5A5FE8;font-weight:700;margin-right:9px}
        .xmark{color:rgba(255,255,255,.2);margin-right:9px}
        .plan-card{background:#12151E;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:clamp(24px,3vw,34px);display:flex;flex-direction:column;position:relative}
        .plan-card.pop{border-color:rgba(37,211,102,.35);box-shadow:0 0 0 1px rgba(37,211,102,.15),0 16px 48px rgba(0,0,0,.4)}
        .badge{position:absolute;top:0;left:50%;transform:translate(-50%,-50%);background:#5A5FE8;color:#0B0D13;font-size:11px;font-weight:800;padding:4px 16px;border-radius:100px;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif}
        .ft-li{display:flex;align-items:flex-start;font-size:13.5px;color:#C7CBD3;margin-bottom:10px;line-height:1.5}
        .ft-li.miss{color:rgba(255,255,255,.25)}
        .faq-item{border-bottom:1px solid rgba(255,255,255,.07)}
        .faq-btn{width:100%;background:none;border:none;padding:20px 0;text-align:left;font-size:15px;font-weight:600;color:#F5F6F8;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;font-family:inherit}
        .faq-ans{font-size:14px;color:rgba(255,255,255,.5);line-height:1.8;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s}
        .faq-ans.open{max-height:200px;padding-bottom:20px}
      `}</style>

      {/* HERO */}
      <section style={{ paddingTop: 130, paddingBottom: 60, paddingLeft: "clamp(16px,4vw,44px)", paddingRight: "clamp(16px,4vw,44px)", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(37,211,102,.1)", color: "#5A5FE8", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 22, border: "1px solid rgba(37,211,102,.2)" }}>Pricing</div>
          <h1 style={{ fontSize: "clamp(34px,5vw,54px)", fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            One missed booking costs more<br />than a month of Fastrill
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 32 }}>Simple plans. No hidden fees. Cancel anytime.</p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 100, padding: 4 }}>
            {["monthly", "annual"].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: "8px 20px", borderRadius: 100, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: billing === b ? "rgba(37,211,102,.15)" : "transparent", color: billing === b ? "#5A5FE8" : "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: 8, transition: "all .15s" }}>
                {b === "monthly" ? "Monthly" : <>Annual <span style={{ fontSize: 10, fontWeight: 800, background: "#5A5FE8", color: "#0B0D13", padding: "2px 8px", borderRadius: 100 }}>Save 17%</span></>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section style={{ padding: "0 clamp(16px,4vw,44px) 80px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, alignItems: "stretch" }}>
          {PLANS.map(plan => {
            const price = billing === "annual" ? Math.round(plan.monthly * 0.83) : plan.monthly
            return (
              <div key={plan.tier} className={`plan-card${plan.pop ? " pop" : ""}`}>
                {plan.pop && <div className="badge">Most popular</div>}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: plan.pop ? "#5A5FE8" : "rgba(255,255,255,.3)", marginBottom: 6 }}>{plan.tier}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 20, minHeight: 36 }}>{plan.tag}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>₹</span>
                  <span style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{price.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginBottom: 24 }}>per month + GST{billing === "annual" && ` · ₹${(price * 12).toLocaleString("en-IN")}/yr`}</div>
                <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,.07)", marginBottom: 20 }} />
                <ul style={{ listStyle: "none", flex: 1, marginBottom: 24 }}>
                  {plan.feats.map(f => <li key={f} className="ft-li"><span className="chk">✓</span>{f}</li>)}
                  {plan.missing.map(f => <li key={f} className="ft-li miss"><span className="xmark">✗</span>{f}</li>)}
                </ul>
                <Link href={plan.href} style={{ display: "block", textAlign: "center", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: plan.pop ? "#5A5FE8" : "transparent", color: plan.pop ? "#0B0D13" : "#fff", border: plan.pop ? "none" : "1px solid rgba(255,255,255,.12)", transition: "all .15s", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{plan.cta}</Link>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "rgba(255,255,255,.25)" }}>14-day free trial · No credit card · Cancel anytime</p>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ padding: "60px clamp(16px,4vw,44px)", background: "#0D0F17", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 40, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>What's included in each plan</h2>
          <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 540 }}>
              <thead>
                <tr>
                  {["Feature", "Starter ₹999", "Growth ₹1,999", "Pro ₹4,999"].map((h, i) => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: i === 0 ? "left" : "center", fontSize: 12, fontWeight: 700, color: i === 2 ? "#5A5FE8" : "rgba(255,255,255,.4)", background: i === 2 ? "rgba(37,211,102,.06)" : "#13161F", borderBottom: "1px solid rgba(255,255,255,.07)", letterSpacing: ".04em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["AI conversations", "300/mo", "Unlimited", "Unlimited"],
                  ["WhatsApp numbers", "1", "1", "Up to 5"],
                  ["Booking automation", "✓", "✓", "✓"],
                  ["10+ Indian languages", "✓", "✓", "✓"],
                  ["Bulk campaigns", "✓", "✓", "✓"],
                  ["Lead recovery", "✗", "✓", "✓"],
                  ["Appointment reminders", "✗", "✓", "✓"],
                  ["Revenue analytics", "✗", "✓", "✓"],
                  ["Multi-branch", "✗", "✗", "✓"],
                  ["Dedicated onboarding", "✗", "✗", "✓"],
                  ["API access", "✗", "✗", "✓"],
                ].map(([feat, ...vals]) => (
                  <tr key={feat} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                    <td style={{ padding: "12px 18px", color: "rgba(255,255,255,.7)", fontWeight: 500 }}>{feat}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ padding: "12px 18px", textAlign: "center", background: i === 1 ? "rgba(37,211,102,.04)" : "transparent", color: v === "✓" ? "#5A5FE8" : v === "✗" ? "rgba(255,255,255,.2)" : "#fff", fontWeight: v === "✓" || v === "✗" ? 700 : 500 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px clamp(16px,4vw,44px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 44, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Pricing FAQs</h2>
          {FAQS.map((f, i) => (
            <div key={i} className="faq-item">
              <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {f.q}
                <span style={{ fontSize: 20, color: "rgba(255,255,255,.3)", flexShrink: 0, transition: "transform .2s", display: "block", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
              </button>
              <div className={`faq-ans${openFaq === i ? " open" : ""}`}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 clamp(16px,4vw,44px) 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#12151E", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "clamp(40px,5vw,60px)" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: "#fff", marginBottom: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Start your 14-day free trial</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", marginBottom: 28 }}>No credit card. Full Growth plan access. Cancel anytime.</p>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5A5FE8", color: "#0B0D13", padding: "14px 28px", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Get started free →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
