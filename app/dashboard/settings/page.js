"use client"
export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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

const TABS = [
  { id:"business", label:"Business",    icon:"🏢" },
  { id:"services", label:"Services",    icon:"📋" },
  { id:"ai",       label:"AI Brain",    icon:"🧠" },
  { id:"whatsapp", label:"WhatsApp",    icon:"💬" },
  { id:"billing",  label:"Plan & Billing", icon:"💳" },
  { id:"account",  label:"Account",     icon:"👤" },
]

const LANGUAGES = ["English","Hindi","Telugu","Tamil","Kannada","Malayalam","Marathi","Bengali","Gujarati","Punjabi","Auto-detect"]

const BIZ_TYPES = [
  "Salon","Beauty Parlour","Spa","Hair Studio","Nail Studio","Makeup Studio",
  "Skin Clinic","Dermatology Clinic","Dental Clinic","Ayurvedic Clinic",
  "Physiotherapy Clinic","Yoga Studio","Fitness Studio","Gym","Wellness Center",
  "Real Estate","Healthcare","Consulting","Agency","Restaurant","Food Delivery",
  "Retail","Education","Legal","Finance","Other"
]

const CATEGORIES = ["Hair","Skin","Nails","Bridal","Massage","Body","Dental","Fitness","Ayurveda","Consultation","Membership","Property","Main Course","Starters","Beverages","Desserts","Other"]

const SECTOR_CATEGORIES = {
  "Real Estate":    ["Property","Consultation","Other"],
  "Food Delivery":  ["Main Course","Starters","Beverages","Combos","Desserts","Other"],
  "Restaurant":     ["Main Course","Starters","Beverages","Combos","Desserts","Other"],
  "Healthcare":     ["Consultation","Procedure","Test","Therapy","Other"],
  "Dental Clinic":  ["Consultation","Procedure","Cleaning","Other"],
  "Clinic":         ["Consultation","Procedure","Test","Other"],
  "Consulting":     ["Consultation","Retainer","Project","Other"],
  "Education":      ["Consultation","Course","Batch","Other"],
  "Legal":          ["Consultation","Retainer","Other"],
  "Finance":        ["Consultation","Advisory","Other"],
  "Gym":            ["Membership","Personal Training","Classes","Other"],
  "Yoga Studio":    ["Membership","Classes","Other"],
  "Fitness Studio": ["Membership","Classes","Personal Training","Other"],
}

function getSectorCategories(bizType) {
  return SECTOR_CATEGORIES[bizType] || CATEGORIES
}

const PLANS = [
  {
    id:"starter", name:"Starter", price:"₹999", period:"/month",
    description:"Your 24/7 AI receptionist — never miss an enquiry", color:"#00C9B1",
    usp:"1 WhatsApp number",
    features:[
      "AI replies in under 5 seconds, 24/7",
      "Booking, reschedule & cancel on autopilot",
      "Speaks 10 Indian languages",
      "Full customer & lead CRM",
      "Dashboard & basic analytics",
      "Up to 500 conversations/month",
    ],
    locked:["Appointment reminders","Lead recovery follow-ups","Bulk campaigns","Extra WhatsApp numbers"]
  },
  {
    id:"growth", name:"Growth", price:"₹1,999", period:"/month",
    description:"Recover lost revenue while you sleep", color:"#6366f1", popular:true,
    usp:"Up to 3 WhatsApp numbers",
    features:[
      "Everything in Starter",
      "Connect up to 3 WhatsApp numbers",
      "Appointment reminders (24hr before) — fewer no-shows",
      "Lead recovery — auto follow-up with leads who ghosted",
      "Unlimited conversations",
      "Booking analytics & peak-hour insights",
      "Priority support",
    ],
    locked:["Bulk campaigns","Customer segments"]
  },
  {
    id:"pro", name:"Pro", price:"₹4,999", period:"/month",
    description:"A full marketing engine for multi-branch businesses", color:"#f59e0b",
    usp:"Up to 5 WhatsApp numbers",
    features:[
      "Everything in Growth",
      "Connect up to 5 WhatsApp numbers — one per branch",
      "Bulk WhatsApp campaigns to your whole customer base",
      "Smart customer segments (regulars, VIPs, gone-quiet)",
      "Festival & offer broadcast templates",
      "Advanced analytics & revenue reports",
      "Dedicated support with onboarding call",
    ],
    locked:[]
  },
]

// ── Sector-aware AI instruction placeholders ──────────────────
const SECTOR_PLACEHOLDERS = {
  "Real Estate": `You are a real estate assistant. When a customer enquires:
1. Ask their preferred location
2. Ask budget range (e.g. 30L–50L)
3. Ask BHK requirement (1BHK / 2BHK / 3BHK)
Then suggest the matching property and offer to book a site visit.
Never dump the full list — always qualify first.`,
  "Dental Clinic": `You are a dental clinic assistant.
Ask what dental issue or treatment the customer needs.
Ask if they prefer a specific doctor or any available.
Suggest the relevant service and book a consultation.
For emergencies, offer the earliest slot.`,
  "Physiotherapy Clinic": `You are a physiotherapy assistant.
Ask about the customer's condition (back pain, sports injury, etc).
Suggest the appropriate service and book an initial consultation.
Mention that first consultation includes a full assessment.`,
  "Gym": `You are a gym assistant.
Ask the customer's fitness goal (weight loss, muscle gain, general fitness).
Suggest the appropriate membership or service.
Offer a free trial session to get them started.`,
  "Fitness Studio": `You are a fitness studio assistant.
Ask about the customer's fitness goal and experience level.
Suggest the right class or personal training package.
Book a trial session if they are new.`,
  "Restaurant": `You are a restaurant assistant.
Answer questions about the menu, timings, and reservations.
For table bookings, collect party size, date, and preferred time.
For takeaway, note items and confirm pickup time.`,
  "Food Delivery": `You are a food ordering assistant.
Show the menu when asked. Take the order clearly.
Confirm the delivery address and expected time.
Upsell add-ons or combos when relevant.`,
  "Consulting": `You are a business consulting assistant.
Ask the customer about their business challenge or goal.
Qualify their budget and timeline expectations.
Book a free 30-minute discovery call to discuss further.`,
  "Education": `You are an educational institute assistant.
Ask which course or program the student is interested in.
Ask about their current qualification and goals.
Book a free counselling session or demo class.`,
  "Healthcare": `You are a healthcare clinic assistant.
Ask about the patient's concern or the type of consultation needed.
Suggest the right doctor or service.
Book the earliest convenient appointment.`,
  "Legal": `You are a legal services assistant.
Ask what type of legal matter the customer needs help with.
Offer a brief free consultation call to assess the case.
Book the consultation with the appropriate specialist.`,
  "Finance": `You are a financial services assistant.
Ask about the customer's financial goal (investment, insurance, loan, etc).
Qualify their requirements and risk profile.
Book a free consultation call with an advisor.`,
  "Salon": `You are a salon booking assistant.
Suggest services based on what the customer asks.
Book appointments efficiently — ask for date, time, and stylist if needed.
Mention active offers or packages when relevant.`,
  "Spa": `You are a spa booking assistant.
Recommend treatments based on the customer's needs (relaxation, skin, body, etc).
Book their preferred slot and mention any ongoing packages or offers.`,
}

