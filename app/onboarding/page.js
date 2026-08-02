"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

const BIZ_TYPES = [
  { id:"Salon",              icon:"✂️",  desc:"Hair, cuts, styling" },
  { id:"Beauty Parlour",     icon:"💄",  desc:"Makeup, skincare" },
  { id:"Spa",                icon:"🧘",  desc:"Massage, wellness" },
  { id:"Dermatology Clinic", icon:"🏥",  desc:"Skin treatments" },
  { id:"Dental Clinic",      icon:"🦷",  desc:"Dental care" },
  { id:"Gym",                icon:"💪",  desc:"Fitness, training" },
  { id:"Yoga Studio",        icon:"🧘",  desc:"Yoga, meditation" },
  { id:"Fitness Studio",     icon:"🏋️",  desc:"Classes, workouts" },
  { id:"Nail Studio",        icon:"💅",  desc:"Nails, nail art" },
  { id:"Makeup Studio",      icon:"💋",  desc:"Bridal, events" },
  { id:"Hair Studio",        icon:"💇",  desc:"Hair specialists" },
  { id:"Clinic",             icon:"🩺",  desc:"General medicine" },
  { id:"Real Estate",        icon:"🏠",  desc:"Properties, site visits" },
  { id:"Healthcare",         icon:"❤️",  desc:"Hospitals, clinics" },
  { id:"Restaurant",         icon:"🍽️",  desc:"Food, dining" },
  { id:"Food Delivery",      icon:"🛵",  desc:"Cloud kitchen, delivery" },
  { id:"Consulting",         icon:"💼",  desc:"Business consulting" },
  { id:"Education",          icon:"📚",  desc:"Coaching, tutoring" },
  { id:"Legal",              icon:"⚖️",  desc:"Legal services" },
  { id:"Finance",            icon:"📊",  desc:"Investment, insurance" },
  { id:"Agency",             icon:"🏢",  desc:"Marketing, services" },
  { id:"Other",              icon:"🏪",  desc:"Other business" },
]

// Sectors where time collection should be skipped in booking flow
const SKIP_TIME_SECTORS = ["Real Estate", "Food Delivery", "Consulting", "Legal", "Finance", "Education"]

// Sector-specific service categories
const SECTOR_CATEGORIES = {
  "Real Estate":    "Property",
  "Food Delivery":  "Main Course",
  "Healthcare":     "Consultation",
  "Dental Clinic":  "Consultation",
  "Clinic":         "Consultation",
  "Consulting":     "Consultation",
  "Education":      "Consultation",
  "Legal":          "Consultation",
  "Finance":        "Consultation",
  "Restaurant":     "Main Course",
  "Gym":            "Membership",
  "Yoga Studio":    "Membership",
  "Fitness Studio": "Membership",
  "default":        "Other",
}

