"use client"
import Link from "next/link"

export default function MarketingFooter() {
  return (
    <footer style={{borderTop:"1px solid rgba(255,255,255,.07)",padding:"clamp(44px,6vw,64px) clamp(16px,4vw,44px) 28px",background:"#0D0F17",fontFamily:"'Inter',sans-serif"}}>
      <div style={{maxWidth:1120,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:"clamp(24px,4vw,52px)",marginBottom:44}}>
          <div>
            <Link href="/" style={{display:"flex",alignItems:"center",gap:9,textDecoration:"none",marginBottom:14}}>
              <img src="/logo.png" alt="Fastrill" style={{width:26,height:26,objectFit:"contain"}} />
              <span style={{fontWeight:800,fontSize:17,color:"#fff",letterSpacing:"-.03em",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>fast<span style={{color:"#00D4AA"}}>rill</span></span>
            </Link>
            <p style={{fontSize:13,color:"rgba(255,255,255,.4)",lineHeight:1.8,maxWidth:240}}>The AI operating system for WhatsApp customer communication. Built for Indian service businesses.</p>
            <p style={{fontSize:12,color:"rgba(255,255,255,.25)",marginTop:12}}>By Solvabil Pvt. Ltd.</p>
          </div>
          {[
            { h: "Features", links: [["AI Conversations", "/features#ai"], ["Booking Automation", "/features#booking"], ["Campaigns", "/features#campaigns"], ["Smart Inbox", "/features#inbox"], ["Lead Recovery", "/features#lead-recovery"]] },
            { h: "Industries", links: [["Salons & Spas", "/industries/salons"], ["Clinics", "/industries/clinics"], ["Coaching", "/industries/coaching"], ["Real Estate", "/industries/real-estate"], ["Gyms", "/industries/gyms"]] },
            { h: "Company", links: [["About us", "/about"], ["Pricing", "/pricing"], ["Contact", "mailto:team@fastrill.com"], ["WhatsApp us", "https://wa.me/916309279265"]] },
            { h: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Sign in", "/login"], ["Start free", "/signup"]] },
          ].map(col => (
            <div key={col.h}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"rgba(255,255,255,.3)",marginBottom:14}}>{col.h}</div>
              <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:9}}>
                {col.links.map(([name, href]) => (
                  <li key={name}><Link href={href} style={{fontSize:13,color:"rgba(255,255,255,.5)",textDecoration:"none",transition:"color .15s"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.5)"}>{name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,fontSize:12,color:"rgba(255,255,255,.25)"}}>
          <span>© 2026 Fastrill · Solvabil Pvt. Ltd. · All rights reserved</span>
          <span>Made with conviction in India 🇮🇳</span>
        </div>
      </div>
    </footer>
  )
}
