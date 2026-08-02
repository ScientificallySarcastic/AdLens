"use client"
import { useEffect, useState, useRef, useCallback } from "react"
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

const TIMES  = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

// Sector config — what to call bookings per sector
const SECTOR_CONFIG = {
  "Food Delivery": { label:"Orders",     icon:"🍽️", newLabel:"New Order",    tabIcon:"🛵" },
  "Restaurant":    { label:"Orders",     icon:"🍽️", newLabel:"New Order",    tabIcon:"🍽️" },
  "Real Estate":   { label:"Site Visits",icon:"🏠", newLabel:"Site Visit",   tabIcon:"🏠" },
  "Education":     { label:"Sessions",   icon:"📚", newLabel:"New Session",  tabIcon:"📚" },
  "Consulting":    { label:"Sessions",   icon:"💼", newLabel:"New Session",  tabIcon:"💼" },
  "Legal":         { label:"Consultations",icon:"⚖️",newLabel:"Consultation",tabIcon:"⚖️" },
  "Finance":       { label:"Consultations",icon:"📊",newLabel:"Consultation",tabIcon:"📊" },
  "default":       { label:"Bookings",   icon:"◷", newLabel:"New Booking",  tabIcon:"◷"  },
}

function getSectorConfig(bizType) {
  return SECTOR_CONFIG[bizType] || SECTOR_CONFIG["default"]
}

// Alarm sound using Web Audio API — no external files needed
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const playBeep = (freq, start, duration) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = "sine"
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration + 0.1)
    }
    // 3 beep pattern like Swiggy/Zomato
    playBeep(880, 0,    0.2)
    playBeep(880, 0.3,  0.2)
    playBeep(1100,0.6,  0.4)
    playBeep(880, 1.1,  0.2)
    playBeep(880, 1.4,  0.2)
    playBeep(1100,1.7,  0.4)
  } catch(e) {
    console.warn("Audio not available:", e.message)
  }
}

const toDateStr  = (v) => (v || "").substring(0, 10)
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