const POPULAR_SERVICES = {
  "Salon":              [{ name:"Haircut",         price:500,  duration:30 },{ name:"Hair Color",       price:1500, duration:90 },{ name:"Hair Spa",         price:800,  duration:60 }],
  "Beauty Parlour":     [{ name:"Facial",          price:800,  duration:60 },{ name:"Threading",        price:50,   duration:15 },{ name:"Waxing",           price:400,  duration:45 }],
  "Spa":                [{ name:"Full Body Massage",price:2000, duration:60 },{ name:"Head Massage",     price:600,  duration:30 },{ name:"Aromatherapy",     price:1500, duration:60 }],
  "Dermatology Clinic": [{ name:"Skin Consultation",price:500, duration:30 },{ name:"Cleanup",          price:1000, duration:45 },{ name:"Detan",            price:800,  duration:30 }],
  "Dental Clinic":      [{ name:"Consultation",    price:300,  duration:30 },{ name:"Cleaning",         price:800,  duration:45 },{ name:"Filling",          price:1500, duration:60 }],
  "Gym":                [{ name:"Monthly Membership",price:1500,duration:30},{ name:"Personal Training",price:800,  duration:60 },{ name:"Diet Consultation", price:500,  duration:30 }],
  "Yoga Studio":        [{ name:"Yoga Class",      price:500,  duration:60 },{ name:"Private Session",  price:1200, duration:60 },{ name:"Monthly Pass",     price:3000, duration:60 }],
  "Fitness Studio":     [{ name:"Group Class",     price:400,  duration:45 },{ name:"PT Session",       price:800,  duration:60 },{ name:"Monthly Pass",     price:2500, duration:60 }],
  "Nail Studio":        [{ name:"Manicure",        price:500,  duration:45 },{ name:"Pedicure",         price:600,  duration:45 },{ name:"Nail Art",         price:800,  duration:60 }],
  "Makeup Studio":      [{ name:"Bridal Makeup",   price:5000, duration:120},{ name:"Party Makeup",     price:2000, duration:60 },{ name:"Everyday Makeup",  price:800,  duration:45 }],
  "Hair Studio":        [{ name:"Haircut",         price:600,  duration:30 },{ name:"Hair Treatment",   price:2000, duration:90 },{ name:"Hair Color",       price:2000, duration:120}],
  "Clinic":             [{ name:"General Consultation",price:300,duration:30},{ name:"Follow-up",       price:200,  duration:20 },{ name:"Health Checkup",   price:800,  duration:45 }],
  "Healthcare":         [{ name:"General Consultation",price:500,duration:30},{ name:"Specialist Consultation",price:1000,duration:30},{ name:"Health Checkup",price:1500,duration:60}],
  "Agency":             [{ name:"Consultation",    price:2000, duration:60 },{ name:"Monthly Retainer", price:15000,duration:60 },{ name:"Project",          price:50000,duration:60 }],
  "Consulting":         [{ name:"Discovery Call",  price:0,    duration:30 },{ name:"Strategy Session", price:5000, duration:60 },{ name:"Monthly Retainer", price:20000,duration:60 }],
  "Education":          [{ name:"Demo Class",      price:0,    duration:60 },{ name:"Monthly Batch",    price:3000, duration:60 },{ name:"One-on-One Session",price:800,  duration:60 }],
  "Legal":              [{ name:"Free Consultation",price:0,   duration:30 },{ name:"Case Consultation",price:2000, duration:60 },{ name:"Document Review",  price:1500, duration:60 }],
  "Finance":            [{ name:"Free Consultation",price:0,   duration:30 },{ name:"Financial Planning",price:2000,duration:60 },{ name:"Investment Advisory",price:3000,duration:60}],
  "Restaurant":         [{ name:"Table Booking",   price:0,    duration:60 },{ name:"Private Dining",   price:2000, duration:120}],
  "Food Delivery":      [{ name:"Thali",           price:120,  duration:30 },{ name:"Biryani",          price:180,  duration:30 },{ name:"Combo Meal",       price:150,  duration:30 }],
  "Real Estate":        [
    { name:"2BHK Site Visit",  price:0, duration:60 },
    { name:"3BHK Site Visit",  price:0, duration:60 },
    { name:"Villa Site Visit", price:0, duration:90 },
  ],
}

