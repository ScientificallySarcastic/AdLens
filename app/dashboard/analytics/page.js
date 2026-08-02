"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { usePlanGuard } from "@/lib/hooks/usePlanGuard"

const NAV = [
  { id:"overview",  label:"Revenue Engine", icon:"⬡", path:"/dashboard" },
  { id:"inbox",     label:"Conversations",  icon:"◎", path:"/dashboard/conversations" },
  { id:"bookings",  label:"Bookings",       icon:"◷", path:"/dashboard/bookings" },
  { id:"campaigns", label:"Campaigns",      icon:"◆", path:"/dashboard/campaigns" },
  { id:"sequences", label:"Sequences",      icon:"⟳", path:"/dashboard/sequences" },
  { id:"leads",     label:"Lead Recovery",  icon:"◉", path:"/dashboard/leads" },
  { id:"contacts",  label:"Customers",      icon:"◑", path:"/dashboard/contacts" },
  { id:"analytics", label:"Analytics",      icon:"▦", path:"/dashboard/analytics" },
  { id:"settings",  label:"Settings",       icon:"◌", path:"/dashboard/settings" },
]

export default function Analytics() {
  usePlanGuard()
  const router = useRouter()
  const toast  = useToast()
  const [userId,    setUserId]    = useState(null)
  const [userEmail, setUserEmail] = useState("")
  const [dark,      setDark]      = useState(true)
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login" }
  const toggleTheme  = () => { const n=!dark; setDark(n); try{localStorage.setItem("fastrill-theme",n?"dark":"light")}catch(e){} }
  const inp = { background:dark?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:8, padding:"9px 12px", color:dark?"#eeeef5":"#1e293b", fontSize:13, outline:"none", width:"100%", fontFamily:"'Plus Jakarta Sans',sans-serif" }
  const colors = { navActiveBdr:dark?"rgba(0,201,177,0.2)":"rgba(0,137,122,0.15)", navActiveText:dark?"#00C9B1":"#00897A" }
  useEffect(() => {
    try{const s=localStorage.getItem("fastrill-theme");if(s)setDark(s==="dark")}catch(e){}
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUserId(session.user.id);setUserEmail(session.user.email||"")}
    })
  }, [])
  const [mobSidebarOpen, setMobSidebarOpen] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState("30") // days
  const [data, setData]           = useState({
    revenue:0, bookings:0, customers:0, leads:0, aiReplies:0, conversionRate:0,
    avgBookingValue:0, returningRate:0, topServices:[], dailyRevenue:[], dailyBookings:[],
    bookingsByStatus:{}, leadsBySource:{}, aiVsManual:{ ai:0, manual:0 }
  })


  useEffect(() => { if (userId) loadAnalytics() }, [userId, period])

  async function loadAnalytics() {
    setLoading(true)
    const from = new Date()
    from.setDate(from.getDate() - parseInt(period))
    const fromISO = from.toISOString()
    const fromDate = from.toISOString().split("T")[0]

    const [
      { data: bks },
      { data: leads },
      { data: msgs },
      { data: customers },
    ] = await Promise.all([
      supabase.from("bookings").select("*").eq("user_id", userId),
      supabase.from("leads").select("*").eq("user_id", userId).gte("created_at", fromISO),
      supabase.from("messages").select("direction,is_ai,created_at").eq("user_id", userId).gte("created_at", fromISO),
      supabase.from("customers").select("id,created_at,tag").eq("user_id", userId),
    ])

    const periodBks = (bks||[]).filter(b => b.booking_date >= fromDate)
    const confirmedBks = periodBks.filter(b=>b.status==="confirmed"||b.status==="completed")
    const revenue = confirmedBks.reduce((s,b)=>s+(b.amount||0),0)
    const aiReplies = (msgs||[]).filter(m=>m.is_ai&&m.direction==="outbound").length
    const newCustomers = (customers||[]).filter(c=>c.created_at>=fromISO).length
    const returningCustomers = (customers||[]).filter(c=>c.tag==="returning"||c.tag==="vip").length

    // Top services
    const svcMap = {}
    for (const b of periodBks) {
      if (!b.service) continue
      if (!svcMap[b.service]) svcMap[b.service] = { count:0, revenue:0 }
      svcMap[b.service].count++
      if (b.status==="confirmed"||b.status==="completed") svcMap[b.service].revenue += (b.amount||0)
    }
    const topServices = Object.entries(svcMap)
      .map(([name,d])=>({name,...d}))
      .sort((a,b)=>b.revenue-a.revenue)
      .slice(0,6)

    // Daily revenue + bookings (last N days)
    const days = parseInt(period) <= 7 ? parseInt(period) : parseInt(period) <= 30 ? 30 : 30
    const dailyRevenue = []
    const dailyBookings = []
    for (let i=days-1; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
      const dayBks = (bks||[]).filter(b=>b.booking_date===ds)
      const dayRev = dayBks.filter(b=>b.status==="confirmed"||b.status==="completed").reduce((s,b)=>s+(b.amount||0),0)
      dailyRevenue.push({ date: ds, label: `${d.getDate()}/${d.getMonth()+1}`, value: dayRev })
      dailyBookings.push({ date: ds, label: `${d.getDate()}/${d.getMonth()+1}`, value: dayBks.length })
    }

    // Bookings by status
    const statusMap = {}
    for (const b of periodBks) statusMap[b.status||"unknown"] = (statusMap[b.status||"unknown"]||0)+1

    // Leads by source
    const srcMap = {}
    for (const l of (leads||[])) srcMap[l.source||"organic"] = (srcMap[l.source||"organic"]||0)+1

    setData({
      revenue, bookings: periodBks.length,
      customers: newCustomers,
      leads: (leads||[]).length,
      aiReplies,
      conversionRate: (leads||[]).length>0 ? Math.round((periodBks.length/(leads||[]).length)*100) : 0,
      avgBookingValue: confirmedBks.length>0 ? Math.round(revenue/confirmedBks.length) : 0,
      returningRate: (customers||[]).length>0 ? Math.round((returningCustomers/(customers||[]).length)*100) : 0,
      topServices,
      dailyRevenue: dailyRevenue.slice(-14), // show last 14 days max
      dailyBookings: dailyBookings.slice(-14),
      bookingsByStatus: statusMap,
      leadsBySource: srcMap,
      aiVsManual: {
        ai:     periodBks.filter(b=>b.ai_booked).length,
        manual: periodBks.filter(b=>!b.ai_booked).length
      }
    })
    setLoading(false)
  }


  const bg=dark?"#08080e":"#f0f2f5", sidebar=dark?"#0c0c15":"#ffffff", card=dark?"#0f0f1a":"#ffffff"
  const border=dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)", cardBorder=dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const text=dark?"#eeeef5":"#111827", textMuted=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const textFaint=dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)", inputBg=dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const accent=dark?"#00C9B1":"#00897A"
  const navText=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const navActive=dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"
  const navActiveBorder = colors.navActiveBdr
  const navActiveText = colors.navActiveText
  const userInitial = userEmail?userEmail[0].toUpperCase():"G"

  // Smooth SVG area chart with gradient fill
  const AreaChart = ({ dataPoints, color, gradientId, label, prefix="" }) => {
    const max = Math.max(...dataPoints.map(d=>d.value), 1)
    const W = 400, H = 100, padTop = 10, padBot = 20
    const chartH = H - padTop - padBot
    const step = dataPoints.length > 1 ? W / (dataPoints.length - 1) : W

    const points = dataPoints.map((d, i) => ({
      x: i * step,
      y: padTop + chartH - (d.value / max) * chartH
    }))

    // Smooth cubic bezier path
    let linePath = ""
    let areaPath = ""
    if (points.length > 0) {
      linePath = `M ${points[0].x},${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const cpx = (prev.x + curr.x) / 2
        linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
      }
      areaPath = linePath + ` L ${points[points.length-1].x},${H - padBot} L ${points[0].x},${H - padBot} Z`
    }

    // Pick ~5 evenly spaced labels
    const labelCount = Math.min(5, dataPoints.length)
    const labelIndices = []
    if (dataPoints.length <= 5) {
      dataPoints.forEach((_, i) => labelIndices.push(i))
    } else {
      for (let i = 0; i < labelCount; i++) {
        labelIndices.push(Math.round(i * (dataPoints.length - 1) / (labelCount - 1)))
      }
    }

    // Peak value indicator
    const peakIdx = dataPoints.reduce((best, d, i) => d.value > dataPoints[best].value ? i : best, 0)
    const peakVal = dataPoints[peakIdx]?.value || 0

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:textFaint,fontWeight:600}}>{label}</div>
          {peakVal > 0 && <div style={{fontSize:10,color,fontWeight:700,background:dark?`${color}15`:`${color}18`,padding:"2px 8px",borderRadius:20}}>Peak: {prefix}{peakVal.toLocaleString()}</div>}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:120}} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={0} y1={padTop + chartH * (1 - f)} x2={W} y2={padTop + chartH * (1 - f)}
              stroke={dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"} strokeDasharray="4,4"/>
          ))}
          {/* Gradient fill area */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`}/>}
          {/* Smooth line */}
          {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
          {/* Data point dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={dataPoints[i].value > 0 ? 3 : 0}
              fill={card} stroke={color} strokeWidth="2"/>
          ))}
          {/* Peak dot highlight */}
          {peakVal > 0 && <circle cx={points[peakIdx].x} cy={points[peakIdx].y} r={5}
            fill={color} opacity="0.3"/>}
        </svg>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
          {labelIndices.map(i => (
            <span key={i} style={{fontSize:9.5,color:textFaint}}>{dataPoints[i]?.label}</span>
          ))}
        </div>
      </div>
    )
  }

  // Donut-style metric with glow effect
  const RingMetric = ({ value, max, color, label, sub }) => {
    const pct = Math.min(100, max>0 ? Math.round((value/max)*100) : 0)
    const r = 30, circ = 2*Math.PI*r
    const dash = (pct/100)*circ
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <svg width={76} height={76} style={{transform:"rotate(-90deg)",filter:`drop-shadow(0 0 6px ${color}40)`}}>
          <circle cx={38} cy={38} r={r} fill="none" stroke={dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} strokeWidth={5}/>
          <circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 0.6s ease-out"}}/>
        </svg>
        <div style={{marginTop:-56,fontSize:16,fontWeight:800,color:text,textAlign:"center",lineHeight:1}}>{pct}%</div>
        <div style={{marginTop:22,fontSize:11.5,fontWeight:700,color:text,textAlign:"center"}}>{label}</div>
        {sub && <div style={{fontSize:10.5,color:textFaint,textAlign:"center"}}>{sub}</div>}
      </div>
    )
  }

  // AI vs Manual donut
  const AiDonut = ({ ai, manual }) => {
    const total = ai + manual
    if (total === 0) return <div style={{color:textFaint,fontSize:12,textAlign:"center",padding:"20px 0"}}>No data yet</div>
    const aiPct = Math.round((ai / total) * 100)
    const manualPct = 100 - aiPct
    const r = 36, circ = 2 * Math.PI * r
    const aiDash = (aiPct / 100) * circ
    const manualDash = (manualPct / 100) * circ
    return (
      <div style={{display:"flex",alignItems:"center",gap:20,justifyContent:"center"}}>
        <svg width={90} height={90} style={{transform:"rotate(-90deg)",filter:`drop-shadow(0 0 8px ${accent}30)`}}>
          <circle cx={45} cy={45} r={r} fill="none" stroke={dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} strokeWidth={7}/>
          <circle cx={45} cy={45} r={r} fill="none" stroke={accent} strokeWidth={7}
            strokeDasharray={`${aiDash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 0.6s"}}/>
          <circle cx={45} cy={45} r={r} fill="none" stroke="#a78bfa" strokeWidth={7}
            strokeDasharray={`${manualDash} ${circ}`} strokeDashoffset={-aiDash}
            strokeLinecap="round" style={{transition:"all 0.6s"}}/>
        </svg>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:10,height:10,borderRadius:3,background:accent}}/>
            <span style={{fontSize:12,color:textMuted}}>AI</span>
            <span style={{fontSize:13,fontWeight:800,color:accent,marginLeft:"auto"}}>{ai}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:3,background:"#a78bfa"}}/>
            <span style={{fontSize:12,color:textMuted}}>Manual</span>
            <span style={{fontSize:13,fontWeight:800,color:"#a78bfa",marginLeft:"auto"}}>{manual}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${text}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;}
        .sidebar{width:224px;flex-shrink:0;background:${sidebar};border-right:1px solid ${border};display:flex;flex-direction:column;overflow-y:auto;}
        .logo{padding:16px 18px;font-weight:800;font-size:20px;color:${text};text-decoration:none;display:flex;flex-direction:row;align-items:center;gap:10px;border-bottom:1px solid ${border};line-height:1;}
        .logo span{color:${accent};}
        .nav-section{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${textFaint};font-weight:600;}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${navText};font-weight:500;transition:all 0.13s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .nav-item:hover{background:${inputBg};color:${text};}
        .nav-item.active{background:${navActive};color:${navActiveText};font-weight:600;border-color:${navActiveBorder};}
        .nav-icon{font-size:13px;width:18px;text-align:center;flex-shrink:0;}
        .sidebar-footer{margin-top:auto;padding:14px;border-top:1px solid ${border};}
        .user-card{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${inputBg};border:1px solid ${cardBorder};}
        .user-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${accent},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
        .user-email{font-size:11.5px;color:${textMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .logout-btn{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cardBorder};font-size:12px;color:${textMuted};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .logout-btn:hover{border-color:#fca5a5;color:#ef4444;}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${border};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sidebar};}
        .tb-title{font-weight:700;font-size:15px;color:${text};}
        .topbar-r{display:flex;align-items:center;gap:8px;}
        .theme-toggle{display:flex;align-items:center;gap:6px;padding:5px 10px;background:${inputBg};border:1px solid ${cardBorder};border-radius:8px;cursor:pointer;font-size:11.5px;color:${textMuted};font-family:'Plus Jakarta Sans',sans-serif;}
        .toggle-pill{width:30px;height:16px;border-radius:100px;background:${dark?accent:"#d1d5db"};position:relative;flex-shrink:0;}
        .toggle-pill::after{content:'';position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;left:${dark?"16px":"2px"};}
        .content{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;background:${bg};}
        .stat-card{background:${card};border:1px solid ${cardBorder};border-radius:11px;padding:15px 17px;position:relative;overflow:hidden;}

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-in { animation: fadeUp 0.4s ease-out both; }

        /* ══ MOBILE RESPONSIVE ══════════════════════════════════ */
        @media(max-width:767px){
          .wrap{position:relative;}
          .sidebar{
            position:fixed;top:0;left:0;height:100vh;z-index:300;
            transform:translateX(-100%);transition:transform 0.25s ease;
            width:240px!important;box-shadow:4px 0 24px rgba(0,0,0,0.5);
          }
          .sidebar.mob-open{transform:translateX(0);}
          .mob-overlay{display:block!important;}
          .main{width:100%;}
          .topbar{padding:0 12px!important;}
          .content{padding:12px!important;}
          .hamburger{display:flex!important;}
          .tb-title{font-size:14px!important;}
          .theme-toggle .tog-label{display:none;}
        }
        .mob-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .hamburger{display:none;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:#eeeef5;line-height:1;margin-right:2px;}
        /* Responsive grids */
        @media(max-width:767px){
          [style*="grid-template-columns: repeat(5"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: repeat(4"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: repeat(3"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: 1fr 300px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 1fr 320px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 280px 1fr 280px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important;}
          [style*="repeat(7,1fr)"]{grid-template-columns:repeat(4,1fr)!important;}
        }
        /* Bottom navigation bar */
        .bottom-nav{
          display:none;position:fixed;bottom:0;left:0;right:0;
          background:#0c0c15;border-top:1px solid rgba(255,255,255,0.07);
          padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;
        }
        @media(max-width:767px){
          .bottom-nav{display:flex;justify-content:space-around;}
          .main{padding-bottom:60px;}
          .wrap{padding-bottom:0;}
        }
        .bnav-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnav-icon{font-size:17px;color:rgba(255,255,255,0.3);}
        .bnav-label{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3);}
        .bnav-btn.active .bnav-icon,.bnav-btn.active .bnav-label{color:#00C9B1;}
      `}</style>

      <div className="wrap">
        <aside className={`sidebar${mobSidebarOpen?" mob-open":""}`}>
          <a href="/dashboard" className="logo"><img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} /><span style={{fontWeight:800,fontSize:20,color:dark?"#eeeef5":"#1e293b",letterSpacing:"-0.3px"}}>fast<span style={{color:"#00C9B1"}}>rill</span></span></a>
          <div className="nav-section">Platform</div>
          {NAV.map(item => (
            <button key={item.id} className={`nav-item${item.id==="analytics"?" active":""}`} onClick={() => router.push(item.path)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{userInitial}</div>
              <div className="user-email">{userEmail||"Loading..."}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <button className="hamburger" onClick={()=>setMobSidebarOpen(s=>!s)}>☰</button>
              <span className="tb-title">Analytics</span>
            <div className="topbar-r">
              {/* Period selector */}
              <div style={{display:"flex",background:inputBg,border:`1px solid ${cardBorder}`,borderRadius:8,padding:2,gap:1}}>
                {[["7","7 days"],["30","30 days"],["90","90 days"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setPeriod(v)} style={{padding:"4px 12px",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer",border:"none",background:period===v?card:"transparent",color:period===v?text:textMuted,fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:period===v?"0 1px 3px rgba(0,0,0,0.15)":"none"}}>
                    {l}
                  </button>
                ))}
              </div>
              <button className="theme-toggle" onClick={toggleTheme}>
                <span>{dark?"🌙":"☀️"}</span><div className="toggle-pill"/><span>{dark?"Dark":"Light"}</span>
              </button>
            </div>
          </div>

          <div className="content">
            {/* Top KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
              {[
                {l:"Revenue",         v:`₹${data.revenue.toLocaleString()}`, c:accent,     icon:"₹",  grad:`linear-gradient(135deg,${accent},#0ea5e9)`},
                {l:"Bookings",        v:data.bookings,                       c:"#a78bfa",  icon:"◷",  grad:"linear-gradient(135deg,#a78bfa,#818cf8)"},
                {l:"New Customers",   v:data.customers,                      c:"#38bdf8",  icon:"◑",  grad:"linear-gradient(135deg,#38bdf8,#06b6d4)"},
                {l:"Leads Captured",  v:data.leads,                          c:"#f59e0b",  icon:"↗",  grad:"linear-gradient(135deg,#f59e0b,#fb923c)"},
              ].map((s,idx)=>(
                <div key={s.l} className="stat-card anim-in" style={{animationDelay:`${idx*60}ms`}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:s.grad,borderRadius:"11px 11px 0 0"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,marginTop:2}}>
                    <div style={{fontSize:11,color:textMuted,fontWeight:500}}>{s.l}</div>
                    <div style={{fontSize:13,opacity:0.35}}>{s.icon}</div>
                  </div>
                  <div style={{fontSize:24,fontWeight:800,color:s.c,letterSpacing:"-0.5px"}}>{loading?"…":s.v}</div>
                  <div style={{fontSize:10.5,color:textFaint,marginTop:2}}>Last {period} days</div>
                </div>
              ))}
            </div>

            {/* Charts row — area charts instead of bar charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div className="stat-card anim-in" style={{animationDelay:"250ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:4}}>Revenue Trend</div>
                {loading ? <div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",color:textFaint,fontSize:12}}>Loading...</div>
                  : <AreaChart dataPoints={data.dailyRevenue} color={accent} gradientId="revGrad" label="Daily revenue" prefix="₹"/>}
              </div>
              <div className="stat-card anim-in" style={{animationDelay:"310ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:4}}>Booking Volume</div>
                {loading ? <div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",color:textFaint,fontSize:12}}>Loading...</div>
                  : <AreaChart dataPoints={data.dailyBookings} color="#a78bfa" gradientId="bkGrad" label="Daily bookings"/>}
              </div>
            </div>

            {/* Performance metrics row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              {/* Conversion + Returning rates */}
              <div className="stat-card anim-in" style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"20px 16px",animationDelay:"380ms"}}>
                <RingMetric value={data.conversionRate} max={100} color={accent} label="Conversion" sub="lead → booking"/>
                <RingMetric value={data.returningRate} max={100} color="#38bdf8" label="Returning" sub="of customers"/>
              </div>

              {/* AI vs Manual donut + stats */}
              <div className="stat-card anim-in" style={{animationDelay:"440ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:14}}>AI vs Manual Bookings</div>
                <AiDonut ai={data.aiVsManual.ai} manual={data.aiVsManual.manual}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
                  <div style={{background:inputBg,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:textFaint,marginBottom:2}}>AI Replies</div>
                    <div style={{fontSize:15,fontWeight:800,color:accent}}>{loading?"…":data.aiReplies}</div>
                  </div>
                  <div style={{background:inputBg,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:textFaint,marginBottom:2}}>Avg Value</div>
                    <div style={{fontSize:15,fontWeight:800,color:"#a78bfa"}}>{loading?"…":`₹${data.avgBookingValue}`}</div>
                  </div>
                </div>
              </div>

              {/* Booking status breakdown */}
              <div className="stat-card anim-in" style={{animationDelay:"500ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:14}}>Booking Status</div>
                {Object.keys(data.bookingsByStatus).length===0 ? (
                  <div style={{color:textFaint,fontSize:12,textAlign:"center",padding:"16px 0"}}>No data yet</div>
                ) : Object.entries(data.bookingsByStatus).map(([status, count])=>{
                  const total = Object.values(data.bookingsByStatus).reduce((a,b)=>a+b,0)
                  const pct = Math.round((count/total)*100)
                  const statusColors = {confirmed:accent,completed:"#a78bfa",cancelled:"#fb7185",pending:"#f59e0b"}
                  const c = statusColors[status]||textMuted
                  return (
                    <div key={status} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:2,background:c}}/>
                          <span style={{fontSize:11.5,color:textMuted,textTransform:"capitalize"}}>{status}</span>
                        </div>
                        <span style={{fontSize:11.5,fontWeight:700,color:c}}>{count} ({pct}%)</span>
                      </div>
                      <div style={{height:5,borderRadius:100,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}}>
                        <div style={{height:5,borderRadius:100,width:`${pct}%`,background:`linear-gradient(90deg,${c},${c}aa)`,transition:"width 0.5s ease-out"}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom row: Top Services + Lead Sources */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Top Services */}
              <div className="stat-card anim-in" style={{animationDelay:"560ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:14}}>Top Services by Revenue</div>
                {data.topServices.length===0 ? (
                  <div style={{color:textFaint,fontSize:12,textAlign:"center",padding:"16px 0"}}>No bookings yet</div>
                ) : data.topServices.map((s,i)=>{
                  const maxRev = data.topServices[0].revenue || 1
                  const pct = Math.round((s.revenue/maxRev)*100)
                  return (
                    <div key={s.name} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{fontSize:10,fontWeight:700,color:accent,background:dark?`${accent}15`:`${accent}18`,padding:"1px 6px",borderRadius:4}}>#{i+1}</span>
                          <span style={{fontSize:12,fontWeight:600,color:text,textTransform:"capitalize"}}>{s.name}</span>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <span style={{fontSize:12,fontWeight:700,color:accent}}>₹{s.revenue.toLocaleString()}</span>
                          <span style={{fontSize:10.5,color:textFaint,marginLeft:6}}>{s.count}x</span>
                        </div>
                      </div>
                      <div style={{height:5,borderRadius:100,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}}>
                        <div style={{height:5,borderRadius:100,width:`${pct}%`,background:`linear-gradient(90deg,${accent},#0ea5e9)`,transition:"width 0.5s ease-out"}}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Lead Sources */}
              <div className="stat-card anim-in" style={{animationDelay:"620ms"}}>
                <div style={{fontWeight:700,fontSize:13,color:text,marginBottom:14}}>Lead Sources</div>
                {Object.keys(data.leadsBySource).length===0 ? (
                  <div style={{color:textFaint,fontSize:12,textAlign:"center",padding:"16px 0"}}>No leads yet</div>
                ) : (() => {
                  const total = Object.values(data.leadsBySource).reduce((a,b)=>a+b,0)
                  const srcColors = { whatsapp:"#25d366", instagram:"#e1306c", google:"#ea4335", referral:"#f59e0b", organic:"#38bdf8" }
                  return Object.entries(data.leadsBySource).sort((a,b)=>b[1]-a[1]).map(([src,count])=>{
                    const pct = Math.round((count/total)*100)
                    const c = srcColors[src.toLowerCase()] || "#a78bfa"
                    return (
                      <div key={src} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:8,height:8,borderRadius:2,background:c}}/>
                            <span style={{fontSize:12,color:textMuted,textTransform:"capitalize"}}>{src}</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,color:c}}>{count} ({pct}%)</span>
                        </div>
                        <div style={{height:5,borderRadius:100,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}}>
                          <div style={{height:5,borderRadius:100,width:`${pct}%`,background:`linear-gradient(90deg,${c},${c}aa)`,transition:"width 0.5s ease-out"}}/>
                        </div>
                      </div>
                    )
                  })
                })()}
                <div style={{marginTop:14,padding:"10px 12px",background:inputBg,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,color:textMuted}}>Total leads: <span style={{fontWeight:700,color:text}}>{data.leads}</span></span>
                  <span style={{fontSize:11.5,color:textMuted}}>Conversion: <span style={{fontWeight:700,color:accent}}>{data.conversionRate}%</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
