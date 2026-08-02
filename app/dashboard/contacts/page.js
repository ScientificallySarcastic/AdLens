"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth }  from "@/lib/hooks/useAuth"
import { useTheme } from "@/lib/hooks/useTheme"
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

const TAG_COLORS = { vip:"#f59e0b", returning:"#a78bfa", new_lead:"#38bdf8", inactive:"#fb7185" }

export default function Contacts() {
  usePlanGuard()  
  const { userId, userEmail, loading: authLoading, logout } = useAuth()
  const { dark, toggleTheme, colors, inputStyle: inp } = useTheme()
  const toast  = useToast()
  const router = useRouter()

  const [mobOpen,    setMobOpen]    = useState(false)
  const [customers,  setCustomers]  = useState([])
  const [selected,   setSelected]   = useState(null)
  const [bookings,   setBookings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [filter,     setFilter]     = useState("all")
  const [stats,      setStats]      = useState({ total:0, vip:0, returning:0, revenue:0 })

  useEffect(() => { if (userId) loadCustomers() }, [userId])

  async function loadCustomers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("customers").select("*")
      .eq("user_id", userId)
      .order("last_visit_at", { ascending: false })
    if (error) { toast.error("Failed to load customers"); setLoading(false); return }
    const list = data || []
    setCustomers(list)
    setStats({
      total:     list.length,
      vip:       list.filter(c=>c.tag==="vip").length,
      returning: list.filter(c=>c.tag==="returning").length,
      revenue:   0
    })
    setLoading(false)
  }

  async function loadCustomerBookings(customerId, phone) {
    const q = supabase.from("bookings").select("*").eq("user_id", userId).order("booking_date", { ascending: false }).limit(10)
    if (customerId) q.eq("customer_id", customerId)
    else if (phone) q.eq("customer_phone", phone)
    const { data } = await q
    setBookings(data || [])
  }

  async function selectCustomer(c) {
    setSelected(c)
    await loadCustomerBookings(c.id, c.phone)
  }

  async function updateTag(id, tag) {
    await supabase.from("customers").update({ tag }).eq("id", id)
    setCustomers(prev=>prev.map(c=>c.id===id?{...c,tag}:c))
    if (selected?.id===id) setSelected(s=>({...s,tag}))
  }

  const bg=dark?"#08080e":"#f0f2f5", sb=dark?"#0c0c15":"#ffffff", card=dark?"#0f0f1a":"#ffffff"
  const bdr=dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)", cbdr=dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const tx=dark?"#eeeef5":"#111827", txm=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const txf=dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)", ibg=dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const acc=dark?"#00C9B1":"#00897A", adim=dark?"rgba(0,201,177,0.12)":"rgba(0,137,122,0.1)"
  const navText=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const navActive=dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"
  const ui=userEmail?userEmail[0].toUpperCase():"G"

  const getInitial = n => (n||"?")[0].toUpperCase()
  const getColor   = n => { const c=["#00C9B1","#38bdf8","#a78bfa","#f59e0b","#fb7185"]; return c[(n||"").charCodeAt(0)%c.length] }

  const filtered = customers.filter(c=>{
    const name=(c.name||c.phone||"").toLowerCase()
    const matchSearch=name.includes(search.toLowerCase())||(c.phone||"").includes(search)
    const matchFilter=filter==="all"||c.tag===filter
    return matchSearch&&matchFilter
  })

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${tx}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;}
        .sidebar{width:224px;flex-shrink:0;background:${sb};border-right:1px solid ${bdr};display:flex;flex-direction:column;overflow-y:auto;}
        .logo{padding:16px 18px;font-weight:800;font-size:20px;color:${tx};text-decoration:none;display:flex;flex-direction:row;align-items:center;gap:10px;border-bottom:1px solid ${bdr};line-height:1;}
        .logo span{color:${acc};}
        .nav-section{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${txf};font-weight:600;}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${navText};font-weight:500;transition:all 0.13s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .nav-item:hover{background:${ibg};color:${tx};}
        .nav-item.active{background:${navActive};color:${colors.navActiveText};font-weight:600;border-color:${colors.navActiveBdr};}
        .nav-icon{font-size:13px;width:18px;text-align:center;flex-shrink:0;}
        .sbf{margin-top:auto;padding:14px;border-top:1px solid ${bdr};}
        .uc{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${ibg};border:1px solid ${cbdr};}
        .ua{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${acc},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
        .lb{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cbdr};font-size:12px;color:${txm};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .lb:hover{border-color:#fca5a5;color:#ef4444;}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${bdr};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sb};}
        .content{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;background:${bg};}
        .theme-toggle{display:flex;align-items:center;gap:6px;padding:5px 10px;background:${ibg};border:1px solid ${cbdr};border-radius:8px;cursor:pointer;font-size:11.5px;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .toggle-pill{width:30px;height:16px;border-radius:100px;background:${dark?acc:"#d1d5db"};position:relative;flex-shrink:0;}
        .toggle-pill::after{content:'';position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;left:${dark?"16px":"2px"};}
        .hamburger{display:none;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:#eeeef5;line-height:1;margin-right:2px;}
        .mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        @media(max-width:767px){
          .wrap{position:relative;}
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);transition:transform 0.25s ease;width:240px!important;box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .sidebar.mob-open{transform:translateX(0);}
          .mob-ov{display:block;}
          .hamburger{display:flex!important;}
          .topbar{padding:0 12px!important;}
          .content{padding:12px!important;}
          [style*="grid-template-columns: 1fr 300px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: repeat(4"]{grid-template-columns:repeat(2,1fr)!important;}
        }
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sb};border-top:1px solid ${bdr};padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;}
        @media(max-width:767px){.bnav{display:flex;justify-content:space-around;}.main{padding-bottom:60px;}}
        .bni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnic{font-size:17px;color:rgba(255,255,255,0.3);}
        .bnil{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3);}
        .bni.on .bnic,.bni.on .bnil{color:${acc};}
      `}</style>

      <div className={"mob-ov"+(mobOpen?" open":"")} onClick={()=>setMobOpen(false)}/>

      <div className="wrap">
        <aside className={`sidebar${mobOpen?" mob-open":""}`}>
          <a href="/dashboard" className="logo">
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} />
            <span style={{fontWeight:800,fontSize:20,color:tx,letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:acc}}>rill</span></span>
          </a>
          <div className="nav-section">Platform</div>
          {NAV.map(item=>(
            <button key={item.id} className={`nav-item${item.id==="contacts"?" active":""}`} onClick={()=>router.push(item.path)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="sbf">
            <div className="uc">
              <div className="ua">{ui}</div>
              <div style={{fontSize:11.5,color:txm,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail||"Loading..."}</div>
            </div>
            <button className="lb" onClick={logout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="hamburger" onClick={()=>setMobOpen(s=>!s)}>☰</button>
              <span style={{fontWeight:700,fontSize:15,color:tx}}>Customers</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme}>
              <span>{dark?"🌙":"☀️"}</span><div className="toggle-pill"/><span>{dark?"Dark":"Light"}</span>
            </button>
          </div>

          <div className="content">
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
              {[
                {l:"Total Customers", v:stats.total,     c:tx},
                {l:"⭐ VIP",          v:stats.vip,       c:"#f59e0b"},
                {l:"🔄 Returning",    v:stats.returning, c:"#a78bfa"},
                {l:"New This Month",  v:customers.filter(c=>c.created_at&&new Date(c.created_at)>new Date(Date.now()-30*86400000)).length, c:acc},
              ].map(s=>(
                <div key={s.l} style={{background:card,border:`1px solid ${cbdr}`,borderRadius:11,padding:"13px 15px"}}>
                  <div style={{fontSize:11,color:txm,marginBottom:5}}>{s.l}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.c}}>{loading?"…":s.v}</div>
                </div>
              ))}
            </div>

            {/* Main layout */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
              {/* Customer list */}
              <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${bdr}`,display:"flex",flexDirection:"column",gap:8}}>
                  <input placeholder="Search customers..." value={search} onChange={e=>setSearch(e.target.value)}
                    style={{background:ibg,border:`1px solid ${cbdr}`,borderRadius:8,padding:"7px 11px",fontSize:12.5,color:tx,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {["all","vip","returning","new_lead","inactive"].map(f=>(
                      <button key={f} onClick={()=>setFilter(f)} style={{padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${filter===f?(TAG_COLORS[f]||acc)+"55":cbdr}`,background:filter===f?(TAG_COLORS[f]||acc)+"18":"transparent",color:filter===f?(TAG_COLORS[f]||acc):txm,fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:"capitalize"}}>
                        {f.replace("_"," ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{overflowY:"auto",maxHeight:"calc(100vh - 300px)"}}>
                  {loading?(
                    <div style={{textAlign:"center",padding:"40px 0",color:txf,fontSize:13}}>Loading customers…</div>
                  ):filtered.length===0?(
                    <div style={{textAlign:"center",padding:"40px 16px",color:txf}}>
                      <div style={{fontSize:28,opacity:0.3,marginBottom:8}}>◑</div>
                      <div style={{fontSize:13,fontWeight:600}}>No customers yet</div>
                      <div style={{fontSize:11,marginTop:4}}>Customers are added automatically from WhatsApp</div>
                    </div>
                  ):filtered.map(c=>{
                    const name=c.name||c.phone||"Unknown"
                    const color=getColor(name)
                    const isSel=selected?.id===c.id
                    const tag=c.tag||"new_lead"
                    return(
                      <div key={c.id} onClick={()=>selectCustomer(c)}
                        style={{padding:"11px 14px",borderBottom:`1px solid ${bdr}`,cursor:"pointer",background:isSel?adim:"transparent",borderLeft:`3px solid ${isSel?acc:"transparent"}`,transition:"all 0.1s",display:"flex",gap:10,alignItems:"center"}}>
                        <div style={{width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${color}88,${color}44)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>
                          {getInitial(name)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                            <span style={{fontWeight:700,fontSize:13,color:tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
                            <span style={{fontSize:10,fontWeight:700,color:TAG_COLORS[tag]||txm,background:(TAG_COLORS[tag]||txm)+"15",border:`1px solid ${(TAG_COLORS[tag]||txm)}33`,borderRadius:100,padding:"1px 7px",flexShrink:0,marginLeft:6,textTransform:"capitalize"}}>{tag.replace("_"," ")}</span>
                          </div>
                          <div style={{fontSize:12,color:txm}}>{c.phone||"—"}</div>
                          {c.last_visit_at&&<div style={{fontSize:10.5,color:txf}}>Last visit: {new Date(c.last_visit_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,padding:18,display:"flex",flexDirection:"column",gap:14}}>
                {selected?(
                  <>
                    <div style={{fontWeight:700,fontSize:14,color:tx,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      Customer Details
                      <button onClick={()=>{setSelected(null);setBookings([])}} style={{background:"transparent",border:"none",color:txf,cursor:"pointer",fontSize:18}}>×</button>
                    </div>

                    {/* Avatar */}
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${getColor(selected.name||"")}88,${getColor(selected.name||"")}44)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:"#fff",flexShrink:0}}>
                        {getInitial(selected.name||"?")}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15,color:tx}}>{selected.name||"Unknown"}</div>
                        <div style={{fontSize:12,color:txm}}>{selected.phone||"—"}</div>
                      </div>
                    </div>

                    {[
                      ["Source",    selected.source||"WhatsApp"],
                      ["Tag",       (selected.tag||"new_lead").replace("_"," ")],
                      ["Joined",    selected.created_at?new Date(selected.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"],
                      ["Last visit",selected.last_visit_at?new Date(selected.last_visit_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"],
                    ].map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${bdr}`}}>
                        <span style={{fontSize:11.5,color:txm}}>{l}</span>
                        <span style={{fontSize:12,fontWeight:600,color:tx,textTransform:"capitalize"}}>{v}</span>
                      </div>
                    ))}

                    {/* Tag update */}
                    <div>
                      <div style={{fontSize:12,color:txm,fontWeight:600,marginBottom:6}}>Update Tag</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {["new_lead","returning","vip","inactive"].map(t=>(
                          <button key={t} onClick={()=>updateTag(selected.id,t)}
                            style={{padding:"4px 10px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${selected.tag===t?(TAG_COLORS[t]||acc)+"55":cbdr}`,background:selected.tag===t?(TAG_COLORS[t]||acc)+"18":"transparent",color:selected.tag===t?(TAG_COLORS[t]||acc):txm,fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:"capitalize"}}>
                            {t.replace("_"," ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Booking history */}
                    <div>
                      <div style={{fontSize:12,color:txm,fontWeight:600,marginBottom:8}}>Booking History</div>
                      {bookings.length===0?(
                        <div style={{fontSize:12,color:txf,textAlign:"center",padding:"12px 0"}}>No bookings yet</div>
                      ):bookings.slice(0,5).map(b=>(
                        <div key={b.id} style={{padding:"7px 0",borderBottom:`1px solid ${bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color:tx}}>{b.service}</div>
                            <div style={{fontSize:11,color:txf}}>{b.booking_date}{b.booking_time?" · "+b.booking_time:""}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            {b.amount>0&&<div style={{fontSize:12,fontWeight:700,color:acc}}>₹{b.amount.toLocaleString()}</div>}
                            <div style={{fontSize:10,color:txm,textTransform:"capitalize"}}>{b.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick actions */}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>router.push("/dashboard/conversations")}
                        style={{flex:1,padding:"8px",borderRadius:8,background:adim,border:`1px solid ${acc}44`,color:acc,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                        💬 Chat
                      </button>
                      <button onClick={()=>router.push("/dashboard/bookings")}
                        style={{flex:1,padding:"8px",borderRadius:8,background:ibg,border:`1px solid ${cbdr}`,color:txm,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                        📅 Book
                      </button>
                    </div>
                  </>
                ):(
                  <div style={{textAlign:"center",padding:"40px 16px",color:txf}}>
                    <div style={{fontSize:28,opacity:0.15,marginBottom:10}}>◑</div>
                    <div style={{fontSize:12,lineHeight:1.7}}>Click any customer<br/>to see their profile & history</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bnav">
        {[
          {id:"overview",icon:"⬡",label:"Home",    path:"/dashboard"},
          {id:"inbox",   icon:"◎",label:"Chats",   path:"/dashboard/conversations"},
          {id:"bookings",icon:"◷",label:"Bookings",path:"/dashboard/bookings"},
          {id:"leads",   icon:"◉",label:"Leads",   path:"/dashboard/leads"},
          {id:"contacts",icon:"◑",label:"Customers",path:"/dashboard/contacts"},
        ].map(item=>(
          <button key={item.id} className={"bni"+(item.id==="contacts"?" on":"")} onClick={()=>router.push(item.path)}>
            <span className="bnic">{item.icon}</span>
            <span className="bnil">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
