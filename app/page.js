"use client"

import { useState, useEffect, useRef } from "react"
import MarketingNav from "@/components/MarketingNav"
import MarketingFooter from "@/components/MarketingFooter"

const DEMOS = {
  booking: [
    { r: "c", m: "Hi, I want a haircut tomorrow around 3pm" },
    { r: "a", m: "Tomorrow’s Saturday — 3 PM works great.\n\nShall I confirm Haircut for Saturday, 29th March at 3:00 PM?" },
    { r: "c", m: "Yes please!" },
    { r: "a", m: "Booking confirmed.\n\nHaircut\nSaturday, 29 March\n3:00 PM\n\nSee you then!" },
  ],
  hindi: [
    { r: "c", m: "Bhai facial karwa sakte hai kal?" },
    { r: "a", m: "Haan bilkul!\n\nFacial ₹1,200 mein available hai (60 min).\n\nKis time aana chahenge?" },
    { r: "c", m: "Shaam 6 baje" },
    { r: "a", m: "Confirm karu Facial kal shaam 6:00 PM ke liye?" },
    { r: "c", m: "Haan kar do" },
    { r: "a", m: "Booking ho gayi!\n\nFacial · ₹1,200\nKal, 29 March\n6:00 PM\n\nMilenge!" },
  ],
  winback: [
    { r: "a", m: "Hi Anita — it’s been a while since your last visit at Riya Salon.\n\nYour favourite keratin treatment is available this week, want to book?" },
    { r: "c", m: "Oh yes actually! What’s the price?" },
    { r: "a", m: "Keratin Treatment is ₹2,800 (90 min). 10% off this week — ₹2,520." },
    { r: "c", m: "That’s great, book me Saturday morning" },
    { r: "a", m: "Booking confirmed.\n\nKeratin Treatment · ₹2,520\nSaturday, 29 March · 10:00 AM" },
  ],
}

const DEMO_META = [
  { k: "booking", label: "Booking flow", sub: "End-to-end in 4 messages", icon: "calendar" },
  { k: "hindi", label: "Hindi support", sub: "Auto-detected per chat", icon: "globe" },
  { k: "winback", label: "Win-back", sub: "Inactive customer recovery", icon: "refresh" },
]

const TESTIMONIALS = [
  { name: "Priya Nair", biz: "Glow Parlour, Hyderabad", result: "+43%", resultLabel: "bookings in month one", quote: "I was losing Saturday night bookings because nobody replied after 8 PM. Customers now book at midnight and wake up to a confirmation. It paid for itself in the first week.", initial: "P" },
  { name: "Dr. Ravi Sharma", biz: "Skin First Clinic, Vijayawada", result: "₹22k", resultLabel: "saved per month", quote: "My patients message in Telugu and Fastrill replies in Telugu, books the slot, and follows up if they go quiet. I had to see it to believe it wasn’t a person.", initial: "R" },
  { name: "Sneha Reddy", biz: "Studio S, 2 branches, Bangalore", result: "0", resultLabel: "missed messages", quote: "Two branches, both inboxes handled at once. Our staff stopped checking phones and started focusing on the customer in front of them.", initial: "S" },
]

function Ic({ name, size = 20 }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }
  switch (name) {
    case "check": return <svg {...c} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></svg>
    case "arrow": return <svg {...c} strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case "x": return <svg {...c} strokeWidth={2}><path d="M5 5l14 14M19 5L5 19" /></svg>
    case "globe": return <svg {...c}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
    case "shield": return <svg {...c}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    case "clock": return <svg {...c}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    case "msg": return <svg {...c}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
    case "calendar": return <svg {...c}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case "send": return <svg {...c}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
    case "inbox": return <svg {...c}><path d="M22 12h-6l-2 3H10l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
    case "refresh": return <svg {...c}><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
    case "chart": return <svg {...c}><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
    case "users": return <svg {...c}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
    case "settings": return <svg {...c}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
    case "sun": return <svg {...c}><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
    case "moon": return <svg {...c}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
    default: return null
  }
}