function getAIPlaceholder(bizType) {
  if (!bizType) return "Describe how the AI should handle your customers — what to ask, what to suggest, how to qualify leads."
  for (const [key, val] of Object.entries(SECTOR_PLACEHOLDERS)) {
    if (bizType.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(bizType.toLowerCase())) {
      return val
    }
  }
  return `You are a ${bizType} assistant. Greet customers warmly, understand their needs, and help them book the right service. Always qualify their requirements before suggesting options.`
}

export default function SettingsPage() {
  const [userId, setUserId]         = useState(null)
  const [userEmail, setUserEmail]   = useState("")
  const [userName, setUserName]     = useState("")
  const [tab, setTab]               = useState("business")
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [planExpired, setPlanExpired] = useState(false)
  const [saveError, setSaveError]   = useState("")
  const [dark, setDark]             = useState(true)
  const [mobOpen, setMobOpen]       = useState(false)
  const [waConn, setWaConn]         = useState(null)
  const [testMsg, setTestMsg]       = useState("")
  const [testReply, setTestReply]   = useState("")
  const [testing, setTesting]       = useState(false)
  const [subscribing, setSubscribing] = useState(null)

  const [currentPlan, setCurrentPlan]                   = useState("trial")
  const [planExpiry, setPlanExpiry]                     = useState(null)
  const [remindersEnabled, setRemindersEnabled]         = useState(false)
  const [leadRecoveryEnabled, setLeadRecoveryEnabled]   = useState(false)
  const [campaignsEnabled, setCampaignsEnabled]         = useState(false)
  const [activeOffer, setActiveOffer]                   = useState("")

  const [business, setBusiness] = useState({
    business_name:"", business_type:"Salon", phone:"", location:"",
    maps_link:"", description:"", working_hours:"", website:"", email:"",
    ai_enabled:true
  })
  const [ai, setAi] = useState({
    ai_language:"English", ai_instructions:"", greeting_message:"",
    auto_booking:true, follow_up_enabled:true, content:"", knowledge:""
  })
  const [services, setServices]   = useState([])
  const [newSvc, setNewSvc]       = useState({ name:"", price:"", duration:"30", category:"Hair", capacity:"1", service_type:"appointment", description:"" })
  const [editingId, setEditingId] = useState(null)
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPass, setChangingPass]       = useState(false)

  // ── Theme ─────────────────────────────────────────────────────
  const bg       = dark ? "#08080e"                : "#f0f2f5"
  const sidebar  = dark ? "#0c0c15"                : "#ffffff"
  const card     = dark ? "#0f0f1a"                : "#ffffff"
  const border   = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const cBorder  = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"
  const text     = dark ? "#eeeef5"                : "#111827"
  const textMuted= dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)"
  const textFaint= dark ? "rgba(255,255,255,0.2)"  : "rgba(0,0,0,0.25)"
  const inputBg  = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
  const accent   = dark ? "#00C9B1"                : "#00897A"
  const navActive      = dark ? "rgba(0,196,125,0.1)"  : "rgba(0,180,115,0.08)"
  const navActiveBorder= dark ? "rgba(0,196,125,0.2)"  : "rgba(0,180,115,0.2)"
  const navActiveText  = dark ? "#00B5A0"              : "#00897A"

  const inp = {
    background: inputBg, border: `1px solid ${cBorder}`, borderRadius: 8,
    padding: "9px 12px", fontSize: 13, color: text,
    fontFamily: "'Plus Jakarta Sans',sans-serif", outline: "none", width: "100%",
    boxSizing: "border-box"
  }
  const btnPrimary = {
    background: accent, color: "#000", border: "none", padding: "9px 20px",
    borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans',sans-serif"
  }
  const lbl = { fontSize: 11.5, color: textMuted, marginBottom: 5, display: "block" }

  function showToast(msg, type="success") {
    if (type === "error") { setSaveError(msg); setTimeout(() => setSaveError(""), 3500) }
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  function planAllows(feature) {
    if (feature === "reminders" || feature === "lead_recovery") return currentPlan === "growth" || currentPlan === "pro"
    if (feature === "campaigns") return currentPlan === "pro"
    return true
  }

  function formatExpiry(dateStr) {
    if (!dateStr) return null
    try { return new Date(dateStr).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" }) }
    catch(e) { return null }
  }

  useEffect(() => {
    const t = localStorage.getItem("fastrill-theme")
    if (t) setDark(t === "dark")
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { window.location.href = "/login"; return }
      setUserId(user.id)
      setUserEmail(user.email || "")
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "")

      // SECURITY FIX: whatsapp_connections query no longer selects "*" —
      // access_token never enters browser state. This page only displays
      // connection status (phone_number_id, waba_id) — it never needed
      // the token in the first place.
      const [{ data: biz }, { data: kn }, { data: svcs }, { data: wa }] = await Promise.all([
        supabase.from("business_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("business_knowledge").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("services").select("*").eq("user_id", user.id).order("category"),
        supabase.from("whatsapp_connections").select("id,phone_number_id,waba_id,connected_at").eq("user_id", user.id).maybeSingle(),
      ])

      if (biz) {
        setBusiness(b => ({ ...b, ...biz }))
        setCurrentPlan(biz.plan || "trial")
        setPlanExpiry(biz.plan_expires_at || null)
        setRemindersEnabled(biz.reminders_enabled || false)
        setLeadRecoveryEnabled(biz.lead_recovery_enabled || false)
        setCampaignsEnabled(biz.campaigns_enabled || false)
        setActiveOffer(biz.active_offer || "")
      }
      if (biz || kn) setAi(a => ({
        ...a,
        ai_language:       biz?.ai_language       || "English",
        ai_instructions:   biz?.ai_instructions   || "",
        greeting_message:  biz?.greeting_message  || "",
        auto_booking:      biz?.auto_booking      !== false,
        follow_up_enabled: biz?.follow_up_enabled !== false,
        content:           kn?.content            || "",
        knowledge:         kn?.knowledge          || "",
      }))
      if (svcs) setServices(svcs)
      if (wa)   setWaConn(wa)
      setLoading(false)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        if (params.get("expired") === "1") { setTab("billing"); setPlanExpired(true) }
      }
    }
    load()
  }, [])

  // `rollback` reverts the optimistic UI toggle if the DB update fails
  async function saveFeatureToggle(field, value, rollback) {
    const { error } = await supabase.from("business_settings").update({ [field]: value }).eq("user_id", userId)
    if (error) {
      if (rollback) rollback()
      showToast("Could not save this setting — please try again", "error")
    }
  }

  async function handleSubscribe(planId) {
    if (!userId) return
    setSubscribing(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch("/api/razorpay/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ plan: planId, userName })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const options = {
        key: data.keyId, subscription_id: data.subscriptionId,
        name: "Fastrill",
        description: "Fastrill " + planId.charAt(0).toUpperCase() + planId.slice(1) + " Plan",
        image: "/logo.png",
        prefill: { email: userEmail, name: userName },
        theme: { color: "#00C9B1" },
        handler: function() {
          showToast("Payment successful! Your plan is being activated...")
          setTimeout(() => window.location.reload(), 3000)
        },
        modal: { ondismiss: function() { setSubscribing(null) } }
      }
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://checkout.razorpay.com/v1/checkout.js"
          script.onload = resolve; script.onerror = reject
          document.body.appendChild(script)
        })
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch(e) { showToast(e.message || "Payment failed. Please try again.", "error") }
    finally { setSubscribing(null) }
  }

  async function saveBusiness() {
    if (!business.business_name?.trim()) { showToast("Business name is required", "error"); return }
    setSaving(true); setSaveError("")
    try {
  
      const { error } = await supabase.from("business_settings").upsert({
        ...business, user_id: userId,
        ai_language: ai.ai_language, ai_instructions: ai.ai_instructions,
        greeting_message: ai.greeting_message, auto_booking: ai.auto_booking,
        follow_up_enabled: ai.follow_up_enabled, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      if (error) throw error
      showToast("Saved ✓")
    } catch(e) { showToast(e.message || "Save failed", "error") }
    finally { setSaving(false) }
  }

  async function saveAI() {
    setSaving(true)
    try {
  
      await Promise.all([
        supabase.from("business_settings").upsert({
          user_id: userId, ai_language: ai.ai_language,
          ai_instructions: ai.ai_instructions, greeting_message: ai.greeting_message,
          auto_booking: ai.auto_booking, follow_up_enabled: ai.follow_up_enabled,
          active_offer: activeOffer
        }, { onConflict: "user_id" }),
        supabase.from("business_knowledge").upsert({
          user_id: userId, content: ai.content, knowledge: ai.knowledge,
          category: "business_info"
        }, { onConflict: "user_id,category" })
      ])
      showToast("AI settings saved ✓")
    } catch(e) { showToast(e.message || "Save failed", "error") }
    finally { setSaving(false) }
  }

  async function addService() {
    if (!newSvc.name.trim() || !newSvc.price) { showToast("Name and price required", "error"); return }
    setSaving(true)
    try {
  
      const isPkg = newSvc.service_type === "package"
      const { data, error } = await supabase.from("services").insert({
        name: newSvc.name.trim(), price: parseFloat(newSvc.price),
        duration: isPkg ? null : parseInt(newSvc.duration),
        category: newSvc.category, capacity: isPkg ? null : parseInt(newSvc.capacity),
        service_type: newSvc.service_type, description: newSvc.description.trim() || null,
        is_active: true, user_id: userId
      }).select().single()
      if (error) throw error
      setServices(s => [...s, data])
      setNewSvc({ name:"", price:"", duration:"30", category:"Hair", capacity:"1", service_type:"appointment", description:"" })
      showToast("Service added ✓")
    } catch(e) { showToast(e.message || "Failed to add", "error") }
    finally { setSaving(false) }
  }

  async function toggleService(id, current) {

    await supabase.from("services").update({ is_active: !current }).eq("id", id)
    setServices(s => s.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  async function deleteService(id) {
    if (!confirm("Delete this service?")) return

    const { error } = await supabase.from("services").delete().eq("id", id)
    if (error) { showToast("Delete failed: " + error.message, "error"); return }
    setServices(s => s.filter(x => x.id !== id))
    showToast("Deleted")
  }

  async function saveService(svc) {

    await supabase.from("services").update({
      name: svc.name, price: parseFloat(svc.price),
      duration: svc.duration ? parseInt(svc.duration) : null,
      description: svc.description, service_type: svc.service_type, category: svc.category
    }).eq("id", svc.id)
    setServices(s => s.map(x => x.id === svc.id ? { ...x, ...svc } : x))
    setEditingId(null)
    showToast("Updated ✓")
  }

  async function testAI() {
    if (!testMsg.trim()) return
    setTesting(true); setTestReply("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: testMsg })
      })
      const data = await res.json()
      setTestReply(data.reply || "No reply received")
    } catch(e) { setTestReply("Error: " + e.message) }
    finally { setTesting(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword.length < 8) { showToast("Min 8 characters", "error"); return }
    if (newPassword !== confirmPassword) { showToast("Passwords don't match", "error"); return }
    setChangingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast("Password updated ✓")
      setNewPassword(""); setConfirmPassword("")
    } catch(e) { showToast(e.message || "Failed", "error") }
    finally { setChangingPass(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const toggleTheme = () => { const n = !dark; setDark(n); localStorage.setItem("fastrill-theme", n ? "dark" : "light") }
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "G"
  const svcBadge = (type) => type === "package"
    ? { color:"#38bdf8", bg:"rgba(56,189,248,0.1)", border:"rgba(56,189,248,0.2)" }
    : { color: accent,   bg: accent+"18",           border: accent+"33" }
  const planColors = { trial: textMuted, starter: "#00C9B1", growth: "#6366f1", pro: "#f59e0b" }
  const planColor  = planColors[currentPlan] || textMuted

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${text}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .s-wrap{display:flex;height:100vh;overflow:hidden;}
        .s-sidebar{width:224px;flex-shrink:0;background:${sidebar};border-right:1px solid ${border};display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;}
        .s-sidebar::-webkit-scrollbar{display:none;}
        .s-logo{padding:16px 18px;font-weight:800;font-size:20px;color:${text};text-decoration:none;display:flex;align-items:center;gap:10px;border-bottom:1px solid ${border};line-height:1;}
        .s-section{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${textFaint};font-weight:600;}
        .s-nav{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${dark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.45)"};font-weight:500;transition:all 0.13s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;text-decoration:none;}
        .s-nav:hover{background:${inputBg};color:${text};}
        .s-nav.active{background:${navActive};color:${navActiveText};font-weight:600;border-color:${navActiveBorder};}
        .s-footer{margin-top:auto;padding:14px;border-top:1px solid ${border};}
        .s-user{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${inputBg};border:1px solid ${cBorder};}
        .s-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${accent},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
        .s-email{font-size:11.5px;color:${textMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .s-logout{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cBorder};font-size:12px;color:${textMuted};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .s-logout:hover{border-color:#fca5a5;color:#ef4444;}
        .s-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .s-topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${border};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sidebar};}
        .s-content{flex:1;overflow-y:auto;padding:20px 24px;background:${bg};}
        .s-tabs{display:flex;gap:0;border-bottom:1px solid ${border};background:${sidebar};flex-shrink:0;padding:0 24px;overflow-x:auto;scrollbar-width:none;}
        .s-tabs::-webkit-scrollbar{display:none;}
        .s-tab{padding:14px 16px;background:transparent;border:none;border-bottom:2px solid transparent;color:${textMuted};font-weight:500;font-size:13px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.12s;display:flex;align-items:center;gap:6px;white-space:nowrap;}
        .s-tab.active{border-bottom-color:${accent};color:${accent};font-weight:700;}
        .s-card{background:${card};border:1px solid ${cBorder};border-radius:13px;padding:22px;margin-bottom:16px;}
        .tog{width:38px;height:22px;border-radius:100px;position:relative;cursor:pointer;border:none;flex-shrink:0;transition:background 0.2s;}
        .tog::after{content:'';position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s;}
        .tog-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid ${border};}
        .plan-card{background:${card};border:1px solid ${cBorder};border-radius:13px;padding:20px;flex:1;min-width:200px;position:relative;transition:border-color 0.2s;}
        .plan-card.current{border-width:2px;}
        .plan-feat{font-size:12px;color:${textMuted};padding:4px 0;display:flex;align-items:center;gap:7px;}
        .plan-locked{font-size:12px;color:${textFaint};padding:4px 0;display:flex;align-items:center;gap:7px;text-decoration:line-through;}
        .hamburger{display:none;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 9px;cursor:pointer;font-size:17px;color:#eeeef5;margin-right:4px;}
        .mob-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        select option{background-color:#0c0c15!important;color:#eeeef5!important;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input:focus,textarea:focus,select:focus{border-color:${accent}88!important;outline:none;}
        @media(max-width:767px){
          .s-sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);transition:transform 0.25s ease;box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .s-sidebar.open{transform:translateX(0);}
          .mob-overlay{display:block;}
          .hamburger{display:flex!important;}
          .s-topbar{padding:0 12px!important;}
          .s-content{padding:12px!important;}
          .s-tabs{padding:0 8px;}
          .s-tab{padding:12px 10px;font-size:12px;}
          .plans-grid{flex-direction:column!important;}
          .two-col{grid-template-columns:1fr!important;}
          .three-col{grid-template-columns:1fr 1fr!important;}
        }
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#0c0c15;border-top:1px solid rgba(255,255,255,0.07);padding:6px 0 calc(6px + env(safe-area-inset-bottom));z-index:200;}
        @media(max-width:767px){.bottom-nav{display:flex;justify-content:space-around;}.s-main{padding-bottom:60px;}}
        .bnav{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;text-decoration:none;}
        .bnav-icon{font-size:17px;color:rgba(255,255,255,0.3);}
        .bnav-label{font-size:9px;font-weight:600;color:rgba(255,255,255,0.3);}
        .bnav.active .bnav-icon,.bnav.active .bnav-label{color:#00C9B1;}
      `}</style>

      <div className="s-wrap">
        {mobOpen && <div className="mob-overlay" onClick={() => setMobOpen(false)} />}

        <aside className={`s-sidebar${mobOpen ? " open" : ""}`}>
          <a href="/dashboard" className="s-logo">
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} />
            <span style={{fontWeight:800,fontSize:20,color:text,letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:accent}}>rill</span></span>
          </a>
          <div className="s-section">Platform</div>
          {NAV.map(n => (
            <a key={n.id} href={n.path} className={`s-nav${n.id === "settings" ? " active" : ""}`}>
              <span style={{fontSize:13,width:18,textAlign:"center"}}>{n.icon}</span>
              <span>{n.label}</span>
            </a>
          ))}
          <div className="s-footer">
            <div className="s-user">
              <div className="s-avatar">{userInitial}</div>
              <div className="s-email">{userEmail || "Loading..."}</div>
            </div>
            <button className="s-logout" onClick={handleLogout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="s-main">
          <div className="s-topbar">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="hamburger" onClick={() => setMobOpen(o => !o)}>☰</button>
              <span style={{fontWeight:700,fontSize:15,color:text}}>Settings</span>
              {currentPlan !== "trial" && (
                <span style={{fontSize:11,fontWeight:700,color:planColor,background:planColor+"18",border:`1px solid ${planColor}33`,borderRadius:100,padding:"2px 10px"}}>
                  {currentPlan.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {(tab === "business" || tab === "ai") && (
                <button onClick={tab === "ai" ? saveAI : saveBusiness} disabled={saving} style={{
                  ...btnPrimary,
                  background: saved ? "#22c55e" : saveError ? "#ef4444" : accent,
                  opacity: saving ? 0.7 : 1
                }}>
                  {saving ? "Saving..." : saved ? "✓ Saved" : saveError ? "✗ Error" : "Save Changes"}
                </button>
              )}
              <button onClick={toggleTheme} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:inputBg,border:`1px solid ${cBorder}`,borderRadius:8,cursor:"pointer",fontSize:11.5,color:textMuted,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                <span>{dark ? "🌙" : "☀️"}</span>
                <div style={{width:30,height:16,borderRadius:100,background:dark?accent:"#d1d5db",position:"relative"}}>
                  <span style={{position:"absolute",top:2,width:12,height:12,borderRadius:"50%",background:"#fff",left:dark?"16px":"2px",transition:"left 0.2s",display:"block"}}/>
                </div>
              </button>
            </div>
          </div>

          {saveError && (
            <div style={{margin:"0 24px",marginTop:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#f87171"}}>
              ⚠️ {saveError}
            </div>
          )}

          {planExpired && (
            <div style={{margin:"0 24px",marginTop:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"12px 16px",fontSize:13,color:"#f87171",display:"flex",alignItems:"center",gap:10}}>
              🔒 <strong>Your plan has expired.</strong> Upgrade below to continue using Fastrill.
            </div>
          )}

          <div className="s-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`s-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="s-content">
            <div style={{maxWidth:720}}>

              {loading ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:12,color:textMuted}}>
                  <div style={{width:20,height:20,border:`2px solid ${accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                  <span style={{fontSize:14}}>Loading settings...</span>
                </div>
              ) : (<>

              {/* ── BUSINESS TAB ── */}
              {tab === "business" && (
                <div className="s-card">
                  <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:16}}>Business Information</div>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="two-col">
                      <div>
                        <label style={lbl}>Business Name *</label>
                        <input value={business.business_name} onChange={e=>setBusiness(b=>({...b,business_name:e.target.value}))} placeholder="e.g. Priya Beauty Salon" style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Business Type</label>
                        <select value={business.business_type} onChange={e=>setBusiness(b=>({...b,business_type:e.target.value}))} style={inp}>
                          {BIZ_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Sector hint */}
                    {business.business_type && (
                      <div style={{padding:"9px 13px",background:inputBg,border:`1px solid ${accent}22`,borderRadius:8,fontSize:12,color:textMuted,lineHeight:1.5}}>
                        💡 <strong style={{color:accent}}>{business.business_type}</strong> detected — go to <strong>AI Brain</strong> tab to see the recommended AI instructions for your sector.
                      </div>
                    )}

                    <div>
                      <label style={lbl}>Location / Address</label>
                      <input value={business.location} onChange={e=>setBusiness(b=>({...b,location:e.target.value}))} placeholder="Shop no, Building, Street, City" style={inp}/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="two-col">
                      <div>
                        <label style={lbl}>Google Maps Link</label>
                        <input value={business.maps_link} onChange={e=>setBusiness(b=>({...b,maps_link:e.target.value}))} placeholder="https://maps.google.com/..." style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Website</label>
                        <input value={business.website} onChange={e=>setBusiness(b=>({...b,website:e.target.value}))} placeholder="https://yoursite.com" style={inp}/>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="two-col">
                      <div>
                        <label style={lbl}>Phone Number</label>
                        <input value={business.phone} onChange={e=>setBusiness(b=>({...b,phone:e.target.value}))} placeholder="+91 98765 43210" style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Business Email</label>
                        <input value={business.email} onChange={e=>setBusiness(b=>({...b,email:e.target.value}))} placeholder="hello@yourbusiness.com" style={inp}/>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Working Hours</label>
                      <input value={business.working_hours} onChange={e=>setBusiness(b=>({...b,working_hours:e.target.value}))} placeholder="Mon–Sat 10am–8pm, Sunday 11am–6pm" style={inp}/>
                    </div>
                    <div>
                      <label style={lbl}>About Your Business <span style={{color:textFaint}}>(AI uses this to answer customer questions)</span></label>
                      <textarea value={business.description} onChange={e=>setBusiness(b=>({...b,description:e.target.value}))} placeholder="Your specialties, experience, certifications, USPs..." rows={3} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SERVICES TAB ── */}
              {tab === "services" && (
                <>
                  <div className="s-card">
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{fontWeight:700,fontSize:14,color:text}}>
                        {["Food Delivery","Restaurant"].includes(business.business_type)?"Add Menu Item":
                         business.business_type==="Real Estate"?"Add Property":
                         "Add Service / Product"}
                      </div>
                      {/* Only show appointment/package toggle for service-based sectors */}
                      {!["Food Delivery","Restaurant","Real Estate","Consulting","Legal","Finance","Education"].includes(business.business_type) && (
                      <div style={{display:"flex",gap:4,background:inputBg,border:`1px solid ${cBorder}`,borderRadius:8,padding:3}}>
                        {[{val:"appointment",label:"Appointment"},{val:"package",label:"Package"}].map(opt=>(
                          <button key={opt.val} onClick={()=>setNewSvc(s=>({...s,service_type:opt.val}))} style={{padding:"5px 12px",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",background:newSvc.service_type===opt.val?(opt.val==="package"?"rgba(56,189,248,0.15)":accent+"22"):"transparent",color:newSvc.service_type===opt.val?(opt.val==="package"?"#38bdf8":accent):textMuted}}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      )}
                    </div>

                    {/* Sector hint for services */}
                    {["Real Estate","Healthcare","Food Delivery"].includes(business.business_type) && (
                      <div style={{marginBottom:14,padding:"9px 13px",background:inputBg,border:`1px solid ${accent}22`,borderRadius:8,fontSize:12,color:textMuted}}>
                        💡 For <strong style={{color:accent}}>{business.business_type}</strong>:
                        {business.business_type==="Real Estate" && " Add your properties as services — e.g. '2BHK Kondapur - Prestige' at ₹45,00,000. Set duration to 60 for the site visit."}
                        {business.business_type==="Healthcare" && " Add consultation types — e.g. 'General Consultation', 'Specialist - Cardiology'. Duration = appointment length."}
                        {business.business_type==="Food Delivery" && " Add your menu items or combos. Duration can be set to delivery time in minutes."}
                      </div>
                    )}

                    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}} className="three-col">
                      <div>
                        <label style={lbl}>
                          {business.business_type==="Real Estate"?"Property Name *":"Service Name *"}
                        </label>
                        <input value={newSvc.name} onChange={e=>setNewSvc(s=>({...s,name:e.target.value}))}
                          placeholder={business.business_type==="Real Estate"?"e.g. 2BHK Kondapur - Prestige Gardens":"e.g. Hair Spa"}
                          style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Price (₹)</label>
                        <input type="number" value={newSvc.price} onChange={e=>setNewSvc(s=>({...s,price:e.target.value}))}
                          placeholder={business.business_type==="Real Estate"?"4500000":"500"}
                          style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Category</label>
                        <select value={newSvc.category} onChange={e=>setNewSvc(s=>({...s,category:e.target.value}))} style={inp}>
                          {getSectorCategories(business.business_type).map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    {newSvc.service_type === "appointment" && (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}} className="two-col">
                        <div>
                          <label style={lbl}>{business.business_type==="Real Estate"?"Visit Duration (min)":"Duration (minutes)"}</label>
                          <select value={newSvc.duration} onChange={e=>setNewSvc(s=>({...s,duration:e.target.value}))} style={inp}>
                            {[15,20,30,45,60,75,90,120,150,180].map(d=><option key={d} value={d}>{d} min</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Capacity</label>
                          <input type="number" min="1" max="20" value={newSvc.capacity} onChange={e=>setNewSvc(s=>({...s,capacity:e.target.value}))} style={inp}/>
                        </div>
                      </div>
                    )}
                    <button onClick={addService} disabled={saving||!newSvc.name||!newSvc.price} style={{...btnPrimary,opacity:saving||!newSvc.name||!newSvc.price?0.5:1}}>
                      {saving?"Adding...":"+ Add"}
                    </button>
                  </div>

                  <div className="s-card" style={{padding:0,overflow:"hidden"}}>
                    <div style={{padding:"12px 16px",borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{fontWeight:700,fontSize:13,color:text}}>
                        {business.business_type==="Real Estate"?"Your Properties":"Your Services"} ({services.length})
                      </div>
                    </div>
                    {services.length === 0 ? (
                      <div style={{textAlign:"center",padding:32,color:textFaint,fontSize:12}}>No services yet — add your first one above</div>
                    ) : CATEGORIES.filter(cat=>services.some(s=>s.category===cat)).map(cat=>(
                      <div key={cat}>
                        <div style={{padding:"7px 16px",background:inputBg,fontSize:10,fontWeight:700,color:textFaint,letterSpacing:"1px",textTransform:"uppercase"}}>{cat}</div>
                        {services.filter(s=>s.category===cat).map(svc=>{
                          const badge=svcBadge(svc.service_type)
                          return(
                            <div key={svc.id} style={{padding:"12px 16px",borderBottom:`1px solid ${border}`,opacity:svc.is_active===false?0.45:1}}>
                              {editingId===svc.id?(
                                <EditService svc={svc} onSave={saveService} onCancel={()=>setEditingId(null)} inp={inp} lbl={lbl} btnPrimary={btnPrimary} border={cBorder} textMuted={textMuted} text={text} inputBg={inputBg}/>
                              ):(
                                <div style={{display:"flex",alignItems:"center",gap:10}}>
                                  <span style={{fontSize:9.5,fontWeight:700,color:badge.color,background:badge.bg,border:`1px solid ${badge.border}`,borderRadius:100,padding:"1px 7px",flexShrink:0}}>
                                    {svc.service_type==="package"?"pkg":"appt"}
                                  </span>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontWeight:600,fontSize:13,color:text}}>{svc.name}</div>
                                    {svc.description&&<div style={{fontSize:11,color:textFaint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc.description}</div>}
                                  </div>
                                  {svc.duration&&<span style={{fontSize:11.5,color:textMuted,flexShrink:0}}>{svc.duration} min</span>}
                                  <span style={{fontWeight:700,fontSize:13,color:accent,flexShrink:0}}>₹{parseInt(svc.price||0).toLocaleString()}</span>
                                  <button onClick={()=>toggleService(svc.id,svc.is_active)} aria-label={(svc.is_active===false?"Enable ":"Disable ")+svc.name} style={{fontSize:10,fontWeight:700,padding:"6px 10px",borderRadius:100,border:`1px solid ${svc.is_active===false?"rgba(251,113,133,0.3)":accent+"44"}`,background:svc.is_active===false?"rgba(251,113,133,0.08)":accent+"08",color:svc.is_active===false?"#fb7185":accent,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                                    {svc.is_active===false?"Off":"On"}
                                  </button>
                                  <button onClick={()=>setEditingId(svc.id)} aria-label={"Edit "+svc.name} style={{background:"transparent",border:"none",color:textMuted,cursor:"pointer",fontSize:11,padding:"8px 10px",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Edit</button>
                                  <button onClick={()=>deleteService(svc.id)} aria-label={"Delete "+svc.name} style={{background:"transparent",border:"none",color:textFaint,cursor:"pointer",fontSize:16,padding:"6px 12px"}}>×</button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── AI BRAIN TAB ── */}
              {tab === "ai" && (
                <>
                  <div className="s-card">
                    <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:16}}>AI Brain Settings</div>

                    <div style={{marginBottom:14}}>
                      <label style={lbl}>Primary Language</label>
                      <select value={ai.ai_language} onChange={e=>setAi(a=>({...a,ai_language:e.target.value}))} style={inp}>
                        {LANGUAGES.map(l=><option key={l}>{l}</option>)}
                      </select>
                    </div>

                    <div className="tog-row" style={{borderBottom:`2px solid ${business.ai_enabled===false?"#ef444433":accent+"33"}`,marginBottom:8,background:business.ai_enabled===false?"rgba(239,68,68,0.06)":"transparent",borderRadius:8,padding:"12px 10px"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:business.ai_enabled===false?"#ef4444":text}}>
                          {business.ai_enabled===false?"🔴 AI is PAUSED":"🟢 AI Assistant"}
                        </div>
                        <div style={{fontSize:11.5,color:textMuted}}>
                          {business.ai_enabled===false
                            ? "AI is not replying to ANY customer right now"
                            : "Turn off to pause AI replies across ALL conversations instantly"}
                        </div>
                      </div>
                      <button className="tog" style={{background:business.ai_enabled!==false?accent:"#ef4444"}}
                        onClick={async()=>{
                          const newVal = business.ai_enabled===false ? true : false
                          setBusiness(b=>({...b,ai_enabled:newVal}))
                      
                          const { error } = await supabase.from("business_settings").update({ai_enabled:newVal}).eq("user_id",userId)
                          if (error) { showToast("Failed to update: "+error.message,"error"); setBusiness(b=>({...b,ai_enabled:!newVal})); return }
                          showToast(newVal?"AI turned ON ✓":"AI paused — no replies will be sent")
                        }}>
                        <span style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",left:business.ai_enabled!==false?"19px":"3px",transition:"left 0.2s",display:"block"}}/>
                      </button>
                    </div>

                    <div className="tog-row">
                      <div>
                        <div style={{fontWeight:600,fontSize:13,color:text}}>Auto Booking</div>
                        <div style={{fontSize:11.5,color:textMuted}}>AI books appointments automatically from WhatsApp</div>
                      </div>
                      <button className="tog" style={{background:ai.auto_booking?accent:"rgba(255,255,255,0.12)"}} onClick={()=>setAi(a=>({...a,auto_booking:!a.auto_booking}))}>
                        <span style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",left:ai.auto_booking?"19px":"3px",transition:"left 0.2s",display:"block"}}/>
                      </button>
                    </div>


                    <div className="tog-row" style={{marginBottom:14}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:13,color:text}}>Follow-up Messages</div>
                        <div style={{fontSize:11.5,color:textMuted}}>AI follows up with inactive leads</div>
                      </div>
                      <button className="tog" style={{background:ai.follow_up_enabled?accent:"rgba(255,255,255,0.12)"}} onClick={()=>setAi(a=>({...a,follow_up_enabled:!a.follow_up_enabled}))}>
                        <span style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",left:ai.follow_up_enabled?"19px":"3px",transition:"left 0.2s",display:"block"}}/>
                      </button>
                    </div>

                    <div style={{marginBottom:14}}>
                      <label style={lbl}>Greeting Message</label>
                      <textarea value={ai.greeting_message} onChange={e=>setAi(a=>({...a,greeting_message:e.target.value}))} rows={3} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
                    </div>

                    {/* SECTOR-AWARE AI INSTRUCTIONS */}
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                        <label style={{...lbl,marginBottom:0}}>
                          AI Instructions
                          <span style={{color:textFaint,fontWeight:400,marginLeft:6}}>(tells AI how to behave for your business)</span>
                        </label>
                        {business.business_type && !ai.ai_instructions && (
                          <button
                            onClick={()=>setAi(a=>({...a,ai_instructions:getAIPlaceholder(business.business_type)}))}
                            style={{fontSize:11,color:accent,background:accent+"12",border:`1px solid ${accent}33`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>
                            Use {business.business_type} template →
                          </button>
                        )}
                      </div>
                      <textarea
                        value={ai.ai_instructions}
                        onChange={e=>setAi(a=>({...a,ai_instructions:e.target.value}))}
                        rows={6}
                        placeholder={getAIPlaceholder(business.business_type)}
                        style={{...inp,resize:"vertical",lineHeight:1.7}}/>
                      <div style={{fontSize:11,color:textFaint,marginTop:5,lineHeight:1.6}}>
                        The AI reads this for every customer conversation. Be specific — how to qualify leads, what to ask, how to handle objections.
                      </div>
                    </div>

                    <div style={{marginBottom:14}}>
                      <label style={lbl}>Knowledge Base <span style={{color:textFaint,fontWeight:400}}>(FAQs, policies, extra info the AI should know)</span></label>
                      <textarea value={ai.content||ai.knowledge} onChange={e=>setAi(a=>({...a,content:e.target.value,knowledge:e.target.value}))} rows={5} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
                    </div>

                    <div style={{padding:"14px 16px",background:inputBg,borderRadius:10,border:`1px solid ${accent}22`}}>
                      <label style={{...lbl,color:accent,fontWeight:700,marginBottom:6}}>
                        🎁 Active Offer
                        <span style={{color:textFaint,fontWeight:400,marginLeft:6}}>(AI mentions this when customers enquire or reply to campaigns)</span>
                      </label>
                      <input
                        value={activeOffer}
                        onChange={e=>setActiveOffer(e.target.value)}
                        placeholder="e.g. 20% off all services this week — valid till Sunday"
                        style={inp}/>
                      <div style={{fontSize:11,color:textMuted,marginTop:6,lineHeight:1.6}}>
                        When a customer says "CLAIM" or asks about an offer, the AI will automatically mention this and help them book. Leave empty if no active offer.
                      </div>
                    </div>
                  </div>

                  <div className="s-card">
                    <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:14}}>Test AI Reply</div>
                    <div style={{display:"flex",gap:10,marginBottom:12}}>
                      <input value={testMsg} onChange={e=>setTestMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&testAI()} placeholder="e.g. I want to book a site visit for 2BHK in Kondapur" style={{...inp,flex:1}}/>
                      <button onClick={testAI} disabled={testing||!testMsg.trim()} style={{...btnPrimary,opacity:testing||!testMsg.trim()?0.5:1}}>
                        {testing?"Testing...":"Test →"}
                      </button>
                    </div>
                    {testReply && (
                      <div style={{background:inputBg,borderRadius:8,padding:14,border:`1px solid ${cBorder}`}}>
                        <div style={{fontSize:11,color:textFaint,marginBottom:6}}>AI Reply:</div>
                        <div style={{fontSize:13.5,color:text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{testReply}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── WHATSAPP TAB ── */}
              {tab === "whatsapp" && (
                <>
                  {waConn ? (
                    <div className="s-card" style={{border:`1px solid ${accent}44`}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                        <div style={{width:44,height:44,borderRadius:11,background:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💬</div>
                        <div>
                          <div style={{fontWeight:800,fontSize:15,color:text}}>WhatsApp Connected ✓</div>
                          <div style={{fontSize:12,color:textMuted}}>Your AI is live and responding to customers</div>
                        </div>
                      </div>
                      {[["Phone Number ID",waConn.phone_number_id],["WABA ID",waConn.waba_id||"—"],["Status","🟢 Active"]].map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${border}`}}>
                          <span style={{fontSize:12,color:textMuted}}>{l}</span>
                          <span style={{fontSize:12,fontWeight:600,color:text,fontFamily:"monospace"}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="s-card" style={{textAlign:"center"}}>
                      <div style={{fontSize:36,marginBottom:12}}>💬</div>
                      <div style={{fontWeight:800,fontSize:16,color:text,marginBottom:6}}>Connect Your WhatsApp</div>
                      <div style={{fontSize:13,color:textMuted,marginBottom:20}}>Link your business WhatsApp to activate AI replies.</div>
                      <button onClick={async ()=>{
                        // Guard: wait until userId is loaded from Supabase session
                        if (!userId) { alert("Please wait a moment and try again."); return }
                        const appId=process.env.NEXT_PUBLIC_META_APP_ID||""
                        const configId=process.env.NEXT_PUBLIC_META_CONFIG_ID||""
                        const redirectUri=(process.env.NEXT_PUBLIC_APP_URL||window.location.origin)+"/api/meta/callback"
                        // Fetch an HMAC-signed, session-bound state from the server.
                        // The callback verifies the signature — a forged state is rejected.
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const res = await fetch("/api/meta/oauth-state", {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${session?.access_token}` }
                          })
                          const d = await res.json()
                          if (!d.state) { alert("Could not start the connection. Please try again."); return }
                          window.location.href=`https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&config_id=${configId}&state=${encodeURIComponent(d.state)}`
                        } catch(e) {
                          alert("Could not start the connection. Please try again.")
                        }
                      }} style={{background:"#1877f2",color:"#fff",border:"none",padding:"11px 24px",borderRadius:9,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                        Connect WhatsApp via Meta →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── BILLING TAB ── */}
              {tab === "billing" && (
                <>
                  <div className="s-card" style={{border:`1px solid ${planColor}44`,marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                      <div>
                        <div style={{fontSize:11,color:textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Current Plan</div>
                        <div style={{fontWeight:800,fontSize:22,color:planColor}}>
                          {currentPlan==="trial"?"Free Trial":"Fastrill "+currentPlan.charAt(0).toUpperCase()+currentPlan.slice(1)}
                        </div>
                        {planExpiry&&(
                          <div style={{fontSize:12,color:textMuted,marginTop:4}}>
                            {new Date(planExpiry)>new Date()?"Renews":"Expired"} on {formatExpiry(planExpiry)}
                          </div>
                        )}
                        {currentPlan==="trial"&&(
                          <div style={{fontSize:12,color:"#f59e0b",marginTop:4}}>Upgrade to unlock reminders, lead recovery and more</div>
                        )}
                      </div>
                      {currentPlan!=="trial"&&(
                        <span style={{fontSize:12,fontWeight:700,color:planColor,background:planColor+"18",border:`1px solid ${planColor}33`,borderRadius:100,padding:"4px 14px"}}>Active</span>
                      )}
                    </div>
                  </div>

                  {currentPlan!=="trial"&&(
                    <div className="s-card" style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:4}}>Feature Controls</div>
                      <div style={{fontSize:12,color:textMuted,marginBottom:16}}>Turn features on or off based on your preference</div>
                      {[
                        {key:"reminders",label:"Appointment Reminders",desc:"Send WhatsApp reminder 24hrs before appointment",plan:"Growth+",state:remindersEnabled,set:setRemindersEnabled,field:"reminders_enabled"},
                        {key:"lead_recovery",label:"Lead Recovery",desc:"Auto follow-up with leads who didn't book",plan:"Growth+",state:leadRecoveryEnabled,set:setLeadRecoveryEnabled,field:"lead_recovery_enabled"},
                        {key:"campaigns",label:"Bulk Campaigns",desc:"Send bulk WhatsApp messages to customer segments",plan:"Pro only",state:campaignsEnabled,set:setCampaignsEnabled,field:"campaigns_enabled"},
                      ].map((f,i)=>(
                        <div key={f.key} className="tog-row" style={i===2?{borderBottom:"none"}:{}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13,color:planAllows(f.key)?text:textFaint}}>
                              {f.label}
                              {!planAllows(f.key)&&<span style={{fontSize:10,color:"#f59e0b",marginLeft:8,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:100,padding:"1px 7px"}}>{f.plan}</span>}
                            </div>
                            <div style={{fontSize:11.5,color:textMuted}}>{f.desc}</div>
                          </div>
                          <button className="tog" disabled={!planAllows(f.key)}
                            style={{background:f.state&&planAllows(f.key)?accent:"rgba(255,255,255,0.12)",opacity:planAllows(f.key)?1:0.4,cursor:planAllows(f.key)?"pointer":"not-allowed"}}
                            role="switch" aria-checked={!!(f.state&&planAllows(f.key))} aria-label={f.label}
                            onClick={async()=>{
                              if(!planAllows(f.key))return
                              const newVal=!f.state; f.set(newVal)
                              await saveFeatureToggle(f.field,newVal,()=>f.set(!newVal))
                            }}>
                            <span style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",left:f.state&&planAllows(f.key)?"19px":"3px",transition:"left 0.2s",display:"block"}}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:14}}>
                    {currentPlan==="trial"?"Choose a Plan":"Upgrade Plan"}
                  </div>
                  <div className="plans-grid" style={{display:"flex",gap:14,alignItems:"stretch",marginBottom:20}}>
                    {PLANS.map(plan=>{
                      const isCurrent=currentPlan===plan.id
                      return(
                        <div key={plan.id} className={`plan-card${isCurrent?" current":""}`} style={{borderColor:isCurrent?plan.color:cBorder}}>
                          {plan.popular&&(
                            <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:700,color:"#fff",background:"#6366f1",borderRadius:100,padding:"2px 12px",whiteSpace:"nowrap"}}>MOST POPULAR</div>
                          )}
                          {isCurrent&&(
                            <div style={{position:"absolute",top:-10,right:16,fontSize:10,fontWeight:700,color:plan.color,background:plan.color+"22",border:`1px solid ${plan.color}44`,borderRadius:100,padding:"2px 10px"}}>CURRENT</div>
                          )}
                          <div style={{fontWeight:800,fontSize:16,color:plan.color,marginBottom:4}}>{plan.name}</div>
                          <div style={{fontSize:11,color:textMuted,marginBottom:12}}>{plan.description}</div>
                          <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:16}}>
                            <span style={{fontWeight:800,fontSize:26,color:text}}>{plan.price}</span>
                            <span style={{fontSize:12,color:textMuted}}>{plan.period}</span>
                          </div>
                          {plan.usp&&(
                            <div style={{display:"inline-block",fontSize:10.5,fontWeight:700,color:plan.color,background:plan.color+"14",border:`1px solid ${plan.color}33`,borderRadius:100,padding:"3px 10px",marginBottom:12}}>
                              📱 {plan.usp}
                            </div>
                          )}
                          {plan.features.map(f=>(
                            <div key={f} className="plan-feat"><span style={{color:plan.color,fontSize:14}}>✓</span> {f}</div>
                          ))}
                          {plan.locked.map(f=>(
                            <div key={f} className="plan-locked"><span style={{fontSize:14}}>✗</span> {f}</div>
                          ))}
                          <button
                            onClick={()=>!isCurrent&&handleSubscribe(plan.id)}
                            disabled={isCurrent||subscribing===plan.id}
                            style={{marginTop:16,width:"100%",padding:"10px",borderRadius:9,fontWeight:700,fontSize:13,cursor:isCurrent?"default":"pointer",border:isCurrent?`1px solid ${plan.color}44`:"none",background:isCurrent?"transparent":plan.color,color:isCurrent?plan.color:"#000",fontFamily:"'Plus Jakarta Sans',sans-serif",opacity:subscribing&&subscribing!==plan.id?0.5:1}}>
                            {subscribing===plan.id?"Opening payment...":isCurrent?"Current Plan":"Upgrade to "+plan.name+" →"}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{fontSize:11.5,color:textFaint,textAlign:"center",lineHeight:1.8}}>
                    All plans include GST. Cancel anytime. Payments secured by Razorpay.
                  </div>
                </>
              )}

              {/* ── ACCOUNT TAB ── */}
              {tab === "account" && (
                <>
                  <div className="s-card">
                    <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:16}}>Account Details</div>
                    <div>
                      <label style={lbl}>Email Address</label>
                      <input value={userEmail} readOnly style={{...inp,opacity:0.6}}/>
                    </div>
                  </div>
                  <div className="s-card">
                    <div style={{fontWeight:700,fontSize:14,color:text,marginBottom:16}}>Change Password</div>
                    <form onSubmit={handleChangePassword}>
                      <div style={{marginBottom:12}}>
                        <label style={lbl}>New Password</label>
                        <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Minimum 8 characters" style={inp}/>
                      </div>
                      <div style={{marginBottom:16}}>
                        <label style={lbl}>Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={{...inp,border:confirmPassword&&confirmPassword!==newPassword?"1px solid #f87171":`1px solid ${cBorder}`}}/>
                        {confirmPassword&&confirmPassword!==newPassword&&<p style={{color:"#f87171",fontSize:11,marginTop:4}}>Passwords do not match</p>}
                      </div>
                      <button type="submit" disabled={changingPass} style={{...btnPrimary,opacity:changingPass?0.7:1}}>
                        {changingPass?"Updating...":"Update Password"}
                      </button>
                    </form>
                  </div>
                  <div className="s-card" style={{border:"1px solid rgba(239,68,68,0.2)"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#f87171",marginBottom:4}}>Danger Zone</div>
                    <div style={{fontSize:13,color:textMuted,marginBottom:16}}>Sign out from all devices</div>
                    <button onClick={handleLogout} style={{...btnPrimary,background:"#dc2626"}}>Sign Out</button>
                  </div>
                </>
              )}

            </>)}
          </div>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        {[
          {id:"overview",icon:"⬡",label:"Home",    path:"/dashboard"},
          {id:"inbox",   icon:"◎",label:"Chats",   path:"/dashboard/conversations"},
          {id:"bookings",icon:"◷",label:"Bookings",path:"/dashboard/bookings"},
          {id:"leads",   icon:"◉",label:"Leads",   path:"/dashboard/leads"},
          {id:"settings",icon:"◌",label:"Settings",path:"/dashboard/settings"},
        ].map(n=>(
          <a key={n.id} href={n.path} className={`bnav${n.id==="settings"?" active":""}`}>
            <span className="bnav-icon">{n.icon}</span>
            <span className="bnav-label">{n.label}</span>
          </a>
        ))}
      </div>
    </>
  )
}

function EditService({ svc, onSave, onCancel, inp, lbl, btnPrimary, border, textMuted, text, inputBg }) {
  const [form, setForm] = useState({ ...svc })
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={lbl}>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>Price (₹)</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>Duration (min)</label><input type="number" value={form.duration||""} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} style={inp}/></div>
        <div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp}>
            {["Hair","Skin","Nails","Bridal","Massage","Body","Dental","Fitness","Ayurveda","Consultation","Membership","Property","Other"].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:10}}><label style={lbl}>Description</label><input value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={inp}/></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(form)} style={{...btnPrimary,fontSize:12,padding:"7px 16px"}}>Save</button>
        <button onClick={onCancel} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${border}`,background:"transparent",color:textMuted,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cancel</button>
      </div>
    </div>
  )
}
