"use client"
import { useEffect, useState, useRef } from "react"
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
const TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"]

function normalizeTs(ts) {
  if (!ts) return null
  const s = String(ts).trim()
  if (s.includes("+") || s.toLowerCase().endsWith("z")) return s
  if (s.includes("T")) return s + "Z"
  return s.replace(" ", "T") + "Z"
}
function formatMsgTime(ts) {
  if (!ts) return ""
  try { return new Date(normalizeTs(ts)).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Kolkata" }) }
  catch { return "" }
}
function formatConvoTime(ts) {
  if (!ts) return ""
  try {
    const d = new Date(normalizeTs(ts)), now = new Date(), diff = now - d
    if (diff < 60000)       return "just now"
    if (diff < 3600000)     return Math.floor(diff/60000) + "m ago"
    if (diff < 86400000)    return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Kolkata" })
    if (diff < 7*86400000)  return d.toLocaleDateString("en-IN", { weekday:"short", timeZone:"Asia/Kolkata" })
    return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", timeZone:"Asia/Kolkata" })
  } catch { return "" }
}

export default function Conversations() {
  usePlanGuard()  
  const router = useRouter()
  const toast  = useToast()

  const [userEmail, setUserEmail]   = useState("")
  const [userId, setUserId]         = useState(null)
  const [dark, setDark]             = useState(true)
  const [mobOpen, setMobOpen]       = useState(false)
  const [mobChatOpen, setMobChatOpen] = useState(false)
  const [convos, setConvos]         = useState([])
  const [selected, setSelected]     = useState(null)
  const [messages, setMessages]     = useState([])
  const [filter, setFilter]         = useState("all")
  const [search, setSearch]         = useState("")
  const [msgInput, setMsgInput]     = useState("")
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [waConn, setWaConn]         = useState(null)
  const [services, setServices]     = useState([])
  const [showBooking, setShowBooking] = useState(false)
  const [bookingForm, setBookingForm] = useState({ service:"", date:"", time:"", amount:"", staff:"", notes:"" })
  const [savingBooking, setSavingBooking] = useState(false)

  const msgsEndRef  = useRef(null)
  const selectedRef = useRef(null)
  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    const saved = localStorage.getItem("fastrill-theme")
    if (saved) setDark(saved === "dark")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push("/login")
      else { setUserEmail(session.user.email || ""); setUserId(session.user.id) }
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    loadConvos(); loadWaConn(); loadServices()
    const ch = supabase.channel("convos-" + userId)
      .on("postgres_changes", { event:"*", schema:"public", table:"conversations", filter:"user_id=eq." + userId },
        (p) => {
          if (p.eventType === "UPDATE" && p.new) {
            setConvos(prev => [...prev.map(c => c.id === p.new.id ? { ...c, ...p.new } : c)].sort((a,b) => new Date(b.last_message_at||0) - new Date(a.last_message_at||0)))
          } else { loadConvos() }
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId])

  useEffect(() => {
    if (!selected?.id) return
    loadMessages(selected.id, selected.phone)
    supabase.from("conversations").update({ unread_count:0 }).eq("id", selected.id)
    const ch = supabase.channel("msgs-" + selected.id)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:"conversation_id=eq." + selected.id },
        (p) => {
          if (selectedRef.current?.id !== selected.id) return
          setMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new])
          setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, last_message: p.new.message_text, unread_count:0 } : c))
        })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"messages", filter:"conversation_id=eq." + selected.id },
        (p) => {
          if (selectedRef.current?.id !== selected.id) return
          setMessages(prev => prev.map(m => m.id === p.new.id ? { ...m, ...p.new } : m))
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [selected?.id])

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  async function loadWaConn() {
    const { data } = await supabase.from("whatsapp_connections").select("id,phone_number_id,waba_id,connected_at").eq("user_id", userId).maybeSingle()
    setWaConn(data || null)
  }
  async function loadServices() {
    const { data } = await supabase.from("services").select("name,price").eq("user_id", userId)
    setServices(data || [])
  }
  async function loadConvos() {
    setLoading(true)
    const { data, error } = await supabase
      .from("conversations").select("*, customers(name,phone)")
      .eq("user_id", userId).order("last_message_at", { ascending:false })
    if (error) { toast.error("Failed to load conversations"); setLoading(false); return }
    const enriched = (data||[]).map(c => ({
      ...c,
      _displayName:  c.customers?.name  || c.phone || "Unknown",
      _displayPhone: c.customers?.phone || c.phone || "",
    }))
    setConvos(enriched)
    if (enriched.length && !selectedRef.current) setSelected(enriched[0])
    setLoading(false)
  }

  async function loadMessages(convoId, customerPhone) {
    const { data: byId } = await supabase.from("messages").select("*").eq("conversation_id", convoId).order("created_at", { ascending:true })
    if (byId?.length > 0) { if (selectedRef.current?.id === convoId) setMessages(byId); return }
    if (customerPhone) {
      const digits = customerPhone.replace(/[^0-9]/g,"")
      const variants = [...new Set([customerPhone, digits, "+"+digits, digits.slice(-10), "91"+digits.slice(-10)])]
      // One query for all format variants instead of up to 5 sequential ones
      const { data } = await supabase.from("messages").select("*").in("customer_phone", variants).eq("user_id", userId).order("created_at", { ascending:true })
      if (data?.length) {
        supabase.from("messages").update({ conversation_id: convoId }).in("id", data.map(m => m.id))
        if (selectedRef.current?.id === convoId) setMessages(data)
        return
      }
    }
    if (selectedRef.current?.id === convoId) setMessages([])
  }

  async function toggleAI(convoId, current) {
    const newVal = !current
    await supabase.from("conversations").update({ ai_enabled: newVal }).eq("id", convoId)
    setConvos(prev => prev.map(c => c.id === convoId ? { ...c, ai_enabled: newVal } : c))
    if (selected?.id === convoId) setSelected(prev => ({ ...prev, ai_enabled: newVal }))
    toast.info("AI " + (newVal ? "enabled" : "disabled") + " for this conversation")
  }

  // Secure send — token from session, userId from server
  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? "Bearer " + session.access_token : null
  }

  async function sendMsg() {
    if (!msgInput.trim() || !selected || sending) return
    if (!waConn) { toast.error("WhatsApp not connected — go to Settings to connect"); return }
    setSending(true)
    const text  = msgInput.trim()
    setMsgInput("")
    const phone = (selected.phone || "").replace(/[^0-9]/g,"")
    try {
      const authHeader = await getAuthHeader()
      if (!authHeader) { toast.error("Session expired — please refresh"); setSending(false); return }
      const res = await fetch("/api/whatsapp/send", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization": authHeader },
        body: JSON.stringify({ to: phone, message: text, conversationId: selected.id, customerPhone: selected.phone })
      })
      const result = await res.json()
      if (!result.success) { toast.error("Send failed: " + (result.error || "Unknown error")); setSending(false); return }
      if (result.messageId) {
        const { data: savedMsg } = await supabase.from("messages").select("*").eq("wa_message_id", result.messageId).maybeSingle()
        if (savedMsg) setMessages(prev => prev.find(m => m.id === savedMsg.id) ? prev : [...prev, savedMsg])
      }
      await supabase.from("conversations").update({ last_message: text, last_message_at: new Date().toISOString() }).eq("id", selected.id)
      setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, last_message: text } : c))
    } catch(e) { toast.error("Send failed: " + e.message) }
    setSending(false)
  }

  async function saveBooking() {
    if (!bookingForm.service || !bookingForm.date) { toast.warning("Service and date are required"); return }
    setSavingBooking(true)
    const custName  = selected?._displayName || selected?.phone || "Customer"
    const custPhone = selected?.phone || ""
    const cleanPhone = custPhone.replace(/[^0-9]/g,"")
    try {
      const { data: booking, error: bookErr } = await supabase.from("bookings").insert({
        user_id:        userId,
        customer_name:  custName,
        customer_phone: custPhone,
        customer_id:    selected?.customer_id || null,
        service:        bookingForm.service,
        booking_date:   bookingForm.date,
        booking_time:   bookingForm.time   || null,
        amount:         parseInt(bookingForm.amount) || 0,
        status:         "confirmed",
        ai_booked:      false,
        created_at:     new Date().toISOString()
      }).select().single()

      if (bookErr) { toast.error("Could not save booking: " + bookErr.message); setSavingBooking(false); return }

      const confirmMsg = [
        "✅ *Booking Confirmed!*", "",
        "📋 Service: " + bookingForm.service,
        "📅 Date: " + new Date(bookingForm.date + "T12:00:00").toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" }),
        bookingForm.time   ? "⏰ Time: "   + bookingForm.time   : "",
        bookingForm.staff  ? "👤 Staff: "  + bookingForm.staff  : "",
        bookingForm.amount ? "💰 Amount: ₹" + bookingForm.amount : "",
        "", "See you soon! 😊"
      ].filter(l => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n")

      let waSent = false
      if (cleanPhone.length >= 10) {
        try {
          const authHeader = await getAuthHeader()
          if (authHeader) {
            const waRes = await fetch("/api/whatsapp/send", {
              method:"POST",
              headers:{ "Content-Type":"application/json", "Authorization": authHeader },
              body: JSON.stringify({ to: cleanPhone, message: confirmMsg, conversationId: selected.id, customerPhone: custPhone })
            })
            const waResult = await waRes.json()
            if (waResult.success) waSent = true
          }
        } catch(e) { console.warn("WA confirm send failed:", e.message) }
      }

      if (!waSent) {
        const { data: savedMsg } = await supabase.from("messages").insert({
          conversation_id: selected.id, customer_phone: custPhone,
          direction:"outbound", message_type:"text", message_text: confirmMsg,
          status:"saved", is_ai:false, user_id: userId, created_at: new Date().toISOString()
        }).select().single()
        if (savedMsg) setMessages(prev => prev.find(m => m.id === savedMsg.id) ? prev : [...prev, savedMsg])
      }

      await supabase.from("conversations").update({ last_message: confirmMsg, last_message_at: new Date().toISOString() }).eq("id", selected.id)
      setShowBooking(false)
      setBookingForm({ service:"", date:"", time:"", amount:"", staff:"", notes:"" })
      setSavingBooking(false)
      toast.success(waSent ? "Booking saved! Confirmation sent to " + custName : "Booking saved! (WhatsApp send failed — check connection)")
    } catch(e) {
      toast.error("Something went wrong: " + e.message)
      setSavingBooking(false)
    }
  }

  const toggleTheme  = () => { const n = !dark; setDark(n); localStorage.setItem("fastrill-theme", n ? "dark" : "light") }
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); router.push("/login") }
    catch(e) { toast.error("Sign out failed") }
  }

  // Theme
  const bg = dark?"#08080e":"#f0f2f5", sb = dark?"#0c0c15":"#ffffff", card = dark?"#0f0f1a":"#ffffff"
  const bdr = dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)", cbdr = dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const tx = dark?"#eeeef5":"#111827", txm = dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const txf = dark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.25)", ibg = dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const acc = dark?"#00C9B1":"#00897A", adim = dark?"rgba(0,208,132,0.12)":"rgba(0,147,90,0.1)"
  const navText = dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const navActive = dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"
  const navActiveBorder = dark?"rgba(0,196,125,0.2)":"rgba(0,180,115,0.2)"
  const navActiveText = dark?"#00B5A0":"#00897A"
  const ui = userEmail ? userEmail[0].toUpperCase() : "G"
  const inp = { background:ibg, border:"1px solid " + cbdr, borderRadius:8, padding:"9px 12px", fontSize:13, color:tx, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none", width:"100%" }

  const getInitial = n => (n||"?")[0].toUpperCase()
  const getColor   = n => { const c=["#00C9B1","#38bdf8","#a78bfa","#f59e0b","#fb7185"]; return c[(n||"").charCodeAt(0)%c.length] }
  const getMsgText = m => {
    const t = (m.message_text||"").trim()
    if (t && t !== "[media message]") return t
    if (m.message_type && m.message_type !== "text") return "📎 " + m.message_type
    return ""
  }
  const filtered = convos.filter(c => {
    const name = c._displayName || ""
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || (c.last_message||"").toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter==="all" || (filter==="ai"&&c.ai_enabled) || (filter==="human"&&!c.ai_enabled) || filter===c.status
    return matchSearch && matchFilter
  })

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${tx}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;background:${bg};}
        .sidebar{width:224px;flex-shrink:0;background:${sb};border-right:1px solid ${bdr};display:flex;flex-direction:column;overflow-y:auto;}
        .logo{padding:16px 18px;font-weight:800;font-size:20px;color:${tx};text-decoration:none;display:flex;flex-direction:row;align-items:center;gap:10px;border-bottom:1px solid ${bdr};line-height:1;}
        .logo span{color:${acc};}
        .nav-section{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${txf};font-weight:600;}
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
        .theme-toggle{display:flex;align-items:center;gap:6px;padding:5px 10px;background:${ibg};border:1px solid ${cbdr};border-radius:8px;cursor:pointer;font-size:11.5px;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .toggle-pill{width:30px;height:16px;border-radius:100px;background:${dark?acc:"#d1d5db"};position:relative;flex-shrink:0;}
        .toggle-pill::after{content:'';position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;left:${dark?"16px":"2px"};}
        .inbox-wrap{flex:1;display:flex;overflow:hidden;}
        .clist{width:300px;flex-shrink:0;border-right:1px solid ${bdr};display:flex;flex-direction:column;background:${sb};}
        .clist-top{padding:12px;border-bottom:1px solid ${bdr};}
        .search-box{display:flex;align-items:center;gap:7px;background:${ibg};border:1px solid ${cbdr};border-radius:8px;padding:7px 10px;margin-bottom:9px;}
        .search-box input{flex:1;background:transparent;border:none;outline:none;font-size:12.5px;color:${tx};font-family:'Plus Jakarta Sans',sans-serif;}
        .search-box input::placeholder{color:${txf};}
        .filters{display:flex;gap:4px;flex-wrap:wrap;}
        .filter-btn{padding:3px 9px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${cbdr};background:transparent;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .filter-btn.active{background:${adim};border-color:${acc}44;color:${acc};}
        .clist-items{flex:1;overflow-y:auto;}
        .c-item{padding:11px 14px;border-bottom:1px solid ${bdr};cursor:pointer;transition:background 0.1s;}
        .c-item:hover{background:${ibg};}
        .c-item.sel{background:${adim};border-left:2px solid ${acc};}
        .chat-area{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .chat-head{padding:12px 16px;border-bottom:1px solid ${bdr};display:flex;align-items:center;justify-content:space-between;background:${card};flex-shrink:0;}
        .chat-msgs{flex:1;overflow-y:auto;padding:16px 12px;display:flex;flex-direction:column;gap:4px;background:${dark?'#0d1117':'#efeae2'};}
        .msg-row{display:flex;width:100%;}
        .msg-row.inbound{justify-content:flex-start;}
        .msg-row.outbound{justify-content:flex-end;}
        .msg-bubble{max-width:68%;min-width:60px;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap;}
        .msg-bubble.inbound{background:${card};border:1px solid ${cbdr};color:${tx};border-radius:0px 12px 12px 12px;}
        .msg-bubble.outbound-ai{background:${dark?'#005c4b':'#dcf8c6'};border:none;color:${dark?'#e9edef':'#111'};border-radius:12px 0px 12px 12px;}
        .msg-bubble.outbound-human{background:${dark?'#2a2f32':'#dcf8c6'};border:none;color:${dark?'#e9edef':'#111'};border-radius:12px 0px 12px 12px;}
        .msg-time{font-size:10px;color:${txf};margin-top:2px;}
        .msg-from{font-size:10px;font-weight:700;margin-bottom:2px;letter-spacing:0.3px;}
        .chat-input{padding:10px 14px;border-top:1px solid ${bdr};background:${card};display:flex;gap:8px;align-items:center;flex-shrink:0;}
        .msg-field{flex:1;background:${ibg};border:1px solid ${cbdr};border-radius:9px;padding:9px 13px;font-size:13px;color:${tx};font-family:'Plus Jakarta Sans',sans-serif;outline:none;resize:none;}
        .msg-field::placeholder{color:${txf};}
        .send-btn{background:${acc};color:#000;border:none;border-radius:9px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0;}
        .send-btn:disabled{opacity:0.4;cursor:not-allowed;}
        .ai-note{font-size:11px;color:${txf};text-align:center;flex:1;padding:8px;}
        .empty-st{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:${txf};}
        .hbtn{display:none;background:${ibg};border:1px solid ${cbdr};border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:${tx};line-height:1;margin-right:2px;}
        .mob-back-btn{display:none;background:${ibg};border:1px solid ${cbdr};border-radius:8px;padding:5px 10px;cursor:pointer;font-size:13px;color:${tx};font-family:'Plus Jakarta Sans',sans-serif;align-items:center;gap:5px;font-weight:600;margin-right:8px;}
        .mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sb};border-top:1px solid ${bdr};padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;}
        @media(max-width:767px){
          .wrap{position:relative;}
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);transition:transform 0.25s;width:240px!important;box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .sidebar.open{transform:translateX(0);}
          .mob-ov.open{display:block;}
          .hbtn{display:flex;}
          .bnav{display:flex;}
          .main{padding-bottom:calc(58px + env(safe-area-inset-bottom));}
          .topbar{padding:0 12px!important;}
          .clist{width:100%!important;border-right:none!important;}
          .mob-hide-list{display:none!important;}
          .mob-hide-chat{display:none!important;}
          .chat-area{position:fixed!important;inset:0!important;z-index:150!important;}
          .mob-back-btn{display:flex!important;}
        }
        .bni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnic{font-size:17px;color:${navText};}
        .bnil{font-size:9px;font-weight:600;color:${navText};}
        .bni.on .bnic,.bni.on .bnil{color:${acc};}
        select option{background-color:#0c0c15!important;color:#eeeef5!important;}
        textarea:focus,input:focus{border-color:${acc}88!important;}
      `}</style>

      <div className="wrap">
        <div className={"mob-ov" + (mobOpen ? " open" : "")} onClick={() => setMobOpen(false)}/>
        <aside className={"sidebar" + (mobOpen ? " open" : "")}>
          <a href="/dashboard" className="logo"><img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} /><span style={{fontWeight:800,fontSize:20,color:tx,letterSpacing:"-0.3px"}}>fast<span style={{color:acc}}>rill</span></span></a>
          <div className="nav-section">Platform</div>
          {NAV.map(item => (
            <button key={item.id} className={"nav-item" + (item.id === "inbox" ? " active" : "")} onClick={() => router.push(item.path)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="sbf">
            <div className="uc">
              <div className="ua">{ui}</div>
              <div style={{fontSize:11.5, color:txm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{userEmail || "Loading..."}</div>
            </div>
            <button className="lb" onClick={handleLogout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <button className="hbtn" onClick={() => setMobOpen(s => !s)}>☰</button>
              <span style={{fontWeight:700, fontSize:15, color:tx}}>Conversations</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme}>
              <span>{dark ? "🌙" : "☀️"}</span><div className="toggle-pill"/><span>{dark ? "Dark" : "Light"}</span>
            </button>
          </div>

          <div className="inbox-wrap">
            {/* Conversation list */}
            <div className={"clist" + (mobChatOpen ? " mob-hide-list" : "")}>
              <div className="clist-top">
                <div className="search-box">
                  <span style={{color:txf, fontSize:13}}>🔍</span>
                  <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                <div className="filters">
                  {["all","ai","human","open","resolved"].map(f => (
                    <button key={f} className={"filter-btn" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="clist-items">
                {loading ? (
                  <div className="empty-st" style={{height:200}}><span style={{fontSize:12}}>Loading...</span></div>
                ) : filtered.length === 0 ? (
                  <div className="empty-st" style={{height:200}}>
                    <span style={{fontSize:26}}>💬</span>
                    <span style={{fontSize:12}}>No conversations yet</span>
                  </div>
                ) : filtered.map(c => {
                  const name = c._displayName || c.phone
                  const color = getColor(name)
                  return (
                    <div key={c.id} className={"c-item" + (selected?.id === c.id ? " sel" : "")}
                      onClick={() => { setSelected(c); setMessages([]); setMobChatOpen(true) }}>
                      <div style={{display:"flex", alignItems:"center", gap:9, marginBottom:4}}>
                        <div style={{width:34, height:34, borderRadius:9, background:"linear-gradient(135deg," + color + "88," + color + "44)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff", flexShrink:0}}>
                          {getInitial(name)}
                        </div>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:600, fontSize:13, color:tx, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{name}</span>
                            <span style={{fontSize:10.5, color:txf, flexShrink:0, marginLeft:4}}>{formatConvoTime(c.last_message_at)}</span>
                          </div>
                          <div style={{fontSize:12, color:txm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{c.last_message || "No messages"}</div>
                        </div>
                      </div>
                      <div style={{display:"flex", alignItems:"center", gap:5}}>
                        <span style={{fontSize:10, fontWeight:700, color:c.ai_enabled ? acc : "#a78bfa", background:(c.ai_enabled ? acc : "#a78bfa") + "15", padding:"2px 7px", borderRadius:100, border:"1px solid " + (c.ai_enabled ? acc : "#a78bfa") + "33"}}>
                          {c.ai_enabled ? "◈ AI Active" : "👤 Human"}
                        </span>
                        {c.unread_count > 0 && (
                          <span style={{background:acc, color:"#000", fontSize:9, fontWeight:700, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center"}}>
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Chat area */}
            {selected ? (
              <div className={"chat-area" + (!mobChatOpen ? " mob-hide-chat" : "")}>
                <div className="chat-head">
                  <div style={{display:"flex", alignItems:"center", gap:11}}>
                    <button className="mob-back-btn" onClick={() => setMobChatOpen(false)}>← Back</button>
                    <div style={{width:36, height:36, borderRadius:9, background:"linear-gradient(135deg," + getColor(selected._displayName) + "88," + getColor(selected._displayName) + "44)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff"}}>
                      {getInitial(selected._displayName)}
                    </div>
                    <div>
                      <div style={{fontWeight:700, fontSize:14, color:tx}}>{selected._displayName}</div>
                      <div style={{fontSize:11, color:txm}}>{selected.phone}</div>
                    </div>
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <button onClick={() => setShowBooking(true)}
                      style={{display:"flex", alignItems:"center", gap:5, background:adim, border:"1px solid " + acc + "44", borderRadius:8, padding:"6px 12px", fontWeight:700, fontSize:12, color:acc, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                      📅 Book
                    </button>
                    <div style={{display:"flex", alignItems:"center", gap:7, fontSize:12, fontWeight:600, color:txm}}>
                      <span>AI</span>
                      <button
                        role="switch" aria-checked={!!selected.ai_enabled} aria-label="AI auto-reply for this conversation"
                        style={{width:36, height:20, borderRadius:100, position:"relative", cursor:"pointer", border:"none", background:selected.ai_enabled ? acc : "rgba(255,255,255,0.12)", transition:"background 0.2s", flexShrink:0}}
                        onClick={() => toggleAI(selected.id, selected.ai_enabled)}>
                        <span style={{position:"absolute", top:2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 0.2s", left:selected.ai_enabled ? "18px" : "2px", display:"block"}}/>
                      </button>
                      <span style={{color:selected.ai_enabled ? acc : txf, minWidth:24}}>{selected.ai_enabled ? "ON" : "OFF"}</span>
                    </div>
                  </div>
                </div>

                <div className="chat-msgs">
                  {messages.length === 0 ? (
                    <div className="empty-st"><span style={{fontSize:22}}>💬</span><span style={{fontSize:12}}>No messages yet</span></div>
                  ) : messages.map((m, i) => {
                    const dir     = m.direction || "inbound"
                    const isAI    = m.is_ai
                    const bClass  = dir === "inbound" ? "inbound" : isAI ? "outbound-ai" : "outbound-human"
                    const from    = dir === "inbound" ? (selected._displayName || selected.phone) : isAI ? "◈ AI" : "👤 You"
                    const fromCol = dir === "inbound" ? txf : isAI ? acc : "#a78bfa"
                    const msgText = getMsgText(m)
                    if (!msgText && !m.message_type) return null
                    return (
                      <div key={m.id || i} className={"msg-row " + dir}>
                        <div style={{maxWidth:"68%", display:"flex", flexDirection:"column", alignItems: dir==="inbound"?"flex-start":"flex-end"}}>
                          {dir === "inbound" && <div className="msg-from" style={{color:fromCol}}>{from}</div>}
                          <div className={"msg-bubble " + bClass}>
                            {dir === "outbound" && isAI && <span style={{fontSize:"9px", fontWeight:700, color: dark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)", display:"block", marginBottom:"3px", letterSpacing:"0.5px"}}>◈ AI</span>}
                            <span>{msgText || "📎 " + (m.message_type || "Media")}</span>
                            <div style={{display:"flex", alignItems:"center", justifyContent:"flex-end", gap:"3px", marginTop:"3px"}}>
                              <span style={{fontSize:"10px", color: dir==="outbound"?(dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.45)"):"rgba(255,255,255,0.4)", lineHeight:1}}>{formatMsgTime(m.created_at)}</span>
                              {dir === "outbound" && (
                                m.status === "failed"
                                  ? <span style={{fontSize:"11px", color:"#ef4444"}} title="Failed to send">!</span>
                                  : m.status === "read"
                                    ? <span style={{fontSize:"11px", color:dark?"#53bdeb":"#4fc3f7"}} title="Read">✓✓</span>
                                    : m.status === "delivered"
                                      ? <span style={{fontSize:"11px", color:dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.45)"}} title="Delivered">✓✓</span>
                                      : <span style={{fontSize:"11px", color:dark?"rgba(255,255,255,0.55)":"rgba(0,0,0,0.45)"}} title="Sent">✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={msgsEndRef}/>
                </div>

                <div className="chat-input">
                  {selected.ai_enabled ? (
                    <div className="ai-note">◈ AI is handling this conversation — toggle AI OFF to send manually</div>
                  ) : (
                    <>
                      <textarea className="msg-field" placeholder="Type a message..." value={msgInput} rows={1}
                        aria-label="Message text"
                        style={{overflow:"hidden", maxHeight:120}}
                        onChange={e => {
                          setMsgInput(e.target.value)
                          e.target.style.height = "auto"
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                        }}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.style.height = "auto"; sendMsg() } }}/>
                      <button className="send-btn" onClick={sendMsg} disabled={sending || !msgInput.trim()}>
                        {sending ? "..." : "Send"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="chat-area">
                <div className="empty-st">
                  <span style={{fontSize:32}}>💬</span>
                  <span style={{fontSize:14, fontWeight:600}}>Select a conversation</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && selected && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20}}
          onClick={e => { if (e.target === e.currentTarget) setShowBooking(false) }}
          onKeyDown={e => { if (e.key === "Escape") setShowBooking(false) }}>
          <div role="dialog" aria-modal="true" aria-label="Book appointment"
            style={{background:card, border:"1px solid " + cbdr, borderRadius:16, padding:28, width:"100%", maxWidth:440, display:"flex", flexDirection:"column", gap:14, maxHeight:"90vh", overflowY:"auto"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{fontWeight:800, fontSize:16, color:tx}}>📅 Book Appointment</div>
              <button onClick={() => setShowBooking(false)} aria-label="Close booking dialog" style={{background:"transparent", border:"none", color:txf, cursor:"pointer", fontSize:20, padding:"4px 10px"}}>×</button>
            </div>
            <div style={{padding:"10px 12px", background:adim, border:"1px solid " + acc + "33", borderRadius:9, fontSize:13, color:tx}}>
              For: <strong>{selected._displayName || selected.phone}</strong>
            </div>
            <div>
              <div style={{fontSize:11.5, color:txm, marginBottom:5}}>Service *</div>
              <select autoFocus aria-label="Service" value={bookingForm.service} onChange={e => { const svc = services.find(s => s.name === e.target.value); setBookingForm(p => ({...p, service:e.target.value, amount:svc?.price?.toString()||p.amount})) }} style={inp}>
                <option value="">Select service</option>
                {services.map(s => <option key={s.name} value={s.name}>{s.name} — ₹{s.price}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <div>
                <div style={{fontSize:11.5, color:txm, marginBottom:5}}>Date *</div>
                <input type="date" value={bookingForm.date} onChange={e => setBookingForm(p => ({...p, date:e.target.value}))} style={inp} min={new Date().toISOString().split("T")[0]}/>
              </div>
              <div>
                <div style={{fontSize:11.5, color:txm, marginBottom:5}}>Time</div>
                <select value={bookingForm.time} onChange={e => setBookingForm(p => ({...p, time:e.target.value}))} style={inp}>
                  <option value="">Any time</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <div>
                <div style={{fontSize:11.5, color:txm, marginBottom:5}}>Amount (₹)</div>
                <input type="number" placeholder="0" value={bookingForm.amount} onChange={e => setBookingForm(p => ({...p, amount:e.target.value}))} style={inp}/>
              </div>
              <div>
                <div style={{fontSize:11.5, color:txm, marginBottom:5}}>Staff</div>
                <input placeholder="Staff name" value={bookingForm.staff} onChange={e => setBookingForm(p => ({...p, staff:e.target.value}))} style={inp}/>
              </div>
            </div>
            <div style={{fontSize:11.5, color:txf, background:adim, border:"1px solid " + acc + "22", borderRadius:8, padding:"9px 11px"}}>
              ✅ Confirmation will be sent to customer via WhatsApp
            </div>
            <div style={{display:"flex", gap:8}}>
              <button onClick={() => setShowBooking(false)} style={{flex:1, padding:"10px", background:ibg, border:"1px solid " + cbdr, borderRadius:8, color:txm, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cancel</button>
              <button onClick={saveBooking} disabled={savingBooking || !bookingForm.service || !bookingForm.date}
                style={{flex:2, padding:"10px", background:(!bookingForm.service||!bookingForm.date) ? ibg : acc, border:"none", borderRadius:8, color:(!bookingForm.service||!bookingForm.date) ? txf : "#000", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                {savingBooking ? "Saving..." : "✅ Confirm & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bnav">
        {[
          { id:"overview", icon:"⬡", label:"Home",     path:"/dashboard" },
          { id:"inbox",    icon:"◎", label:"Chats",    path:"/dashboard/conversations" },
          { id:"bookings", icon:"◷", label:"Bookings", path:"/dashboard/bookings" },
          { id:"leads",    icon:"◉", label:"Leads",    path:"/dashboard/leads" },
          { id:"contacts", icon:"◑", label:"Customers",path:"/dashboard/contacts" },
        ].map(item => (
          <button key={item.id} className={"bni" + (item.id === "inbox" ? " on" : "")} onClick={() => router.push(item.path)}>
            <span className="bnic">{item.icon}</span>
            <span className="bnil">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
