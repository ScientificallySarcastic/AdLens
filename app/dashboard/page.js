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

export default function Dashboard() {
  usePlanGuard()
  const router = useRouter()
  const toast  = useToast()

  const [userEmail, setUserEmail]         = useState("")
  const [userId, setUserId]               = useState(null)
  const [connected, setConnected]         = useState(false)
  const [period, setPeriod]               = useState("today")
  const [dark, setDark]                   = useState(true)
  const [mobSidebarOpen, setMobSidebarOpen] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [stats, setStats]                 = useState({ revenue:0, leads:0, bookings:0, missedLeads:0, aiHandled:0, aiBookings:0, aiRevenue:0 })
  const [funnel, setFunnel]               = useState({ customers:0, convos:0, booked:0, completed:0, revenue:0 })
  const [todayBookings, setTodayBookings] = useState([])
  const [sources, setSources]             = useState([])
  const [healthScore, setHealthScore]     = useState(0)
  const [avgServiceValue, setAvgServiceValue] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem("fastrill-theme")
    if (saved) setDark(saved === "dark")
    async function initAuth() {
      const hash = window.location.hash
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          window.history.replaceState(null, "", window.location.pathname)
        }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push("/login"); return }
      setUserEmail(session.user.email || "")
      setUserId(session.user.id)
    }
    initAuth()
  }, [])

  useEffect(() => { if (userId) loadAll() }, [userId, period])

  async function loadAll() {
    setLoading(true)
    try {
      const now = new Date()
      let from = new Date()
      if (period === "today") from.setHours(0,0,0,0)
      else if (period === "week") from.setDate(now.getDate()-7)
      else from.setDate(1)
      const fromISO     = from.toISOString()
      const fromDateStr = from.toISOString().split("T")[0]
      const todayStr    = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")

      // Customers are only ever counted — a head:true count query transfers
      // zero rows instead of up to 5,000.
      const [{ data:wa },{ data:biz },{ data:msgs },{ data:allBks },{ data:leads },{ count:customerCount }] = await Promise.all([
        supabase.from("whatsapp_connections").select("id").eq("user_id",userId).maybeSingle(),
        supabase.from("business_settings").select("business_name").eq("user_id",userId).maybeSingle(),
        supabase.from("messages").select("direction,is_ai,created_at,conversation_id").eq("user_id",userId).gte("created_at",fromISO).limit(5000),
        supabase.from("bookings").select("id,status,amount,ai_booked,booking_date,customer_name,service,booking_time").eq("user_id",userId).limit(2000),
        supabase.from("leads").select("status,source,estimated_value,created_at").eq("user_id",userId).gte("created_at",fromISO).limit(1000),
        supabase.from("customers").select("id",{ count:"exact", head:true }).eq("user_id",userId),
      ])

      if (!biz?.business_name) {
        router.push("/onboarding")
        return
      }

      setConnected(!!wa)
      const bks = allBks || []

      const periodBks       = period==="today"
        ? bks.filter(b=>b.booking_date===todayStr&&b.status!=="cancelled")
        : bks.filter(b=>b.booking_date>=fromDateStr&&b.status!=="cancelled")
      const periodConfirmed = periodBks.filter(b=>b.status==="confirmed"||b.status==="completed")
      const revenue         = periodConfirmed.reduce((s,b)=>s+(b.amount||0),0)
      const aiRevenue       = periodBks.filter(b=>b.ai_booked&&(b.status==="confirmed"||b.status==="completed")).reduce((s,b)=>s+(b.amount||0),0)
      const avgVal          = periodConfirmed.length>0 ? Math.round(revenue/periodConfirmed.length) : 0
      const aiHandled       = (msgs||[]).filter(m=>m.is_ai&&m.direction==="outbound").length
      const aiBookings      = periodBks.filter(b=>b.ai_booked&&b.status!=="cancelled").length
      const missedLeads     = (leads||[]).filter(l=>l.status==="open").length
      const uniqueConvos    = new Set((msgs||[]).map(m=>m.conversation_id).filter(Boolean)).size

      setAvgServiceValue(avgVal)
      setStats({ revenue, leads:(leads||[]).length, bookings:periodBks.length, missedLeads, aiHandled, aiBookings, aiRevenue })

      // FIX: messages are filtered by created_at but bookings by booking_date,
      // so a booking made before the period (for a date inside it) has its chat
      // outside the message window — convos undercounts and Book Rate exceeded 100%.
      // Every booking comes from a conversation, so clamp convos to at least bookings.
      const funnelConvos = Math.max(uniqueConvos, periodBks.length)
      setFunnel({ customers:customerCount||0, convos:funnelConvos, booked:periodBks.length, completed:periodConfirmed.length, revenue })
      setTodayBookings(bks.filter(b=>b.booking_date===todayStr&&b.status!=="cancelled").slice(0,4))

      const srcMap={}
      for(const l of (leads||[])) { const s=l.source||"Organic"; srcMap[s]=(srcMap[s]||0)+1 }
      const srcColors={whatsapp:"#25d366",instagram:"#e1306c",google:"#ea4335",referral:"#f59e0b",organic:"#38bdf8"}
      setSources(Object.entries(srcMap).map(([name,count])=>({name,count,color:srcColors[name.toLowerCase()]||"#a78bfa"})).slice(0,4))

      let score=0
      if(wa)                            score+=25
      if(aiHandled>0)                   score+=Math.min(20,aiHandled*2)
      if(bks.length>0)                  score+=15
      if((leads||[]).length>0)          score+=10
      if((customerCount||0)>2)          score+=15
      if(aiBookings>0)                  score+=15
      setHealthScore(Math.min(100,score))
    } catch(e) { toast.error("Failed to load dashboard") }
    setLoading(false)
  }

  const toggleTheme = ()=>{ const n=!dark; setDark(n); localStorage.setItem("fastrill-theme",n?"dark":"light") }
  const handleLogout = async()=>{ try{ await supabase.auth.signOut(); router.push("/login") } catch(e){ toast.error("Sign out failed") } }

  const handleConnect = () => {
    const appId      = process.env.NEXT_PUBLIC_META_APP_ID
    const configId   = process.env.NEXT_PUBLIC_META_CONFIG_ID
    if (!appId || !configId) { toast.error("Meta App ID not configured"); return }
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL        || "https://fastrill.com"
    const redirectUri = appUrl + "/api/meta/callback"
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&config_id=${configId}&state=${userId}`
  }

  const bg=dark?"#08080e":"#f0f2f5", sb=dark?"#0c0c15":"#ffffff", card=dark?"#0f0f1a":"#ffffff"
  const bdr=dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)", cbdr=dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const tx=dark?"#eeeef5":"#111827", txm=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const txf=dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)", ibg=dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const acc=dark?"#00C9B1":"#00897A"
  const navText=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const navActive=dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"
  const navActiveBorder=dark?"rgba(0,196,125,0.2)":"rgba(0,180,115,0.2)"
  const navActiveText=dark?"#00B5A0":"#00897A"
  const adim=dark?"rgba(0,208,132,0.12)":"rgba(0,147,90,0.1)"
  const ui=userEmail?userEmail[0].toUpperCase():"G"
  const hColor=healthScore>=75?acc:healthScore>=40?"#f59e0b":"#ef4444"
  const hLabel=healthScore>=75?"Excellent":healthScore>=40?"Needs Work":"Getting Started"
  const circ=2*Math.PI*46
  const pLabel=period==="today"?"Today":period==="week"?"This week":"This month"

  const fMax=Math.max(funnel.customers,1)
  const fSteps=[
    {label:"Customers",  val:funnel.customers, pct:100,                                     color:acc,      icon:"◑"},
    {label:"Chats",      val:funnel.convos,     pct:Math.round((funnel.convos/fMax)*100),    color:"#38bdf8",icon:"◎"},
    {label:"Booked",     val:funnel.booked,     pct:Math.round((funnel.booked/fMax)*100),    color:"#a78bfa",icon:"◷"},
    {label:"Completed",  val:funnel.completed,  pct:Math.round((funnel.completed/fMax)*100), color:"#f59e0b",icon:"✓"},
    {label:"Revenue",    val:"₹"+(funnel.revenue).toLocaleString(), pct:funnel.customers>0?Math.round((funnel.completed/fMax)*100):0, color:"#fb7185",icon:"₹"},
  ]

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${tx}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;background:${bg};}
        .sidebar{width:224px;flex-shrink:0;background:${sb};border-right:1px solid ${bdr};display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;}
        .sidebar::-webkit-scrollbar{display:none;}
        .logo{padding:16px 18px;font-weight:800;font-size:20px;color:${tx};text-decoration:none;display:flex;flex-direction:row;align-items:center;gap:10px;border-bottom:1px solid ${bdr};line-height:1;}
        .logo span{color:${acc};}
        .nav-sec{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${txf};font-weight:600;}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${navText};font-weight:500;transition:all 0.13s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .nav-item:hover{background:${ibg};color:${tx};}
        .nav-item.active{background:${navActive};color:${navActiveText};font-weight:600;border-color:${navActiveBorder};}
        .nav-icon{font-size:13px;width:18px;text-align:center;flex-shrink:0;}
        .sbf{margin-top:auto;padding:14px;border-top:1px solid ${bdr};}
        .uc{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${ibg};border:1px solid ${cbdr};}
        .ua{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${acc},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
        .lb{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cbdr};font-size:12px;color:${txm};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .lb:hover{border-color:#fca5a5;color:#ef4444;}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${bdr};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sb};}
        .content{flex:1;overflow-y:auto;padding:20px 24px;background:${bg};display:flex;flex-direction:column;gap:14px;}
        .card{background:${card};border:1px solid ${cbdr};border-radius:13px;padding:18px;}
        .period-wrap{display:flex;background:${ibg};border:1px solid ${cbdr};border-radius:8px;padding:2px;gap:1px;}
        .pbt{padding:3px 11px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;background:transparent;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .pbt.on{background:${card};color:${tx};box-shadow:0 1px 3px rgba(0,0,0,0.15);}
        .badge{display:flex;align-items:center;gap:5px;padding:4px 11px;border-radius:100px;font-size:11px;font-weight:600;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;white-space:nowrap;}
        .badge.on{background:${adim};border-color:${acc}44;color:${acc};}
        .bdot{width:5px;height:5px;border-radius:50%;background:currentColor;}
        .ttog{display:flex;align-items:center;gap:6px;padding:5px 10px;background:${ibg};border:1px solid ${cbdr};border-radius:8px;cursor:pointer;font-size:11.5px;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .tpill{width:30px;height:16px;border-radius:100px;background:${dark?acc:"#d1d5db"};position:relative;flex-shrink:0;}
        .tpill::after{content:'';position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;left:${dark?"16px":"2px"};}
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sb};border-top:1px solid ${bdr};padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;}
        @media(max-width:767px){.bnav{display:flex;justify-content:space-around;}.main{padding-bottom:60px;}}
        .bni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnic{font-size:17px;color:rgba(255,255,255,0.3);}
        .bnil{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3);}
        .bni.on .bnic,.bni.on .bnil{color:${acc};}
        select option{background-color:#0c0c15!important;color:#eeeef5!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fin{animation:fadeUp 0.35s ease both;}

        @media(max-width:767px){
          .wrap{position:relative;}
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);transition:transform 0.25s;width:240px!important;box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .sidebar.open{transform:translateX(0);}
          .topbar{padding:0 12px!important;}
          .content{padding:12px!important;}
          .hbtn{display:flex!important;}
          [style*="grid-template-columns: repeat(5"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: repeat(4"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: repeat(3"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: 200px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 1fr 1fr 1fr"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important;}
        }
        .mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .mob-ov.open{display:block;}
        .hbtn{display:none;background:${ibg};border:1px solid ${cbdr};border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:${tx};line-height:1;margin-right:2px;}
      `}</style>

      <div className="wrap">
        <div className={"mob-ov"+(mobSidebarOpen?" open":"")} onClick={()=>setMobSidebarOpen(false)}/>
        <aside className={"sidebar"+(mobSidebarOpen?" open":"")}>
          <a href="/dashboard" className="logo">
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}}/>
            <span style={{fontWeight:800,fontSize:20,color:tx,letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:acc}}>rill</span></span>
          </a>
          <div className="nav-sec">Platform</div>
          {NAV.map(item=>(
            <button key={item.id} className={"nav-item"+(item.id==="overview"?" active":"")} onClick={()=>router.push(item.path)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="sbf">
            <div className="uc">
              <div className="ua">{ui}</div>
              <div style={{fontSize:11.5,color:txm,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail||"Loading..."}</div>
            </div>
            <button className="lb" onClick={handleLogout}>{"↩"} Sign out</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button className="hbtn" onClick={()=>setMobSidebarOpen(s=>!s)}>{"☰"}</button>
              <span style={{fontWeight:700,fontSize:15,color:tx}}>Revenue Engine</span>
              <div className="period-wrap">
                {["today","week","month"].map(p=>(
                  <button key={p} className={"pbt"+(period===p?" on":"")} onClick={()=>setPeriod(p)}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="ttog" onClick={toggleTheme}><span>{dark?"🌙":"☀️"}</span><div className="tpill"/><span>{dark?"Dark":"Light"}</span></button>
              <div className={"badge"+(connected?" on":"")}><span className="bdot"/>{connected?"WhatsApp Live":"Not Connected"}</div>
            </div>
          </div>

          <div className="content">
            {/* WhatsApp connect banner */}
            {!connected&&(
              <div className="fin" style={{background:dark?`linear-gradient(135deg,${acc}0f,rgba(56,189,248,0.06))`:`linear-gradient(135deg,${acc}0a,rgba(56,189,248,0.04))`,border:`1px solid ${acc}28`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{"💬"}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:tx,marginBottom:2}}>Connect WhatsApp to start generating revenue</div>
                    <div style={{fontSize:11.5,color:txm}}>Link your business number to activate AI-powered lead conversion</div>
                  </div>
                </div>
                <button onClick={handleConnect} style={{background:"#1877f2",color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}>Connect WhatsApp {"→"}</button>
              </div>
            )}

            {/* KPI Cards Row */}
            <div className="fin" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,animationDelay:"0.05s"}}>
              {[
                {name:"Revenue",    val:"₹"+stats.revenue.toLocaleString(),  color:acc,       icon:"₹",  sub:pLabel},
                {name:"New Leads",  val:stats.leads,                          color:"#38bdf8", icon:"↗", sub:pLabel},
                {name:"Bookings",   val:stats.bookings,                       color:"#a78bfa", icon:"◷", sub:pLabel},
                {name:"AI Bookings",val:stats.aiBookings,                     color:"#f59e0b", icon:"◈", sub:"automated"},
                {name:"Avg Value",  val:"₹"+avgServiceValue.toLocaleString(), color:"#fb7185", icon:"₹",  sub:"per booking"},
              ].map((k,i)=>(
                <div key={k.name} className="fin" style={{background:card,border:`1px solid ${cbdr}`,borderRadius:12,padding:"16px 15px",position:"relative",overflow:"hidden",animationDelay:`${i*40}ms`}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:`linear-gradient(90deg,${k.color},${k.color}44)`}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{fontSize:11,color:txm,fontWeight:500}}>{k.name}</div>
                    <div style={{width:28,height:28,borderRadius:8,background:dark?`${k.color}12`:`${k.color}10`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:k.color,fontWeight:700}}>{k.icon}</div>
                  </div>
                  <div style={{fontWeight:800,fontSize:26,letterSpacing:"-1px",lineHeight:1,color:tx}}>{loading?"—":k.val}</div>
                  <div style={{fontSize:10.5,color:txf,marginTop:5}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Funnel + Health Score row */}
            <div className="fin" style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:14,animationDelay:"0.1s"}}>
              {/* Conversion Pipeline — horizontal steps */}
              <div className="card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:tx}}>Conversion Pipeline</div>
                    <div style={{fontSize:11,color:txm,marginTop:2}}>Customer journey from contact to revenue · {pLabel.toLowerCase()}</div>
                  </div>
                  {funnel.customers>0&&<div style={{fontSize:10.5,color:txf,background:ibg,padding:"3px 10px",borderRadius:6,border:`1px solid ${cbdr}`}}>{funnel.customers} total customers</div>}
                </div>

                {loading?(
                  <div style={{textAlign:"center",padding:"28px 0",color:txf,fontSize:12}}>Loading...</div>
                ):funnel.customers===0?(
                  <div style={{textAlign:"center",padding:"28px 0",color:txf,fontSize:12}}>No data yet</div>
                ):(
                  <div>
                    {/* Pipeline steps */}
                    <div style={{display:"flex",gap:0,alignItems:"stretch"}}>
                      {fSteps.map((step,i)=>{
                        const widthPct = Math.max(12, step.pct)
                        return (
                          <div key={step.label} style={{flex:`${widthPct} 0 0`,minWidth:0,position:"relative"}}>
                            <div style={{
                              background:dark?`${step.color}18`:`${step.color}12`,
                              borderLeft:i===0?`3px solid ${step.color}`:"none",
                              borderRight:`3px solid ${step.color}`,
                              borderTop:`1px solid ${step.color}30`,
                              borderBottom:`1px solid ${step.color}30`,
                              borderRadius:i===0?"10px 0 0 10px":i===fSteps.length-1?"0 10px 10px 0":"0",
                              padding:"14px 12px",
                              height:"100%",
                              position:"relative",
                              overflow:"hidden"
                            }}>
                              <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${step.color}66,${step.color}22)`}}/>
                              <div style={{fontSize:10,color:step.color,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{step.label}</div>
                              <div style={{fontWeight:800,fontSize:20,color:tx,lineHeight:1,marginBottom:3}}>{step.val}</div>
                              <div style={{fontSize:10,color:txf}}>{step.pct}%</div>
                            </div>
                            {i<fSteps.length-1&&(
                              <div style={{position:"absolute",right:-6,top:"50%",transform:"translateY(-50%)",zIndex:2,width:12,height:12,background:card,border:`2px solid ${step.color}55`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <div style={{width:0,height:0,borderTop:"3px solid transparent",borderBottom:"3px solid transparent",borderLeft:`4px solid ${step.color}`,marginLeft:1}}/>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Conversion rate pills */}
                    {funnel.convos>0 && (
                      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                        {[
                          {l:"Chat Rate", v:Math.min(100,Math.round((funnel.convos/Math.max(funnel.customers,1))*100))+"%", c:"#38bdf8"},
                          {l:"Book Rate", v:funnel.convos>0?Math.min(100,Math.round((funnel.booked/funnel.convos)*100))+"%":"0%", c:"#a78bfa"},
                          {l:"Complete Rate", v:funnel.booked>0?Math.min(100,Math.round((funnel.completed/funnel.booked)*100))+"%":"0%", c:"#f59e0b"},
                        ].map(m=>(
                          <div key={m.l} style={{display:"flex",alignItems:"center",gap:6,background:ibg,border:`1px solid ${cbdr}`,borderRadius:8,padding:"5px 12px"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:m.c}}/>
                            <span style={{fontSize:10.5,color:txm}}>{m.l}</span>
                            <span style={{fontSize:11.5,fontWeight:700,color:m.c}}>{m.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Health Score */}
              <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,padding:"18px 14px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 30%,${acc}08,transparent 70%)`,pointerEvents:"none"}}/>
                <div style={{fontSize:9.5,letterSpacing:"1.5px",textTransform:"uppercase",color:txf,fontWeight:600,marginBottom:10}}>Health</div>
                <div style={{position:"relative",width:100,height:100,marginBottom:10}}>
                  <svg width="100" height="100" viewBox="0 0 110 110" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="55" cy="55" r="46" fill="none" stroke={dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"} strokeWidth="6"/>
                    <circle cx="55" cy="55" r="46" fill="none" stroke={hColor} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${circ}`} strokeDashoffset={`${circ*(1-healthScore/100)}`} style={{transition:"stroke-dashoffset 1s ease",filter:`drop-shadow(0 0 4px ${hColor}40)`}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontWeight:800,fontSize:28,lineHeight:1,color:hColor}}>{healthScore}</div>
                    <div style={{fontSize:10,color:txf}}>/100</div>
                  </div>
                </div>
                <div style={{fontWeight:700,fontSize:12,color:hColor}}>{hLabel}</div>
                <div style={{fontSize:10,color:txm,marginTop:3,lineHeight:1.4}}>{connected?"AI active":"Connect WA"}</div>
              </div>
            </div>

            {/* AI Performance + Missed Revenue */}
            <div className="fin" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,animationDelay:"0.15s"}}>
              <div className="card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:100,padding:"2px 9px",fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:"0.5px"}}>{"◈"} AI ENGINE</div>
                    <div style={{fontWeight:700,fontSize:13.5,color:tx,marginTop:6}}>AI Performance</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Conversations",v:stats.aiHandled,    s:"handled by AI",    c:acc},
                    {l:"AI Bookings",  v:stats.aiBookings,   s:"auto-created",     c:"#a78bfa"},
                    {l:"AI Revenue",   v:"₹"+stats.aiRevenue.toLocaleString(), s:"generated", c:"#38bdf8"},
                    {l:"Avg Value",    v:"₹"+avgServiceValue.toLocaleString(), s:"per booking",c:"#f59e0b"},
                  ].map(m=>(
                    <div key={m.l} style={{background:ibg,border:`1px solid ${cbdr}`,borderRadius:10,padding:"12px 11px",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.c}55,transparent)`}}/>
                      <div style={{fontWeight:800,fontSize:20,color:m.c,lineHeight:1,marginBottom:4}}>{loading?"—":m.v}</div>
                      <div style={{fontSize:11,color:txm,fontWeight:500}}>{m.l}</div>
                      <div style={{fontSize:9.5,color:txf,marginTop:1}}>{m.s}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:card,border:`1px solid ${dark?"rgba(251,113,133,0.15)":"rgba(251,113,133,0.2)"}`,borderRadius:13,padding:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(251,113,133,0.1)",border:"1px solid rgba(251,113,133,0.18)",borderRadius:100,padding:"2px 9px",fontSize:10,color:"#fb7185",fontWeight:700,letterSpacing:"0.5px"}}>ATTENTION</div>
                    <div style={{fontWeight:700,fontSize:13.5,color:tx,marginTop:6}}>Missed Revenue</div>
                  </div>
                </div>
                <div style={{fontWeight:800,fontSize:32,color:stats.missedLeads>0?"#fb7185":acc,letterSpacing:"-1px",lineHeight:1,marginBottom:6}}>
                  {loading?"—":stats.missedLeads>0?stats.missedLeads+" open leads":"All caught up"}
                </div>
                <div style={{fontSize:11.5,color:txm,marginBottom:14}}>
                  {stats.missedLeads>0?"Leads without bookings this period":"No open leads right now"}
                </div>
                {[
                  {l:"Open leads",       v:stats.missedLeads, c:"#fb7185"},
                  {l:"AI replies sent",  v:stats.aiHandled,   c:acc},
                  {l:"Bookings created", v:stats.bookings,    c:acc},
                ].map(r=>(
                  <div key={r.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:ibg,border:`1px solid ${cbdr}`,borderRadius:8,marginBottom:5}}>
                    <span style={{fontSize:12,color:txm}}>{r.l}</span>
                    <span style={{fontSize:12,fontWeight:700,color:r.c}}>{loading?"—":r.v}</span>
                  </div>
                ))}
                {stats.missedLeads>0&&(
                  <button onClick={()=>router.push("/dashboard/leads")} style={{width:"100%",marginTop:10,padding:"9px",borderRadius:8,background:"rgba(251,113,133,0.1)",border:"1px solid rgba(251,113,133,0.22)",color:"#fb7185",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    Recover {stats.missedLeads} leads {"→"}
                  </button>
                )}
              </div>
            </div>

            {/* Sources + Today's Bookings + Quick Actions */}
            <div className="fin" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,animationDelay:"0.2s"}}>
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:13.5,color:tx}}>Lead Sources</div>
                  <div style={{fontSize:11,color:txm}}>By channel</div>
                </div>
                {loading?<div style={{color:txf,fontSize:12,textAlign:"center",padding:"16px 0"}}>Loading...</div>
                :sources.length===0?<div style={{color:txf,fontSize:12,textAlign:"center",padding:"16px 0"}}>No leads yet</div>
                :(<>
                  {sources.map(s=>{
                    const total=sources.reduce((a,b)=>a+b.count,0)
                    const pct=total>0?Math.round((s.count/total)*100):0
                    return(
                      <div key={s.name} style={{marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:3,background:s.color,flexShrink:0}}/>
                            <span style={{fontSize:12.5,color:tx,fontWeight:500,textTransform:"capitalize"}}>{s.name}</span>
                          </div>
                          <span style={{fontWeight:700,fontSize:12,color:s.color}}>{s.count} ({pct}%)</span>
                        </div>
                        <div style={{height:4,borderRadius:100,background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}}>
                          <div style={{height:4,borderRadius:100,width:`${Math.max(pct,3)}%`,background:`linear-gradient(90deg,${s.color},${s.color}66)`,transition:"width 0.5s"}}/>
                        </div>
                      </div>
                    )
                  })}
                </>)}
              </div>

              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:13.5,color:tx}}>Today's Bookings</div>
                  <div style={{fontSize:11,color:txm}}>{todayBookings.length} scheduled</div>
                </div>
                {loading?<div style={{color:txf,fontSize:12,textAlign:"center",padding:"16px 0"}}>Loading...</div>
                :todayBookings.length===0?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 0",gap:6}}>
                    <div style={{fontSize:26,opacity:0.15}}>{"◷"}</div>
                    <div style={{fontSize:11.5,color:txf,textAlign:"center",lineHeight:1.5}}>No bookings today<br/>{connected?"Appear from WhatsApp chats":"Connect WhatsApp to start"}</div>
                  </div>
                ):todayBookings.map((b,i)=>(
                  <div key={b.id||b.customer_name+b.booking_time+i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${bdr}`}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:12.5,color:tx}}>{b.customer_name}</div>
                      <div style={{fontSize:11,color:txm}}>{b.service}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11.5,fontWeight:600,color:acc}}>{b.booking_time||"—"}</div>
                      {b.amount>0&&<div style={{fontSize:10.5,color:txf}}>{"₹"}{b.amount}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{background:card,border:`1px solid ${acc}1a`,borderRadius:13,padding:18}}>
                <div style={{fontSize:9.5,letterSpacing:"1.2px",textTransform:"uppercase",color:txf,fontWeight:600,marginBottom:4}}>Quick Actions</div>
                <div style={{fontWeight:800,fontSize:18,color:acc,letterSpacing:"-0.5px",lineHeight:1,marginBottom:14}}>Grow Faster</div>
                {[
                  {label:"Send Campaign",   sub:"Reach all customers",        icon:"◆",path:"/dashboard/campaigns",color:acc},
                  {label:"Recover Leads",   sub:stats.missedLeads+" waiting", icon:"◉", path:"/dashboard/leads",   color:"#fb7185"},
                  {label:"Add Booking",     sub:"Manual entry",               icon:"◷",path:"/dashboard/bookings",color:"#a78bfa"},
                  {label:"New Sequence",    sub:"Drip automation",            icon:"⟳", path:"/dashboard/sequences",color:"#38bdf8"},
                ].map(a=>(
                  <div key={a.label} onClick={()=>router.push(a.path)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${bdr}`,cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:14,color:a.color}}>{a.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:tx}}>{a.label}</div>
                        <div style={{fontSize:10.5,color:txm}}>{a.sub}</div>
                      </div>
                    </div>
                    <span style={{color:a.color,fontSize:14}}>{"→"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bnav">
        {[
          {id:"overview",  icon:"⬡",label:"Home",      path:"/dashboard"},
          {id:"inbox",     icon:"◎",label:"Chats",     path:"/dashboard/conversations"},
          {id:"bookings",  icon:"◷",label:"Bookings",  path:"/dashboard/bookings"},
          {id:"leads",     icon:"◉",label:"Leads",     path:"/dashboard/leads"},
          {id:"contacts",  icon:"◑",label:"Customers", path:"/dashboard/contacts"},
        ].map(item=>(
          <button key={item.id} className={"bni"+(item.id==="overview"?" on":"")} onClick={()=>router.push(item.path)}>
            <span className="bnic">{item.icon}</span><span className="bnil">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