// Sector-aware AI instruction templates
const SECTOR_AI_INSTRUCTIONS = {
  "Real Estate": `You are a real estate assistant. When a customer enquires:
1. Ask their preferred location
2. Ask budget range (e.g. 30L–50L)
3. Ask BHK requirement (1BHK / 2BHK / 3BHK)
Then suggest the matching property and offer to book a site visit.
Never dump the full list — always qualify first.`,
  "Food Delivery": `You are a food ordering assistant. Show the menu when asked.
Take the order clearly, confirm delivery address and expected time.
Upsell combos or add-ons when relevant.`,
  "Healthcare": `You are a healthcare assistant. Ask about the patient's concern.
Suggest the right doctor or service and book the earliest convenient slot.`,
  "Dental Clinic": `You are a dental clinic assistant. Ask what dental issue or treatment the customer needs.
Suggest the relevant service and book a consultation. For emergencies, offer the earliest slot.`,
  "Consulting": `You are a consulting assistant. Ask about the customer's business challenge.
Qualify their requirements and book a free discovery call.`,
  "Legal": `You are a legal services assistant. Ask what type of legal matter the customer needs help with.
Offer a brief free consultation to assess the case.`,
  "Finance": `You are a financial services assistant. Ask about the customer's financial goal.
Qualify their requirements and book a free consultation with an advisor.`,
  "Education": `You are an education assistant. Ask which course or program the student is interested in.
Ask about their current qualification and goals. Book a free demo class.`,
  "Restaurant": `You are a restaurant assistant. Answer questions about the menu and timings.
For table bookings, collect party size, date, and preferred time.`,
  "Salon": `You are a salon booking assistant. Suggest services based on what the customer asks.
Book appointments efficiently — ask for date, time, and stylist if needed.
Mention active offers or packages when relevant.`,
}

const LANGUAGES = ["English","Hindi","Telugu","Tamil","Kannada","Malayalam","Marathi","Bengali","Gujarati","Punjabi"]
const STEPS     = ["Business","Services","AI Setup","WhatsApp"]