export default function FastrillLanding() {
  const [scrolled, setScrolled] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [light, setLight] = useState(false)
  const [demoKey, setDemoKey] = useState("booking")
  const [demoMsgs, setDemoMsgs] = useState([])
  const [billing, setBilling] = useState("monthly")
  const demoRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem("fastrill-lp-theme")
    if (saved === "light") setLight(true)
  }, [])

  useEffect(() => {
    document.body.style.background = light ? "#FAFAFB" : "#0B0D13"
    localStorage.setItem("fastrill-lp-theme", light ? "light" : "dark")
  }, [light])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setDemoMsgs([])
    const msgs = DEMOS[demoKey]
    const timers = msgs.map((m, i) => setTimeout(() => {
      setDemoMsgs(p => [...p, m])
      if (demoRef.current) demoRef.current.scrollTop = 9999
    }, 500 + i * 1000))
    return () => timers.forEach(clearTimeout)
  }, [demoKey])

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    )
    document.querySelectorAll(".fade").forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const plans = [
    { tier: "Starter", monthly: 999, tag: "Solo operators & new businesses", cta: "Get started", cs: "out", feats: [["inc", "1 WhatsApp number"], ["inc", "300 conversations / month"], ["inc", "Booking automation"], ["inc", "10+ Indian languages"], ["inc", "Bulk WhatsApp campaigns"], ["exc", "Lead recovery sequences"], ["exc", "Appointment reminders"], ["exc", "Revenue analytics"]] },
    { tier: "Growth", monthly: 1999, tag: "For growing businesses", cta: "Start free trial", cs: "go", pop: true, feats: [["inc", "1 WhatsApp number"], ["inc", "Unlimited conversations"], ["inc", "Customer memory & context"], ["inc", "Lead recovery sequences"], ["inc", "Appointment reminders"], ["inc", "Revenue analytics"]] },
    { tier: "Pro", monthly: 4999, tag: "Multi-branch teams", cta: "Contact sales", cs: "out", feats: [["inc", "Up to 5 WhatsApp numbers"], ["inc", "Everything in Growth"], ["inc", "Multi-branch management"], ["inc", "Dedicated onboarding"], ["inc", "Priority support"]] },
  ]

  return (
    <div className={`flr${light ? " lt" : ""}`}>
      <style>{`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{-webkit-font-smoothing:antialiased;overflow-x:hidden}

.flr{
  --bg:#0B0D13;--card:#12151E;--card2:#0E1119;--well:#0E1119;
  --ink:#F5F6F8;--ink2:#C7CBD3;--mut:#9BA1AC;--mut2:#6B7180;
  --line:#1E2330;--line2:#2C3344;
  --accent:#8B93FF;--accent-soft:rgba(139,147,255,.09);--accent-line:rgba(139,147,255,.32);
  --cta:#5A5FE8;--cta-hov:#6B70F0;--cta-fg:#FFFFFF;
  --danger:#F87171;
  --wa-me:#1F2447;--wa-me-ink:#DCE0FF;
  --sh-sm:0 1px 2px rgba(3,5,12,.5);
  --sh-md:0 4px 16px rgba(3,5,12,.45);
  --sh-lg:0 16px 48px rgba(3,5,12,.5);
  background:var(--bg);color:var(--mut);
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  font-size:16px;line-height:1.6;min-height:100vh;
}
.flr.lt{
  --bg:#FAFAFB;--card:#FFFFFF;--card2:#F4F5F7;--well:#F4F5F7;
  --ink:#16181D;--ink2:#3F4450;--mut:#5F6672;--mut2:#9AA0AB;
  --line:#E7E8EC;--line2:#D3D5DC;
  --accent:#4F46E5;--accent-soft:rgba(79,70,229,.06);--accent-line:rgba(79,70,229,.28);
  --cta:#4F46E5;--cta-hov:#4338CA;--cta-fg:#FFFFFF;
  --danger:#DC2626;
  --wa-me:#EEF0FF;--wa-me-ink:#3730A3;
  --sh-sm:0 1px 2px rgba(22,24,29,.05);
  --sh-md:0 4px 16px rgba(22,24,29,.06);
  --sh-lg:0 16px 48px rgba(22,24,29,.09);
}

.fade{opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s ease}
.fade.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.fade{opacity:1;transform:none;transition:none}}

/* ── NAV ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;padding:0 clamp(20px,4vw,44px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid transparent;transition:background .25s,border-color .25s}
.nav.sc{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom-color:var(--line)}
.logo{display:flex;align-items:center;gap:9px;text-decoration:none}
.logo img{width:26px;height:26px;object-fit:contain}
.logo span{font-weight:700;font-size:17px;color:var(--ink);letter-spacing:-.02em}
.nav-links{display:flex;align-items:center;gap:2px;list-style:none}
.nav-links a{font-size:13.5px;font-weight:500;color:var(--mut);text-decoration:none;padding:7px 13px;border-radius:8px;transition:color .15s,background .15s}
.nav-links a:hover{color:var(--ink);background:var(--card2)}
.nav-right{display:flex;align-items:center;gap:6px}
.theme-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:none;border:1px solid var(--line);color:var(--mut);cursor:pointer;transition:color .15s,border-color .15s}
.theme-btn:hover{color:var(--ink);border-color:var(--line2)}
.nav-signin{font-size:13.5px;font-weight:500;color:var(--mut);text-decoration:none;padding:7px 13px;border-radius:8px;transition:color .15s}
.nav-signin:hover{color:var(--ink)}
.nav-cta{display:inline-flex;align-items:center;background:var(--cta);color:var(--cta-fg);padding:8px 16px;border-radius:8px;font-weight:600;font-size:13.5px;text-decoration:none;transition:background .15s;margin-left:4px}
.nav-cta:hover{background:var(--cta-hov)}
.hbg{display:none;background:none;border:1px solid var(--line);border-radius:8px;width:34px;height:34px;align-items:center;justify-content:center;cursor:pointer;color:var(--mut);font-size:15px}
.mdraw{position:fixed;top:60px;left:0;right:0;z-index:190;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px 18px;display:flex;flex-direction:column;gap:2px;transform:translateY(-115%);transition:transform .22s ease;box-shadow:var(--sh-md)}
.mdraw.open{transform:none}
.mdraw a{color:var(--mut);text-decoration:none;font-size:14px;font-weight:500;padding:12px 12px;border-radius:8px}
.mdraw a:hover{background:var(--card2);color:var(--ink)}
.mdraw-cta{margin-top:8px;background:var(--cta);color:var(--cta-fg) !important;font-weight:600;text-align:center}
@media(max-width:900px){.nav-links,.nav-signin,.nav-cta{display:none}.hbg{display:inline-flex}}

/* ── HERO ── */
.hero{padding:clamp(104px,13vh,148px) clamp(20px,4vw,44px) clamp(48px,6vw,72px)}
.hero-in{max-width:1120px;margin:0 auto}
.hero-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(36px,5vw,72px);align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}
.eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent)}
.h1{font-weight:700;font-size:clamp(34px,4.6vw,56px);line-height:1.07;letter-spacing:-.032em;color:var(--ink);margin:0 0 20px}
.h1 em{font-style:normal;color:var(--accent)}
.hero-sub{font-size:clamp(15px,1.5vw,17px);color:var(--mut);line-height:1.7;max-width:520px;margin:0 0 30px}
.hero-sub strong{color:var(--ink2);font-weight:600}
.hero-btns{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr;text-align:center}.hero-sub{margin-left:auto;margin-right:auto}.hero-btns,.hero-trust{justify-content:center}}

/* ── PHONE DEMO ── */
.ph-stage{position:relative;display:flex;justify-content:center;padding:24px 0}
.ph-stage::before{content:'';position:absolute;inset:0;margin:auto;width:min(440px,100%);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(230,168,84,.10) 0%,rgba(230,168,84,.03) 45%,transparent 66%)}
.ph-stage::after{content:'';position:absolute;inset:0;margin:auto;width:min(390px,90%);aspect-ratio:1;border-radius:50%;border:1px solid rgba(230,168,84,.20);box-shadow:0 0 0 32px rgba(230,168,84,.03)}
.flr.lt .ph-stage::before{background:radial-gradient(circle,rgba(217,119,6,.09) 0%,rgba(217,119,6,.03) 45%,transparent 66%)}
.flr.lt .ph-stage::after{border-color:rgba(217,119,6,.20);box-shadow:0 0 0 32px rgba(217,119,6,.03)}
.ph-frame{position:relative;z-index:1;width:280px;background:#0E0F12;border-radius:38px;padding:10px;box-shadow:0 24px 64px rgba(3,5,12,.55),0 0 0 1px rgba(255,255,255,.07)}
.ph-screen{border-radius:30px;overflow:hidden;background:#EFE7DB;display:flex;flex-direction:column;height:520px}
.ph-status{background:#075E54;color:#fff;font-size:9.5px;display:flex;justify-content:space-between;padding:7px 16px 0;font-weight:600}
.ph-head{background:#075E54;color:#fff;display:flex;align-items:center;gap:9px;padding:8px 12px 10px}
.ph-back{font-size:15px;opacity:.9}
.ph-avatar{width:30px;height:30px;border-radius:50%;background:#F3C26B;color:#7C3E0A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.ph-name{font-size:12.5px;font-weight:600;line-height:1.2}
.ph-onl{font-size:9.5px;opacity:.85}
.ph-chat{flex:1;padding:12px 10px;display:flex;flex-direction:column;gap:7px;overflow:hidden;position:relative;
  background-color:#EFE7DB;
  background-image:radial-gradient(rgba(124,62,10,.05) 1px,transparent 1px);background-size:18px 18px}
.ph-bub{max-width:82%;padding:7px 10px 6px;border-radius:9px;font-size:11.5px;line-height:1.45;color:#1B1B18;box-shadow:0 1px 1px rgba(0,0,0,.08);animation:phin .3s ease both;white-space:pre-wrap}
.ph-bub.c{background:#DCF8C6;align-self:flex-end;border-top-right-radius:2px}
.ph-bub.a{background:#FFFFFF;align-self:flex-start;border-top-left-radius:2px}
.ph-time{display:block;font-size:8.5px;color:rgba(27,27,24,.45);text-align:right;margin-top:2px}
.ph-time .tick{color:#4FB6EC;font-weight:700}
@keyframes phin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ph-typing{align-self:flex-start;background:#FFFFFF;border-radius:9px;border-top-left-radius:2px;padding:10px 13px;display:flex;gap:4px;box-shadow:0 1px 1px rgba(0,0,0,.08);animation:phin .25s ease both}
.ph-typing i{width:5px;height:5px;border-radius:50%;background:#9B9B93;animation:phdot 1.1s infinite}
.ph-typing i:nth-child(2){animation-delay:.18s}
.ph-typing i:nth-child(3){animation-delay:.36s}
@keyframes phdot{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.ph-card{align-self:flex-start;max-width:88%;background:#FFFFFF;border-radius:10px;border-top-left-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.1);overflow:hidden;animation:phin .3s ease both}
.ph-card-top{display:flex;align-items:center;gap:8px;background:#F0FAF0;padding:9px 12px;border-bottom:1px solid #E4EDE2}
.ph-card-check{width:20px;height:20px;border-radius:50%;background:#25A55A;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ph-card-title{font-size:11.5px;font-weight:700;color:#14532D}
.ph-card-body{padding:9px 12px 7px}
.ph-card-row{display:flex;justify-content:space-between;gap:14px;font-size:10.5px;color:#4B4B44;padding:2.5px 0}
.ph-card-row b{color:#1B1B18;font-weight:600}
.ph-card-foot{font-size:9px;color:rgba(27,27,24,.5);padding:0 12px 8px;display:flex;justify-content:space-between;align-items:center}
.ph-card-foot .tick{color:#4FB6EC;font-weight:700}
.ph-inputbar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#F2EBDF}
.ph-input{flex:1;background:#fff;border-radius:100px;font-size:10.5px;color:#A7A79E;padding:8px 13px}
.ph-send{width:30px;height:30px;border-radius:50%;background:#00897B;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ph-caption{position:absolute;bottom:-6px;left:0;right:0;text-align:center;font-size:11.5px;color:var(--mut2)}
@media(max-width:900px){.ph-frame{width:260px}.ph-screen{height:480px}}
.btn-p{display:inline-flex;align-items:center;gap:8px;background:var(--cta);color:var(--cta-fg);padding:13px 26px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:background .15s,transform .15s;border:none;cursor:pointer;font-family:inherit}
.btn-p:hover{background:var(--cta-hov);transform:translateY(-1px)}
.btn-s{display:inline-flex;align-items:center;gap:8px;background:var(--card);color:var(--ink);padding:13px 22px;border-radius:10px;font-weight:600;font-size:14.5px;text-decoration:none;border:1px solid var(--line);transition:border-color .15s,background .15s;box-shadow:var(--sh-sm)}
.btn-s:hover{border-color:var(--line2)}
.hero-trust{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:22px;font-size:12.5px;color:var(--mut2);flex-wrap:wrap}
.hero-trust span{display:flex;align-items:center;gap:6px}
.hero-trust svg{color:var(--accent)}

/* ── PRODUCT PREVIEW ── */
.preview-wrap{max-width:1120px;margin:clamp(44px,6vw,64px) auto 0;padding:0 clamp(20px,4vw,44px)}
.preview{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--sh-lg)}
.pv-chrome{height:40px;background:var(--card2);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 16px;gap:14px}
.pv-dots{display:flex;gap:6px}
.pv-dots i{width:9px;height:9px;border-radius:50%;background:var(--line2);display:block}
.pv-url{flex:1;max-width:340px;margin:0 auto;background:var(--bg);border:1px solid var(--line);border-radius:7px;font-size:11px;color:var(--mut2);padding:4px 12px;text-align:center;font-weight:500}
.pv-body{display:grid;grid-template-columns:190px 1fr;min-height:440px}
.pv-side{border-right:1px solid var(--line);background:var(--card2);padding:16px 10px;display:flex;flex-direction:column;gap:2px}
.pv-side-logo{display:flex;align-items:center;gap:7px;padding:4px 10px 14px}
.pv-side-logo img{width:18px;height:18px;object-fit:contain}
.pv-side-logo b{font-size:12.5px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.pv-nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:500;color:var(--mut)}
.pv-nav-item svg{opacity:.75}
.pv-nav-item.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.pv-main{padding:20px 22px;display:flex;flex-direction:column;gap:16px;min-width:0}
.pv-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pv-title{font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.01em}
.pv-title small{display:block;font-size:11px;font-weight:400;color:var(--mut2);margin-top:2px}
.pv-live{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:600;color:var(--accent);background:var(--accent-soft);border-radius:100px;padding:4px 11px}
.pv-live::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent)}
.pv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.pv-kpi{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.pv-kpi-l{font-size:10.5px;color:var(--mut2);font-weight:500;margin-bottom:5px}
.pv-kpi-v{font-size:19px;font-weight:700;color:var(--ink);letter-spacing:-.02em;line-height:1}
.pv-kpi-d{font-size:10px;font-weight:600;color:var(--accent);margin-top:5px}
.pv-cols{display:grid;grid-template-columns:1fr 1.25fr;gap:12px;flex:1;min-height:0}
.pv-list{background:var(--bg);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.pv-list-hd{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mut2);padding:11px 14px;border-bottom:1px solid var(--line)}
.pv-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)}
.pv-row:last-child{border-bottom:none}
.pv-row.on{background:var(--card2)}
.pv-av{width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0}
.pv-row-mid{flex:1;min-width:0}
.pv-row-n{font-size:12px;font-weight:600;color:var(--ink);margin-bottom:1px}
.pv-row-m{font-size:11px;color:var(--mut2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv-pill{font-size:9px;font-weight:700;padding:3px 8px;border-radius:100px;background:var(--accent-soft);color:var(--accent);flex-shrink:0}
.pv-pill.off{background:var(--card2);color:var(--mut2)}
.pv-chat{background:var(--bg);border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;overflow:hidden}
.pv-chat-hd{display:flex;align-items:center;gap:9px;padding:10px 14px;border-bottom:1px solid var(--line)}
.pv-chat-n{font-size:12px;font-weight:600;color:var(--ink)}
.pv-chat-s{font-size:10px;color:var(--accent)}
.pv-chat-b{padding:13px;display:flex;flex-direction:column;gap:7px;flex:1}
.bub{max-width:82%;padding:8px 12px;border-radius:11px;font-size:11.5px;line-height:1.5;white-space:pre-wrap}
.bub.c{background:var(--card2);border:1px solid var(--line);color:var(--ink2);align-self:flex-start;border-bottom-left-radius:4px}
.bub.a{background:var(--wa-me);color:var(--wa-me-ink);align-self:flex-end;border-bottom-right-radius:4px}
.bub-meta{font-size:9px;color:var(--mut2);align-self:flex-end}
.pv-confirm{align-self:flex-end;display:flex;align-items:center;gap:7px;background:var(--accent-soft);border:1px solid var(--accent-line);color:var(--accent);font-size:10.5px;font-weight:600;border-radius:8px;padding:6px 12px}
@media(max-width:920px){.pv-side{display:none}.pv-body{grid-template-columns:1fr}}
@media(max-width:680px){.pv-cols{grid-template-columns:1fr}.pv-list{display:none}.pv-kpis{grid-template-columns:repeat(2,1fr)}}

/* ── STATS STRIP ── */
.stats{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--card2);padding:22px clamp(20px,4vw,44px);margin-top:clamp(48px,7vw,80px)}
.stats-in{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.stat{text-align:center}
.stat b{display:block;font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-.02em}
.stat span{font-size:12px;color:var(--mut2)}
@media(max-width:680px){.stats-in{grid-template-columns:repeat(2,1fr)}}

/* ── SECTIONS ── */
.section{padding:clamp(72px,9vw,110px) clamp(20px,4vw,44px)}
.section.alt{background:var(--card2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.flr.lt .section.alt{background:#F4F5F7}
.section-in{max-width:1120px;margin:0 auto}
.label{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
.h2{font-weight:700;font-size:clamp(26px,3.3vw,40px);color:var(--ink);letter-spacing:-.025em;line-height:1.14;margin-bottom:14px}
.h2 em{font-style:normal;color:var(--accent)}
.lead{font-size:15px;color:var(--mut);line-height:1.75;max-width:540px}
.center{text-align:center}
.lead.center,.faq-list{margin-left:auto;margin-right:auto}

/* ── TIMELINE ── */
.timeline{margin-top:48px}
.tl-row{display:grid;grid-template-columns:130px 1fr;gap:26px;align-items:baseline;padding:24px 0;border-top:1px solid var(--line)}
.tl-row:last-child{border-bottom:1px solid var(--line)}
.tl-time{font-size:clamp(17px,2vw,22px);font-weight:600;color:var(--mut2);letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.tl-row.danger .tl-time,.tl-row.danger .tl-event{color:var(--danger)}
.tl-event{font-size:15.5px;font-weight:600;color:var(--ink);margin-bottom:3px}
.tl-desc{font-size:13.5px;color:var(--mut);line-height:1.65}
@media(max-width:640px){.tl-row{grid-template-columns:1fr;gap:4px}}

/* ── PROBLEM CARDS ── */
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 26px;box-shadow:var(--sh-sm)}
.card-num{font-size:13px;font-weight:700;color:var(--accent);margin-bottom:14px}
.card-title{font-size:16px;font-weight:600;color:var(--ink);margin-bottom:8px;letter-spacing:-.01em}
.card-desc{font-size:13.5px;color:var(--mut);line-height:1.7}
.card-tag{display:inline-block;margin-top:16px;font-size:11px;font-weight:600;color:var(--danger);background:transparent;border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);border-radius:6px;padding:3px 10px}
@media(max-width:760px){.cards{grid-template-columns:1fr}}

/* ── MODULES ── */
.module{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,68px);align-items:center;padding:56px 0}
.module.rev .module-text{order:2}
.module.rev .module-vis{order:1}
.module-tag{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.module-title{font-weight:700;font-size:clamp(20px,2.4vw,27px);color:var(--ink);letter-spacing:-.02em;line-height:1.22;margin-bottom:10px}
.module-desc{font-size:14px;color:var(--mut);line-height:1.75;margin-bottom:18px}
.module-list{list-style:none;display:flex;flex-direction:column;gap:10px}
.module-list li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--ink2)}
.module-list li svg{color:var(--accent);flex-shrink:0;margin-top:3px}
.mock{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--sh-md);max-width:400px;margin:0 auto}
.mock-hd{background:var(--card2);padding:11px 15px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--line)}
.mock-av{width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.mock-n{font-size:12.5px;font-weight:600;color:var(--ink)}
.mock-s{font-size:10px;color:var(--accent)}
.mock-b{padding:15px;min-height:200px;display:flex;flex-direction:column;gap:8px}
.mock-b .bub{font-size:12px}
.dash-b{padding:20px}
.dash-t{font-weight:600;font-size:13.5px;color:var(--ink);margin-bottom:16px}
.dash-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.dash-sl{font-size:10.5px;color:var(--mut2);margin-bottom:4px}
.dash-sv{font-weight:700;font-size:17px;color:var(--ink);letter-spacing:-.01em}
.dash-sv.t{color:var(--accent)}
.dash-roi{background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:13px 15px}
.dash-roi-row{display:flex;justify-content:space-between;font-size:12px;color:var(--mut);padding:4px 0}
.dash-roi-row strong{font-weight:600;color:var(--ink)}
.dash-roi-row strong.t{color:var(--accent)}
.inbox-row{display:flex;align-items:center;gap:11px;padding:12px 15px;border-bottom:1px solid var(--line)}
.inbox-row:last-child{border-bottom:none}
.inbox-mid{flex:1;min-width:0}
.inbox-n{font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:2px}
.inbox-m{font-size:11px;color:var(--mut2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inbox-right{text-align:right;flex-shrink:0}
.inbox-t{font-size:10px;color:var(--mut2);margin-bottom:4px}
@media(max-width:860px){.module,.module.rev{grid-template-columns:1fr;gap:26px}.module.rev .module-text{order:1}.module.rev .module-vis{order:2}}

/* ── DEMO ── */
.demo-layout{display:grid;grid-template-columns:210px 1fr;gap:18px;align-items:start;margin-top:40px}
.demo-tabs{display:flex;flex-direction:column;gap:8px}
.demo-tab{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;cursor:pointer;transition:border-color .15s;text-align:left;font-family:inherit;width:100%}
.demo-tab:hover{border-color:var(--line2)}
.demo-tab.on{border-color:var(--accent-line);background:var(--accent-soft)}
.demo-tab-ic{color:var(--accent);margin-bottom:8px}
.demo-tab-l{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px}
.demo-tab-s{font-size:11px;color:var(--mut2)}
.wa{background:var(--card);border-radius:14px;overflow:hidden;border:1px solid var(--line);box-shadow:var(--sh-md)}
.wa-b{padding:16px;min-height:280px;max-height:340px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;scrollbar-width:none}
.wa-b::-webkit-scrollbar{display:none}
.wa-b .bub{font-size:12.5px;animation:msgin .22s ease both}
@keyframes msgin{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(max-width:760px){.demo-layout{grid-template-columns:1fr}.demo-tabs{display:grid;grid-template-columns:repeat(3,1fr)}}

/* ── COMPETITOR TABLE ── */
.vs-wrap{overflow-x:auto;margin-top:44px;border-radius:14px;border:1px solid var(--line);box-shadow:var(--sh-md)}
.vs-table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
.vs-table th{padding:13px 18px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut2);background:var(--card2);border-bottom:1px solid var(--line);text-align:left}
.vs-table th.hl{background:var(--accent-soft);color:var(--accent);border-bottom-color:var(--accent-line)}
.vs-table td{padding:13px 18px;border-bottom:1px solid var(--line);color:var(--ink2);vertical-align:middle}
.vs-table tr:last-child td{border-bottom:none}
.vs-table td.hl{background:var(--accent-soft);font-weight:600;color:var(--ink)}
.vs-table td.feat{font-weight:500;color:var(--ink);max-width:200px}
.vs-yes{color:#22C55E;font-weight:700}
.vs-no{color:var(--mut2)}
.vs-part{color:#F59E0B;font-weight:600}

/* ── COMPARISON ── */
.cmp{max-width:760px;margin:44px auto 0}
.cmp-row{display:grid;grid-template-columns:1fr 40px 1fr;align-items:center;gap:14px;padding:18px 0;border-bottom:1px solid var(--line)}
.cmp-row:first-child{border-top:1px solid var(--line)}
.cmp-before{font-size:14px;color:var(--mut2);text-align:right}
.cmp-arrow{color:var(--accent);display:flex;justify-content:center}
.cmp-after{font-size:14.5px;font-weight:600;color:var(--ink)}
@media(max-width:600px){.cmp-row{grid-template-columns:1fr;gap:4px}.cmp-before{text-align:left}.cmp-arrow{display:none}}

/* ── TESTIMONIALS ── */
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px}
.tcard{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px;box-shadow:var(--sh-sm);display:flex;flex-direction:column}
.tcard-metric{font-size:26px;font-weight:700;color:var(--accent);letter-spacing:-.02em;line-height:1}
.tcard-metric-l{font-size:11.5px;color:var(--mut2);margin:5px 0 18px}
.tcard-q{font-size:13.5px;color:var(--ink2);line-height:1.75;flex:1}
.tcard-auth{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}
.tcard-av{width:34px;height:34px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.tcard-n{font-size:13px;font-weight:600;color:var(--ink)}
.tcard-b{font-size:11.5px;color:var(--mut2)}
@media(max-width:820px){.tgrid{grid-template-columns:1fr;max-width:460px;margin-left:auto;margin-right:auto}}

/* ── FOUNDER ── */
.founder{max-width:660px;margin:0 auto}
.founder-letter{font-family:'Newsreader',serif;font-style:italic;font-size:clamp(16.5px,1.9vw,19px);color:var(--ink2);line-height:1.9;margin-top:36px}
.founder-letter strong{color:var(--ink);font-weight:600;font-style:normal}
.founder-pull{display:block;color:var(--accent);font-size:clamp(19px,2.2vw,22px);margin:26px 0;line-height:1.5}
.founder-sign{margin-top:40px;display:flex;align-items:center;gap:13px}
.founder-av{width:42px;height:42px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
.founder-n{font-size:14px;font-weight:600;color:var(--ink);font-family:'Inter',sans-serif;font-style:normal}
.founder-r{font-size:12px;color:var(--mut2);font-family:'Inter',sans-serif;font-style:normal}

/* ── PRICING ── */
.billing{display:inline-flex;align-items:center;gap:3px;background:var(--card);border:1px solid var(--line);border-radius:100px;padding:4px;margin:20px auto 40px}
.bt{padding:8px 18px;border-radius:100px;font-size:13px;font-weight:600;border:none;background:transparent;color:var(--mut);cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:7px;transition:background .15s,color .15s}
.bt.on{background:var(--accent-soft);color:var(--accent)}
.bt-save{font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:var(--accent-soft);color:var(--accent)}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:stretch}
.plan{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:clamp(24px,3vw,30px);position:relative;box-shadow:var(--sh-sm);display:flex;flex-direction:column}
.plan.pop{border-color:var(--accent-line);box-shadow:var(--sh-md)}
.plan-badge{position:absolute;top:0;left:26px;transform:translateY(-50%);background:var(--cta);color:var(--cta-fg);font-size:10.5px;font-weight:700;padding:4px 13px;border-radius:100px}
.plan-tier{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut2);margin-bottom:5px}
.plan-tag{font-size:12.5px;color:var(--mut2);margin-bottom:18px}
.plan-price{display:flex;align-items:baseline;gap:3px}
.plan-rs{font-size:16px;font-weight:600;color:var(--ink)}
.plan-amt{font-size:clamp(32px,4vw,40px);font-weight:700;color:var(--ink);letter-spacing:-.03em}
.plan-mo{font-size:11.5px;color:var(--mut2);margin:4px 0 16px}
.plan-hr{border:none;border-top:1px solid var(--line);margin:14px 0 16px}
.plan-list{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:24px;flex:1}
.plan-list li{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--ink2)}
.plan-list li svg{color:var(--accent);flex-shrink:0;margin-top:2px}
.plan-list li.exc{color:var(--mut2)}
.plan-list li.exc svg{color:var(--mut2);opacity:.6}
.plan-btn{display:block;text-align:center;padding:12px;border-radius:10px;font-weight:600;font-size:13.5px;text-decoration:none;transition:background .15s,border-color .15s}
.plan-btn.go{background:var(--cta);color:var(--cta-fg)}
.plan-btn.go:hover{background:var(--cta-hov)}
.plan-btn.out{background:transparent;color:var(--ink);border:1px solid var(--line)}
.plan-btn.out:hover{border-color:var(--line2)}
@media(max-width:820px){.pgrid{grid-template-columns:1fr;max-width:420px;margin:0 auto}}

/* ── FAQ ── */
.faq-list{max-width:660px;margin-top:40px}
.fi{border-bottom:1px solid var(--line)}
.fi:first-child{border-top:1px solid var(--line)}
.fb{width:100%;background:none;border:none;padding:19px 0;text-align:left;font-size:14.5px;font-weight:600;color:var(--ink);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:inherit;transition:color .15s}
.fb:hover{color:var(--accent)}
.fp{width:22px;height:22px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--mut2);flex-shrink:0;transition:transform .2s,color .2s,border-color .2s}
.fa{font-size:14px;color:var(--mut);line-height:1.8;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease}
.fi.op .fa{max-height:220px;padding:0 0 19px}
.fi.op .fp{color:var(--accent);border-color:var(--accent-line);transform:rotate(45deg)}

/* ── CTA ── */
.cta-card{max-width:720px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:clamp(40px,6vw,64px) clamp(26px,4vw,52px);text-align:center;box-shadow:var(--sh-md)}
.cta-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:26px}
.cta-note{margin-top:16px;font-size:12px;color:var(--mut2)}

/* ── FOOTER ── */
.footer{border-top:1px solid var(--line);padding:clamp(44px,6vw,60px) clamp(20px,4vw,44px) 26px;background:var(--card2)}
.ft{max-width:1120px;margin:0 auto}
.ft-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:clamp(28px,4vw,52px);margin-bottom:40px}
.ft-tag{font-size:13px;color:var(--mut2);line-height:1.8;margin-top:13px;max-width:260px}
.ft-hd{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut2);margin-bottom:13px}
.ft-lks{list-style:none;display:flex;flex-direction:column;gap:9px}
.ft-lks a{font-size:13px;color:var(--mut);text-decoration:none;transition:color .15s}
.ft-lks a:hover{color:var(--ink)}
.ft-bot{padding-top:20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--mut2);flex-wrap:wrap;gap:8px}
@media(max-width:760px){.ft-top{grid-template-columns:1fr}}
      `}</style>

      <MarketingNav />

      {/* HERO */}
      <section className="hero">
        <div className="hero-in">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">The front desk for WhatsApp</div>
              <h1 className="h1">
                Your leads are messaging.<br />
                <em>Nobody is replying.</em>
              </h1>
              <p className="hero-sub">
                Most businesses reply in <strong>hours</strong> — or never. Fastrill replies in <strong>under 2 seconds</strong>, understands the customer, and books the appointment automatically.
              </p>
              <div className="hero-btns">
                <a href="/signup" className="btn-p">Start free trial <Ic name="arrow" size={15} /></a>
                <a href="#demo" className="btn-s">See it in action</a>
              </div>
              <div className="hero-trust" style={{ justifyContent: "flex-start" }}>
                <span><Ic name="shield" size={13} /> No credit card required</span>
                <span><Ic name="clock" size={13} /> Setup in 10 minutes</span>
                <span><Ic name="globe" size={13} /> 10+ Indian languages</span>
              </div>
            </div>
            <PhoneDemo />
          </div>
        </div>

        {/* PRODUCT PREVIEW */}
        <div className="preview-wrap">
          <div className="preview">
            <div className="pv-chrome">
              <div className="pv-dots"><i /><i /><i /></div>
              <div className="pv-url">app.fastrill.com/dashboard</div>
              <div style={{ width: 45 }} />
            </div>
            <div className="pv-body">
              <div className="pv-side">
                <div className="pv-side-logo"><img src="/logo.png" alt="" /><b>fastrill</b></div>
                {[["chart", "Overview", true], ["inbox", "Inbox", false], ["calendar", "Bookings", false], ["send", "Campaigns", false], ["users", "Customers", false], ["settings", "Settings", false]].map(([ic, l, on]) => (
                  <div key={l} className={`pv-nav-item${on ? " on" : ""}`}><Ic name={ic} size={14} />{l}</div>
                ))}
              </div>
              <div className="pv-main">
                <div className="pv-head">
                  <div className="pv-title">Riya Salon<small>Saturday, 29 March</small></div>
                  <div className="pv-live">Replying instantly</div>
                </div>
                <div className="pv-kpis">
                  {[["Conversations today", "128", "+18% vs last week"], ["Bookings this week", "47", "+9 today"], ["Avg. response time", "1.8s", "24/7 coverage"], ["Revenue this month", "₹1,84,500", "+31% vs Feb"]].map(([l, v, d]) => (
                    <div key={l} className="pv-kpi">
                      <div className="pv-kpi-l">{l}</div>
                      <div className="pv-kpi-v">{v}</div>
                      <div className="pv-kpi-d">{d}</div>
                    </div>
                  ))}
                </div>
                <div className="pv-cols">
                  <div className="pv-list">
                    <div className="pv-list-hd">Conversations</div>
                    {[
                      ["Anita Verma", "Yes, book me for 3 PM", true, true],
                      ["Arjun Mehta", "Do you have dermatology also?", true, false],
                      ["Sneha Reddy", "Thank you so much!", false, false],
                      ["Kiran Patel", "What time do you close?", true, false],
                    ].map(([n, m, ai, on]) => (
                      <div key={n} className={`pv-row${on ? " on" : ""}`}>
                        <div className="pv-av">{n.charAt(0)}</div>
                        <div className="pv-row-mid">
                          <div className="pv-row-n">{n}</div>
                          <div className="pv-row-m">{m}</div>
                        </div>
                        <div className={`pv-pill${ai ? "" : " off"}`}>{ai ? "Auto" : "You"}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pv-chat">
                    <div className="pv-chat-hd">
                      <div className="pv-av">A</div>
                      <div>
                        <div className="pv-chat-n">Anita Verma</div>
                        <div className="pv-chat-s">via WhatsApp · answered instantly</div>
                      </div>
                    </div>
                    <div className="pv-chat-b">
                      <div className="bub c">Hi, do you have a slot for keratin treatment tomorrow?</div>
                      <div className="bub a">Yes! Tomorrow we have 11:00 AM or 3:00 PM available for Keratin Treatment (₹2,800 · 90 min). Which works better?</div>
                      <div className="bub c">3 PM please</div>
                      <div className="bub a">Perfect — confirming Keratin Treatment for tomorrow at 3:00 PM. See you then, Anita!</div>
                      <div className="pv-confirm"><Ic name="check" size={12} /> Booking confirmed · ₹2,800</div>
                      <div className="bub-meta">Replied in 1.6 seconds — while the owner was with a client</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats">
          <div className="stats-in">
            {[["3,200+", "Bookings automated monthly"], ["99%", "Message delivery rate"], ["1.8s", "Average reply time"], ["10+", "Indian languages"]].map(([n, l]) => (
              <div key={l} className="stat"><b>{n}</b><span>{l}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="section">
        <div className="section-in">
          <div className="fade">
            <div className="label">A real scenario</div>
            <h2 className="h2" style={{ maxWidth: 540 }}>What happens when you don&apos;t reply instantly</h2>
          </div>
          <div className="timeline">
            {[
              { time: "9:02 PM", event: "Customer messages you", desc: "Ready to book. Service: keratin treatment. Budget: ₹2,800." },
              { time: "9:45 PM", event: "You finally reply", desc: "Too late — they already asked your competitor." },
              { time: "10:12 PM", event: "Customer booked elsewhere", desc: "Your competitor replied in 2 minutes." },
              { time: "—", event: "Your loss", desc: "₹2,800 + lifetime value + referrals ≈ ₹12,000+", danger: true },
            ].map(row => (
              <div key={row.event} className={`tl-row fade${row.danger ? " danger" : ""}`}>
                <div className="tl-time">{row.time}</div>
                <div>
                  <div className="tl-event">{row.event}</div>
                  <div className="tl-desc">{row.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="fade center" style={{ marginTop: 40 }}>
            <p style={{ fontSize: 14, marginBottom: 20 }}>This happens thousands of times every month across Indian businesses.</p>
            <a href="/signup" className="btn-p">Stop losing revenue <Ic name="arrow" size={15} /></a>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section alt" id="problem">
        <div className="section-in">
          <div className="fade" style={{ maxWidth: 540 }}>
            <div className="label">The real problem</div>
            <h2 className="h2">Your ads are working.<br />Your follow-up isn&apos;t.</h2>
            <p className="lead">Most businesses spend thousands getting leads to message them. The money walks out in the WhatsApp inbox.</p>
          </div>
          <div className="cards">
            {[
              { n: "01", t: "Leads die after hours", d: "A customer messages at 10 PM about your bridal package. You see it at 9 AM — she’s already booked someone who replied in 2 minutes.", tag: "Revenue lost every night" },
              { n: "02", t: "Speed wins the booking", d: "Your competitor replies in 2 seconds. You reply in 2 hours. Same service, same price — they win the appointment every time.", tag: "Competitive disadvantage" },
              { n: "03", t: "Silence becomes a bad review", d: "An upset customer messages at peak hour. Your staff is busy. The message sits unread. The 1-star review doesn’t.", tag: "Reputation at risk" },
            ].map(p => (
              <div key={p.n} className="card fade">
                <div className="card-num">{p.n}</div>
                <div className="card-title">{p.t}</div>
                <p className="card-desc">{p.d}</p>
                <div className="card-tag">{p.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section className="section" id="product">
        <div className="section-in">
          <div className="fade">
            <div className="label">What&apos;s inside</div>
            <h2 className="h2">Not a chatbot. A revenue system.</h2>
            <p className="lead">Three modules that work together to turn every WhatsApp conversation into money in your bank.</p>
          </div>

          <div className="module">
            <div className="module-text fade">
              <div className="module-tag"><Ic name="calendar" size={14} /> 01 · Booking engine</div>
              <h3 className="module-title">Books the appointment, start to finish.</h3>
              <p className="module-desc">Service, date, time, confirmation — collected naturally, checked against real availability, and confirmed without a human touching it.</p>
              <ul className="module-list">
                <li><Ic name="check" size={14} />Understands casual, mixed-language messages</li>
                <li><Ic name="check" size={14} />Checks real slot availability before confirming</li>
                <li><Ic name="check" size={14} />Sends instant notification to the owner</li>
                <li><Ic name="check" size={14} />Handles rescheduling and cancellation</li>
              </ul>
            </div>
            <div className="module-vis fade">
              <div className="mock">
                <div className="mock-hd">
                  <div className="mock-av">R</div>
                  <div><div className="mock-n">Riya Salon</div><div className="mock-s">Online</div></div>
                </div>
                <div className="mock-b">
                  <div className="bub c">Hi, I want a haircut tomorrow around 3pm</div>
                  <div className="bub a">{"Tomorrow’s great — 3 PM is available.\n\nShall I confirm Haircut for tomorrow at 3:00 PM?"}</div>
                  <div className="bub c">Yes please!</div>
                  <div className="bub a">{"Booking confirmed.\n\nHaircut · Tomorrow · 3:00 PM"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="module rev">
            <div className="module-text fade">
              <div className="module-tag"><Ic name="send" size={14} /> 02 · Campaigns</div>
              <h3 className="module-title">See exactly what each campaign earned.</h3>
              <p className="module-desc">Send approved WhatsApp templates to customer segments, and track delivery, replies and revenue attributed to that exact send.</p>
              <ul className="module-list">
                <li><Ic name="check" size={14} />Segment by tag — new, returning, VIP, inactive</li>
                <li><Ic name="check" size={14} />Real Meta delivery and read tracking</li>
                <li><Ic name="check" size={14} />Revenue and ROI per campaign, not just opens</li>
                <li><Ic name="check" size={14} />Schedule sends for optimal timing</li>
              </ul>
            </div>
            <div className="module-vis fade">
              <div className="mock">
                <div className="dash-b">
                  <div className="dash-t">Winter offer — January</div>
                  <div className="dash-stats">
                    <div><div className="dash-sl">Sent</div><div className="dash-sv">412</div></div>
                    <div><div className="dash-sl">Delivered</div><div className="dash-sv">404</div></div>
                    <div><div className="dash-sl">Replied</div><div className="dash-sv t">138</div></div>
                  </div>
                  <div className="dash-roi">
                    <div className="dash-roi-row"><span>Est. bookings</span><strong>82</strong></div>
                    <div className="dash-roi-row"><span>Est. revenue</span><strong>&#8377;98,400</strong></div>
                    <div className="dash-roi-row"><span>ROI</span><strong className="t">+612%</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="module">
            <div className="module-text fade">
              <div className="module-tag"><Ic name="inbox" size={14} /> 03 · Smart inbox</div>
              <h3 className="module-title">One inbox. Every conversation. Full control.</h3>
              <p className="module-desc">See every conversation live, take over manually whenever you want, and let Fastrill pick back up the moment you&apos;re done.</p>
              <ul className="module-list">
                <li><Ic name="check" size={14} />Take over any conversation in one tap</li>
                <li><Ic name="check" size={14} />Full customer history and tags in one view</li>
                <li><Ic name="check" size={14} />Works across 10+ Indian languages</li>
                <li><Ic name="check" size={14} />Real-time conversation updates</li>
              </ul>
            </div>
            <div className="module-vis fade">
              <div className="mock">
                {[
                  { n: "Priya Nair", m: "Yes please, book me for 3 PM", t: "now", on: true },
                  { n: "Arjun Mehta", m: "Do you have dermatology also", t: "2m", on: true },
                  { n: "Sneha Reddy", m: "Thank you so much!", t: "14m", on: false },
                  { n: "Kiran Patel", m: "What time do you close?", t: "23m", on: true },
                ].map(c => (
                  <div key={c.n} className="inbox-row">
                    <div className="mock-av">{c.n.charAt(0)}</div>
                    <div className="inbox-mid"><div className="inbox-n">{c.n}</div><div className="inbox-m">{c.m}</div></div>
                    <div className="inbox-right"><div className="inbox-t">{c.t}</div><div className={`pv-pill${c.on ? "" : " off"}`}>{c.on ? "Auto" : "You"}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="section alt" id="demo">
        <div className="section-in">
          <div className="fade">
            <div className="label">Live demo</div>
            <h2 className="h2">See it convert in real time</h2>
            <p className="lead">Pick a scenario and watch Fastrill handle the entire conversation — any language, any hour.</p>
          </div>
          <div className="demo-layout">
            <div className="demo-tabs fade">
              {DEMO_META.map(s => (
                <button key={s.k} className={`demo-tab${demoKey === s.k ? " on" : ""}`} onClick={() => setDemoKey(s.k)}>
                  <div className="demo-tab-ic"><Ic name={s.icon} size={16} /></div>
                  <div className="demo-tab-l">{s.label}</div>
                  <div className="demo-tab-s">{s.sub}</div>
                </button>
              ))}
            </div>
            <div className="wa fade">
              <div className="mock-hd">
                <div className="mock-av">R</div>
                <div><div className="mock-n">Riya Salon</div><div className="mock-s">Online</div></div>
              </div>
              <div className="wa-b" ref={demoRef}>
                {demoMsgs.map((m, i) => <div key={`${demoKey}-${i}`} className={`bub ${m.r}`}>{m.m}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section">
        <div className="section-in">
          <div className="fade center">
            <div className="label">The difference</div>
            <h2 className="h2">Before Fastrill. After.</h2>
          </div>
          <div className="cmp fade">
            {[
              { before: "Reply in 8 hours", after: "Reply in 2 seconds" },
              { before: "No reply after hours", after: "Books appointments at 2 AM" },
              { before: "Complaint ignored for hours", after: "Resolved instantly with empathy" },
              { before: "No idea what converted", after: "Every booking tracked to source" },
              { before: "Staff glued to phones", after: "Staff focused on customers" },
            ].map(pair => (
              <div key={pair.before} className="cmp-row">
                <div className="cmp-before">{pair.before}</div>
                <div className="cmp-arrow"><Ic name="arrow" size={15} /></div>
                <div className="cmp-after">{pair.after}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPETITOR COMPARISON */}
      <section className="section alt">
        <div className="section-in">
          <div className="fade center">
            <div className="label">How we compare</div>
            <h2 className="h2">Why businesses choose <em>Fastrill</em></h2>
            <p className="lead center">Most WhatsApp tools broadcast. Fastrill actually understands, replies, and books — in your customer&apos;s language.</p>
          </div>
          <div className="vs-wrap fade">
            <table className="vs-table">
              <thead>
                <tr>
                  <th style={{minWidth:190}}>Feature</th>
                  <th className="hl">Fastrill</th>
                  <th>WATI</th>
                  <th>Interakt</th>
                  <th>WappBiz</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["AI conversations (not scripted)", "✓", "✗", "✗", "✗"],
                  ["Auto-booking via WhatsApp", "✓", "✗", "✗", "✗"],
                  ["10+ Indian languages, auto-detected", "✓", "✗", "Partial", "✗"],
                  ["Bulk WhatsApp campaigns", "✓", "✓", "✓", "✓"],
                  ["Lead recovery sequences", "✓", "Partial", "✗", "✗"],
                  ["Revenue attribution per campaign", "✓", "✗", "Partial", "✗"],
                  ["Starts at ₹999/month", "✓", "✗", "✗", "✗"],
                  ["Built for Indian SMBs", "✓", "✗", "Partial", "Partial"],
                  ["Replies in under 2 seconds", "✓", "✗", "✗", "✗"],
                ].map(([feat, f, wati, int, wbiz]) => (
                  <tr key={feat}>
                    <td className="feat">{feat}</td>
                    <td className="hl"><span className={f === "✓" ? "vs-yes" : "vs-no"}>{f}</span></td>
                    <td><span className={wati === "✓" ? "vs-yes" : wati === "Partial" ? "vs-part" : "vs-no"}>{wati}</span></td>
                    <td><span className={int === "✓" ? "vs-yes" : int === "Partial" ? "vs-part" : "vs-no"}>{int}</span></td>
                    <td><span className={wbiz === "✓" ? "vs-yes" : wbiz === "Partial" ? "vs-part" : "vs-no"}>{wbiz}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fade center" style={{marginTop:18,fontSize:12,color:"var(--mut2)"}}>Pricing and features based on publicly available information. Last checked July 2026.</p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="section-in">
          <div className="fade">
            <div className="label">What customers say</div>
            <h2 className="h2">Real businesses. Real results.</h2>
          </div>
          <div className="tgrid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="tcard fade">
                <div className="tcard-metric">{t.result}</div>
                <div className="tcard-metric-l">{t.resultLabel}</div>
                <p className="tcard-q">&ldquo;{t.quote}&rdquo;</p>
                <div className="tcard-auth">
                  <div className="tcard-av">{t.initial}</div>
                  <div>
                    <div className="tcard-n">{t.name}</div>
                    <div className="tcard-b">{t.biz}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section alt">
        <div className="section-in">
          <div className="fade center">
            <div className="label">Setup</div>
            <h2 className="h2">Live in 10 minutes, not 10 days</h2>
            <p className="lead center">No developers needed. No API docs. Just connect your WhatsApp and you&apos;re ready.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 52 }}>
            {[
              { step: "01", title: "Connect your WhatsApp", desc: "Link your WhatsApp Business number via the official Meta API — the same number your customers already know. Takes 3 minutes.", icon: "msg" },
              { step: "02", title: "Tell Fastrill about your business", desc: "Add your services, prices, working hours, and team. Fastrill learns your business and starts handling conversations exactly as you would.", icon: "settings" },
              { step: "03", title: "Watch it handle conversations", desc: "From the first message to the confirmed booking — Fastrill replies, qualifies, books, and follows up. You get notified when a booking lands.", icon: "check" },
            ].map(s => (
              <div key={s.step} className="card fade" style={{ position: "relative", paddingTop: 36 }}>
                <div style={{ position: "absolute", top: 22, left: 26, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--accent)", opacity: .6 }}>{s.step}</div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Ic name={s.icon} size={18} />
                </div>
                <div className="card-title">{s.title}</div>
                <p className="card-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="section">
        <div className="section-in">
          <div className="fade center">
            <div className="label">Industries</div>
            <h2 className="h2">Built for every service business in India</h2>
            <p className="lead center">Whether you run a salon or a hospital, Fastrill speaks the language of your business — and your customers.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 44 }}>
            {[
              { emoji: "💇", title: "Salons & Spas", desc: "Book appointments, send reminders, win back silent customers. Your front desk — 24/7.", href: "/industries/salons" },
              { emoji: "🏥", title: "Clinics & Healthcare", desc: "Patient scheduling in Hindi, Telugu, Tamil and more. Reduce no-shows automatically.", href: "/industries/clinics" },
              { emoji: "📚", title: "Coaching & Education", desc: "Enroll students, send class reminders, and follow up with leads in their language.", href: "/industries/coaching" },
              { emoji: "🏠", title: "Real Estate", desc: "Qualify leads 24/7, schedule site visits, and nurture long sales cycles automatically.", href: "/industries/real-estate" },
              { emoji: "🏋️", title: "Gyms & Fitness", desc: "Fill time slots, renew memberships, and send class reminders without staff effort.", href: "/industries/gyms" },
              { emoji: "🍽️", title: "Restaurants & Cafés", desc: "Take reservations, handle delivery queries, and run re-engagement campaigns that fill tables.", href: "/signup" },
            ].map(ind => (
              <a key={ind.title} href={ind.href} className="card fade" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
                <div style={{ fontSize: 28 }}>{ind.emoji}</div>
                <div className="card-title" style={{ marginBottom: 0 }}>{ind.title}</div>
                <p className="card-desc" style={{ flex: 1 }}>{ind.desc}</p>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>Learn more <Ic name="arrow" size={11} /></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section alt" id="pricing">
        <div className="section-in">
          <div className="fade center">
            <div className="label">Pricing</div>
            <h2 className="h2">Simple pricing. Pays for itself.</h2>
            <p className="lead center">One missed booking costs more than a month of Fastrill.</p>
          </div>
          <div className="fade center">
            <div className="billing">
              <button className={`bt${billing === "monthly" ? " on" : ""}`} onClick={() => setBilling("monthly")}>Monthly</button>
              <button className={`bt${billing === "annual" ? " on" : ""}`} onClick={() => setBilling("annual")}>Annual <span className="bt-save">Save 17%</span></button>
            </div>
          </div>
          <div className="pgrid">
            {plans.map(plan => {
              const price = billing === "annual" ? Math.round(plan.monthly * 0.83) : plan.monthly
              return (
                <div key={plan.tier} className={`plan fade${plan.pop ? " pop" : ""}`}>
                  {plan.pop && <div className="plan-badge">Most popular</div>}
                  <div className="plan-tier">{plan.tier}</div>
                  <div className="plan-tag">{plan.tag}</div>
                  <div className="plan-price"><span className="plan-rs">&#8377;</span><span className="plan-amt">{price.toLocaleString("en-IN")}</span></div>
                  <div className="plan-mo">per month + GST{billing === "annual" && <span> &middot; billed &#8377;{(price * 12).toLocaleString("en-IN")}/yr</span>}</div>
                  <hr className="plan-hr" />
                  <ul className="plan-list">
                    {plan.feats.map(([c, t]) => (
                      <li key={t} className={c === "exc" ? "exc" : undefined}>
                        {c === "inc" ? <Ic name="check" size={13} /> : <Ic name="x" size={13} />}{t}
                      </li>
                    ))}
                  </ul>
                  <a href="/signup" className={`plan-btn ${plan.cs}`}>{plan.cta}</a>
                </div>
              )
            })}
          </div>
          <p className="fade center" style={{ marginTop: 26, fontSize: 12.5, color: "var(--mut2)" }}>14-day free trial &middot; No credit card &middot; Cancel anytime</p>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <section className="section">
        <div className="cta-card fade">
          <h2 className="h2">Turn every WhatsApp message into revenue</h2>
          <p className="lead center">Start automating replies, recovering leads, and booking customers today.</p>
          <div className="cta-btns">
            <a href="/signup" className="btn-p">Start free — no card needed <Ic name="arrow" size={15} /></a>
            <a href="https://wa.me/916309279265" className="btn-s"><Ic name="msg" size={14} /> Message us on WhatsApp</a>
          </div>
          <p className="cta-note">14-day free trial &middot; Setup in 10 minutes &middot; Cancel anytime</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}

const PHONE_SCRIPT = [
  { t: "c", m: "Namaste! Kal facial ho payega?", time: "9:41 PM" },
  { t: "typing", dur: 1100 },
  { t: "a", m: "Namaste Anita ji! Haan bilkul 🙏\nKal 11:00 AM ya 4:00 PM free hai.\nKaunsa time theek rahega?", time: "9:41 PM" },
  { t: "c", m: "4 baje perfect 👍", time: "9:42 PM" },
  { t: "typing", dur: 1100 },
  { t: "card", time: "9:42 PM" },
]

function PhoneDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(PHONE_SCRIPT.length)
      return
    }
    const item = PHONE_SCRIPT[step]
    const delay = step >= PHONE_SCRIPT.length ? 3600 : (item.t === "typing" ? item.dur : 1250)
    const t = setTimeout(() => {
      setStep(s => (s >= PHONE_SCRIPT.length ? 0 : s + 1))
    }, delay)
    return () => clearTimeout(t)
  }, [step])

  const visible = PHONE_SCRIPT.slice(0, step + 1).filter((it, i) => it.t !== "typing" || i === step)

  return (
    <div className="ph-stage" aria-hidden="true">
      <div className="ph-frame">
        <div className="ph-screen">
          <div className="ph-status"><span>9:42</span><span>▂▄▆ ⌁ ▉</span></div>
          <div className="ph-head">
            <span className="ph-back">‹</span>
            <div className="ph-avatar">L</div>
            <div>
              <div className="ph-name">Lakshmi Beauty Parlour</div>
              <div className="ph-onl">online</div>
            </div>
          </div>
          <div className="ph-chat">
            {visible.map((it, i) => {
              if (it.t === "typing") return <div key={`ty-${i}`} className="ph-typing"><i /><i /><i /></div>
              if (it.t === "card") return (
                <div key="card" className="ph-card">
                  <div className="ph-card-top">
                    <div className="ph-card-check"><Ic name="check" size={11} /></div>
                    <div className="ph-card-title">Appointment Confirmed</div>
                  </div>
                  <div className="ph-card-body">
                    <div className="ph-card-row"><span>Service</span><b>Gold Facial</b></div>
                    <div className="ph-card-row"><span>Date</span><b>Kal · Sat, 29 March</b></div>
                    <div className="ph-card-row"><span>Time</span><b>4:00 PM</b></div>
                    <div className="ph-card-row"><span>Amount</span><b>₹1,200</b></div>
                  </div>
                  <div className="ph-card-foot"><span>Milte hai kal! 💐</span><span>{it.time} <span className="tick">✓✓</span></span></div>
                </div>
              )
              return (
                <div key={`${it.t}-${i}`} className={`ph-bub ${it.t}`}>
                  {it.m}
                  <span className="ph-time">{it.time}{it.t === "c" && <> <span className="tick">✓✓</span></>}</span>
                </div>
              )
            })}
          </div>
          <div className="ph-inputbar">
            <div className="ph-input">Message</div>
            <div className="ph-send"><Ic name="send" size={13} /></div>
          </div>
        </div>
      </div>
      <div className="ph-caption">Replied &amp; booked in seconds — while the owner was busy</div>
    </div>
  )
}

function FAQSection() {
  const [open, setOpen] = useState(null)
  const faqs = [
    { q: "Do I need to change my WhatsApp number?", a: "No. You keep your existing WhatsApp Business number. Fastrill connects via Meta’s official Business API — customers message the same number they always have." },
    { q: "How long does setup take?", a: "About 10 minutes from account creation to your first automatic reply. Connect WhatsApp, add your services and hours, go live." },
    { q: "Which Indian languages does Fastrill support?", a: "Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and English — auto-detected per conversation. No configuration needed." },
    { q: "Can I take over and reply manually?", a: "Yes, always. Pause auto-replies for any conversation and reply yourself — Fastrill waits, and picks back up when you’re done. You’re always in control." },
    { q: "Is there a free trial?", a: "Yes — 14 days, full Growth plan access, no credit card required. If it doesn’t pay for itself, you don’t pay." },
    { q: "How is Fastrill different from a chatbot?", a: "Chatbots follow scripts. Fastrill understands context — it reads the customer’s intent, checks your real availability, books the slot, and follows up if they go quiet. It’s a revenue system, not a decision tree." },
  ]
  return (
    <section className="section alt">
      <div className="section-in">
        <div className="fade center">
          <div className="label">FAQ</div>
          <h2 className="h2">Honest answers</h2>
        </div>
        <div className="faq-list fade">
          {faqs.map((f, i) => (
            <div key={i} className={`fi${open === i ? " op" : ""}`}>
              <button className="fb" onClick={() => setOpen(open === i ? null : i)}>{f.q}<span className="fp">+</span></button>
              <div className="fa">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
