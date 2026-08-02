"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"

const NAV_ITEMS = [
  {
    label: "Features", dropdown: [
      { label: "AI Conversations", desc: "Replies in under 2 seconds", href: "/features#ai" },
      { label: "Booking Automation", desc: "Books appointments end-to-end", href: "/features#booking" },
      { label: "WhatsApp Campaigns", desc: "Broadcast & track revenue", href: "/features#campaigns" },
      { label: "Smart Inbox", desc: "One inbox, full control", href: "/features#inbox" },
      { label: "Lead Recovery", desc: "Win back silent leads", href: "/features#lead-recovery" },
      { label: "Appointment Reminders", desc: "Reduce no-shows automatically", href: "/features#reminders" },
    ]
  },
  {
    label: "Industries", dropdown: [
      { label: "Salons & Spas", desc: "Bookings, reminders, win-backs", href: "/industries/salons" },
      { label: "Clinics & Healthcare", desc: "Patient scheduling in any language", href: "/industries/clinics" },
      { label: "Coaching & Education", desc: "Enroll students automatically", href: "/industries/coaching" },
      { label: "Real Estate", desc: "Qualify leads 24/7", href: "/industries/real-estate" },
      { label: "Gyms & Fitness", desc: "Fill every time slot", href: "/industries/gyms" },
    ]
  },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
]

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(null)
  const [mobOpen, setMobOpen] = useState(false)
  const [mobExpanded, setMobExpanded] = useState(null)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <>
      <style>{`
        .mn{position:fixed;top:0;left:0;right:0;z-index:500;height:64px;display:flex;align-items:center;padding:0 clamp(16px,4vw,44px);background:transparent;transition:background .2s,border-color .2s,box-shadow .2s;border-bottom:1px solid transparent}
        .mn.sc{background:rgba(11,13,19,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom-color:rgba(255,255,255,.07);box-shadow:0 4px 24px rgba(0,0,0,.3)}
        .mn-logo{display:flex;align-items:center;gap:9px;text-decoration:none;flex-shrink:0}
        .mn-logo img{width:28px;height:28px;object-fit:contain}
        .mn-logo span{font-weight:800;font-size:18px;color:#fff;letter-spacing:-.03em;font-family:'Plus Jakarta Sans',sans-serif}
        .mn-logo span em{font-style:normal;color:#00D4AA}

        .mn-center{display:flex;align-items:center;gap:2px;margin:0 auto}
        .mn-item{position:relative}
        .mn-btn{display:flex;align-items:center;gap:5px;padding:8px 13px;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.75);background:none;border:none;cursor:pointer;border-radius:8px;font-family:inherit;transition:color .15s,background .15s;text-decoration:none;white-space:nowrap}
        .mn-btn:hover,.mn-btn.active{color:#fff;background:rgba(255,255,255,.07)}
        .mn-chevron{width:14px;height:14px;transition:transform .2s;opacity:.6}
        .mn-item.op .mn-chevron{transform:rotate(180deg)}
        .mn-drop{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);background:#13161F;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px;min-width:260px;box-shadow:0 16px 48px rgba(0,0,0,.5);animation:dropIn .15s ease}
        @keyframes dropIn{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .mn-drop-item{display:flex;flex-direction:column;gap:2px;padding:10px 13px;border-radius:9px;text-decoration:none;transition:background .12s}
        .mn-drop-item:hover{background:rgba(255,255,255,.07)}
        .mn-drop-label{font-size:13.5px;font-weight:600;color:#fff}
        .mn-drop-desc{font-size:11.5px;color:rgba(255,255,255,.45)}
        .mn-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .mn-signin{font-size:13.5px;font-weight:500;color:rgba(255,255,255,.65);text-decoration:none;padding:8px 13px;border-radius:8px;transition:color .15s}
        .mn-signin:hover{color:#fff}
        .mn-cta{display:inline-flex;align-items:center;gap:6px;background:#5A5FE8;color:#fff;padding:9px 18px;border-radius:9px;font-weight:700;font-size:13.5px;text-decoration:none;transition:background .15s;font-family:'Plus Jakarta Sans',sans-serif}
        .mn-cta:hover{background:#4449D0}
        .mn-hbg{display:none;background:none;border:1px solid rgba(255,255,255,.15);border-radius:8px;width:36px;height:36px;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.7);font-size:16px}
        .mn-mob{position:fixed;top:64px;left:0;right:0;z-index:490;background:#0D0F17;border-bottom:1px solid rgba(255,255,255,.08);padding:12px 16px 20px;transform:translateY(-110%);transition:transform .22s ease;box-shadow:0 8px 32px rgba(0,0,0,.4)}
        .mn-mob.open{transform:none}
        .mn-mob-item{border-bottom:1px solid rgba(255,255,255,.06)}
        .mn-mob-btn{width:100%;background:none;border:none;display:flex;justify-content:space-between;align-items:center;padding:14px 4px;font-size:14px;font-weight:600;color:rgba(255,255,255,.8);cursor:pointer;font-family:inherit}
        .mn-mob-link{display:block;padding:14px 4px;font-size:14px;font-weight:600;color:rgba(255,255,255,.8);text-decoration:none}
        .mn-mob-sub{display:none;flex-direction:column;gap:2px;padding:0 0 12px 12px}
        .mn-mob-sub.open{display:flex}
        .mn-mob-sublink{display:block;padding:9px 10px;font-size:13px;color:rgba(255,255,255,.55);text-decoration:none;border-radius:7px}
        .mn-mob-sublink:hover{color:#fff;background:rgba(255,255,255,.06)}
        .mn-mob-cta{margin-top:14px;display:block;text-align:center;background:#5A5FE8;color:#fff;padding:13px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none}
        @media(max-width:860px){.mn-center{display:none}.mn-signin{display:none}.mn-hbg{display:inline-flex}}
      `}</style>

      <nav className={`mn${scrolled ? " sc" : ""}`} ref={navRef}>
        <Link href="/" className="mn-logo">
          <img src="/logo.png" alt="Fastrill" />
          <span>fast<em>rill</em></span>
        </Link>

        <div className="mn-center">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`mn-item${open === item.label ? " op" : ""}`}
              onMouseEnter={() => item.dropdown && setOpen(item.label)}
              onMouseLeave={() => setOpen(null)}
            >
              {item.href ? (
                <Link href={item.href} className="mn-btn">{item.label}</Link>
              ) : (
                <button className={`mn-btn${open === item.label ? " active" : ""}`} onClick={() => setOpen(open === item.label ? null : item.label)}>
                  {item.label}
                  <svg className="mn-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                </button>
              )}
              {item.dropdown && open === item.label && (
                <div className="mn-drop">
                  {item.dropdown.map(d => (
                    <Link key={d.href} href={d.href} className="mn-drop-item" onClick={() => setOpen(null)}>
                      <span className="mn-drop-label">{d.label}</span>
                      <span className="mn-drop-desc">{d.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mn-right">
          <Link href="/login" className="mn-signin">Sign in</Link>
          <Link href="/signup" className="mn-cta">Start free →</Link>
          <button className="mn-hbg" onClick={() => setMobOpen(p => !p)} aria-label="Menu">&#9776;</button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`mn-mob${mobOpen ? " open" : ""}`}>
        {NAV_ITEMS.map(item => (
          <div key={item.label} className="mn-mob-item">
            {item.href ? (
              <Link href={item.href} className="mn-mob-link" onClick={() => setMobOpen(false)}>{item.label}</Link>
            ) : (
              <>
                <button className="mn-mob-btn" onClick={() => setMobExpanded(mobExpanded === item.label ? null : item.label)}>
                  {item.label}
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{transform: mobExpanded === item.label ? "rotate(180deg)" : "none", transition: "transform .2s"}}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div className={`mn-mob-sub${mobExpanded === item.label ? " open" : ""}`}>
                  {item.dropdown.map(d => (
                    <Link key={d.href} href={d.href} className="mn-mob-sublink" onClick={() => { setMobOpen(false); setMobExpanded(null) }}>{d.label}</Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <Link href="/login" className="mn-mob-link" onClick={() => setMobOpen(false)}>Sign in</Link>
        <Link href="/signup" className="mn-mob-cta" onClick={() => setMobOpen(false)}>Start free trial →</Link>
      </div>
    </>
  )
}