export default function Bookings() {
  usePlanGuard()
  const router = useRouter()
  const toast  = useToast()

  const [userId,    setUserId]    = useState(null)
  const [userEmail, setUserEmail] = useState("")
  const [bizType,   setBizType]   = useState("default")
  const [dark,      setDark]      = useState(true)
  const [mobSidebarOpen, setMobSidebarOpen] = useState(false)

  // New order alert state
  const [newOrderAlert, setNewOrderAlert] = useState(null) // { booking, alarmActive }
  const alarmIntervalRef = useRef(null)

  const sectorCfg = getSectorConfig(bizType)

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login" }
  const toggleTheme  = () => { const n=!dark; setDark(n); try{localStorage.setItem("fastrill-theme",n?"dark":"light")}catch(e){} }

  useEffect(() => {
    try{const s=localStorage.getItem("fastrill-theme");if(s)setDark(s==="dark")}catch(e){}
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setUserId(session.user.id)
        setUserEmail(session.user.email||"")
        // Fetch biz type for sector config
        supabase.from("business_settings")
          .select("business_type").eq("user_id",session.user.id).maybeSingle()
          .then(({data})=>{ if(data?.business_type) setBizType(data.business_type) })
      }
    })
  }, [])

  const [view, setView]         = useState("list")
  const [bookings, setBookings] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState("upcoming")
  const [showAdd, setShowAdd]   = useState(false)
  const [services, setServices] = useState([])
  const [weekOffset,setWeekOffset] = useState(0)
  const [newBk, setNewBk]       = useState({ customer_name:"", customer_phone:"", service:"", staff:"", booking_date:"", booking_time:"", amount:"" })
  const [saving, setSaving]     = useState(false)
  const [stats, setStats]       = useState({ total:0, confirmed:0, pending:0, revenue:0, ai:0 })
  const todayStr = getTodayStr()

  useEffect(() => { if (userId) { load(); loadServices() } }, [userId])

  // ── REALTIME SUBSCRIPTION ────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel("new-bookings-"+userId)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "bookings",
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newBooking = { ...payload.new, booking_date: toDateStr(payload.new.booking_date) }
        console.log("🔔 New booking received:", newBooking)

        // Add to list
        setBookings(prev => {
          const updated = [...prev, newBooking].sort((a,b)=>a.booking_date>b.booking_date?1:-1)
          recalcStats(updated)
          return updated
        })

        // ALARM + POPUP
        playAlarm()
        setNewOrderAlert({ booking: newBooking, alarmActive: true })

        // Request browser notification permission + show notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`🔔 New ${sectorCfg.newLabel}!`, {
            body: `${newBooking.customer_name} — ${newBooking.service}`,
            icon: "/logo.png"
          })
        }

        // Keep repeating alarm every 4 seconds until accepted
        if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = setInterval(() => {
          playAlarm()
        }, 4000)
      })
      .subscribe()

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current)
    }
  }, [userId, sectorCfg.newLabel])

  function stopAlarm() {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
    setNewOrderAlert(prev => prev ? { ...prev, alarmActive: false } : null)
  }

  async function acceptOrder(booking) {
    stopAlarm()
    await updateStatus(booking.id, "confirmed")
    setNewOrderAlert(null)
    toast?.success?.("Order accepted!")
  }

  function dismissAlert() {
    stopAlarm()
    setNewOrderAlert(null)
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from("bookings").select("*").eq("user_id", userId)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true })
      .limit(2000)
    if (error) console.error("Bookings load:", error.message)
    const list = (data || []).map(b => ({ ...b, booking_date: toDateStr(b.booking_date) }))
    setBookings(list)
    recalcStats(list)
    const upcoming = list.filter(b => b.booking_date >= todayStr)
    setSelected(upcoming[0] || list[0] || null)
    setLoading(false)
  }

  function recalcStats(list) {
    const active    = list.filter(b => b.status !== "cancelled")
    const confirmed = list.filter(b => b.status === "confirmed" || b.status === "completed")
    setStats({
      total:     active.length,
      confirmed: list.filter(b => b.status === "confirmed").length,
      pending:   list.filter(b => b.status === "pending").length,
      revenue:   confirmed.reduce((s, b) => s + (b.amount || 0), 0),
      ai:        active.filter(b => b.ai_booked).length,
    })
  }

  async function loadServices() {
    const { data } = await supabase.from("services").select("name,price").eq("user_id", userId)
    setServices(data || [])
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id)
    if (error) { console.error("Status update:", error.message); return }
    const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b)
    setBookings(updated)
    recalcStats(updated)
    if (selected?.id === id) setSelected(s => ({ ...s, status: newStatus }))
  }

  async function addBooking() {
    if (!newBk.customer_name || !newBk.service || !newBk.booking_date) return
    setSaving(true)
    const { data, error } = await supabase.from("bookings").insert({
      ...newBk, user_id: userId, status: "confirmed", ai_booked: false,
      amount: parseInt(newBk.amount) || 0, created_at: new Date().toISOString()
    }).select().single()
    if (error) { console.error("Add booking:", error.message); setSaving(false); return }
    if (data) {
      const row = { ...data, booking_date: toDateStr(data.booking_date) }
      const updated = [...bookings, row].sort((a,b) => a.booking_date > b.booking_date ? 1 : -1)
      setBookings(updated)
      recalcStats(updated)
      setSelected(row)
      setShowAdd(false)
      setNewBk({ customer_name:"", customer_phone:"", service:"", staff:"", booking_date:"", booking_time:"", amount:"" })
    }
    setSaving(false)
  }

  // Theme tokens
  const bg=dark?"#08080e":"#f0f2f5", sidebar=dark?"#0c0c15":"#ffffff", card=dark?"#0f0f1a":"#ffffff"
  const border=dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)"
  const cardBorder=dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const text=dark?"#eeeef5":"#111827"
  const textMuted=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const textFaint=dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)"
  const inputBg=dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const accent=dark?"#00C9B1":"#00897A"
  const accentDim=dark?"rgba(0,208,132,0.12)":"rgba(0,147,90,0.1)"
  const navText=dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const navActive=dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"
  const navActiveBorder=dark?"rgba(0,196,125,0.2)":"rgba(0,180,115,0.2)"
  const navActiveText=dark?"#00B5A0":"#00897A"
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "G"
  const statusColor = { confirmed:accent, pending:"#f59e0b", "in-progress":"#38bdf8", completed:"#a78bfa", cancelled:"#fb7185" }
  const inp = { background:dark?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:8, padding:"9px 12px", color:dark?"#eeeef5":"#1e293b", fontSize:13, outline:"none", width:"100%", fontFamily:"'Plus Jakarta Sans',sans-serif" }

  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7)
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()+i)
    return d
  })
  const weekLabel = `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]}`
  const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  const formatDate = (raw) => {
    if (!raw) return "—"
    const d = toDateStr(raw)
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1)
    const tomorrowStr = localDateStr(tomorrow)
    const prefix = d === todayStr ? "Today · " : d === tomorrowStr ? "Tomorrow · " : ""
    try { return prefix + new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}) }
    catch { return raw }
  }

  const todayBks = bookings.filter(b => b.booking_date === todayStr)
  const filterMap = {
    upcoming:  bookings.filter(b => b.booking_date >= todayStr && b.status !== "cancelled"),
    today:     todayBks,
    all:       bookings,
    confirmed: bookings.filter(b => b.status === "confirmed"),
    pending:   bookings.filter(b => b.status === "pending"),
    completed: bookings.filter(b => b.status === "completed"),
    cancelled: bookings.filter(b => b.status === "cancelled"),
  }
  const filtered = filterMap[filter] || bookings

  const BookingCard = ({ b }) => {
    const isToday    = b.booking_date === todayStr
    const isSelected = selected?.id === b.id
    const isFood     = ["Food Delivery","Restaurant"].includes(bizType)
    return (
      <div onClick={() => setSelected(isSelected ? null : b)} style={{
        background: isSelected ? accentDim : isToday ? `${accent}08` : card,
        border: `1px solid ${isSelected ? accent+"66" : isToday ? accent+"44" : (statusColor[b.status]||textFaint)+"44"}`,
        borderLeft: `3px solid ${isToday ? accent : statusColor[b.status] || textFaint}`,
        borderRadius:10, padding:"11px 13px", cursor:"pointer", marginBottom:8, transition:"all 0.1s"
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontWeight:700,fontSize:13,color:text}}>{b.customer_name}</span>
            {isToday && <span style={{fontSize:9,fontWeight:800,color:accent,background:accentDim,border:`1px solid ${accent}44`,borderRadius:100,padding:"1px 6px"}}>
              {isFood?"NOW":"TODAY"}
            </span>}
            {b.ai_booked && <span style={{fontSize:9,fontWeight:700,color:"#a78bfa",background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:100,padding:"1px 6px"}}>◈ AI</span>}
          </div>
          <span style={{fontSize:10.5,fontWeight:700,color:statusColor[b.status],background:(statusColor[b.status]||textFaint)+"18",border:`1px solid ${(statusColor[b.status]||textFaint)}33`,borderRadius:100,padding:"2px 8px"}}>{b.status||"—"}</span>
        </div>
        <div style={{fontSize:12,color:textMuted,marginBottom:4}}>
          {b.service}{b.booking_time&&!isFood ? ` · ⏰ ${b.booking_time}` : ""}
          {b.amount>0&&isFood?` · ₹${b.amount.toLocaleString()}`:""}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:isToday?accent:textFaint,fontWeight:isToday?600:400}}>
            {isFood?b.booking_date===todayStr?"Today":"Scheduled":formatDate(b.booking_date)}
          </span>
          {b.amount > 0 && !isFood && <span style={{fontWeight:700,fontSize:12.5,color:accent}}>₹{b.amount.toLocaleString()}</span>}
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
        .sidebar{width:224px;flex-shrink:0;background:${sidebar};border-right:1px solid ${border};display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;}
        .sidebar::-webkit-scrollbar{display:none;}
        .logo{padding:16px 18px;font-weight:800;font-size:20px;color:${text};text-decoration:none;display:flex;flex-direction:row;align-items:center;gap:10px;border-bottom:1px solid ${border};line-height:1;}
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
        .content{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px;background:${bg};}
        .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:8px;color:${textFaint};text-align:center;}
        .week-nav-btn{padding:5px 12px;border-radius:7px;border:1px solid ${cardBorder};background:${inputBg};color:${textMuted};cursor:pointer;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;}
        select option{background-color:#0c0c15!important;color:#eeeef5!important;}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .alarm-pulse{animation:pulse 0.5s ease-in-out infinite;}
        @media(max-width:767px){
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);transition:transform 0.25s;width:240px!important;box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .sidebar.mob-open{transform:translateX(0);}
          .mob-overlay{display:block!important;}
          .topbar{padding:0 12px!important;}
          .content{padding:12px!important;}
          .hamburger{display:flex!important;}
          [style*="grid-template-columns: repeat(5"]{grid-template-columns:repeat(2,1fr)!important;}
          [style*="grid-template-columns: 1fr 300px"]{grid-template-columns:1fr!important;}
          [style*="grid-template-columns: 280px 1fr 280px"]{grid-template-columns:1fr!important;}
          [style*="repeat(7,1fr)"]{grid-template-columns:repeat(4,1fr)!important;}
        }
        .mob-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .hamburger{display:none;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:#eeeef5;line-height:1;margin-right:2px;}
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#0c0c15;border-top:1px solid rgba(255,255,255,0.07);padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;}
        @media(max-width:767px){.bottom-nav{display:flex;justify-content:space-around;}.main{padding-bottom:60px;}}
        .bnav-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnav-icon{font-size:17px;color:rgba(255,255,255,0.3);}
        .bnav-label{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3);}
        .bnav-btn.active .bnav-icon,.bnav-btn.active .bnav-label{color:#00C9B1;}
      `}</style>

      {/* ── NEW ORDER ALARM POPUP ────────────────────────────── */}
      {newOrderAlert && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div className={newOrderAlert.alarmActive?"alarm-pulse":""} style={{background:card,border:`2px solid ${accent}`,borderRadius:20,padding:32,maxWidth:420,width:"100%",textAlign:"center",boxShadow:`0 0 40px ${accent}44`}}>
            <div style={{fontSize:56,marginBottom:12}}>{sectorCfg.icon}</div>
            <div style={{fontWeight:800,fontSize:22,color:accent,marginBottom:6}}>
              🔔 New {sectorCfg.newLabel}!
            </div>
            <div style={{fontWeight:700,fontSize:16,color:text,marginBottom:4}}>
              {newOrderAlert.booking.customer_name}
            </div>
            <div style={{fontSize:14,color:textMuted,marginBottom:4}}>
              {newOrderAlert.booking.service}
            </div>
            {newOrderAlert.booking.amount>0&&(
              <div style={{fontSize:20,fontWeight:800,color:accent,marginBottom:16}}>
                ₹{newOrderAlert.booking.amount.toLocaleString()}
              </div>
            )}
            <div style={{fontSize:12,color:textFaint,marginBottom:24}}>
              📞 {newOrderAlert.booking.customer_phone||"—"}
            </div>
            <div style={{display:"flex",gap:12}}>
              <button
                onClick={()=>acceptOrder(newOrderAlert.booking)}
                style={{flex:1,padding:"14px",borderRadius:12,background:accent,border:"none",color:"#000",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                ✓ Accept
              </button>
              <button
                onClick={dismissAlert}
                style={{padding:"14px 20px",borderRadius:12,background:inputBg,border:`1px solid ${cardBorder}`,color:textMuted,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className={"mob-overlay"+(mobSidebarOpen?" ":"hidden")} onClick={()=>setMobSidebarOpen(false)}/>
        <aside className={"sidebar"+(mobSidebarOpen?" mob-open":"")}>
          <a href="/dashboard" className="logo">
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}}/>
            <span style={{fontWeight:800,fontSize:20,color:text,letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:accent}}>rill</span></span>
          </a>
          <div className="nav-section">Platform</div>
          {NAV.map(item=>(
            <button key={item.id} className={`nav-item${item.id==="bookings"?" active":""}`} onClick={()=>router.push(item.path)}>
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
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="hamburger" onClick={()=>setMobSidebarOpen(s=>!s)}>☰</button>
              <span style={{fontWeight:700,fontSize:15,color:text}}>
                {sectorCfg.icon} {sectorCfg.label}
              </span>
              {/* Live indicator */}
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:accentDim,border:`1px solid ${accent}44`,borderRadius:100,fontSize:10,fontWeight:700,color:accent}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:accent,animation:"pulse 1.5s ease-in-out infinite"}}/>
                LIVE
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",background:inputBg,border:`1px solid ${cardBorder}`,borderRadius:8,padding:2,gap:1}}>
                {["list","week"].map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"4px 12px",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer",border:"none",background:view===v?card:"transparent",color:view===v?text:textMuted,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    {v.charAt(0).toUpperCase()+v.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowAdd(true)} style={{background:accent,color:"#000",border:"none",padding:"7px 16px",borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                + {sectorCfg.newLabel}
              </button>
              <button onClick={toggleTheme} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:inputBg,border:`1px solid ${cardBorder}`,borderRadius:8,cursor:"pointer",fontSize:11.5,color:textMuted,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                <span>{dark?"🌙":"☀️"}</span>
                <div style={{width:28,height:15,borderRadius:100,background:dark?accent:"#d1d5db",position:"relative",flexShrink:0}}>
                  <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"#fff",left:dark?"15px":"2px",transition:"left 0.2s"}}/>
                </div>
              </button>
            </div>
          </div>

          <div className="content">
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11}}>
              {[
                {l:"Total",   v:stats.total,                          c:text},
                {l:"Confirmed",v:stats.confirmed,                     c:accent},
                {l:"Pending", v:stats.pending,                        c:"#f59e0b"},
                {l:"AI Booked",v:stats.ai,                            c:"#a78bfa"},
                {l:"Revenue", v:`₹${stats.revenue.toLocaleString()}`, c:accent},
              ].map(s=>(
                <div key={s.l} style={{background:card,border:`1px solid ${cardBorder}`,borderRadius:11,padding:"13px 15px"}}>
                  <div style={{fontSize:11,color:textMuted,marginBottom:5}}>{s.l}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.c}}>{loading?"…":s.v}</div>
                </div>
              ))}
            </div>

            {/* Today banner */}
            {todayBks.length>0&&(
              <div style={{background:`linear-gradient(135deg,${accent}14,${accent}06)`,border:`1px solid ${accent}33`,borderRadius:11,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{sectorCfg.icon}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:text}}>
                      {todayBks.length} {sectorCfg.label.toLowerCase()} today
                    </div>
                    <div style={{fontSize:11.5,color:textMuted}}>
                      {todayBks.map(b=>`${b.customer_name}${b.booking_time?" @ "+b.booking_time:""}`).join(" · ")}
                    </div>
                  </div>
                </div>
                <button onClick={()=>{setFilter("today");setView("list")}} style={{padding:"5px 14px",borderRadius:7,background:accent,border:"none",color:"#000",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}>
                  View Today
                </button>
              </div>
            )}

            {/* Week / List view */}
            {view==="week" ? (
              <div style={{background:card,border:`1px solid ${cardBorder}`,borderRadius:13,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${border}`}}>
                  <button className="week-nav-btn" onClick={()=>setWeekOffset(w=>w-1)}>← Prev week</button>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontWeight:700,fontSize:13,color:text}}>{weekLabel}</span>
                    {weekOffset!==0&&<button onClick={()=>setWeekOffset(0)} style={{padding:"2px 8px",borderRadius:6,border:`1px solid ${accent}44`,background:accentDim,color:accent,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Today</button>}
                  </div>
                  <button className="week-nav-btn" onClick={()=>setWeekOffset(w=>w+1)}>Next week →</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${border}`}}>
                  {weekDays.map((d,i)=>{
                    const ds=localDateStr(d),isToday=ds===todayStr,count=bookings.filter(b=>b.booking_date===ds).length
                    return(
                      <div key={i} style={{padding:"10px 8px",textAlign:"center",borderRight:i<6?`1px solid ${border}`:"none",background:isToday?`${accent}08`:"transparent"}}>
                        <div style={{fontSize:10.5,color:textFaint,fontWeight:600,marginBottom:4}}>{DAYS[d.getDay()]}</div>
                        <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",fontWeight:700,fontSize:13,background:isToday?accent:"transparent",color:isToday?"#000":textMuted}}>{d.getDate()}</div>
                        {count>0&&<div style={{marginTop:4,fontSize:9,fontWeight:700,color:accent,background:accentDim,borderRadius:100,padding:"1px 5px",display:"inline-block"}}>{count}</div>}
                      </div>
                    )
                  })}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",minHeight:240,padding:"8px 4px",gap:4}}>
                  {weekDays.map((d,i)=>{
                    const ds=localDateStr(d),isToday=ds===todayStr,dayBks=bookings.filter(b=>b.booking_date===ds)
                    return(
                      <div key={i} style={{borderRight:i<6?`1px solid ${border}`:"none",padding:"4px",background:isToday?`${accent}04`:"transparent",borderRadius:4}}>
                        {dayBks.map(b=>(
                          <div key={b.id} onClick={()=>setSelected(b)} style={{fontSize:10.5,fontWeight:600,color:statusColor[b.status]||accent,background:(statusColor[b.status]||accent)+"18",border:`1px solid ${statusColor[b.status]||accent}33`,borderRadius:5,padding:"4px 5px",marginBottom:4,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4,outline:selected?.id===b.id?`2px solid ${accent}`:"none"}}>
                            {b.booking_time&&<span style={{opacity:0.75}}>{b.booking_time} </span>}
                            {b.customer_name}
                          </div>
                        ))}
                        {dayBks.length===0&&isToday&&<div style={{fontSize:9.5,color:textFaint,textAlign:"center",marginTop:12}}>Free today</div>}
                      </div>
                    )
                  })}
                </div>
                {selected&&(
                  <div style={{borderTop:`1px solid ${border}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                    <div style={{fontWeight:700,fontSize:13,color:text}}>{selected.customer_name}</div>
                    <div style={{fontSize:12,color:textMuted}}>{selected.service}</div>
                    <div style={{fontSize:12,color:textMuted}}>{formatDate(selected.booking_date)}{selected.booking_time?" · "+selected.booking_time:""}</div>
                    {selected.amount>0&&<div style={{fontSize:12,fontWeight:700,color:accent}}>₹{selected.amount.toLocaleString()}</div>}
                    <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                      {selected.status!=="confirmed"&&<button onClick={()=>updateStatus(selected.id,"confirmed")} style={{padding:"5px 12px",borderRadius:7,background:accentDim,border:`1px solid ${accent}44`,color:accent,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✓ Confirm</button>}
                      {selected.status!=="completed"&&<button onClick={()=>updateStatus(selected.id,"completed")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",color:"#a78bfa",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✓ Done</button>}
                      {selected.status!=="cancelled"&&<button onClick={()=>updateStatus(selected.id,"cancelled")} style={{padding:"5px 12px",borderRadius:7,background:"rgba(251,113,133,0.1)",border:"1px solid rgba(251,113,133,0.25)",color:"#fb7185",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✕ Cancel</button>}
                      <button onClick={()=>setSelected(null)} style={{padding:"5px 10px",borderRadius:7,background:inputBg,border:`1px solid ${cardBorder}`,color:textMuted,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
                <div style={{background:card,border:`1px solid ${cardBorder}`,borderRadius:13,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:`1px solid ${border}`,display:"flex",gap:5,flexWrap:"wrap"}}>
                    {[
                      {k:"upcoming",label:"Upcoming"},
                      {k:"today",   label:`Today${todayBks.length>0?" ("+todayBks.length+")":""}`,hi:todayBks.length>0},
                      {k:"all",     label:"All"},
                      {k:"confirmed",label:"Confirmed"},
                      {k:"pending", label:"Pending"},
                      {k:"completed",label:"Done"},
                      {k:"cancelled",label:"Cancelled"},
                    ].map(f=>{
                      const active=filter===f.k,color=f.hi?accent:statusColor[f.k]||accent
                      return(
                        <button key={f.k} onClick={()=>setFilter(f.k)} style={{padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${active?color+"55":cardBorder}`,background:active?color+"18":"transparent",color:active?color:textMuted,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                          {f.label}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{padding:12,overflowY:"auto",maxHeight:"calc(100vh - 310px)"}}>
                    {loading?(
                      <div className="empty-state"><span style={{fontSize:22}}>⏳</span><span>Loading {sectorCfg.label.toLowerCase()}…</span></div>
                    ):filtered.length===0?(
                      <div className="empty-state">
                        <span style={{fontSize:28,opacity:0.3}}>{sectorCfg.icon}</span>
                        <span style={{fontWeight:600,fontSize:13}}>No {filter} {sectorCfg.label.toLowerCase()}</span>
                        <span style={{fontSize:11}}>AI creates {sectorCfg.label.toLowerCase()} automatically from WhatsApp</span>
                        <button onClick={()=>setShowAdd(true)} style={{marginTop:6,padding:"6px 14px",borderRadius:8,background:accentDim,border:`1px solid ${accent}44`,color:accent,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>+ Add manually</button>
                      </div>
                    ):(
                      filtered.map(b=><BookingCard key={b.id} b={b}/>)
                    )}
                  </div>
                </div>

                {/* Detail panel */}
                <div style={{background:card,border:`1px solid ${cardBorder}`,borderRadius:13,padding:18}}>
                  {selected?(
                    <>
                      <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        {sectorCfg.label.slice(0,-1)} Details
                        <button onClick={()=>setSelected(null)} style={{background:"transparent",border:"none",color:textFaint,cursor:"pointer",fontSize:18}}>×</button>
                      </div>
                      {selected.booking_date===todayStr&&(
                        <div style={{background:accentDim,border:`1px solid ${accent}44`,borderRadius:8,padding:"7px 11px",marginBottom:12,fontSize:12,fontWeight:600,color:accent}}>
                          {sectorCfg.icon} This {sectorCfg.label.slice(0,-1).toLowerCase()} is TODAY
                        </div>
                      )}
                      {[
                        ["Customer",  selected.customer_name],
                        ["Phone",     selected.customer_phone||"—"],
                        ["Service",   selected.service],
                        ["Date",      formatDate(selected.booking_date)],
                        ["Time",      selected.booking_time||"—"],
                        ["Amount",    selected.amount?`₹${selected.amount.toLocaleString()}`:"—"],
                        ["Source",    selected.ai_booked?"◈ AI":"Manual"],
                        ["Status",    selected.status],
                      ].map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${border}`}}>
                          <span style={{fontSize:11.5,color:textMuted}}>{l}</span>
                          <span style={{fontSize:12,fontWeight:600,color:l==="Status"?(statusColor[v]||text):text}}>{v}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",gap:7,marginTop:14,flexWrap:"wrap"}}>
                        {selected.status!=="confirmed"&&<button onClick={()=>updateStatus(selected.id,"confirmed")} style={{flex:1,padding:"8px",background:accentDim,border:`1px solid ${accent}44`,borderRadius:8,color:accent,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✓ Confirm</button>}
                        {selected.status!=="completed"&&<button onClick={()=>updateStatus(selected.id,"completed")} style={{flex:1,padding:"8px",background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:8,color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✓ Done</button>}
                        {selected.status!=="cancelled"&&<button onClick={()=>updateStatus(selected.id,"cancelled")} style={{padding:"8px 12px",background:"rgba(251,113,133,0.1)",border:"1px solid rgba(251,113,133,0.25)",borderRadius:8,color:"#fb7185",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>✕ Cancel</button>}
                      </div>
                    </>
                  ):(
                    <div style={{textAlign:"center",padding:"40px 16px"}}>
                      <div style={{fontSize:28,opacity:0.15,marginBottom:10}}>{sectorCfg.icon}</div>
                      <div style={{fontSize:12,color:textFaint,lineHeight:1.7}}>Click any {sectorCfg.label.slice(0,-1).toLowerCase()}<br/>to see details & actions</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div style={{background:card,border:`1px solid ${cardBorder}`,borderRadius:16,padding:28,width:420,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontWeight:800,fontSize:16,color:text,marginBottom:2}}>+ {sectorCfg.newLabel}</div>
            <input placeholder="Customer name *" value={newBk.customer_name} onChange={e=>setNewBk(p=>({...p,customer_name:e.target.value}))} style={inp}/>
            <input placeholder="Phone (with country code)" value={newBk.customer_phone} onChange={e=>setNewBk(p=>({...p,customer_phone:e.target.value}))} style={inp}/>
            <select value={newBk.service} onChange={e=>{const svc=services.find(s=>s.name===e.target.value);setNewBk(p=>({...p,service:e.target.value,amount:svc?.price?.toString()||p.amount}))}} style={inp}>
              <option value="">Select service *</option>
              {services.map(s=><option key={s.name} value={s.name}>{s.name} — ₹{s.price}</option>)}
              <option value="Other">Other</option>
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <input type="date" value={newBk.booking_date} onChange={e=>setNewBk(p=>({...p,booking_date:e.target.value}))} style={inp}/>
              <select value={newBk.booking_time} onChange={e=>setNewBk(p=>({...p,booking_time:e.target.value}))} style={inp}>
                <option value="">Time (optional)</option>
                {TIMES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input placeholder="Amount (₹)" type="number" value={newBk.amount} onChange={e=>setNewBk(p=>({...p,amount:e.target.value}))} style={inp}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"9px",background:inputBg,border:`1px solid ${cardBorder}`,borderRadius:8,color:textMuted,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cancel</button>
              <button onClick={addBooking} disabled={saving||!newBk.customer_name||!newBk.service||!newBk.booking_date} style={{flex:1,padding:"9px",background:accent,border:"none",borderRadius:8,color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",opacity:(saving||!newBk.customer_name||!newBk.service||!newBk.booking_date)?0.5:1}}>
                {saving?"Saving...":"Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:sidebar,borderTop:`1px solid ${border}`,padding:"6px 0",zIndex:200}}>
        {[
          {id:"overview",icon:"⬡",label:"Home",    path:"/dashboard"},
          {id:"inbox",   icon:"◎",label:"Chats",   path:"/dashboard/conversations"},
          {id:"bookings",icon:"◷",label:sectorCfg.label,path:"/dashboard/bookings"},
          {id:"leads",   icon:"◉",label:"Leads",   path:"/dashboard/leads"},
          {id:"contacts",icon:"◑",label:"Customers",path:"/dashboard/contacts"},
        ].map(item=>(
          <button key={item.id} className={"bnav-btn"+(item.id==="bookings"?" active":"")} onClick={()=>router.push(item.path)}>
            <span className="bnav-icon">{item.icon}</span>
            <span className="bnav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
