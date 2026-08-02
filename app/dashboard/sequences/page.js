"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { usePlanGuard } from "@/lib/hooks/usePlanGuard"

const NAV = [
  { id:"overview",   label:"Revenue Engine", icon:"⬡", path:"/dashboard" },
  { id:"inbox",      label:"Conversations",  icon:"◎", path:"/dashboard/conversations" },
  { id:"bookings",   label:"Bookings",       icon:"◷", path:"/dashboard/bookings" },
  { id:"campaigns",  label:"Campaigns",      icon:"◆", path:"/dashboard/campaigns" },
  { id:"sequences",  label:"Sequences",      icon:"⟳", path:"/dashboard/sequences" },
  { id:"leads",      label:"Lead Recovery",  icon:"◉", path:"/dashboard/leads" },
  { id:"contacts",   label:"Customers",      icon:"◑", path:"/dashboard/contacts" },
  { id:"analytics",  label:"Analytics",      icon:"▦", path:"/dashboard/analytics" },
  { id:"settings",   label:"Settings",       icon:"◌", path:"/dashboard/settings" },
]

const TRIGGERS = [
  { value:"manual",          label:"Manual",           desc:"Enroll leads manually" },
  { value:"lead_recovery",   label:"Lead Recovery",    desc:"Auto-enroll cold leads" },
  { value:"no_booking_3d",   label:"No Booking (3d)",  desc:"Lead didn't book in 3 days" },
  { value:"no_booking_7d",   label:"No Booking (7d)",  desc:"Lead didn't book in 7 days" },
  { value:"post_booking",    label:"After Booking",    desc:"Follow up after appointment" },
]

const EMPTY_STEP = { day: 0, template_name: "", label: "", language: "en" }
const EMPTY_SEQ  = { name: "", description: "", trigger: "manual", steps: [] }

