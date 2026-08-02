"use client"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { usePlanGuard } from "@/lib/hooks/usePlanGuard"

// ════════════════════════════════════════════════════════════════
// CAMPAIGNS — COMMAND CENTER VERSION
// Views: overview (KPIs + table + insights) · compose (4-step wizard,
// compact template picker) · templates (full library, moved out of
// compose flow).
//
// HONEST-DATA RULES baked in:
// • Sparklines/trends computed from real campaign history (30d vs prior
//   30d). No data → flat line + "—", never invented numbers.
// • Insights panel derives from actual stats with minimum sample sizes;
//   below threshold it shows a locked state, not fake predictions.
// • Replies capped at recipients per campaign (webhook overcounts).
// • Median booking value for revenue estimates (outlier-safe).
//
// ⚠ Requires the same SQL migration as the previous version:
// ALTER TABLE conversations ADD COLUMN IF NOT EXISTS campaign_id uuid;
// ALTER TABLE conversations ADD COLUMN IF NOT EXISTS campaign_replied_at timestamptz;
// ════════════════════════════════════════════════════════════════

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

const SEGMENTS = [
  {id:"all",       label:"All Customers", desc:"Everyone who messaged you", icon:"👥"},
  {id:"new_lead",  label:"New Leads",     desc:"First-time, not booked",   icon:"✨"},
  {id:"returning", label:"Returning",     desc:"Booked 2+ times",          icon:"🔄"},
  {id:"vip",       label:"VIP",           desc:"Tagged as VIP",            icon:"⭐"},
  {id:"inactive",  label:"Inactive 30d+", desc:"No visit in 30 days",      icon:"💤"},
  {id:"manual",    label:"Enter Numbers", desc:"Paste numbers manually",   icon:"✏️"},
  {id:"csv",       label:"Upload CSV",    desc:"Upload a .csv or .txt file",icon:"📎"},
]

const META_COST = {
  MARKETING:      0.83,
  UTILITY:        0.35,
  AUTHENTICATION: 0.15,
  SERVICE:        0.29,
}

function toPhone(p) {
  const d = (p||"").replace(/[^0-9]/g,"")
  if (d.length===10) return "91"+d
  if (d.length===12&&d.startsWith("91")) return d
  if (d.length===11&&d.startsWith("0")) return "91"+d.slice(1)
  return d
}
function dedupe(p) {
  const d = (p||"").replace(/[^0-9]/g,"")
  return d.slice(-10)
}
function getCategoryIcon(cat) {
  if (cat==="UTILITY") return "🔧"
  if (cat==="AUTHENTICATION") return "🔐"
  if (cat==="SERVICE") return "💬"
  return "📢"
}
// A campaign can never have more unique repliers than people it reached.
function cappedReplies(c) {
  return Math.min(c?.replied_count||0, c?.sent_count||0)
}
// Trend vs previous period. null when previous period has no data.
function trendPct(cur, prev) {
  if (!prev || prev<=0) return null
  return Math.round(((cur-prev)/prev)*100)
}