export default function OnboardingPage() {
  const [step,   setStep]   = useState(0)
  const [userId, setUserId] = useState(null)
  const [loading,setLoading]= useState(true)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  // Step 1
  const [bizName,  setBizName]  = useState("")
  const [bizType,  setBizType]  = useState("")
  const [location, setLocation] = useState("")
  const [hours,    setHours]    = useState("")
  const [phone,    setPhone]    = useState("")

  // Step 2
  const [services,   setServices]   = useState([])
  const [customSvc,  setCustomSvc]  = useState({ name:"", price:"", duration:"30" })

  // Step 3
  const [language,     setLanguage]     = useState("English")
  const [instructions, setInstructions] = useState("")

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { window.location.href = "/login"; return }
      setUserId(user.id)
      const { data: biz } = await supabase
        .from("business_settings").select("business_name")
        .eq("user_id", user.id).maybeSingle()
      if (biz?.business_name) { window.location.href = "/dashboard"; return }
      // No row yet means the post-signup init never ran (failed fetch,
      // closed tab, OTP edge case). Provision it here so the upserts
      // below have a plan-bearing row to land on.
      if (!biz) {
        try {
          await fetch("/api/onboarding/init", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            }
          })
        } catch {}
      }
      setLoading(false)
    }
    init()
  }, [])

  // Auto-load popular services + AI instructions when biz type selected
  useEffect(() => {
    if (!bizType) { setServices([]); return }
    const preset = POPULAR_SERVICES[bizType] || []
    setServices(preset.map(s => ({ ...s, selected: true })))
    // Auto-fill AI instructions if empty
    if (!instructions && SECTOR_AI_INSTRUCTIONS[bizType]) {
      setInstructions(SECTOR_AI_INSTRUCTIONS[bizType])
    }
  }, [bizType])

  const skipTime      = SKIP_TIME_SECTORS.includes(bizType)
  const showDuration  = !skipTime
  const svcCategory   = SECTOR_CATEGORIES[bizType] || SECTOR_CATEGORIES["default"]

  // upsert(onConflict:"user_id") needs a UNIQUE constraint on user_id
  // (added in migration 002). If the DB doesn't have it yet, fall back
  // to update-then-insert so onboarding data is never silently lost.
  async function saveSettings(fields) {
    const payload = { user_id: userId, ...fields, updated_at: new Date().toISOString() }
    const { error } = await supabase.from("business_settings")
      .upsert(payload, { onConflict: "user_id" })
    if (!error) return
    const { data: existing } = await supabase.from("business_settings")
      .select("user_id").eq("user_id", userId).maybeSingle()
    const fallback = existing
      ? await supabase.from("business_settings").update(payload).eq("user_id", userId)
      : await supabase.from("business_settings").insert(payload)
    if (fallback.error) throw fallback.error
  }

  async function saveStep1() {
    if (!bizName.trim()) { setError("Please enter your business name"); return false }
    if (!bizType)        { setError("Please select your business type"); return false }
    setSaving(true); setError("")
    try {
      await saveSettings({
        business_name: bizName.trim(),
        business_type: bizType,
        location:      location.trim(),
        working_hours: hours.trim(),
        phone:         phone.trim(),
      })
      return true
    } catch(e) { setError(e.message || "Save failed"); return false }
    finally { setSaving(false) }
  }

  async function saveStep2() {
    const selected = services.filter(s => s.selected)
    if (!selected.length) { setError("Please add at least one service"); return false }
    setSaving(true); setError("")
    try {
      await supabase.from("services").delete().eq("user_id", userId)
      const rows = selected.map(s => ({
        user_id:      userId,
        name:         s.name,
        price:        parseInt(s.price) || 0,
        duration:     skipTime ? null : (parseInt(s.duration) || 30),
        service_type: "appointment",
        category:     svcCategory,
        is_active:    true,
        created_at:   new Date().toISOString()
      }))
      const { error } = await supabase.from("services").insert(rows)
      if (error) throw error
      return true
    } catch(e) { setError(e.message || "Save failed"); return false }
    finally { setSaving(false) }
  }

  async function saveStep3() {
    setSaving(true); setError("")
    try {
      await saveSettings({
        ai_language:     language,
        ai_instructions: instructions.trim(),
      })
      return true
    } catch(e) { setError(e.message || "Save failed"); return false }
    finally { setSaving(false) }
  }

  async function handleNext() {
    setError("")
    let ok = true
    if      (step === 0) ok = await saveStep1()
    else if (step === 1) ok = await saveStep2()
    else if (step === 2) ok = await saveStep3()
    if (ok) {
      if (step < 3) setStep(s => s + 1)
      else window.location.href = "/dashboard"
    }
  }

  function addCustomService() {
    if (!customSvc.name.trim() || !customSvc.price) return
    setServices(s => [...s, { ...customSvc, selected: true }])
    setCustomSvc({ name:"", price:"", duration:"30" })
  }

  const bg     = "#08080e"
  const card   = "#0f0f1a"
  const border = "rgba(255,255,255,0.08)"
  const text   = "#eeeef5"
  const muted  = "rgba(255,255,255,0.45)"
  const accent = "#00C9B1"
  const inp    = {
    width:"100%", padding:"10px 12px", borderRadius:8,
    border:"1px solid "+border, background:"rgba(255,255,255,0.04)",
    color:text, fontSize:14, outline:"none", boxSizing:"border-box",
    fontFamily:"'Plus Jakarta Sans',sans-serif"
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:32,height:32,border:"3px solid "+accent,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <div style={{color:muted,fontSize:14}}>Loading...</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
                *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${bg};font-family:'Plus Jakarta Sans',sans-serif;color:${text};}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .biz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
        .biz-card{padding:14px;border-radius:10px;border:1px solid ${border};background:rgba(255,255,255,0.03);cursor:pointer;transition:all 0.15s;text-align:center;}
        .biz-card:hover{border-color:${accent}44;background:${accent}08;}
        .biz-card.selected{border-color:${accent};background:${accent}15;}
        .biz-icon{font-size:24px;margin-bottom:6px;}
        .biz-name{font-size:12px;font-weight:600;color:${text};}
        .biz-desc{font-size:10px;color:${muted};margin-top:2px;}
        .svc-list{display:flex;flex-direction:column;gap:8px;}
        .svc-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${border};background:rgba(255,255,255,0.03);}
        .svc-check{width:18px;height:18px;border-radius:4px;border:1.5px solid ${border};background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .svc-check.on{background:${accent};border-color:${accent};}
        .lang-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .lang-btn{padding:9px;border-radius:8px;border:1px solid ${border};background:rgba(255,255,255,0.03);color:${muted};font-size:13px;cursor:pointer;transition:all 0.12s;font-family:'Plus Jakarta Sans',sans-serif;}
        .lang-btn.on{border-color:${accent};background:${accent}15;color:${accent};font-weight:600;}
        select option{background:#0f0f1a!important;color:#eeeef5!important;}
        input:focus,textarea:focus,select:focus{border-color:${accent}88!important;outline:none;}
        @media(max-width:480px){.biz-grid{grid-template-columns:repeat(2,1fr);}.lang-grid{grid-template-columns:repeat(2,1fr);}}
      `}</style>

      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{width:"100%",maxWidth:"560px"}}>

          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:"32px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
              <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}}/>
              <span style={{fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:"#00C9B1"}}>rill</span></span>
            </div>
            <p style={{color:muted,fontSize:"14px",marginTop:"6px"}}>Let's set up your AI receptionist</p>
          </div>

          {/* Progress */}
          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px"}}>
            {STEPS.map((_,i)=>(
              <div key={i} style={{flex:1,height:"4px",borderRadius:"2px",background:i<=step?accent:border,transition:"background 0.3s"}}/>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"24px"}}>
            {STEPS.map((s,i)=>(
              <span key={i} style={{fontSize:"11px",color:i===step?accent:muted,fontWeight:i===step?600:400}}>{s}</span>
            ))}
          </div>

          {/* Card */}
          <div style={{background:card,border:"1px solid "+border,borderRadius:"16px",padding:"28px"}}>

            {error && (
              <div style={{background:"#2d1515",border:"1px solid #f87171",borderRadius:"8px",padding:"10px 14px",marginBottom:"16px",color:"#f87171",fontSize:"13px"}}>
                {error}
              </div>
            )}

            {/* ── STEP 0: Business Info ── */}
            {step === 0 && (
              <>
                <h2 style={{fontSize:"18px",fontWeight:"700",marginBottom:"6px"}}>About your business</h2>
                <p style={{color:muted,fontSize:"13px",marginBottom:"20px"}}>Your AI will use this to answer customer questions</p>

                <div style={{marginBottom:"14px"}}>
                  <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"5px"}}>Business name *</label>
                  <input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="e.g. Priya Beauty Salon" style={inp}/>
                </div>

                <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"8px"}}>Business type *</label>
                <div className="biz-grid" style={{marginBottom:"16px"}}>
                  {BIZ_TYPES.map(t=>(
                    <div key={t.id} className={"biz-card"+(bizType===t.id?" selected":"")} onClick={()=>setBizType(t.id)}>
                      <div className="biz-icon">{t.icon}</div>
                      <div className="biz-name">{t.id}</div>
                      <div className="biz-desc">{t.desc}</div>
                    </div>
                  ))}
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                  <div>
                    <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"5px"}}>Location / Address</label>
                    <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Shop address" style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"5px"}}>Phone number</label>
                    <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" style={inp}/>
                  </div>
                </div>

                <div>
                  <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"5px"}}>Working hours</label>
                  <input value={hours} onChange={e=>setHours(e.target.value)} placeholder="Mon-Sat 10am-8pm, Sun 11am-6pm" style={inp}/>
                </div>
              </>
            )}

            {/* ── STEP 1: Services ── */}
            {step === 1 && (
              <>
                <h2 style={{fontSize:"18px",fontWeight:"700",marginBottom:"6px"}}>
                  {bizType==="Real Estate"?"Your properties":bizType==="Food Delivery"?"Your menu items":"Your services"}
                </h2>
                <p style={{color:muted,fontSize:"13px",marginBottom:skipTime?"8px":"20px"}}>
                  {bizType==="Real Estate"
                    ? "Add the properties you want to show — customers will book site visits"
                    : bizType==="Food Delivery"
                    ? "Add your main items — customers will enquire and order via WhatsApp"
                    : "Select the services you offer — you can add more in settings"}
                </p>

                {/* Sector hint for real estate */}
                {skipTime && (
                  <div style={{marginBottom:"16px",padding:"10px 13px",background:accent+"0a",border:"1px solid "+accent+"22",borderRadius:"8px",fontSize:"12px",color:muted,lineHeight:1.6}}>
                    💡 For <strong style={{color:accent}}>{bizType}</strong>: time slots are not needed — the AI will book and your team confirms timing separately.
                  </div>
                )}

                {services.length > 0 && (
                  <div className="svc-list" style={{marginBottom:"16px"}}>
                    {services.map((svc,i)=>(
                      <div key={i} className="svc-row">
                        <div className={"svc-check"+(svc.selected?" on":"")}
                          onClick={()=>setServices(s=>s.map((x,j)=>j===i?{...x,selected:!x.selected}:x))}>
                          {svc.selected&&<span style={{color:"#000",fontSize:"12px",fontWeight:"700"}}>✓</span>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"13px",fontWeight:"600",color:text}}>{svc.name}</div>
                          <div style={{fontSize:"11px",color:muted}}>
                            {parseInt(svc.price)>0?`₹${svc.price}`:"Free"}
                            {!skipTime&&` · ${svc.duration} min`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"14px",border:"1px solid "+border}}>
                  <div style={{fontSize:"12px",color:muted,marginBottom:"10px",fontWeight:"600"}}>
                    {bizType==="Real Estate"?"Add property":"Add custom service"}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:showDuration?"2fr 1fr 1fr":"2fr 1fr",gap:"8px",marginBottom:"8px"}}>
                    <input
                      value={customSvc.name}
                      onChange={e=>setCustomSvc(s=>({...s,name:e.target.value}))}
                      placeholder={bizType==="Real Estate"?"e.g. 2BHK Kondapur":bizType==="Food Delivery"?"e.g. Chicken Biryani":"Service name"}
                      style={{...inp,fontSize:12}}/>
                    <input
                      type="number" value={customSvc.price}
                      onChange={e=>setCustomSvc(s=>({...s,price:e.target.value}))}
                      placeholder={bizType==="Real Estate"?"₹ Price (0=free)":"₹ Price"}
                      style={{...inp,fontSize:12}}/>
                    {showDuration && (
                      <input type="number" value={customSvc.duration}
                        onChange={e=>setCustomSvc(s=>({...s,duration:e.target.value}))}
                        placeholder="Mins" style={{...inp,fontSize:12}}/>
                    )}
                  </div>
                  <button
                    onClick={addCustomService}
                    disabled={!customSvc.name||!customSvc.price&&bizType!=="Real Estate"}
                    style={{padding:"8px 16px",borderRadius:"7px",border:"none",background:accent,color:"#000",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    + Add
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: AI Setup ── */}
            {step === 2 && (
              <>
                <h2 style={{fontSize:"18px",fontWeight:"700",marginBottom:"6px"}}>AI configuration</h2>
                <p style={{color:muted,fontSize:"13px",marginBottom:"20px"}}>Your AI speaks all 10 Indian languages — set your default</p>

                <label style={{display:"block",fontSize:"12px",color:muted,marginBottom:"8px"}}>Default language</label>
                <div className="lang-grid" style={{marginBottom:"20px"}}>
                  {LANGUAGES.map(l=>(
                    <button key={l} className={"lang-btn"+(language===l?" on":"")} onClick={()=>setLanguage(l)}>{l}</button>
                  ))}
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"5px"}}>
                  <label style={{fontSize:"12px",color:muted}}>
                    AI instructions <span style={{color:"rgba(255,255,255,0.2)"}}>(optional)</span>
                  </label>
                  {bizType && !instructions && SECTOR_AI_INSTRUCTIONS[bizType] && (
                    <button
                      onClick={()=>setInstructions(SECTOR_AI_INSTRUCTIONS[bizType])}
                      style={{fontSize:11,color:accent,background:accent+"12",border:"1px solid "+accent+"33",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600}}>
                      Use {bizType} template →
                    </button>
                  )}
                </div>
                <textarea
                  value={instructions}
                  onChange={e=>setInstructions(e.target.value)}
                  placeholder={
                    bizType && SECTOR_AI_INSTRUCTIONS[bizType]
                      ? SECTOR_AI_INSTRUCTIONS[bizType]
                      : "Examples:\n• Always be warm and use customer's name\n• Mention any active offers\n• Free parking available in basement"
                  }
                  rows={6}
                  style={{...inp,resize:"vertical",lineHeight:1.6}}/>

                <div style={{marginTop:"14px",padding:"12px 14px",background:accent+"0a",border:"1px solid "+accent+"22",borderRadius:"9px",fontSize:"12px",color:muted,lineHeight:1.7}}>
                  💡 <strong style={{color:text}}>The more you add, the smarter your AI gets.</strong> You can always update this from Settings → AI Brain.
                </div>
              </>
            )}

            {/* ── STEP 3: WhatsApp ── */}
            {step === 3 && (
              <>
                <h2 style={{fontSize:"18px",fontWeight:"700",marginBottom:"6px"}}>Connect WhatsApp</h2>
                <p style={{color:muted,fontSize:"13px",marginBottom:"24px"}}>Link your WhatsApp Business account to activate AI replies</p>

                <div style={{background:"rgba(37,211,102,0.06)",border:"1px solid rgba(37,211,102,0.2)",borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                    <div style={{width:"44px",height:"44px",borderRadius:"11px",background:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0}}>💬</div>
                    <div>
                      <div style={{fontWeight:"700",fontSize:"15px"}}>WhatsApp Business API</div>
                      <div style={{color:muted,fontSize:"12px"}}>Via Meta Business Manager</div>
                    </div>
                  </div>
                  <div style={{fontSize:"12px",color:muted,lineHeight:1.7,marginBottom:"16px"}}>
                    You'll be redirected to Facebook to authorize Fastrill to use your WhatsApp Business number. This takes about 2 minutes.
                  </div>
                  <button
                    onClick={()=>{
                      const appId    = process.env.NEXT_PUBLIC_META_APP_ID
                      const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID
                      if (!appId || !configId) { alert("Meta App ID not configured"); return }
                      const appUrl   = process.env.NEXT_PUBLIC_APP_URL        || window.location.origin
                      const redirect = encodeURIComponent(appUrl+"/api/meta/callback")
                      window.location.href=`https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&response_type=code&config_id=${configId}&state=${userId}`
                    }}
                    style={{width:"100%",padding:"12px",borderRadius:"9px",border:"none",background:"#1877f2",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    Connect WhatsApp via Meta →
                  </button>
                </div>

                <button
                  onClick={()=>{ window.location.href="/dashboard" }}
                  style={{width:"100%",padding:"10px",borderRadius:"8px",border:"1px solid "+border,background:"transparent",color:muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  Skip for now — connect later from Settings
                </button>
              </>
            )}

            {/* Navigation */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"24px"}}>
              {step > 0 ? (
                <button
                  onClick={()=>{setStep(s=>s-1);setError("")}}
                  style={{padding:"10px 20px",borderRadius:"8px",border:"1px solid "+border,background:"transparent",color:muted,fontSize:"13px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  ← Back
                </button>
              ) : <div/>}
              {step < 3 && (
                <button
                  onClick={handleNext}
                  disabled={saving}
                  style={{padding:"11px 28px",borderRadius:"9px",border:"none",background:saving?"rgba(0,208,132,0.4)":accent,color:"#000",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  {saving?"Saving...":step===2?"Save & Connect WhatsApp →":"Continue →"}
                </button>
              )}
            </div>

          </div>

          <p style={{textAlign:"center",marginTop:"16px",color:muted,fontSize:"12px"}}>
            You can change everything later from the Settings page
          </p>

        </div>
      </div>
    </>
  )
}