export default function SequencesPage() {
  usePlanGuard()
  const router = useRouter()

  const [userId,   setUserId]   = useState(null)
  const [userEmail,setUserEmail]= useState("")
  const [dark,     setDark]     = useState(true)
  const [mobOpen,  setMobOpen]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  // Data
  const [sequences,    setSequences]    = useState([])
  const [enrollments,  setEnrollments]  = useState([])
  const [templates,    setTemplates]    = useState([]) // approved Meta templates
  const [waConn,       setWaConn]       = useState(null)

  // Views: "list" | "create" | "detail"
  const [view,         setView]         = useState("list")
  const [activeSeq,    setActiveSeq]    = useState(null) // for detail view

  // Create form
  const [form,         setForm]         = useState(EMPTY_SEQ)
  const [steps,        setSteps]        = useState([{ ...EMPTY_STEP }])
  const [saving,       setSaving]       = useState(false)
  const [saveMsg,      setSaveMsg]      = useState("")

  // Enroll panel
  const [enrollOpen,   setEnrollOpen]   = useState(false)
  const [enrollSeqId,  setEnrollSeqId]  = useState(null)
  const [enrollPhones, setEnrollPhones] = useState("")
  const [enrollName,   setEnrollName]   = useState("")
  const [enrolling,    setEnrolling]    = useState(false)

  // ── Theme ─────────────────────────────────────────────────────
  const bg   = dark ? "#08080e" : "#f0f2f5"
  const sb   = dark ? "#0c0c15" : "#ffffff"
  const card = dark ? "#0f0f1a" : "#ffffff"
  const bdr  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const cbdr = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"
  const tx   = dark ? "#eeeef5" : "#111827"
  const txm  = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)"
  const txf  = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)"
  const ibg  = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
  const acc  = dark ? "#00C9B1" : "#00897A"
  const adim = dark ? "rgba(0,201,177,0.1)" : "rgba(0,137,122,0.08)"

  const inp = {
    background: ibg, border: `1px solid ${cbdr}`, borderRadius: 8,
    padding: "9px 12px", fontSize: 13, color: tx,
    fontFamily: "'Plus Jakarta Sans',sans-serif", outline: "none", width: "100%",
    boxSizing: "border-box"
  }
  const lbl = { fontSize: 11.5, color: txm, marginBottom: 5, display: "block" }

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("fastrill-theme")
    if (saved) setDark(saved === "dark")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push("/login")
      else { setUserEmail(session.user.email || ""); setUserId(session.user.id) }
    })
  }, [])

  useEffect(() => { if (userId) init() }, [userId])

  // SECURITY FIX: whatsapp_connections query no longer selects "*" —
  // access_token never enters browser state. Only safe metadata fetched.
  async function init() {
    setLoading(true)
    try {
      const [{ data: seqs }, { data: enrs }, { data: wa }] = await Promise.all([
        supabase.from("sequences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("sequence_enrollments").select("sequence_id, status").eq("user_id", userId),
        supabase.from("whatsapp_connections").select("id,phone_number_id,waba_id,connected_at").eq("user_id", userId).maybeSingle(),
      ])
      setSequences(seqs || [])
      setEnrollments(enrs || [])
      setWaConn(wa)

      // Fetch approved Meta templates if WhatsApp connected
      if (wa?.waba_id) {
        fetchTemplates()
      }
    } catch(e) { console.error("init failed:", e.message) }
    setLoading(false)
  }

  // SECURITY FIX: templates now fetched via server route — access_token
  // never enters the browser. Server reads the token from Supabase itself,
  // using the same /api/meta/templates route as the campaigns page.
  async function fetchTemplates() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token
      if (!authToken) return

      const r = await fetch("/api/meta/templates", {
        headers: { "Authorization": "Bearer " + authToken }
      })
      const data = await r.json()
      if (data.error) return // non-critical, dropdown falls back to manual text input

      const approved = (data.templates || []).filter(t => t.status === "APPROVED" || t.status === "ACTIVE")
      setTemplates(approved.map(t => t.name))
    } catch(e) { /* non-critical */ }
  }

  // ── Derived stats per sequence ────────────────────────────────
  function seqStats(seqId) {
    const seqEnr = enrollments.filter(e => e.sequence_id === seqId)
    return {
      total:     seqEnr.length,
      active:    seqEnr.filter(e => e.status === "active").length,
      completed: seqEnr.filter(e => e.status === "completed").length,
      stopped:   seqEnr.filter(e => e.status === "stopped").length,
    }
  }

  // ── Create sequence ───────────────────────────────────────────
  async function createSequence() {
    if (!form.name.trim())           { setSaveMsg("Name required"); return }
    if (!steps.length)               { setSaveMsg("Add at least one step"); return }
    if (steps.some(s => !s.template_name.trim())) { setSaveMsg("All steps need a template name"); return }

    setSaving(true); setSaveMsg("")
    try {
      const { data, error } = await supabase.from("sequences").insert({
        user_id:     userId,
        name:        form.name.trim(),
        description: form.description.trim() || null,
        trigger:     form.trigger,
        status:      "active",
        steps:       steps.map((s, i) => ({
          day:           parseInt(s.day) || 0,
          template_name: s.template_name.trim(),
          label:         s.label.trim() || `Step ${i+1}`,
          language:      s.language || "en",
          has_name_var:  true,
        })),
        enrolled_count:  0,
        completed_count: 0,
        stopped_count:   0,
      }).select().single()

      if (error) throw error
      setSequences(prev => [data, ...prev])
      setView("list")
      setForm(EMPTY_SEQ)
      setSteps([{ ...EMPTY_STEP }])
      setSaveMsg("Created!")
    } catch(e) { setSaveMsg(e.message || "Failed to create") }
    finally { setSaving(false) }
  }

  // ── Toggle pause/resume ───────────────────────────────────────
  async function toggleStatus(seq) {
    const newStatus = seq.status === "active" ? "paused" : "active"
    await supabase.from("sequences").update({ status: newStatus }).eq("id", seq.id)
    setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, status: newStatus } : s))
  }

  // ── Archive ───────────────────────────────────────────────────
  async function archiveSeq(id) {
    if (!confirm("Archive this sequence? Enrollments will stop.")) return
    await supabase.from("sequences").update({ status: "archived" }).eq("id", id)
    setSequences(prev => prev.filter(s => s.id !== id))
  }

  // ── Enroll leads ──────────────────────────────────────────────
  async function enrollLeads() {
    const phones = enrollPhones
      .replace(/[,;]/g, "\n").split("\n")
      .map(p => p.replace(/[^0-9]/g, "").slice(-10))
      .filter(p => p.length >= 10)

    if (!phones.length) { setSaveMsg("Enter valid phone numbers"); return }

    setEnrolling(true)
    let enrolled = 0, skipped = 0

    for (const phone of phones) {
      try {
        // Get sequence steps to find first send time
        const seq = sequences.find(s => s.id === enrollSeqId)
        if (!seq) continue
        const steps_data = seq.steps || []
        if (!steps_data.length) continue
        const firstStep = steps_data[0]
        const firstSendAt = new Date()
        firstSendAt.setDate(firstSendAt.getDate() + (firstStep.day || 0))

        const { error } = await supabase.from("sequence_enrollments").upsert({
          user_id:      userId,
          sequence_id:  enrollSeqId,
          lead_phone:   phone,
          lead_name:    enrollName.trim() || "Customer",
          current_step: 0,
          enrolled_at:  new Date().toISOString(),
          next_send_at: firstSendAt.toISOString(),
          status:       "active",
        }, { onConflict: "sequence_id,lead_phone" })

        if (error) { skipped++; continue }
        enrolled++
      } catch(e) { skipped++ }
    }

    // Refresh enrollments
    const { data: enrs } = await supabase
      .from("sequence_enrollments").select("sequence_id, status").eq("user_id", userId)
    setEnrollments(enrs || [])

    setEnrollPhones("")
    setEnrollName("")
    setEnrollOpen(false)
    setEnrolling(false)
    alert(`✅ Enrolled ${enrolled} leads${skipped ? `, ${skipped} skipped (already enrolled)` : ""}`)
  }

  // ── Step management ───────────────────────────────────────────
  function addStep() {
    const lastDay = steps.length ? parseInt(steps[steps.length - 1].day) || 0 : 0
    setSteps(prev => [...prev, { ...EMPTY_STEP, day: lastDay + 3 }])
  }
  function updateStep(i, field, val) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }
  function removeStep(i) {
    if (steps.length === 1) return
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }
  function moveStep(i, dir) {
    const arr = [...steps]
    const target = i + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[i], arr[target]] = [arr[target], arr[i]]
    setSteps(arr)
  }

  const toggleTheme = () => { const n = !dark; setDark(n); localStorage.setItem("fastrill-theme", n ? "dark" : "light") }
  const logout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const ui = userEmail ? userEmail[0].toUpperCase() : "G"

  const activeSeqs   = sequences.filter(s => s.status !== "archived")
  const activeCount  = sequences.filter(s => s.status === "active").length
  const totalEnrolled= enrollments.length
  const totalActive  = enrollments.filter(e => e.status === "active").length

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${tx}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;}
        .sidebar{width:224px;flex-shrink:0;background:${sb};border-right:1px solid ${bdr};display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;}
        .sidebar::-webkit-scrollbar{display:none;}
        .logo{padding:16px 18px;text-decoration:none;display:flex;align-items:center;gap:10px;border-bottom:1px solid ${bdr};}
        .navs{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${txf};font-weight:700;}
        .navi{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${dark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.45)"};font-weight:500;transition:all 0.12s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .navi:hover{background:${ibg};color:${tx};}
        .navi.on{background:${dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"};color:${dark?"#00B5A0":"#00897A"};font-weight:600;border-color:${dark?"rgba(0,196,125,0.2)":"rgba(0,180,115,0.2)"};}
        .sbf{margin-top:auto;padding:14px;border-top:1px solid ${bdr};}
        .uc{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${ibg};border:1px solid ${cbdr};}
        .ua{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${acc},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff;flex-shrink:0;}
        .lb{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cbdr};font-size:11.5px;color:${txm};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .lb:hover{border-color:#fca5a5;color:#ef4444;}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${bdr};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sb};}
        .content{flex:1;overflow-y:auto;padding:28px;background:${bg};}
        .hbtn{display:none;background:${ibg};border:1px solid ${cbdr};border-radius:7px;padding:5px 8px;cursor:pointer;font-size:16px;color:${tx};line-height:1;margin-right:4px;}
        .mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sb};border-top:1px solid ${bdr};padding:5px 0 calc(5px + env(safe-area-inset-bottom));z-index:200;}
        .bni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnic{font-size:16px;color:${txf};}
        .bnil{font-size:9px;font-weight:600;color:${txf};}
        .bni.on .bnic,.bni.on .bnil{color:${acc};}
        .seq-card{background:${card};border:1px solid ${cbdr};border-radius:13px;padding:20px 22px;transition:border-color 0.15s;}
        .seq-card:hover{border-color:${acc}44;}
        .step-row{background:${ibg};border:1px solid ${cbdr};border-radius:10px;padding:16px;position:relative;}
        .step-connector{width:2px;height:20px;background:${cbdr};margin:0 auto;}
        .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:${card};border:1px solid ${cbdr};border-radius:16px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
        input:focus,textarea:focus,select:focus{border-color:${acc}88!important;outline:none;}
        @media(max-width:767px){
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);width:240px!important;transition:transform 0.25s;}
          .sidebar.open{transform:translateX(0);box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .mob-ov.open{display:block;}
          .hbtn{display:flex;}
          .bnav{display:flex;}
          .main{padding-bottom:58px;}
          .content{padding:16px;}
          .kpi-grid{grid-template-columns:1fr 1fr!important;}
        }
      `}</style>

      <div className="wrap">
        <div className={"mob-ov"+(mobOpen?" open":"")} onClick={()=>setMobOpen(false)}/>

        <aside className={"sidebar"+(mobOpen?" open":"")}>
          <a href="/dashboard" className="logo">
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}}/>
            <span style={{fontWeight:800,fontSize:20,color:tx,letterSpacing:"-0.3px"}}>fast<span style={{color:acc}}>rill</span></span>
          </a>
          <div className="navs">Platform</div>
          {NAV.map(item=>(
            <button key={item.id} className={"navi"+(item.id==="sequences"?" on":"")}
              onClick={()=>{router.push(item.path);setMobOpen(false)}}>
              <span style={{fontSize:12,width:17,textAlign:"center",flexShrink:0}}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div className="sbf">
            <div className="uc">
              <div className="ua">{ui}</div>
              <div style={{fontSize:11,color:txm,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail||"..."}</div>
            </div>
            <button className="lb" onClick={logout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="hbtn" onClick={()=>setMobOpen(s=>!s)}>☰</button>
              <span style={{fontWeight:700,fontSize:15,color:tx}}>
                {view==="create"?"New Sequence":"Drip Sequences"}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {view==="list" && (
                <button onClick={()=>{setView("create");setForm(EMPTY_SEQ);setSteps([{...EMPTY_STEP}])}}
                  style={{padding:"8px 18px",borderRadius:9,background:acc,border:"none",color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  + New Sequence
                </button>
              )}
              {view==="create" && (
                <button onClick={()=>setView("list")}
                  style={{padding:"7px 16px",borderRadius:8,background:ibg,border:`1px solid ${cbdr}`,color:txm,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  ← Back
                </button>
              )}
              <button onClick={toggleTheme}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:ibg,border:`1px solid ${cbdr}`,borderRadius:7,cursor:"pointer",fontSize:11.5,color:txm,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                <span>{dark?"🌙":"☀️"}</span>
                <div style={{width:28,height:15,borderRadius:100,background:dark?acc:"#d1d5db",position:"relative",flexShrink:0}}>
                  <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"#fff",left:dark?"15px":"2px",transition:"left 0.2s"}}/>
                </div>
              </button>
            </div>
          </div>

          <div className="content">

            {/* ── LOADING ── */}
            {loading && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:12,color:txm}}>
                <div style={{width:18,height:18,border:`2px solid ${acc}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <span style={{fontSize:13}}>Loading sequences...</span>
              </div>
            )}

            {/* ── LIST VIEW ── */}
            {!loading && view==="list" && (
              <div style={{maxWidth:820}}>

                {/* KPIs */}
                <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
                  {[
                    {label:"Total Sequences", val:activeSeqs.length,    color:tx,   icon:"⟳"},
                    {label:"Active",          val:activeCount,           color:acc,  icon:"▶"},
                    {label:"Total Enrolled",  val:totalEnrolled,         color:"#a78bfa", icon:"👥"},
                    {label:"In Progress",     val:totalActive,           color:"#38bdf8", icon:"⚡"},
                  ].map(k=>(
                    <div key={k.label} style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,padding:"18px 20px"}}>
                      <div style={{fontSize:11,color:txf,fontWeight:600,marginBottom:8}}>{k.icon} {k.label}</div>
                      <div style={{fontSize:32,fontWeight:800,color:k.color,letterSpacing:"-1px",lineHeight:1}}>{k.val}</div>
                    </div>
                  ))}
                </div>

                {/* Sequences list */}
                {activeSeqs.length === 0 ? (
                  <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:16,padding:"72px 24px",textAlign:"center"}}>
                    <div style={{fontSize:48,marginBottom:16,opacity:0.2}}>⟳</div>
                    <div style={{fontWeight:800,fontSize:18,color:tx,marginBottom:8}}>No sequences yet</div>
                    <div style={{fontSize:13,color:txm,marginBottom:24}}>
                      Build automated drip campaigns that work outside the 24hr window using approved WhatsApp templates.
                    </div>
                    <button onClick={()=>{setView("create");setForm(EMPTY_SEQ);setSteps([{...EMPTY_STEP}])}}
                      style={{padding:"12px 28px",borderRadius:11,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                      Create your first sequence →
                    </button>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {activeSeqs.map(seq=>{
                      const stats = seqStats(seq.id)
                      const trigger = TRIGGERS.find(t=>t.value===seq.trigger)
                      const isActive = seq.status==="active"
                      const isPaused = seq.status==="paused"
                      return(
                        <div key={seq.id} className="seq-card">
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                                <span style={{fontWeight:700,fontSize:15,color:tx}}>{seq.name}</span>
                                <span className="badge" style={{
                                  background:isActive?adim:isPaused?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.05)",
                                  color:isActive?acc:isPaused?"#f59e0b":txm,
                                  border:`1px solid ${isActive?acc+"44":isPaused?"rgba(245,158,11,0.3)":cbdr}`
                                }}>
                                  {isActive?"Active":isPaused?"Paused":"Archived"}
                                </span>
                              </div>
                              {seq.description && <div style={{fontSize:12,color:txm,marginBottom:6}}>{seq.description}</div>}
                              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                                <span style={{fontSize:11,color:txf,background:ibg,border:`1px solid ${cbdr}`,borderRadius:6,padding:"2px 8px"}}>
                                  🎯 {trigger?.label||seq.trigger}
                                </span>
                                <span style={{fontSize:11,color:txf}}>
                                  {(seq.steps||[]).length} step{(seq.steps||[]).length!==1?"s":""}
                                </span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div style={{display:"flex",gap:16,flexShrink:0,textAlign:"center"}}>
                              {[
                                {label:"Enrolled",  val:stats.total,     color:txm},
                                {label:"Active",    val:stats.active,    color:acc},
                                {label:"Done",      val:stats.completed, color:"#a78bfa"},
                                {label:"Stopped",   val:stats.stopped,   color:txf},
                              ].map(s=>(
                                <div key={s.label}>
                                  <div style={{fontSize:18,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                                  <div style={{fontSize:10,color:txf,marginTop:2}}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Step timeline preview */}
                          {(seq.steps||[]).length > 0 && (
                            <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
                              {(seq.steps||[]).map((step,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                                  <div style={{textAlign:"center"}}>
                                    <div style={{width:28,height:28,borderRadius:"50%",background:adim,border:`1px solid ${acc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:acc,margin:"0 auto 4px"}}>
                                      {i+1}
                                    </div>
                                    <div style={{fontSize:10,color:txm,fontWeight:600}}>Day {step.day}</div>
                                    <div style={{fontSize:9,color:txf,maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                      {step.template_name}
                                    </div>
                                  </div>
                                  {i < (seq.steps||[]).length-1 && (
                                    <div style={{width:32,height:1,background:cbdr,flexShrink:0,margin:"0 4px",marginBottom:20}}/>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <button
                              onClick={()=>{setEnrollSeqId(seq.id);setEnrollOpen(true)}}
                              style={{padding:"7px 16px",borderRadius:8,background:adim,border:`1px solid ${acc}44`,color:acc,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                              + Enroll Leads
                            </button>
                            <button
                              onClick={()=>toggleStatus(seq)}
                              style={{padding:"7px 16px",borderRadius:8,background:ibg,border:`1px solid ${cbdr}`,color:txm,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                              {isActive?"⏸ Pause":"▶ Resume"}
                            </button>
                            <button
                              onClick={()=>archiveSeq(seq.id)}
                              style={{padding:"7px 14px",borderRadius:8,background:"transparent",border:`1px solid ${cbdr}`,color:txf,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                              Archive
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Info callout */}
                <div style={{marginTop:24,padding:"16px 20px",background:ibg,border:`1px solid ${cbdr}`,borderRadius:12,display:"flex",gap:12,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>💡</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:tx,marginBottom:4}}>How sequences work</div>
                    <div style={{fontSize:12,color:txm,lineHeight:1.7}}>
                      Sequences send approved Meta templates at scheduled intervals — they work <strong style={{color:tx}}>outside the 24hr window</strong>.
                      When a lead replies, the sequence stops automatically and the AI takes over.
                      Set up your approved templates in Meta Business Manager first.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── CREATE VIEW ── */}
            {!loading && view==="create" && (
              <div style={{maxWidth:680}}>
                {saveMsg && (
                  <div style={{marginBottom:16,padding:"10px 14px",borderRadius:9,background:saveMsg.includes("!")||saveMsg.includes("Create")?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${saveMsg.includes("!")||saveMsg.includes("Create")?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,fontSize:13,color:saveMsg.includes("!")||saveMsg.includes("Create")?"#4ade80":"#f87171"}}>
                    {saveMsg}
                  </div>
                )}

                {/* Step 1: Basics */}
                <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,padding:22,marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:14,color:tx,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:24,height:24,borderRadius:"50%",background:adim,border:`1px solid ${acc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:acc,flexShrink:0}}>1</span>
                    Sequence Details
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={lbl}>Sequence Name *</label>
                      <input
                        placeholder="e.g. Real Estate Lead Nurture"
                        value={form.name}
                        onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                        style={inp}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={lbl}>Description <span style={{color:txf,fontWeight:400}}>(optional)</span></label>
                      <input
                        placeholder="e.g. 3-step follow-up for property enquiries"
                        value={form.description}
                        onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                        style={inp}/>
                    </div>
                    <div>
                      <label style={lbl}>Trigger</label>
                      <select value={form.trigger} onChange={e=>setForm(f=>({...f,trigger:e.target.value}))} style={inp}>
                        {TRIGGERS.map(t=>(
                          <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Steps */}
                <div style={{background:card,border:`1px solid ${cbdr}`,borderRadius:13,padding:22,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                    <div style={{fontWeight:700,fontSize:14,color:tx,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:24,height:24,borderRadius:"50%",background:adim,border:`1px solid ${acc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:acc,flexShrink:0}}>2</span>
                      Sequence Steps
                    </div>
                    <button onClick={addStep}
                      style={{padding:"6px 14px",borderRadius:8,background:adim,border:`1px solid ${acc}44`,color:acc,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                      + Add Step
                    </button>
                  </div>

                  <div style={{fontSize:12,color:txm,marginBottom:16,padding:"10px 12px",background:ibg,borderRadius:8}}>
                    Each step sends one approved Meta template. Day 0 = immediately after enrollment.
                    Only approved templates from your WhatsApp Business account will be accepted by Meta.
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {steps.map((step,i)=>(
                      <div key={i}>
                        <div className="step-row">
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:22,height:22,borderRadius:"50%",background:adim,border:`1px solid ${acc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:acc}}>
                                {i+1}
                              </div>
                              <span style={{fontSize:12,fontWeight:600,color:txm}}>Step {i+1}</span>
                            </div>
                            <div style={{display:"flex",gap:4}}>
                              {steps.length > 1 && (
                                <>
                                  {i > 0 && <button onClick={()=>moveStep(i,-1)} style={{padding:"3px 8px",borderRadius:6,background:"transparent",border:`1px solid ${cbdr}`,color:txf,fontSize:11,cursor:"pointer"}}>↑</button>}
                                  {i < steps.length-1 && <button onClick={()=>moveStep(i,1)} style={{padding:"3px 8px",borderRadius:6,background:"transparent",border:`1px solid ${cbdr}`,color:txf,fontSize:11,cursor:"pointer"}}>↓</button>}
                                  <button onClick={()=>removeStep(i)} style={{padding:"3px 8px",borderRadius:6,background:"transparent",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:14,cursor:"pointer",lineHeight:1}}>×</button>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 80px",gap:10}}>
                            <div>
                              <label style={lbl}>Day</label>
                              <input
                                type="number" min="0" max="365"
                                value={step.day}
                                onChange={e=>updateStep(i,"day",e.target.value)}
                                style={inp}/>
                            </div>
                            <div>
                              <label style={lbl}>Template Name *</label>
                              {templates.length > 0 ? (
                                <select value={step.template_name} onChange={e=>updateStep(i,"template_name",e.target.value)} style={inp}>
                                  <option value="">Select template...</option>
                                  {templates.map(t=><option key={t} value={t}>{t}</option>)}
                                </select>
                              ) : (
                                <input
                                  placeholder="exact_template_name"
                                  value={step.template_name}
                                  onChange={e=>updateStep(i,"template_name",e.target.value)}
                                  style={inp}/>
                              )}
                            </div>
                            <div>
                              <label style={lbl}>Language</label>
                              <select value={step.language} onChange={e=>updateStep(i,"language",e.target.value)} style={inp}>
                                {[["en","English"],["hi_IN","Hindi"],["te","Telugu"],["ta","Tamil"],["kn","Kannada"],["ml","Malayalam"]].map(([v,l])=>(
                                  <option key={v} value={v}>{l}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div style={{marginTop:10}}>
                            <label style={lbl}>Step Label <span style={{color:txf,fontWeight:400}}>(internal note)</span></label>
                            <input
                              placeholder={`e.g. Day ${step.day} — First touch`}
                              value={step.label}
                              onChange={e=>updateStep(i,"label",e.target.value)}
                              style={inp}/>
                          </div>
                        </div>
                        {i < steps.length-1 && <div className="step-connector"/>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div style={{background:ibg,border:`1px solid ${cbdr}`,borderRadius:11,padding:"14px 18px",marginBottom:20}}>
                  <div style={{fontWeight:600,fontSize:12,color:txm,marginBottom:10}}>Summary</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[
                      ["Sequence Name", form.name||"—"],
                      ["Trigger",       TRIGGERS.find(t=>t.value===form.trigger)?.label||"—"],
                      ["Steps",         steps.length],
                      ["Duration",      steps.length>0?"Day 0 → Day "+(steps[steps.length-1].day||0):"—"],
                    ].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${bdr}`}}>
                        <span style={{fontSize:12,color:txf}}>{k}</span>
                        <span style={{fontSize:12,fontWeight:600,color:tx}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createSequence}
                  disabled={saving||!form.name.trim()}
                  style={{width:"100%",padding:"14px",borderRadius:11,background:form.name.trim()?acc:ibg,border:`1px solid ${form.name.trim()?acc:cbdr}`,color:form.name.trim()?"#000":txm,fontWeight:700,fontSize:15,cursor:form.name.trim()?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  {saving?"Creating...":"Create Sequence →"}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── ENROLL MODAL ── */}
      {enrollOpen && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget){setEnrollOpen(false)}}}>
          <div className="modal">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:15,color:tx}}>Enroll Leads</div>
              <button onClick={()=>setEnrollOpen(false)} style={{background:"transparent",border:"none",fontSize:20,color:txm,cursor:"pointer",lineHeight:1}}>×</button>
            </div>

            <div style={{marginBottom:14}}>
              <label style={lbl}>Lead Name <span style={{color:txf}}>(used for personalisation)</span></label>
              <input
                placeholder="e.g. Ravi Kumar (or leave blank for 'Customer')"
                value={enrollName}
                onChange={e=>setEnrollName(e.target.value)}
                style={inp}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={lbl}>Phone Numbers *</label>
              <textarea
                placeholder={"919876543210\n918765432109\n(one per line or comma-separated)"}
                value={enrollPhones}
                onChange={e=>setEnrollPhones(e.target.value)}
                rows={5}
                style={{...inp,resize:"vertical",lineHeight:1.7}}/>
              <div style={{fontSize:11.5,color:txm,marginTop:5}}>
                {enrollPhones.replace(/[,;]/g,"\n").split("\n").filter(p=>p.replace(/[^0-9]/g,"").length>=10).length} valid numbers detected
              </div>
            </div>

            <div style={{padding:"12px 14px",background:ibg,border:`1px solid ${cbdr}`,borderRadius:9,marginBottom:20,fontSize:12,color:txm,lineHeight:1.6}}>
              ℹ️ Sequence will start immediately (Day 0 template) if the first step is Day 0.
              If a lead is already enrolled, they'll be skipped.
            </div>

            <div style={{display:"flex",gap:10}}>
              <button
                onClick={enrollLeads}
                disabled={enrolling||!enrollPhones.trim()}
                style={{flex:1,padding:"11px",borderRadius:9,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:13,cursor:enrolling||!enrollPhones.trim()?"not-allowed":"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",opacity:enrolling||!enrollPhones.trim()?0.5:1}}>
                {enrolling?"Enrolling...":"Enroll →"}
              </button>
              <button
                onClick={()=>setEnrollOpen(false)}
                style={{padding:"11px 18px",borderRadius:9,background:ibg,border:`1px solid ${cbdr}`,color:txm,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bnav">
        {[
          {id:"overview",  icon:"⬡",label:"Home",      path:"/dashboard"},
          {id:"inbox",     icon:"◎",label:"Chats",     path:"/dashboard/conversations"},
          {id:"sequences", icon:"⟳",label:"Sequences", path:"/dashboard/sequences"},
          {id:"leads",     icon:"◉",label:"Leads",     path:"/dashboard/leads"},
          {id:"settings",  icon:"◌",label:"Settings",  path:"/dashboard/settings"},
        ].map(item=>(
          <button key={item.id} className={"bni"+(item.id==="sequences"?" on":"")} onClick={()=>router.push(item.path)}>
            <span className="bnic">{item.icon}</span>
            <span className="bnil">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