// ── Real-data sparkline. Flat faded baseline when series is all zeros. ──
function Spark({data, color}) {
  const w=68, h=22
  if (!data || data.length<2 || data.every(v=>v===0)) {
    return (
      <svg width={w} height={h} aria-hidden="true">
        <line x1="0" y1={h-4} x2={w} y2={h-4} stroke={color} strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="3 3"/>
      </svg>
    )
  }
  const max = Math.max(...data)
  const pts = data.map((v,i)=>((i/(data.length-1))*w).toFixed(1)+","+(h-2-(v/max)*(h-6)).toFixed(1)).join(" ")
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

export default function Campaigns() {
  usePlanGuard()
  const router  = useRouter()
  const fileRef = useRef(null)
  const pollRef = useRef(null)

  const [userId,    setUserId]    = useState(null)
  const [userEmail, setUserEmail] = useState("")
  const [dark,      setDark]      = useState(true)
  const [mobOpen,   setMobOpen]   = useState(false)
  const [planLocked, setPlanLocked] = useState(false)
  const [lastSentCampId, setLastSentCampId] = useState(null)
  const [avgServiceValue, setAvgServiceValue] = useState(1200) // median, set in init

  const [customers,  setCustomers]  = useState([])
  const [optouts,    setOptouts]    = useState([])
  const [whatsapp,   setWhatsapp]   = useState(null)
  const [bizName,    setBizName]    = useState("")
  const [loading,    setLoading]    = useState(true)

  const [templates,   setTemplates]   = useState([])
  const [tmplLoading, setTmplLoading] = useState(false)
  const [tmplError,   setTmplError]   = useState("")

  const [history,     setHistory]     = useState([])
  const [histLoading, setHistLoading] = useState(false)

  // Views: overview | compose | templates
  const [view, setView] = useState("overview")
  const [step, setStep] = useState("setup")

  // Table controls
  const [q,          setQ]          = useState("")
  const [statusFilt, setStatusFilt] = useState("all")
  const [sortKey,    setSortKey]    = useState("date")
  const [sortDir,    setSortDir]    = useState("desc")
  const [expanded,   setExpanded]   = useState(null)

  // Compose
  const [selectedTmplId, setSelectedTmplId] = useState("")
  const [tmplVals,       setTmplVals]       = useState({})
  const [campaignName,   setCampaignName]   = useState("")
  const [segment,        setSegment]        = useState("all")
  const [manualNums,     setManualNums]     = useState("")
  const [csvNums,        setCsvNums]        = useState([])
  const [testPhone,      setTestPhone]      = useState("")
  const [testState,      setTestState]      = useState("idle")
  const [tmplSearch,     setTmplSearch]     = useState("")

  const [sending,   setSending]   = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [failCount, setFailCount] = useState(0)

  const pendingDraftRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem("fastrill-theme")
    if (saved) setDark(saved==="dark")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push("/login")
      else { setUserEmail(session.user.email || ""); setUserId(session.user.id) }
    })
  }, [])

  useEffect(() => { if (userId) init() }, [userId])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  useEffect(()=>{
    if (!lastSentCampId) return
    const t = setTimeout(()=>setLastSentCampId(null), 4000)
    return ()=>clearTimeout(t)
  }, [lastSentCampId])

  useEffect(() => {
    if (templates.length > 0 && pendingDraftRef.current) {
      const tmplName = pendingDraftRef.current
      pendingDraftRef.current = null
      const tmpl = templates.find(t=>t.template_name===tmplName)
      if (tmpl) setSelectedTmplId(tmpl.id)
    }
  }, [templates])

  async function init() {
    setLoading(true)
    try {
      const [{ data:custs }, { data:wa }, { data:biz }, { data:bks }] = await Promise.all([
        supabase.from("customers").select("id,name,phone,tag,last_visit_at,created_at").eq("user_id",userId),
        supabase.from("whatsapp_connections").select("id,phone_number_id,waba_id,connected_at").eq("user_id",userId).maybeSingle(),
        supabase.from("business_settings").select("business_name,campaigns_enabled,plan").eq("user_id",userId).maybeSingle(),
        supabase.from("bookings").select("amount").eq("user_id",userId).in("status",["confirmed","completed"]).limit(200),
      ])

      setCustomers(custs||[])
      const bn = biz?.business_name||""
      setBizName(bn)
      if (bn) setTmplVals(p=>({...p, business_name:bn}))
      if (biz && !biz.campaigns_enabled) setPlanLocked(true)

      // Median booking value — outlier-safe
      if (bks?.length > 0) {
        const amts = bks.map(b=>b.amount||0).filter(a=>a>0).sort((a,b)=>a-b)
        if (amts.length > 0) {
          const mid = Math.floor(amts.length/2)
          const median = amts.length%2===1 ? amts[mid] : Math.round((amts[mid-1]+amts[mid])/2)
          if (median > 0) setAvgServiceValue(median)
        }
      }

      try {
        const { data:opts } = await supabase.from("campaign_optouts").select("phone").eq("user_id",userId)
        setOptouts((opts||[]).map(o=>o.phone))
      } catch(e) {}

      await loadHistory()

      if (wa) {
        setWhatsapp(wa)
        await fetchMetaTemplates(wa)
      } else {
        setTmplError("no_whatsapp")
      }
    } catch(e) {
      console.error("init failed:", e.message)
    }
    setLoading(false)
  }

  async function fetchMetaTemplates(wa) {
    if (!wa) { setTmplError("no_whatsapp"); return }
    setTmplLoading(true)
    setTmplError("")
    setTemplates([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token
      if (!authToken) { setTmplError("Not authenticated"); setTmplLoading(false); return }
      const res = await fetch("/api/meta/templates", {
        headers: { "Authorization": "Bearer " + authToken }
      })
      const data = await res.json()
      if (data.error === "no_whatsapp") { setTmplError("no_whatsapp"); setTmplLoading(false); return }
      if (data.error) { setTmplError(data.error); setTmplLoading(false); return }
      const usable = (data.templates||[]).filter(t=>
        t.status==="APPROVED" || t.status==="ACTIVE" || (t.status||"").startsWith("ACTIVE")
      )
      if (usable.length===0) { setTmplError("no_templates"); setTmplLoading(false); return }
      setTemplates(usable.map(t=>parseTemplate(t)))
    } catch(e) {
      setTmplError("Failed to load templates: "+e.message)
    }
    setTmplLoading(false)
  }

  function parseTemplate(t) {
    const components = t.components || []
    const bodyComp   = components.find(c=>c.type==="BODY")
    const headerComp = components.find(c=>c.type==="HEADER")
    const footerComp = components.find(c=>c.type==="FOOTER")
    const bodyText   = bodyComp?.text   || ""
    const headerText = headerComp?.text || ""
    const footerText = footerComp?.text || ""

    const allText    = headerText + " " + bodyText
    const varMatches = allText.match(/\{\{(\d+)\}\}/g) || []
    const varNums    = [...new Set(varMatches.map(m=>m.replace(/\D/g,"")))]
      .sort((a,b)=>parseInt(a)-parseInt(b))

    const vars = varNums.map(num => {
      const allTemplateText = headerText + " " + bodyText
      const contextMatch = allTemplateText.match(
        new RegExp('.{0,25}\\{\\{'+num+'\\}\\}.{0,25}')
      )
      const context = contextMatch
        ? contextMatch[0].replace(/\{\{[0-9]+\}\}/g, "___").trim()
        : null
      return {
        key:   "var_"+num,
        label: num==="1" ? "Customer Name" : "Variable {{"+num+"}}",
        hint:  context || "Value for {{"+num+"}}",
        auto:  num==="1",
        num,
      }
    })

    const metaCost = META_COST[t.category] || 0.83

    return {
      id:            t.id,
      template_name: t.name,
      label:         t.name.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),
      category:      t.category || "MARKETING",
      language:      t.language || "en",
      metaCost,
      icon:          getCategoryIcon(t.category),
      desc:          (t.category||"MARKETING")+" · "+(t.language||"en"),
      vars,
      bodyText,
      headerText,
      footerText,
      preview: (v={}) => {
        let text = ""
        if (headerText) text += headerText+"\n\n"
        text += bodyText
        if (footerText) text += "\n\n"+footerText
        varNums.forEach(num => {
          text = text.replace(
            new RegExp("\\{\\{"+num+"\\}\\}","g"),
            v["var_"+num] || "{{"+num+"}}"
          )
        })
        return text
      }
    }
  }

  const loadHistory = useCallback(async () => {
    if (!userId) return
    setHistLoading(true)
    try {
      const { data } = await supabase.from("campaigns").select("*")
        .eq("user_id",userId).order("created_at",{ascending:false}).limit(200)
      setHistory(data||[])
    } catch(e) { console.error("loadHistory error:", e.message) }
    setHistLoading(false)
  }, [userId])

  function segCount(segId) {
    if (segId==="manual"||segId==="csv") return null
    const ago30 = new Date(Date.now()-30*86400000)
    if (segId==="all")       return customers.length
    if (segId==="new_lead")  return customers.filter(c=>c.tag==="new_lead").length
    if (segId==="returning") return customers.filter(c=>c.tag==="returning"||c.tag==="vip").length
    if (segId==="vip")       return customers.filter(c=>c.tag==="vip").length
    if (segId==="inactive")  return customers.filter(c=>!c.last_visit_at||new Date(c.last_visit_at)<ago30).length
    return null
  }

  function getAudience() {
    const ago30 = new Date(Date.now()-30*86400000)
    let pool = []
    if      (segment==="all")       pool = customers
    else if (segment==="new_lead")  pool = customers.filter(c=>c.tag==="new_lead")
    else if (segment==="returning") pool = customers.filter(c=>c.tag==="returning"||c.tag==="vip")
    else if (segment==="vip")       pool = customers.filter(c=>c.tag==="vip")
    else if (segment==="inactive")  pool = customers.filter(c=>!c.last_visit_at||new Date(c.last_visit_at)<ago30)
    else if (segment==="manual") {
      const nums = manualNums.replace(/[,;]/g," ").split(/\s+/).filter(s=>s.replace(/[^0-9]/g,"").length>=8)
      pool = nums.map(n=>({name:"Customer",phone:n,id:n}))
    }
    else if (segment==="csv") pool = csvNums.map(n=>({name:"Customer",phone:n,id:n}))
    return pool.filter(c=>!optouts.includes(dedupe(c.phone)))
  }

  function campCost(c) {
    const tmpl = templates.find(t=>t.template_name===c.template_name)
    return (c.sent_count||0)*(tmpl?.metaCost||0.83)
  }

  // Aggregate stats for a set of campaigns
  function statsFor(camps) {
    const done = camps.filter(c=>c.status==="done"||c.status==="completed")
    const sent  = done.reduce((a,c)=>a+(c.sent_count||0),0)
    const dlv   = done.reduce((a,c)=>a+(c.delivered_count||0),0)
    const read  = done.reduce((a,c)=>a+(c.read_count||0),0)
    const reply = done.reduce((a,c)=>a+cappedReplies(c),0)
    const cost  = parseFloat(done.reduce((a,c)=>a+campCost(c),0).toFixed(2))
    const estBookings = Math.round(reply*0.6)
    const estRevenue  = estBookings*avgServiceValue
    return {
      count:done.length, sent, dlv, read, reply, cost, estBookings, estRevenue,
      deliveryRate: sent>0?Math.min(100,Math.round((dlv/sent)*100)):null,
      readRate:     sent>0?Math.min(100,Math.round((read/sent)*100)):null,
      replyRate:    sent>0?Math.min(100,Math.round((reply/sent)*100)):null,
      roi: (cost>0&&sent>=10)?Math.round(((estRevenue-cost)/cost)*100):null,
    }
  }

  // Daily series over last N days from real sent_at data
  function dailySeries(days, fn) {
    const out = Array(days).fill(0)
    const today = new Date(); today.setHours(0,0,0,0)
    for (const c of history) {
      if (!c.sent_at || c.status==="draft") continue
      const d = new Date(c.sent_at); d.setHours(0,0,0,0)
      const diff = Math.round((today-d)/86400000)
      if (diff>=0 && diff<days) out[days-1-diff] += fn(c)
    }
    return out
  }

  function fmtRoi(roi) {
    if (roi===null || roi===undefined) return "—"
    if (roi>999) return "999%+"
    return (roi>0?"+":"")+roi+"%"
  }
  function fmtTrend(t) {
    if (t===null) return null
    return (t>0?"↑ +":t<0?"↓ ":"")+Math.abs(t)+"%"
  }

  // ── HONEST INSIGHTS — computed from real data with sample-size guards ──
  const insights = useMemo(()=>{
    const done = history.filter(c=>(c.status==="done"||c.status==="completed")&&(c.sent_count||0)>0)
    const totalSent = done.reduce((a,c)=>a+(c.sent_count||0),0)
    const out = { unlocked: totalSent>=25, totalSent, items:[] }

    if (!out.unlocked) return out

    // Best performer (min 10 sends)
    const eligible = done.filter(c=>(c.sent_count||0)>=10)
    if (eligible.length>=2) {
      const withRate = eligible.map(c=>({c, rate:cappedReplies(c)/(c.sent_count||1)}))
      withRate.sort((a,b)=>b.rate-a.rate)
      const best = withRate[0]
      const avgRate = withRate.reduce((a,x)=>a+x.rate,0)/withRate.length
      if (best.rate>0 && avgRate>0) {
        const lift = Math.round(((best.rate-avgRate)/avgRate)*100)
        if (lift>=10) out.items.push({icon:"🏆", title:"Best performer", text:`"${best.c.name}" replies ${lift}% above your average. Its template and segment are your current winning combo.`})
      }
    }

    // Best send hour (min 3 campaigns across 2+ distinct hours)
    const hourBuckets = {}
    for (const c of done) {
      if (!c.sent_at) continue
      const h = new Date(c.sent_at).getHours()
      if (!hourBuckets[h]) hourBuckets[h] = {sent:0, reply:0, n:0}
      hourBuckets[h].sent += (c.sent_count||0)
      hourBuckets[h].reply += cappedReplies(c)
      hourBuckets[h].n++
    }
    const hours = Object.entries(hourBuckets).filter(([,v])=>v.sent>=10)
    if (hours.length>=2) {
      hours.sort((a,b)=>(b[1].reply/b[1].sent)-(a[1].reply/a[1].sent))
      const [bestH, v] = hours[0]
      if (v.reply>0) {
        const h = parseInt(bestH)
        const label = h===0?"12 AM":h<12?h+" AM":h===12?"12 PM":(h-12)+" PM"
        out.items.push({icon:"🕕", title:"Best send time so far", text:`Campaigns sent around ${label} get your highest reply rate (${Math.round((v.reply/v.sent)*100)}%). Based on your own send history, not a generic rule.`})
      }
    }

    // Spam risk heuristic
    const s = statsFor(history)
    if (s.sent>=50 && s.replyRate!==null) {
      if (s.replyRate<2) out.items.push({icon:"⚠️", title:"Spam risk: elevated", text:`Reply rate is under 2% across ${s.sent} sends. Meta throttles numbers with low engagement — tighten your audience segments before the next blast.`})
      else out.items.push({icon:"🛡️", title:"Spam risk: low", text:`${s.replyRate}% reply rate across ${s.sent} sends keeps your number in good standing with Meta.`})
    }

    // Cost efficiency
    if (s.reply>0 && s.cost>0) {
      const cpr = (s.cost/s.reply).toFixed(2)
      out.items.push({icon:"₹", title:"Cost per conversation", text:`You pay ₹${cpr} per customer reply. One booking at ₹${avgServiceValue.toLocaleString()} covers ${Math.max(1,Math.floor(avgServiceValue/parseFloat(cpr))).toLocaleString()} replies worth of spend.`})
    }

    return out
  }, [history, templates, avgServiceValue])

  // ── Table rows: filtered + sorted ──
  const tableRows = useMemo(()=>{
    let rows = history.slice()
    if (statusFilt!=="all") {
      rows = rows.filter(c=>{
        if (statusFilt==="done") return c.status==="done"||c.status==="completed"
        return c.status===statusFilt
      })
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      rows = rows.filter(c=>(c.name||"").toLowerCase().includes(needle)||(c.template_name||"").toLowerCase().includes(needle))
    }
    const val = c => {
      if (sortKey==="date")  return new Date(c.sent_at||c.created_at||0).getTime()
      if (sortKey==="sent")  return c.sent_count||0
      if (sortKey==="reply") return (c.sent_count||0)>0 ? cappedReplies(c)/(c.sent_count||1) : -1
      if (sortKey==="cost")  return campCost(c)
      return 0
    }
    rows.sort((a,b)=> sortDir==="desc" ? val(b)-val(a) : val(a)-val(b))
    return rows
  }, [history, statusFilt, q, sortKey, sortDir, templates])

  function toggleSort(key) {
    if (sortKey===key) setSortDir(d=>d==="desc"?"asc":"desc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function buildPayload(customerName, phone) {
    const tmpl = templates.find(t=>t.id===selectedTmplId)
    if (!tmpl) return null
    const firstName = (customerName||"there").split(" ")[0]
    const getValue = (num) => {
      if (num==="1") return firstName
      return String(tmplVals["var_"+num]||"N/A")
    }
    const bodyNums = [...new Set(
      (tmpl.bodyText.match(/\{\{(\d+)\}\}/g)||[]).map(m=>m.replace(/\D/g,""))
    )].sort((a,b)=>parseInt(a)-parseInt(b))
    const headerNums = [...new Set(
      (tmpl.headerText.match(/\{\{(\d+)\}\}/g)||[]).map(m=>m.replace(/\D/g,""))
    )].sort((a,b)=>parseInt(a)-parseInt(b))
    const components = []
    if (headerNums.length > 0) {
      components.push({ type:"header", parameters: headerNums.map(num=>({ type:"text", text:getValue(num) })) })
    }
    if (bodyNums.length > 0) {
      components.push({ type:"body", parameters: bodyNums.map(num=>({ type:"text", text:getValue(num) })) })
    }
    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: { name: tmpl.template_name, language: { code: tmpl.language||"en" } }
    }
    if (components.length > 0) payload.template.components = components
    return payload
  }

  function getPreview() {
    const tmpl = templates.find(t=>t.id===selectedTmplId)
    if (!tmpl) return ""
    return tmpl.preview({ ...tmplVals, var_1: tmplVals.var_1||"Priya" })
  }

  async function sendTest() {
    if (!testPhone.trim()||!whatsapp||!selectedTmplId||testState==="sending") return
    setTestState("sending")
    try {
      const payload = buildPayload("Test User", toPhone(testPhone))
      if (!payload) { setTestState("fail"); setTimeout(()=>setTestState("idle"),3000); return }
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token
      if (!authToken) { alert("Not authenticated"); setTestState("fail"); setTimeout(()=>setTestState("idle"),3000); return }
      const res = await fetch("/api/meta/send-message", {
        method: "POST",
        headers: { "Authorization": "Bearer " + authToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: payload.to,
          templateName: payload.template.name,
          language: payload.template.language.code,
          components: payload.template.components || []
        })
      })
      const d = await res.json()
      if (d.error) {
        console.error("Test send error:", d.error)
        alert("Test failed: "+d.error)
        setTestState("fail")
      } else {
        setTestState("done")
      }
    } catch(e) {
      alert("Error: "+e.message)
      setTestState("fail")
    }
    setTimeout(()=>setTestState("idle"),3000)
  }

  async function pollDelivery(campId, waIds) {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!waIds?.length||!campId) return
    let ticks = 0
    pollRef.current = setInterval(async()=>{
      ticks++
      if (ticks>60) { clearInterval(pollRef.current); return }
      try {
        const { data:msgs } = await supabase.from("messages")
          .select("status,wa_message_id").in("wa_message_id",waIds)
        if (!msgs) return
        const delivered = msgs.filter(m=>m.status==="delivered"||m.status==="read").length
        const read      = msgs.filter(m=>m.status==="read").length
        await supabase.from("campaigns").update({delivered_count:delivered,read_count:read}).eq("id",campId)
        await loadHistory()
      } catch(e) {}
    },10000)
  }

  async function sendCampaign() {
    const aud  = getAudience()
    const tmpl = templates.find(t=>t.id===selectedTmplId)
    if (!tmpl||!whatsapp||sending||!aud.length||!campaignName.trim()) return
    setSending(true); setSentCount(0); setFailCount(0); setStep("sending")
    const now   = new Date().toISOString()
    const waIds = []
    let sc=0, fc=0, campId=null
    try {
      const { data:nc } = await supabase.from("campaigns").insert({
        user_id:userId, name:campaignName, status:"live",
        sent_count:0, failed_count:0, delivered_count:0,
        read_count:0, replied_count:0, segment,
        message:getPreview().substring(0,500),
        template_name:tmpl.template_name,
        wa_message_ids:[], sent_at:now, created_at:now,
      }).select("id").single()
      campId = nc?.id
    } catch(e) { console.error("Campaign insert:", e.message) }

    for (const customer of aud) {
      const phone = toPhone(customer.phone)
      const payload = buildPayload(customer.name||"Customer", phone)
      if (!payload) { fc++; setFailCount(fc); continue }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const authToken = session?.access_token
        const res = await fetch("/api/meta/send-message", {
          method: "POST",
          headers: { "Authorization": "Bearer " + authToken, "Content-Type": "application/json" },
          body: JSON.stringify({
            to: payload.to,
            templateName: payload.template.name,
            language: payload.template.language.code,
            components: payload.template.components || []
          })
        })
        const d = await res.json()
        if (!d.error) {
          sc++; setSentCount(sc)
          const waId = d?.waMessageId
          if (waId) waIds.push(waId)
          // ── INSERT INTO campaign_recipients ──
if (campId) {
  try {
    await supabase.from("campaign_recipients").insert({
      campaign_id: campId,
      user_id: userId,
      phone: dedupe(phone),
      status: "sent",
      wa_message_id: waId || null,
      sent_at: now,
      created_at: now,
    })
  } catch(e) {
    console.error("⚠️ campaign_recipients insert failed for", phone, e.message)
  }
}
          try {
            const { data:convo, error:convoErr } = await supabase
              .from("conversations").select("id")
              .eq("user_id",userId).eq("phone",phone).maybeSingle()
            if (convoErr) console.error("⚠️ conversation lookup failed for", phone, convoErr.message)
            const { error:msgErr } = await supabase.from("messages").insert({
              user_id:userId, customer_phone:dedupe(phone),
              conversation_id:convo?.id||null, direction:"outbound",
              message_type:"template", message_text:getPreview().substring(0,500),
              status:"sent", is_ai:false, wa_message_id:waId||null, created_at:now
            })
            if (msgErr) console.error("⚠️ messages insert failed for", phone, msgErr.message)
            if (convo?.id) {
              await supabase.from("conversations").update({
                campaign_sent_at: now,
                campaign_message: getPreview().substring(0,500),
                campaign_id: campId,
                campaign_replied_at: null,
                state_json: null
              }).eq("id", convo.id)
            } else {
              console.warn("⚠️ No existing conversation for", phone, "— first-time contact, campaign context won't attach to their reply until upsertConversation creates one")
            }
          } catch(e) {
            console.error("⚠️ Post-send tracking failed for", phone, e.message)
          }
        } else {
          console.error("Send error for", phone, d.error.message)
          fc++; setFailCount(fc)
        }
      } catch(e) { fc++; setFailCount(fc) }
      await new Promise(r=>setTimeout(r,1200))
    }

    if (campId) {
      await supabase.from("campaigns").update({
        sent_count:sc, failed_count:fc, status:"done", wa_message_ids:waIds
      }).eq("id",campId)
      if (waIds.length>0) pollDelivery(campId, waIds)
      setLastSentCampId(campId)
    }
    await loadHistory()
    setSending(false); setStep("done")
  }

  async function saveDraft() {
    if (!userId||!campaignName.trim()||!selectedTmplId) return
    const tmpl = templates.find(t=>t.id===selectedTmplId)
    try {
      await supabase.from("campaigns").insert({
        user_id:userId, name:campaignName.trim(), status:"draft",
        template_name:tmpl?.template_name||"", segment,
        message:getPreview().substring(0,500),
        sent_count:0, failed_count:0, delivered_count:0,
        read_count:0, replied_count:0, created_at:new Date().toISOString()
      })
      await loadHistory()
      alert("Draft saved!")
    } catch(e) { console.error("saveDraft:", e.message) }
  }

  function openDraft(c) {
    setCampaignName(c.name||"")
    setSegment(c.segment||"all")
    setView("compose")
    setStep("setup")
    if (templates.length > 0) {
      const tmpl = templates.find(t=>t.template_name===c.template_name)
      if (tmpl) setSelectedTmplId(tmpl.id)
      else setSelectedTmplId("")
    } else {
      pendingDraftRef.current = c.template_name
      if (whatsapp) fetchMetaTemplates(whatsapp)
    }
  }

  function duplicateCampaign(c) {
    setCampaignName((c.name||"Campaign")+" (copy)")
    setSegment(c.segment&&c.segment!=="manual"&&c.segment!=="csv"?c.segment:"all")
    setView("compose")
    setStep("setup")
    if (templates.length > 0) {
      const tmpl = templates.find(t=>t.template_name===c.template_name)
      setSelectedTmplId(tmpl?tmpl.id:"")
    } else {
      pendingDraftRef.current = c.template_name
      if (whatsapp) fetchMetaTemplates(whatsapp)
    }
  }

  async function deleteCampaign(c) {
    if (!window.confirm(`Delete campaign "${c.name}"? This only removes the record — messages already sent are unaffected.`)) return
    try {
      await supabase.from("campaigns").delete().eq("id",c.id).eq("user_id",userId)
      setExpanded(null)
      await loadHistory()
    } catch(e) { console.error("delete:", e.message) }
  }

  function handleCsv(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const nums = []
      ev.target.result.split("\n").forEach(line =>
        line.replace(/\r/g,"").split(",").forEach(col => {
          const d = col.replace(/[^0-9]/g,"")
          if (d.length>=10) nums.push(d)
        })
      )
      setCsvNums([...new Set(nums)]); setSegment("csv")
    }
    reader.readAsText(file)
  }

  const toggleTheme = () => { const n=!dark; setDark(n); localStorage.setItem("fastrill-theme",n?"dark":"light") }
  const logout      = async() => { await supabase.auth.signOut(); router.push("/login") }

  const bg   = dark?"#08080e":"#f0f2f5"
  const sb   = dark?"#0c0c15":"#ffffff"
  const card = dark?"#0f0f1a":"#ffffff"
  const bdr  = dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.08)"
  const cbdr = dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)"
  const tx   = dark?"#eeeef5":"#111827"
  const txm  = dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)"
  const txf  = dark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.22)"
  const ibg  = dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"
  const acc  = dark?"#00C9B1":"#00897A"
  const adim = dark?"rgba(0,208,132,0.1)":"rgba(0,147,90,0.08)"
  const inp  = { background:ibg, border:"1px solid "+cbdr, borderRadius:9, padding:"11px 14px", fontSize:13.5, color:tx, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none", width:"100%" }
  const ui   = userEmail?userEmail[0].toUpperCase():"G"

  const selectedTmpl = templates.find(t=>t.id===selectedTmplId)||null
  const audience     = getAudience()
  const previewText  = getPreview()
  const nonAutoVars  = selectedTmpl?.vars.filter(v=>!v.auto)||[]
  const allVarsFilled = nonAutoVars.every(v=>!!tmplVals[v.key])
  const canSend = !!whatsapp&&!!campaignName.trim()&&audience.length>0&&!!selectedTmplId&&allVarsFilled

  // Period comparison: last 30 days vs previous 30 days (real data)
  const now30  = Date.now()-30*86400000
  const now60  = Date.now()-60*86400000
  const cur    = statsFor(history.filter(c=>c.sent_at&&new Date(c.sent_at).getTime()>=now30))
  const prev   = statsFor(history.filter(c=>c.sent_at&&new Date(c.sent_at).getTime()>=now60&&new Date(c.sent_at).getTime()<now30))
  const allTime = statsFor(history)
  const liveCount = history.filter(c=>c.status==="live").length

  const sparkSent    = dailySeries(14, c=>c.sent_count||0)
  const sparkReply   = dailySeries(14, c=>cappedReplies(c))
  const sparkRevenue = dailySeries(14, c=>Math.round(cappedReplies(c)*0.6)*avgServiceValue)

  const filteredTemplates = templates.filter(t=>
    !tmplSearch.trim() ||
    t.label.toLowerCase().includes(tmplSearch.trim().toLowerCase()) ||
    t.bodyText.toLowerCase().includes(tmplSearch.trim().toLowerCase())
  )

  const KPIS = [
    {label:"Est. Revenue (30d)", val:"₹"+cur.estRevenue.toLocaleString(), trend:trendPct(cur.estRevenue,prev.estRevenue), spark:sparkRevenue, color:acc,       icon:"₹",  sub:"vs prev 30 days"},
    {label:"Messages Sent (30d)",val:cur.sent.toLocaleString(),           trend:trendPct(cur.sent,prev.sent),             spark:sparkSent,    color:"#38bdf8", icon:"📤", sub:"vs prev 30 days"},
    {label:"Replies (30d)",      val:cur.reply.toLocaleString(),          trend:trendPct(cur.reply,prev.reply),           spark:sparkReply,   color:"#a78bfa", icon:"↩", sub:"unique customers"},
    {label:"Delivery Rate",      val:cur.deliveryRate!==null?cur.deliveryRate+"%":"—", trend:trendPct(cur.deliveryRate,prev.deliveryRate), spark:null, color:"#38bdf8", icon:"📬", sub:cur.dlv+" delivered"},
    {label:"Read Rate",          val:cur.readRate!==null?cur.readRate+"%":"—",         trend:trendPct(cur.readRate,prev.readRate),         spark:null, color:"#a78bfa", icon:"👁", sub:cur.read+" read"},
    {label:"Reply Rate",         val:cur.replyRate!==null?cur.replyRate+"%":"—",       trend:trendPct(cur.replyRate,prev.replyRate),       spark:null, color:acc,       icon:"💬", sub:"of messages sent"},
    {label:"Est. Bookings (30d)",val:cur.estBookings,                     trend:trendPct(cur.estBookings,prev.estBookings), spark:null,       color:"#f59e0b", icon:"◷", sub:"from replies × 60%"},
    {label:"ROI (30d)",          val:fmtRoi(cur.roi),                     trend:null,                                      spark:null,        color:cur.roi!==null&&cur.roi>0?acc:txm, icon:"📈", sub:"₹"+cur.cost.toLocaleString()+" spend"},
  ]

  return (
    <>
      <style>{`
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${tx}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .wrap{display:flex;height:100vh;overflow:hidden;}
        .sidebar{width:224px;flex-shrink:0;background:${sb};border-right:1px solid ${bdr};display:flex;flex-direction:column;overflow-y:auto;transition:transform 0.25s;scrollbar-width:none;}
        .sidebar::-webkit-scrollbar{display:none;}
        .logo{padding:16px 18px;text-decoration:none;display:flex;align-items:center;gap:10px;border-bottom:1px solid ${bdr};}
        .navs{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${txf};font-weight:700;}
        .navi{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${dark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.45)"};font-weight:500;transition:all 0.12s;border:1px solid transparent;background:none;width:calc(100% - 14px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .navi:hover{background:${ibg};color:${tx};}
        .navi.on{background:${dark?"rgba(0,196,125,0.1)":"rgba(0,180,115,0.08)"};color:${dark?"#00B5A0":"#00897A"};font-weight:600;border-color:${dark?"rgba(0,196,125,0.2)":"rgba(0,180,115,0.2)"};}
        .sbf{margin-top:auto;padding:14px;border-top:1px solid ${bdr};}
        .uc{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${ibg};border:1px solid ${cbdr};}
        .ua{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${acc},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff;flex-shrink:0;}
        .lb{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cbdr};font-size:11.5px;color:${txm};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .lb:hover{border-color:#fca5a5;color:#ef4444;}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${bdr};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sb};}
        .tb{padding:4px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:${txm};font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;}
        .tb.on{background:${card};color:${tx};box-shadow:0 1px 4px rgba(0,0,0,0.15);}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        .kpi{background:${card};border:1px solid ${cbdr};border-radius:13px;padding:"16px 16px";padding:16px;transition:transform 0.12s,border-color 0.12s;}
        .kpi:hover{border-color:${acc}33;}
        .split{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;}
        .tbl{width:100%;border-collapse:collapse;font-size:12.5px;}
        .tbl th{position:sticky;top:0;background:${card};z-index:2;text-align:left;padding:11px 12px;font-size:10.5px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${txf};border-bottom:1px solid ${bdr};white-space:nowrap;cursor:pointer;user-select:none;}
        .tbl th.nosort{cursor:default;}
        .tbl td{padding:12px;border-bottom:1px solid ${bdr};color:${tx};vertical-align:middle;white-space:nowrap;}
        .tbl tbody tr{transition:background 0.1s;cursor:pointer;}
        .tbl tbody tr:hover{background:${ibg};}
        .chip{padding:4px 12px;border-radius:100px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid ${cbdr};background:${ibg};color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .chip.on{border-color:${acc};background:${adim};color:${acc};}
        .act{padding:5px 12px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid ${cbdr};background:${ibg};color:${txm};font-family:'Plus Jakarta Sans',sans-serif;}
        .act:hover{color:${tx};border-color:${acc}44;}
        .act.danger:hover{color:#ef4444;border-color:#ef444466;}
        .funnel-bar{height:8px;border-radius:100px;background:${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"};overflow:hidden;}
        .tmpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        .tmpl-card{padding:16px;border:1px solid ${cbdr};border-radius:12px;background:${card};transition:all 0.12s;}
        .tmpl-card:hover{border-color:${acc}44;transform:translateY(-1px);}
        .tmpl-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ${cbdr};border-radius:10px;background:${ibg};cursor:pointer;transition:all 0.1s;}
        .tmpl-row:hover{border-color:${acc}44;}
        .tmpl-row.on{border-color:${acc};background:${adim};}
        .seg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .seg-card{padding:12px 14px;border:1px solid ${cbdr};border-radius:10px;cursor:pointer;transition:all 0.12s;background:${ibg};display:flex;align-items:center;gap:10px;}
        .seg-card:hover{border-color:${acc}44;}
        .seg-card.on{border-color:${acc};background:${adim};}
        .step-card{background:${card};border:1px solid ${cbdr};border-radius:14px;margin-bottom:18px;overflow:hidden;}
        .step-head{padding:18px 22px;border-bottom:1px solid ${bdr};display:flex;align-items:center;gap:12px;}
        .step-body{padding:22px;}
        .step-num{width:26px;height:26px;border-radius:50%;background:${adim};border:1px solid ${acc}44;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:${acc};flex-shrink:0;}
        .var-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .compose-pad{padding:28px;max-width:760px;margin:0 auto;}
        .hbtn{display:none;background:${ibg};border:1px solid ${cbdr};border-radius:7px;padding:5px 8px;cursor:pointer;font-size:16px;color:${tx};line-height:1;margin-right:4px;}
        .mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:299;cursor:pointer;}
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sb};border-top:1px solid ${bdr};padding:5px 0 calc(5px + env(safe-area-inset-bottom));z-index:200;}
        .bni{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:none;background:transparent;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex:1;}
        .bnic{font-size:16px;color:${txf};}
        .bnil{font-size:9px;font-weight:600;color:${txf};}
        .bni.on .bnic,.bni.on .bnil{color:${acc};}
        input:focus,textarea:focus{border-color:${acc}88!important;outline:none;}
        .tblwrap{overflow:auto;max-height:calc(100vh - 420px);min-height:280px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fin{animation:fadeUp 0.3s ease both;}
        @media(max-width:1100px){
          .kpi-grid{grid-template-columns:repeat(2,1fr);}
          .split{grid-template-columns:1fr;}
          .tmpl-grid{grid-template-columns:repeat(2,1fr);}
        }
        @media(max-width:767px){
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);width:240px!important;}
          .sidebar.open{transform:translateX(0);box-shadow:4px 0 24px rgba(0,0,0,0.5);}
          .mob-ov.open{display:block;}
          .hbtn{display:flex;}
          .bnav{display:flex;}
          .main{padding-bottom:58px;}
          .compose-pad{padding:16px;}
          .kpi-grid{grid-template-columns:repeat(2,1fr);gap:8px;}
          .tmpl-grid{grid-template-columns:1fr;}
          .var-grid{grid-template-columns:1fr!important;}
          .seg-grid{grid-template-columns:1fr;}
          .hdr-actions .act{display:none;}
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
            <button key={item.id} className={"navi"+(item.id==="campaigns"?" on":"")}
              onClick={()=>{ router.push(item.path); setMobOpen(false) }}>
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
              <span style={{fontWeight:700,fontSize:15,color:tx}}>Campaigns</span>
              {!planLocked && (
                <div style={{display:"flex",background:ibg,border:"1px solid "+cbdr,borderRadius:8,padding:2,gap:1,marginLeft:8}}>
                  {[["overview","Overview"],["compose","Compose"],["templates","Templates ("+templates.length+")"]].map(([v,l])=>(
                    <button key={v} className={"tb"+(view===v?" on":"")}
                      onClick={()=>{ setView(v); if(v==="overview") loadHistory() }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {!whatsapp&&!planLocked&&(
                <div style={{fontSize:12,color:"#fb7185",background:"rgba(251,113,133,0.08)",border:"1px solid rgba(251,113,133,0.2)",borderRadius:7,padding:"5px 12px"}}>
                  ⚠ Connect WhatsApp
                </div>
              )}
              <button onClick={toggleTheme}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:ibg,border:"1px solid "+cbdr,borderRadius:7,cursor:"pointer",fontSize:11.5,color:txm,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                <span>{dark?"🌙":"☀️"}</span>
                <div style={{width:28,height:15,borderRadius:100,background:dark?acc:"#d1d5db",position:"relative",flexShrink:0}}>
                  <div style={{position:"absolute",top:2,width:11,height:11,borderRadius:"50%",background:"#fff",left:dark?"15px":"2px",transition:"left 0.2s"}}/>
                </div>
              </button>
            </div>
          </div>

          {/* ── PLAN LOCK ── */}
          {planLocked && (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:16,textAlign:"center"}}>
              <div style={{fontSize:52,opacity:0.2}}>🔒</div>
              <div style={{fontWeight:800,fontSize:22,color:tx}}>Campaigns — Pro Plan Only</div>
              <div style={{fontSize:14,color:txm,maxWidth:420,lineHeight:1.8,marginTop:4}}>
                WhatsApp bulk campaigns are available on the{" "}
                <strong style={{color:acc}}>Pro plan (₹4,999/month)</strong>.
                Upgrade to reach all your customers with personalised broadcasts.
              </div>
              <button
                onClick={()=>router.push("/dashboard/settings")}
                style={{padding:"13px 32px",borderRadius:10,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",marginTop:12}}>
                Upgrade to Pro →
              </button>
            </div>
          )}

          {/* ══ OVERVIEW — COMMAND CENTER ══ */}
          {!planLocked && view==="overview" && (
            <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>

              {/* Header */}
              <div className="fin" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:23,color:tx,letterSpacing:"-0.5px"}}>Campaigns</div>
                  <div style={{fontSize:13,color:txm,marginTop:3}}>
                    Manage, launch and monitor every WhatsApp campaign.
                    {liveCount>0&&<span style={{color:"#38bdf8",fontWeight:600}}> · {liveCount} sending now</span>}
                  </div>
                </div>
                <div className="hdr-actions" style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button className="act" onClick={()=>router.push("/dashboard/contacts")}>Import Contacts</button>
                  <button className="act" onClick={()=>setView("templates")}>Templates</button>
                  <button onClick={()=>{ setView("compose"); setStep("setup") }}
                    style={{padding:"10px 22px",borderRadius:10,background:acc,border:"none",color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    + New Campaign
                  </button>
                </div>
              </div>

              {history.filter(c=>c.status!=="draft").length===0 && !histLoading ? (
                /* Empty state */
                <div className="fin" style={{background:card,border:"1px solid "+cbdr,borderRadius:16,padding:"80px 24px",textAlign:"center"}}>
                  <div style={{fontSize:56,marginBottom:18,opacity:0.2}}>📢</div>
                  <div style={{fontWeight:800,fontSize:20,color:tx,marginBottom:8}}>Launch your first campaign</div>
                  <div style={{fontSize:13.5,color:txm,marginBottom:28,maxWidth:380,marginLeft:"auto",marginRight:"auto",lineHeight:1.7}}>
                    Send a personalised WhatsApp message to your customers and watch replies turn into bookings — Fastrill's AI handles every response.
                  </div>
                  <button onClick={()=>{ setView("compose"); setStep("setup") }} style={{padding:"13px 34px",borderRadius:11,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    Create Campaign →
                  </button>
                </div>
              ):(
              <>
                {/* KPI row — real 30d data, real trends, real sparklines */}
                <div className="kpi-grid fin">
                  {KPIS.map((k,i)=>(
                    <div key={k.label} className="kpi" style={{animationDelay:`${i*30}ms`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div style={{fontSize:11,color:txm,fontWeight:600}}>{k.icon} {k.label}</div>
                        {k.trend!==null&&k.trend!==undefined&&(
                          <span style={{fontSize:10.5,fontWeight:700,color:k.trend>=0?acc:"#fb7185",background:k.trend>=0?adim:"rgba(251,113,133,0.08)",padding:"2px 8px",borderRadius:100}}>
                            {fmtTrend(k.trend)}
                          </span>
                        )}
                      </div>
                      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:8}}>
                        <div>
                          <div style={{fontWeight:800,fontSize:23,letterSpacing:"-1px",lineHeight:1,color:tx}}>{loading?"—":k.val}</div>
                          <div style={{fontSize:10,color:txf,marginTop:5}}>{k.sub}</div>
                        </div>
                        {k.spark&&<Spark data={k.spark} color={k.color}/>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Split: table 70% + insights 30% */}
                <div className="split fin" style={{animationDelay:"0.1s"}}>

                  {/* CAMPAIGN TABLE */}
                  <div style={{background:card,border:"1px solid "+cbdr,borderRadius:14,overflow:"hidden"}}>
                    <div style={{padding:"14px 18px",borderBottom:"1px solid "+bdr,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <input placeholder="🔍 Search campaigns..." value={q} onChange={e=>setQ(e.target.value)}
                        style={{...inp,width:220,padding:"8px 12px",fontSize:12.5}}/>
                      <div style={{display:"flex",gap:6}}>
                        {[["all","All"],["done","Done"],["live","Sending"],["draft","Drafts"]].map(([v,l])=>(
                          <button key={v} className={"chip"+(statusFilt===v?" on":"")} onClick={()=>setStatusFilt(v)}>{l}</button>
                        ))}
                      </div>
                      <span style={{marginLeft:"auto",fontSize:11.5,color:txf}}>{tableRows.length} campaigns</span>
                    </div>

                    <div className="tblwrap">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th className="nosort">Campaign</th>
                            <th className="nosort">Status</th>
                            <th onClick={()=>toggleSort("sent")}>Sent {sortKey==="sent"?(sortDir==="desc"?"↓":"↑"):""}</th>
                            <th className="nosort">Dlvd</th>
                            <th className="nosort">Read%</th>
                            <th onClick={()=>toggleSort("reply")}>Reply% {sortKey==="reply"?(sortDir==="desc"?"↓":"↑"):""}</th>
                            <th className="nosort">Est. Rev</th>
                            <th onClick={()=>toggleSort("cost")}>Cost {sortKey==="cost"?(sortDir==="desc"?"↓":"↑"):""}</th>
                            <th onClick={()=>toggleSort("date")}>Date {sortKey==="date"?(sortDir==="desc"?"↓":"↑"):""}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map(c=>{
                            const sc=c.sent_count||0
                            const rpl=cappedReplies(c)
                            const replyRt=sc>0?Math.min(100,Math.round((rpl/sc)*100)):null
                            const readRt=sc>0?Math.min(100,Math.round(((c.read_count||0)/sc)*100)):null
                            const estRev=Math.round(rpl*0.6)*avgServiceValue
                            const cost=campCost(c).toFixed(2)
                            const isDone=c.status==="done"||c.status==="completed"
                            const isDraft=c.status==="draft"
                            const isLive=c.status==="live"
                            const isOpen=expanded===c.id
                            const isHl=c.id===lastSentCampId
                            return (
                              <FragmentRow key={c.id}>
                                <tr onClick={()=>setExpanded(isOpen?null:c.id)}
                                  style={isHl?{background:adim}:undefined}>
                                  <td style={{fontWeight:600,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis"}}>
                                    <span style={{color:txf,marginRight:6,fontSize:10}}>{isOpen?"▼":"▶"}</span>{c.name}
                                  </td>
                                  <td>
                                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:100,fontWeight:700,
                                      background:isDone?adim:isDraft?"rgba(245,158,11,0.1)":isLive?"rgba(56,189,248,0.1)":"rgba(245,158,11,0.1)",
                                      color:isDone?acc:isDraft?"#f59e0b":isLive?"#38bdf8":"#f59e0b"}}>
                                      {isDone?"Done":isDraft?"Draft":isLive?"Sending":c.status}
                                    </span>
                                  </td>
                                  <td>{sc}</td>
                                  <td style={{color:"#38bdf8"}}>{c.delivered_count||0}</td>
                                  <td style={{color:"#a78bfa"}}>{readRt!==null?readRt+"%":"—"}</td>
                                  <td style={{color:acc,fontWeight:700}}>{replyRt!==null?replyRt+"%":"—"}</td>
                                  <td>{sc>0?"₹"+estRev.toLocaleString():"—"}</td>
                                  <td style={{color:txm}}>₹{cost}</td>
                                  <td style={{color:txm,fontSize:11.5}}>
                                    {c.sent_at?new Date(c.sent_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}
                                  </td>
                                </tr>
                                {isOpen&&(
                                  <tr>
                                    <td colSpan={9} style={{background:ibg,padding:"18px 20px",whiteSpace:"normal",cursor:"default"}} onClick={e=>e.stopPropagation()}>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                                        <div>
                                          <div style={{fontSize:11,color:txf,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Message</div>
                                          <div style={{background:card,border:"1px solid "+cbdr,borderRadius:10,padding:"12px 14px",fontSize:12.5,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:140,overflow:"auto"}}>
                                            {c.message||"—"}
                                          </div>
                                          <div style={{fontSize:11,color:txf,marginTop:8}}>
                                            Template: <span style={{color:txm}}>{c.template_name||"—"}</span> · Segment: <span style={{color:txm}}>{c.segment||"—"}</span>
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{fontSize:11,color:txf,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Delivery funnel</div>
                                          {[
                                            {l:"Sent",      v:sc,                  c:"#eeeef5"},
                                            {l:"Delivered", v:c.delivered_count||0,c:"#38bdf8"},
                                            {l:"Read",      v:c.read_count||0,     c:"#a78bfa"},
                                            {l:"Replied",   v:rpl,                 c:acc},
                                          ].map(f=>(
                                            <div key={f.l} style={{marginBottom:8}}>
                                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,marginBottom:3}}>
                                                <span style={{color:txm}}>{f.l}</span>
                                                <span style={{fontWeight:700,color:f.c}}>{f.v}</span>
                                              </div>
                                              <div className="funnel-bar">
                                                <div style={{height:"100%",borderRadius:100,width:(sc>0?Math.max(2,Math.round((f.v/sc)*100)):0)+"%",background:f.c,opacity:0.75}}/>
                                              </div>
                                            </div>
                                          ))}
                                          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                                            {isDraft&&<button className="act" onClick={()=>openDraft(c)}>✏️ Open Draft</button>}
                                            <button className="act" onClick={()=>duplicateCampaign(c)}>⧉ Duplicate</button>
                                            <button className="act danger" onClick={()=>deleteCampaign(c)}>🗑 Delete</button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </FragmentRow>
                            )
                          })}
                          {tableRows.length===0&&(
                            <tr><td colSpan={9} style={{textAlign:"center",padding:32,color:txf,cursor:"default"}}>No campaigns match.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* INSIGHTS PANEL — real data only, locked until sample size */}
                  <div style={{background:card,border:"1px solid "+cbdr,borderRadius:14,padding:"18px 18px",position:"sticky",top:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:100,padding:"2px 9px",fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:"0.5px"}}>◈ INSIGHTS</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:14,color:tx,marginBottom:4}}>From your own data</div>
                    <div style={{fontSize:11,color:txf,marginBottom:16,lineHeight:1.5}}>
                      Computed from your real campaign history — no generic benchmarks, no invented predictions.
                    </div>

                    {!insights.unlocked?(
                      <div style={{background:ibg,border:"1px dashed "+cbdr,borderRadius:11,padding:"20px 16px",textAlign:"center"}}>
                        <div style={{fontSize:26,opacity:0.25,marginBottom:8}}>🔓</div>
                        <div style={{fontSize:12.5,fontWeight:700,color:txm,marginBottom:4}}>Insights unlock at 25 sends</div>
                        <div style={{fontSize:11.5,color:txf,lineHeight:1.6,marginBottom:12}}>
                          {insights.totalSent} of 25 real messages sent. Send campaigns to actual customers and patterns will appear here.
                        </div>
                        <div className="funnel-bar" style={{maxWidth:160,margin:"0 auto"}}>
                          <div style={{height:"100%",borderRadius:100,width:Math.min(100,Math.round((insights.totalSent/25)*100))+"%",background:acc}}/>
                        </div>
                      </div>
                    ):insights.items.length===0?(
                      <div style={{background:ibg,border:"1px dashed "+cbdr,borderRadius:11,padding:"20px 16px",textAlign:"center",fontSize:12,color:txf,lineHeight:1.6}}>
                        Not enough variation between campaigns yet to find patterns. Try different templates, segments or send times.
                      </div>
                    ):(
                      insights.items.map((it,i)=>(
                        <div key={i} style={{background:ibg,border:"1px solid "+cbdr,borderRadius:11,padding:"13px 14px",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:700,color:tx,marginBottom:4}}>{it.icon} {it.title}</div>
                          <div style={{fontSize:11.5,color:txm,lineHeight:1.6}}>{it.text}</div>
                        </div>
                      ))
                    )}

                    <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+bdr}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"4px 0"}}>
                        <span style={{color:txf}}>All-time sent</span><span style={{fontWeight:700,color:tx}}>{allTime.sent}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"4px 0"}}>
                        <span style={{color:txf}}>All-time replies</span><span style={{fontWeight:700,color:acc}}>{allTime.reply}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"4px 0"}}>
                        <span style={{color:txf}}>All-time spend</span><span style={{fontWeight:700,color:txm}}>₹{allTime.cost.toLocaleString()}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"4px 0"}}>
                        <span style={{color:txf}}>Median booking value</span><span style={{fontWeight:700,color:txm}}>₹{avgServiceValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
              )}
            </div>
          )}

          {/* ══ TEMPLATES LIBRARY (moved out of compose) ══ */}
          {!planLocked && view==="templates" && (
            <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>
              <div className="fin" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:22,color:tx,letterSpacing:"-0.5px"}}>Template Library</div>
                  <div style={{fontSize:13,color:txm,marginTop:3}}>Approved templates from your Meta WhatsApp Business account</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {whatsapp&&(
                    <button className="act" onClick={()=>fetchMetaTemplates(whatsapp)}>↻ Refresh</button>
                  )}
                  <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noreferrer"
                    style={{display:"inline-block",padding:"9px 20px",borderRadius:9,background:acc,color:"#000",fontWeight:700,fontSize:12.5,textDecoration:"none"}}>
                    Create in Meta →
                  </a>
                </div>
              </div>

              <input placeholder="🔍 Search templates..." value={tmplSearch} onChange={e=>setTmplSearch(e.target.value)}
                style={{...inp,maxWidth:320,marginBottom:18}}/>

              {tmplLoading&&<div style={{textAlign:"center",padding:48,color:txf}}>Loading from Meta...</div>}
              {!tmplLoading&&templates.length===0&&(
                <div style={{background:card,border:"1px solid "+cbdr,borderRadius:16,padding:"64px 24px",textAlign:"center"}}>
                  <div style={{fontSize:44,marginBottom:14,opacity:0.25}}>📋</div>
                  <div style={{fontWeight:700,fontSize:16,color:tx,marginBottom:8}}>
                    {!whatsapp?"Connect WhatsApp to load templates":"No approved templates yet"}
                  </div>
                  <div style={{fontSize:12.5,color:txf,lineHeight:1.6}}>Templates created in Meta Business Manager appear here once approved (24-48 hrs).</div>
                </div>
              )}
              {!tmplLoading&&filteredTemplates.length>0&&(
                <div className="tmpl-grid">
                  {filteredTemplates.map(t=>(
                    <div key={t.id} className="tmpl-card">
                      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
                        <span style={{fontSize:18,lineHeight:1,flexShrink:0}}>{t.icon}</span>
                        <div style={{fontWeight:700,fontSize:13,color:tx,wordBreak:"break-all"}}>{t.label}</div>
                      </div>
                      <div style={{fontSize:11.5,color:txm,lineHeight:1.55,marginBottom:12,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",minHeight:52}}>
                        {t.bodyText||"—"}
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
                        <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:100,fontWeight:700,
                          background:t.category==="UTILITY"||t.category==="AUTHENTICATION"?"rgba(56,189,248,0.1)":adim,
                          color:t.category==="UTILITY"||t.category==="AUTHENTICATION"?"#38bdf8":acc}}>
                          {t.category}
                        </span>
                        <span style={{fontSize:10,color:txf}}>{t.language}</span>
                        <span style={{fontSize:10,color:txf,marginLeft:"auto"}}>₹{t.metaCost}/msg</span>
                      </div>
                      <button onClick={()=>{ setSelectedTmplId(t.id); setTmplVals(p=>({business_name:p.business_name||bizName})); setView("compose"); setStep("setup") }}
                        style={{width:"100%",padding:"9px",borderRadius:8,background:adim,border:"1px solid "+acc+"44",color:acc,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                        Use in Campaign →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ COMPOSE: SENDING ══ */}
          {!planLocked && view==="compose"&&step==="sending"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:24}}>
              <div style={{fontSize:48}}>📤</div>
              <div style={{fontWeight:800,fontSize:24,color:tx}}>Sending Campaign...</div>
              <div style={{fontSize:14,color:txm}}>{sentCount} sent · {failCount} failed</div>
              <div style={{width:"100%",maxWidth:400,background:ibg,borderRadius:100,height:8,overflow:"hidden"}}>
                <div style={{height:"100%",background:acc,borderRadius:100,
                  width:audience.length>0?Math.round(((sentCount+failCount)/audience.length)*100)+"%":"0%",
                  transition:"width 0.4s"}}/>
              </div>
              <div style={{fontSize:12.5,color:txf}}>
                {audience.length>0?Math.round(((sentCount+failCount)/audience.length)*100):0}% complete
              </div>
            </div>
          )}

          {/* ══ COMPOSE: DONE ══ */}
          {!planLocked && view==="compose"&&step==="done"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:24}}>
              <div style={{fontSize:64}}>🎉</div>
              <div style={{fontWeight:800,fontSize:28,color:tx}}>Campaign Sent!</div>
              <div style={{display:"flex",gap:48}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:56,fontWeight:800,color:acc,letterSpacing:"-2px",lineHeight:1}}>{sentCount}</div>
                  <div style={{fontSize:13,color:txm,marginTop:6}}>Sent ✅</div>
                </div>
                {failCount>0&&(
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:56,fontWeight:800,color:"#fb7185",letterSpacing:"-2px",lineHeight:1}}>{failCount}</div>
                    <div style={{fontSize:13,color:txm,marginTop:6}}>Failed</div>
                  </div>
                )}
              </div>
              <div style={{fontSize:13,color:txm,textAlign:"center",maxWidth:360,lineHeight:1.7}}>
                Replies are tracked per customer and will appear in the Overview table automatically.
              </div>
              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>{ setStep("setup"); setSentCount(0); setFailCount(0); setCampaignName(""); setSelectedTmplId("") }}
                  style={{padding:"12px 32px",borderRadius:11,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  New Campaign
                </button>
                <button onClick={()=>{ setView("overview"); setStep("setup"); loadHistory() }}
                  style={{padding:"12px 32px",borderRadius:11,background:ibg,border:"1px solid "+cbdr,color:txm,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  View Overview →
                </button>
              </div>
            </div>
          )}

          {/* ══ COMPOSE: SETUP — 4-step wizard with COMPACT template picker ══ */}
          {!planLocked && view==="compose"&&step==="setup"&&(
            <div style={{flex:1,overflowY:"auto",background:bg}}>
              <div className="compose-pad">

                {/* STEP 1 — compact picker, not a library */}
                <div className="step-card">
                  <div className="step-head">
                    <div className="step-num">1</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:tx}}>Choose Template</div>
                      <div style={{fontSize:11.5,color:txf,marginTop:1}}>Pick from your approved templates</div>
                    </div>
                    <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>setView("templates")}
                        style={{padding:"5px 12px",borderRadius:7,background:ibg,border:"1px solid "+cbdr,color:txm,fontSize:11.5,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                        Browse library →
                      </button>
                      {selectedTmplId&&(
                        <button onClick={()=>setSelectedTmplId("")}
                          style={{padding:"5px 12px",borderRadius:7,background:ibg,border:"1px solid "+cbdr,color:txm,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                          ← Change
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="step-body">
                    {tmplLoading&&(
                      <div style={{padding:20,textAlign:"center",color:txf,fontSize:13}}>⟳ Loading from Meta...</div>
                    )}
                    {!whatsapp&&!tmplLoading&&(
                      <div style={{padding:12,textAlign:"center"}}>
                        <div style={{fontWeight:600,fontSize:13.5,color:tx,marginBottom:10}}>📵 WhatsApp not connected</div>
                        <button onClick={()=>router.push("/dashboard/settings")}
                          style={{padding:"9px 20px",borderRadius:9,background:acc,border:"none",color:"#000",fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                          Go to Settings →
                        </button>
                      </div>
                    )}
                    {whatsapp&&!tmplLoading&&tmplError==="no_templates"&&(
                      <div style={{padding:12,textAlign:"center"}}>
                        <div style={{fontWeight:600,fontSize:13.5,color:tx,marginBottom:8}}>📋 No approved templates found</div>
                        <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noreferrer"
                          style={{display:"inline-block",padding:"9px 20px",borderRadius:9,background:acc,color:"#000",fontWeight:700,fontSize:12.5,textDecoration:"none"}}>
                          Create in Meta →
                        </a>
                      </div>
                    )}
                    {whatsapp&&!tmplLoading&&tmplError&&tmplError!=="no_templates"&&tmplError!=="no_whatsapp"&&(
                      <div style={{padding:12,textAlign:"center"}}>
                        <div style={{fontSize:12,color:"#fb7185",marginBottom:12,lineHeight:1.5}}>⚠️ {tmplError}</div>
                        <button onClick={()=>fetchMetaTemplates(whatsapp)}
                          style={{padding:"8px 20px",borderRadius:8,background:ibg,border:"1px solid "+cbdr,color:txm,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                          ↻ Retry
                        </button>
                      </div>
                    )}

                    {/* Compact searchable row list — NOT a giant grid */}
                    {!tmplLoading&&!tmplError&&!selectedTmplId&&templates.length>0&&(
                      <>
                        <input placeholder="🔍 Filter templates..." value={tmplSearch} onChange={e=>setTmplSearch(e.target.value)}
                          style={{...inp,marginBottom:10,padding:"9px 12px",fontSize:12.5}}/>
                        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
                          {filteredTemplates.map(t=>(
                            <div key={t.id} className="tmpl-row"
                              onClick={()=>{ setSelectedTmplId(t.id); setTmplVals(p=>({business_name:p.business_name||bizName})) }}>
                              <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:600,fontSize:12.5,color:tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.label}</div>
                                <div style={{fontSize:10.5,color:txf,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.bodyText.substring(0,70)}</div>
                              </div>
                              <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:100,fontWeight:700,flexShrink:0,
                                background:t.category==="UTILITY"||t.category==="AUTHENTICATION"?"rgba(56,189,248,0.1)":adim,
                                color:t.category==="UTILITY"||t.category==="AUTHENTICATION"?"#38bdf8":acc}}>
                                ₹{t.metaCost}
                              </span>
                            </div>
                          ))}
                          {filteredTemplates.length===0&&<div style={{padding:16,textAlign:"center",fontSize:12,color:txf}}>No templates match.</div>}
                        </div>
                      </>
                    )}

                    {selectedTmpl&&(
                      <div style={{display:"flex",alignItems:"center",gap:12,background:adim,border:"1px solid "+acc+"33",borderRadius:11,padding:"14px 16px"}}>
                        <span style={{fontSize:22,flexShrink:0}}>{selectedTmpl.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13.5,color:acc}}>{selectedTmpl.label}</div>
                          <div style={{fontSize:11.5,color:txm,marginTop:2}}>{selectedTmpl.desc} · ₹{selectedTmpl.metaCost}/msg</div>
                        </div>
                        <span style={{fontSize:16,color:acc,flexShrink:0}}>✓</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2 — DETAILS */}
                {selectedTmplId&&(
                  <div className="step-card">
                    <div className="step-head">
                      <div className="step-num">2</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:tx}}>Campaign Details</div>
                        <div style={{fontSize:11.5,color:txf,marginTop:1}}>Name your campaign and fill in variables</div>
                      </div>
                    </div>
                    <div className="step-body">
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:7}}>Campaign Name *</div>
                        <input placeholder="e.g. May Offer 2026" value={campaignName}
                          onChange={e=>setCampaignName(e.target.value)} style={{...inp,fontSize:14}}/>
                      </div>
                      {selectedTmpl?.vars.some(v=>v.auto)&&(
                        <div style={{marginBottom:16,padding:"12px 14px",background:ibg,borderRadius:9,border:"1px solid "+acc+"22"}}>
                          <div style={{fontSize:12,color:acc,fontWeight:700,marginBottom:3}}>👤 Customer Name — Auto-personalised</div>
                          <div style={{fontSize:12.5,color:txm}}>Each recipient gets their own first name automatically. No action needed.</div>
                        </div>
                      )}
                      {nonAutoVars.length>0&&(
                        <>
                          <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:12}}>Fill in Template Variables</div>
                          <div className="var-grid">
                            {nonAutoVars.map(v=>(
                              <div key={v.key}>
                                <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:4}}>{v.label}</div>
                                <div style={{fontSize:11,color:txf,marginBottom:6}}>{v.hint}</div>
                                <input
                                  placeholder={v.hint}
                                  value={tmplVals[v.key]||""}
                                  onChange={e=>setTmplVals(p=>({...p,[v.key]:e.target.value}))}
                                  style={inp}/>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {nonAutoVars.length===0&&!selectedTmpl?.vars.some(v=>v.auto)&&(
                        <div style={{fontSize:12.5,color:txf,background:ibg,borderRadius:9,padding:"12px 14px"}}>
                          No variables — sent as-is to all recipients.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3 — AUDIENCE */}
                {selectedTmplId&&campaignName.trim()&&(
                  <div className="step-card">
                    <div className="step-head">
                      <div className="step-num">3</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:tx}}>Select Audience</div>
                        <div style={{fontSize:11.5,color:txf,marginTop:1}}>Who receives this campaign?</div>
                      </div>
                      {audience.length>0&&(
                        <div style={{marginLeft:"auto",textAlign:"right"}}>
                          <div style={{fontSize:28,fontWeight:800,color:acc,letterSpacing:"-1px",lineHeight:1}}>{audience.length}</div>
                          <div style={{fontSize:11,color:txf}}>recipients</div>
                        </div>
                      )}
                    </div>
                    <div className="step-body">
                      <div className="seg-grid" style={{marginBottom:16}}>
                        {SEGMENTS.map(s=>{
                          const count = segCount(s.id)
                          return(
                            <div key={s.id} className={"seg-card"+(segment===s.id?" on":"")}
                              onClick={()=>{ setSegment(s.id); if(s.id!=="csv") setCsvNums([]) }}>
                              <span style={{fontSize:18,flexShrink:0}}>{s.icon}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:segment===s.id?acc:tx}}>{s.label}</div>
                                <div style={{fontSize:11,color:txf,marginTop:1}}>{s.desc}</div>
                              </div>
                              {count!==null&&<div style={{fontSize:14,fontWeight:700,color:segment===s.id?acc:txf,flexShrink:0}}>{count}</div>}
                            </div>
                          )
                        })}
                      </div>
                      {segment==="manual"&&(
                        <div style={{background:ibg,border:"1px solid "+cbdr,borderRadius:10,padding:16}}>
                          <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:8}}>Enter numbers (one per line or comma-separated)</div>
                          <textarea placeholder={"919876543210\n918765432109"} value={manualNums}
                            onChange={e=>setManualNums(e.target.value)} rows={5}
                            style={{...inp,resize:"vertical",lineHeight:1.7,marginBottom:8}}/>
                          <span style={{fontSize:12.5,color:acc,fontWeight:600}}>
                            {manualNums.replace(/[,;]/g," ").split(/\s+/).filter(s=>s.trim().length>=8).length} numbers detected
                          </span>
                        </div>
                      )}
                      {segment==="csv"&&(
                        <div style={{background:ibg,border:"1px solid "+cbdr,borderRadius:10,padding:16}}>
                          <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleCsv}/>
                          <button onClick={()=>fileRef.current?.click()}
                            style={{width:"100%",padding:"12px",borderRadius:9,background:adim,border:"1px solid "+acc+"44",color:acc,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                            📎 {csvNums.length>0?csvNums.length+" numbers loaded — click to replace":"Upload CSV or .txt file"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4 — PREVIEW, TEST & SEND */}
                {selectedTmplId&&campaignName.trim()&&audience.length>0&&(
                  <div className="step-card">
                    <div className="step-head">
                      <div className="step-num">4</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:tx}}>Preview, Test & Send</div>
                        <div style={{fontSize:11.5,color:txf,marginTop:1}}>Always test on your number first</div>
                      </div>
                    </div>
                    <div className="step-body">
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
                        <div>
                          <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:10}}>Message preview</div>
                          <div style={{background:dark?"#0d1117":"#e5ddd5",borderRadius:13,padding:"18px 16px",minHeight:120}}>
                            <div style={{background:dark?"#1c2433":"#fff",borderRadius:"4px 14px 14px 14px",padding:"13px 16px",maxWidth:"92%",display:"inline-block"}}>
                              <div style={{fontSize:13.5,color:dark?"#e9edef":"#111",lineHeight:1.75,whiteSpace:"pre-wrap"}}>
                                {previewText||<span style={{color:txf,fontStyle:"italic"}}>Preview here</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:16}}>
                          <div>
                            <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:8}}>🧪 Test message</div>
                            <div style={{display:"flex",gap:8}}>
                              <input placeholder="e.g. 919876543210" value={testPhone}
                                onChange={e=>setTestPhone(e.target.value)} style={{...inp,flex:1,fontSize:13}}/>
                              <button onClick={sendTest}
                                disabled={!testPhone.trim()||!whatsapp||testState==="sending"}
                                style={{padding:"11px 16px",borderRadius:9,flexShrink:0,
                                  background:testState==="done"?acc:adim,
                                  border:"1px solid "+acc+"44",
                                  color:testState==="done"?"#000":acc,
                                  fontWeight:700,fontSize:13,cursor:"pointer",
                                  fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap"}}>
                                {testState==="sending"?"...":testState==="done"?"Sent ✓":"Send Test"}
                              </button>
                            </div>
                          </div>
                          <div style={{background:ibg,border:"1px solid "+cbdr,borderRadius:11,padding:"14px 16px",flex:1}}>
                            <div style={{fontSize:12.5,color:txm,fontWeight:600,marginBottom:12}}>Summary</div>
                            {[
                              {label:"Template",  val:selectedTmpl?.label},
                              {label:"Audience",  val:audience.length+" recipients"},
                              {label:"Meta Cost", val:"₹"+(audience.length*(selectedTmpl?.metaCost||0.83)).toFixed(2)},
                              {label:"Est. time", val:"~"+Math.ceil(audience.length*1.2)+"s"},
                            ].map(item=>(
                              <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+bdr}}>
                                <span style={{fontSize:12.5,color:txf}}>{item.label}</span>
                                <span style={{fontSize:12.5,fontWeight:600,color:tx}}>{item.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button onClick={sendCampaign} disabled={!canSend||sending}
                        style={{width:"100%",padding:"16px",
                          background:canSend?"#00B5A0":ibg,
                          border:"1px solid "+(canSend?"#00B5A0":cbdr),
                          borderRadius:12,color:canSend?"#000":txm,
                          fontWeight:800,fontSize:16,
                          cursor:canSend?"pointer":"not-allowed",
                          fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:8}}>
                        {!allVarsFilled
                          ?"↑ Fill in all template variables"
                          :"🚀 Send to "+audience.length+" people · ₹"+(audience.length*(selectedTmpl?.metaCost||0.83)).toFixed(2)}
                      </button>

                      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"center",marginTop:4}}>
                        <button onClick={saveDraft} disabled={!campaignName.trim()||!selectedTmplId}
                          style={{padding:"6px 16px",borderRadius:7,background:"transparent",border:"1px solid "+cbdr,color:txm,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                          💾 Save as Draft
                        </button>
                        <span style={{fontSize:12,color:txf}}>1 msg/sec · Meta rate safe</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="bnav">
        {[
          {id:"overview",  icon:"⬡", label:"Home",      path:"/dashboard"},
          {id:"inbox",     icon:"◎", label:"Chats",     path:"/dashboard/conversations"},
          {id:"campaigns", icon:"◆", label:"Campaigns", path:"/dashboard/campaigns"},
          {id:"leads",     icon:"◉", label:"Leads",     path:"/dashboard/leads"},
          {id:"contacts",  icon:"◑", label:"Customers", path:"/dashboard/contacts"},
        ].map(item=>(
          <button key={item.id} className={"bni"+(item.id==="campaigns"?" on":"")} onClick={()=>router.push(item.path)}>
            <span className="bnic">{item.icon}</span>
            <span className="bnil">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

// Lightweight fragment wrapper so expandable rows can return two <tr>s
function FragmentRow({children}) { return <>{children}</> }
