// lib/ai/orchestrator.js — v9.2 CAMPAIGN-SAFE + HARD-CONFIRM + SERVICE-NAME-TRIGGER
// CHANGES FROM v9.1:
// NEW FIX: handleCampaignReply() now also treats a plain SERVICE NAME mention
// (e.g. "diabetes") as a valid trigger to start the booking flow — not just
// the words book/yes/interested. Previously, saying just the service name
// fell through to the generic "Reply BOOK to schedule" fallback every time,
// and never advanced state, causing an infinite flip-flop between two
// templates depending on which exact word was sent.

const { loadContext }       = require("../memory/context-engine")
const { loadState, saveState, clearBookingFields } = require("../memory/state-engine")
const { createBooking, rescheduleBooking } = require("../booking/booking-engine")
const { matchService, isTimeBased } = require("../booking/slot-engine")
const { formatDate, formatTime, normalizeTime } = require("../booking/calendar-engine")
const { createClient } = require("@supabase/supabase-js")
const { decrypt } = require("../encryption")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GEMINI_TIMEOUT_MS  = 15000
const GEMINI_MAX_RETRIES = 2
const GEMINI_MODEL = "gemini-3.1-flash-lite"

const CONFIRM_WORDS = /^(yes|ok|okay|sure|haan|avunu|sare|confirm|cofirmed|confirmed|proceed|book it|do it|yes please|ha|ji|ji haan|aanu|otey|done|go ahead|please|correct|right|yep|yup|yeah|ya|deal|lets do it|let's do it|sounds good|perfect|great|fine|book karo|karo|kar do|aavunu|ante|ante avunu|ante ok|s|y)\.?\s*$/i
const PURE_NEGATION = /^(no|nahi|nope|vaddu|vaddhu|don't|dont|wait|hold|stop|not now|cancel it|వద్దు|noo|na|mat karo)\.?\s*$/i

function pad(n){return String(n).padStart(2,"0")}
function nowIST(){return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Kolkata"}))}
function todayStr(){const d=nowIST();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function tomorrowStr(){const d=nowIST();d.setDate(d.getDate()+1);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function todayFormatted(){return nowIST().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function pad2(n){return String(n).padStart(2,"0")}
function toMinutes(t){if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m}

function detectLanguage(msg){
  if(!msg)return"English"
  if(/[\u0C00-\u0C7F]/.test(msg))return"Telugu"
  if(/[\u0900-\u097F]/.test(msg))return"Hindi"
  if(/[\u0B80-\u0BFF]/.test(msg))return"Tamil"
  if(/[\u0C80-\u0CFF]/.test(msg))return"Kannada"
  if(/[\u0D00-\u0D7F]/.test(msg))return"Malayalam"
  return"English"
}
function t(en,te,hi,lang){if(lang==="Telugu"&&te)return te;if(lang==="Hindi"&&hi)return hi;return en}
function stripBadEmojis(text){
  if(!text)return text
  return text.replace(/📅/g,"").replace(/📆/g,"").replace(/⏰/g,"").replace(/🔔/g,"").replace(/⌚/g,"").replace(/🎊/g,"").replace(/🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛/g,"").replace(/  +/g," ").trim()
}

function extractDateFromMessage(message){
  if(!message)return null
  const m=message.toLowerCase().trim()
  if(/\btoday\b|\baaj\b|\bee roju\b/.test(m))return todayStr()
  if(/\btomm?orr?ow\b|\bkal\b|\bnale\b|\breyyi\b|\bnaale\b/.test(m))return tomorrowStr()
  const MONTHS={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11}
  const withMonth=m.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i)||m.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i)
  if(withMonth){
    let day,monthStr
    if(/^\d/.test(withMonth[1])){day=parseInt(withMonth[1]);monthStr=withMonth[2]}else{monthStr=withMonth[1];day=parseInt(withMonth[2])}
    const mIdx=MONTHS[monthStr.toLowerCase().substring(0,3)]
    if(mIdx!==undefined&&day>=1&&day<=31){
      let yr=nowIST().getFullYear()
      const cand=new Date(yr,mIdx,day)
      if(cand<new Date(todayStr()+"T00:00:00"))yr++
      const d=new Date(yr,mIdx,day)
      return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())
    }
  }
  const DAYS={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6}
  const dayMatch=m.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
  if(dayMatch){
    const target=DAYS[dayMatch[1].toLowerCase()]
    const d=nowIST();let diff=target-d.getDay();if(diff<=0)diff+=7
    d.setDate(d.getDate()+diff)
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())
  }
  const ordinal=m.match(/\b(\d{1,2})(st|nd|rd|th)\b/)
  if(ordinal){
    const day=parseInt(ordinal[1])
    if(day>=1&&day<=31){
      const now=nowIST();let mo=now.getMonth(),yr=now.getFullYear()
      let d=new Date(yr,mo,day)
      if(d<=now){mo++;if(mo>11){mo=0;yr++}}
      d=new Date(yr,mo,day)
      return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())
    }
  }
  return null
}

function extractTimeFromMessage(message){
  if(!message)return null
  const m=message.toLowerCase().trim()
  const ampm=m.match(/\b(\d{1,2})(?:[:.:](\d{2}))?\s*(am|pm)\b/i)
  if(ampm){let h=parseInt(ampm[1]);const min=ampm[2]||"00",p=ampm[3].toLowerCase();if(p==="pm"&&h!==12)h+=12;if(p==="am"&&h===12)h=0;return pad(h)+":"+min}
  const exp24=m.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if(exp24)return pad(parseInt(exp24[1]))+":"+exp24[2]
  const baje=m.match(/\b(\d{1,2})\s*baje\b/i)
  if(baje){let h=parseInt(baje[1]);if(h>=1&&h<=8)h+=12;return pad(h)+":00"}
  const plain=m.match(/\bat\s+(\d{1,2})\b/)||m.match(/\b(\d{1,2})\s+o'?clock\b/i)
  if(plain)return normalizeTime(String(parseInt(plain[1])))
  return null
}

function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}

// NEW FIX: word-boundary matching added as the FIRST check, before the
// existing loose substring matching. This prevents short/generic service
// names (e.g. "Tax", "CT", "Spa") from false-matching inside unrelated
// words (e.g. "taxes" matching "Tax", "space" matching "Spa"). Exact
// word-boundary matches are checked first and win immediately. If no
// word-boundary match is found, falls back to the ORIGINAL substring/fuzzy
// logic unchanged — so longer, more specific service names that relied on
// loose matching continue to work exactly as before.
function extractServiceFromMessage(message,services){
  if(!services?.length||!message)return null
  const m=message.toLowerCase().replace(/[?!.,]/g,"").trim()

  // PASS 1 (NEW): exact word-boundary match — safest, checked first
  for(const svc of services){
    const name=svc.name.toLowerCase().trim()
    const pattern=new RegExp("(^|\\s)"+escapeRegex(name)+"($|\\s)","i")
    if(pattern.test(m))return svc.name
  }

  // PASS 2 (ORIGINAL, unchanged): loose substring match — fallback only
  for(const svc of services){if(m.includes(svc.name.toLowerCase()))return svc.name}
  for(const svc of services){const words=svc.name.toLowerCase().split(" ");if(words.filter(w=>w.length>3).every(w=>m.includes(w)))return svc.name}
  for(const svc of services){
    const svcLower=svc.name.toLowerCase()
    if(svcLower.length<4)continue
    if(m.includes(svcLower.substring(0,Math.floor(svcLower.length*0.8))))return svc.name
  }
  return null
}

async function getAvailableSlots(userId,date,serviceName,services){
  if(!date||!serviceName)return[]
  try{
    const svc=matchService(serviceName,services),duration=svc?.duration||30,capacity=svc?.capacity||1
    const{data:existing}=await supabaseAdmin.from("bookings").select("id,booking_time,service").eq("user_id",userId).eq("booking_date",date).in("status",["confirmed","pending"])
    const bookings=existing||[],freeSlots=[]
    let m=9*60
    while(m+duration<=20*60){
      const timeStr=pad2(Math.floor(m/60))+":"+pad2(m%60),reqStart=m,reqEnd=m+duration
      let overlapCount=0
      for(const bk of bookings){
        const ed=matchService(bk.service,services),dur=ed?.duration||30,s=toMinutes(bk.booking_time),e=s+dur
        if(reqStart<e&&reqEnd>s)overlapCount++
      }
      if(overlapCount<capacity)freeSlots.push(timeStr)
      m+=duration
    }
    return freeSlots
  }catch(e){return[]}
}

function formatTimeDisplay(timeStr){
  if(!timeStr)return timeStr
  const[h,m]=timeStr.split(":").map(Number),period=h>=12?"PM":"AM"
  return(h%12||12)+(m>0?":"+pad2(m):"")+(" ")+period
}

async function callGeminiWithRetry(prompt,attempt=1){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),GEMINI_TIMEOUT_MS)
  try{
    const res=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:600,responseMimeType:"application/json"}}),
       signal:controller.signal}
    )
    clearTimeout(timer)
    const data=await res.json()
    if(data?.error){
      console.error("❌ Gemini error attempt "+attempt+":",data.error.message)
      if((data.error.code===429||data.error.code===503)&&attempt<=GEMINI_MAX_RETRIES){await sleep(1000*attempt);return callGeminiWithRetry(prompt,attempt+1)}
      return null
    }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text||null
  }catch(e){
    clearTimeout(timer)
    console.error("❌ Gemini "+(e.name==="AbortError"?"TIMEOUT":e.message)+" attempt "+attempt)
    if(attempt<=GEMINI_MAX_RETRIES){await sleep(1000*attempt);return callGeminiWithRetry(prompt,attempt+1)}
    return null
  }
}

function parseJSON(raw){
  if(!raw)return null
  try{
    let clean=raw.replace(/```json|```/gi,"").trim().replace(/<think>[\s\S]*?<\/think>/gi,"").trim()
    const match=clean.match(/\{[\s\S]*\}/)
    if(!match)return null
    return JSON.parse(match[0])
  }catch(e){return null}
}

function buildGeminiPrompt({message,services,history,state,firstName,activeBookings,biz,campaignContext,availableSlots,replyLang}){
  const bizType=biz?.business_type||"General",bizName=biz?.business_name||"us"
  const aiInstr=biz?.ai_instructions||"",activeOffer=biz?.active_offer||"",workHours=biz?.working_hours||"Mon-Sat 9AM-8PM"
  const svcList=services.map(s=>"• "+s.name+" — ₹"+s.price+(s.duration?" ("+s.duration+" min)":"")).join("\n")||"No services configured"
  const hist=(history||[]).slice(-6).map(m=>(m.role==="user"?"Customer":"Assistant")+": "+m.content.substring(0,120)).join("\n")
  const st=[state.service?"service="+state.service:"",state.date?"date="+state.date:"",state.time?"time="+state.time:"",state.stage&&state.stage!=="idle"?"stage="+state.stage:""].filter(Boolean).join(", ")||"fresh"
  const slotsInfo=availableSlots?.length>0?"AVAILABLE SLOTS on "+state.date+": "+availableSlots.map(formatTimeDisplay).join(", "):""

  const activeBookingsLine = campaignContext
    ? ""
    : (activeBookings && activeBookings !== "none" ? "CUSTOMER'S UPCOMING BOOKINGS: "+activeBookings : "")

  return`You are an intelligent WhatsApp assistant for ${bizName}, a ${bizType} business in India.
Reply language: ${replyLang}
${aiInstr?"BUSINESS INSTRUCTIONS: "+aiInstr:""}
${activeOffer?"ACTIVE OFFER: "+activeOffer:""}

SERVICES:
${svcList}

WORKING HOURS: ${workHours}
TODAY: ${todayStr()} (${todayFormatted()})
TOMORROW: ${tomorrowStr()}
CUSTOMER: ${firstName}
BOOKING STATE: ${st}
${slotsInfo}
${activeBookingsLine}
${campaignContext?"CAMPAIGN: Customer replied to campaign. Help them book the service mentioned in the campaign.":""}

CONVERSATION HISTORY:
${hist||"none"}

CUSTOMER MESSAGE: "${message}"

RULES:
1. Understand casual/mixed language naturally
2. Booking order is STRICT: service → date → time → confirm. NEVER skip steps.
3. If service known but date missing → ask for date ONLY. Never ask for time yet.
4. If service+date known but time missing → ask for time ONLY.
5. Only say "Shall I confirm" when service + date + time are ALL collected.
6. Reply in ${replyLang}, warm WhatsApp tone, use *bold* for names/services
7. suggested_reply = null ONLY for do_booking/do_cancel/do_reschedule intents
8. Keep replies SHORT — max 3 lines.
9. NEVER ask same question twice.
10. NEVER reference old/past bookings when customer is trying to make a NEW booking.

INTENTS: book, cancel, reschedule, confirm, deny, show_services, show_bookings, show_location, show_hours, set_reminder, check_slot, provide_info, qualify_lead, complaint, out_of_scope, unclear

RESPOND JSON ONLY:
{
  "intent": "<intent>",
  "extracted": {
    "service": "<exact name or null>",
    "date": "<YYYY-MM-DD or null>",
    "time": "<HH:MM or null>",
    "confirmed": <true|false>,
    "cancel_scope": "<all|specific|null>",
    "reminder_preference": "<2hrs|24hrs|null>"
  },
  "suggested_reply": "<WhatsApp reply or null>",
  "preferred_language": "<English|Telugu|Hindi|Tamil|null>",
  "sentiment": "<happy|neutral|frustrated|upset>",
  "qualification_data": "<extracted info or null>"
}`
}

function ruleBasedClassify(message,state,services){
  const m=(message||"").toLowerCase().trim()
  const extracted={service:null,date:null,time:null,confirmed:false,cancel_scope:null,reminder_preference:null}
  let intent="unclear"
  if(CONFIRM_WORDS.test(m)){intent="confirm";extracted.confirmed=true}
  else if(PURE_NEGATION.test(m))intent="deny"
  else if(/\b(cancel|cancle|రద్దు|रद्द)\b/i.test(m)){intent="cancel";extracted.cancel_scope=/everything|all|sab/i.test(m)?"all":"specific"}
  else if(/\b(reschedule|postpone|మార్చు)\b/i.test(m))intent="reschedule"
  else if(isServiceInquiry(m)||/\b(price|cost|rate|charges|fees|how much|menu)\b/i.test(m))intent="show_services"
  else if(/\b(location|address|where|maps)\b/i.test(m))intent="show_location"
  else if(/\b(hours|timing|open|close|working|schedule)\b/i.test(m)&&!/\b(book|slot)\b/i.test(m))intent="show_hours"
  else if(/\b(remind|reminder|notify)\b/i.test(m)){intent="set_reminder";extracted.reminder_preference=/2\s*hr/i.test(m)?"2hrs":"24hrs"}
  else if(/\b(booking|appointment|booked)s?\b/i.test(m)&&/\b(my|show|upcoming|status)\b/i.test(m))intent="show_bookings"
  else if(/\b(claim|interested|book now)\b/i.test(m))intent="book"
  else{
    const svc=extractServiceFromMessage(message,services)
    if(svc){extracted.service=svc;intent="provide_info"}
    else if(extractDateFromMessage(message))intent="provide_info"
    else if(extractTimeFromMessage(message))intent="provide_info"
    else if(state?.stage&&state.stage!=="idle")intent="provide_info"
  }
  return{intent,extracted,sentiment:"neutral",preferred_language:null,suggested_reply:null}
}

function isServiceInquiry(message){
  const m=(message||"").toLowerCase().trim()
  if(!m)return false
  if(/\b(book|booking|appointment|schedule|confirm|reschedule|cancel|tomorrow|today)\b/i.test(m))return false
  return (
    /\b(what|which|list|show|tell)\b[\s\S]*\b(service|services|menu|offer|offers|available|provide|providing)\b/i.test(m) ||
    /\b(service|services|menu|offer|offers)\b[\s\S]*\b(offer|offers|available|provide|providing|have|do you)\b/i.test(m) ||
    /\b(available services|services available|service list|list services|show services|show menu)\b/i.test(m) ||
    // NEW: catches "do you have X also/too", "do you do X" —
    // specific-service follow-up questions that don't use the words
    // service/menu/offer at all (e.g. "do you have dermatology also").
    // Excludes time/slot-related phrasing ("is there a slot at 5pm") so it
    // doesn't hijack an in-progress time check during booking.
    (/\b(do you (have|do|offer|provide)|got any)\b/i.test(m) && !/\b(slot|time|am|pm|\d{1,2}:\d{2}|available)\b/i.test(m))
  )
}

function quickRoute(message){
  const m=(message||"").toLowerCase().trim()
  if(/^(hi|hello|hey|hii|hai|namaste|good morning|good evening|good afternoon|howdy)[\s!.]*$/i.test(m))return"greeting"
  if(/^(thank|thanks|thnx|thx|ty|thank you|thankyou|dhanyavaad|tq)[\s!.]*$/i.test(m))return"thanks"
  if(/^(bye|goodbye|see you|cya|later|take care|good night|goodnight|ok bye)[\s!.]*$/i.test(m))return"bye"
  if(/^(good|awesome|amazing|excellent|wonderful|nice|cool|superb|👍|🙏)[\s!.]*$/i.test(m))return"compliment"
  if(/\b(ipl|cricket|football|worldcup|t20|nba|nfl|epl)\b/i.test(m)&&!/\b(book|cancel)\b/i.test(m))return"sports"
  if(/\b(weather|rainfall|temperature|forecast)\b/i.test(m))return"weather"
  if(/\b(tell me a joke|crack a joke|make me laugh)\b/i.test(m))return"joke"
  if(/\b(who is modi|bjp|congress|election|politics)\b/i.test(m))return"politics"
  if(/\b(fuck|fck|shit|bastard|idiot|stupid|useless|hate you|mf|bc|mc|lavda|luvda|loda|lund|chutiya|chutiye|madarchod|bhosdi|bsdk)\b/i.test(m))return"abuse"
  return null
}

function quickReply(type,firstName,bizName){
  const name=firstName||"there"
  switch(type){
    case"thanks":return"You're welcome "+name+"! 😊 Let me know if you need anything else."
    case"bye":return"Take care "+name+"! 😊 See you soon at *"+bizName+"*!"
    case"compliment":return"Thank you "+name+"! 😊 Anything I can help you with today?"
    case"sports":return"Ha, wish I was watching too! 😄 Can I help you at *"+bizName+"*?"
    case"weather":return"No idea — I'm indoors! 😂 Can I help you at *"+bizName+"*?"
    case"joke":return"Why did the customer always come back? Service was too good to cancel 😄\n\nCan I help you today?"
    case"politics":return"Ha, that's above my pay grade 😄 I'm just here to help — what do you need?"
    case"abuse":return"I understand you might be frustrated "+name+" 😔 I'm here to help — what's going on?"
    default:return"Not sure I got that! 😊 How can I help you at *"+bizName+"* today?"
  }
}

function buildReply(action,state,services,biz,lang,activeBookings){
  const bizName=biz?.business_name||"us",svc=state.service
  const displayDate=state.date?formatDate(state.date):null,displayTime=state.time?formatTime(state.time):null
  const svcList=(services||[]).map(s=>"• *"+s.name+"* — ₹"+s.price+(s.duration?" ("+s.duration+" min)":"")).join("\n")
  switch(action){
    case"collect_service":
      if(!services?.length)return t("We're updating our menu right now 😊 Please check back shortly!","మేము మా సేవలను అప్‌డేట్ చేస్తున్నాము 😊","हम अभी सेवाएं अपडेट कर रहे हैं 😊",lang)
      return t("Which would you like to book? 😊\n\n"+svcList,"మీకు ఏది కావాలి? 😊\n\n"+svcList,"कौन सा चाहिए? 😊\n\n"+svcList,lang)
    case"collect_date":
      return t("What date works for your *"+svc+"*?","*"+svc+"* కోసం తేదీ చెప్పండి?","*"+svc+"* के लिए तारीख बताइए?",lang)
    case"collect_time":
      return t("What time works on "+(displayDate||state.date)+"?",(displayDate||state.date)+"న ఏ సమయం కావాలి?",(displayDate||state.date)+" को कौन सा समय?",lang)
    case"confirm_booking":
      if(svc&&displayDate){
        const tp=displayTime?" at "+displayTime:"",tpTe=displayTime?" "+displayTime+"కి":"",tpHi=displayTime?" "+displayTime+" को":""
        return t("Shall I confirm *"+svc+"* on "+displayDate+tp+"? ✅","*"+svc+"* "+displayDate+tpTe+" బుక్ చేయమా? ✅","*"+svc+"* "+displayDate+tpHi+" बुक करें? ✅",lang)
      }
      return null
    case"show_services":
      if(!services?.length)return t("We're updating our menu right now 😊","మేము అప్‌డేట్ చేస్తున్నాము 😊","अभी अपडेट कर रहे हैं 😊",lang)
      return t("*"+bizName+" Services*\n\n"+svcList+"\n\nWant to book any? 😊","*"+bizName+" సేవలు*\n\n"+svcList+"\n\nబుక్ చేయాలా? 😊","*"+bizName+" सेवाएं*\n\n"+svcList+"\n\nबुक करना है? 😊",lang)
    case"show_location":
      if(biz?.location)return"📍 *"+bizName+"*\n"+biz.location+(biz.maps_link?"\n\n"+biz.maps_link:"")
      return t("I'll get our location! 😊","లొకేషన్ తెలియజేస్తాను! 😊","लोकेशन बताता हूं! 😊",lang)
    case"show_hours":
      if(biz?.working_hours)return t("*"+bizName+"* is open:\n"+biz.working_hours+"\n\nAnything else? 😊","*"+bizName+"* తెరిచి ఉంటుంది:\n"+biz.working_hours+"\n\nఇంకేమైనా? 😊","*"+bizName+"* खुला है:\n"+biz.working_hours+"\n\nकुछ और? 😊",lang)
      return t("We're open Mon–Sat, 9 AM to 8 PM 😊","మేము సోమ–శని, ఉ. 9 నుండి సా. 8 వరకు 😊","हम सोम–शनि, सुबह 9 से शाम 8 बजे तक 😊",lang)
    case"show_bookings":
      if(activeBookings&&activeBookings!=="no upcoming bookings"&&activeBookings!=="none")
        return t("Here are your upcoming bookings:\n\n"+activeBookings+"\n\nNeed to reschedule or cancel? 😊","మీ రాబోయే బుకింగ్‌లు:\n\n"+activeBookings+"\n\nరీషెడ్యూల్ చేయాలా? 😊","आपकी upcoming बुकिंग:\n\n"+activeBookings+"\n\nरीशेड्यूल करना है? 😊",lang)
      return t("You don't have any upcoming bookings. Want to book something? 😊","మీకు బుకింగ్‌లు లేవు. బుక్ చేయాలా? 😊","कोई upcoming बुकिंग नहीं। कुछ बुक करना है? 😊",lang)
    default:return null
  }
}

function buildSmartDefault(state,bizName,lang){
  if(state?.stage&&state.stage!=="idle"){
    const map={
      "awaiting_service":t("Which would you like to book? 😊","ఏది కావాలి? 😊","कौन सा चाहिए? 😊",lang),
      "awaiting_date":t("What date works for you? 😊","తేదీ చెప్పండి? 😊","तारीख बताइए? 😊",lang),
      "awaiting_time":t("What time works for you? 😊","సమయం చెప్పండి? 😊","समय बताइए? 😊",lang),
      "awaiting_confirmation":t("Shall I confirm this booking? ✅","బుకింగ్ నిర్ధారించమా? ✅","बुकिंग confirm करूं? ✅",lang)
    }
    if(map[state.stage])return map[state.stage]
  }
  return t("Not sure I got that! 😊 How can I help you at *"+bizName+"* today?","అర్థం కాలేదు! 😊 నేను మీకు ఎలా సహాయం చేయగలను?","समझ नहीं आया! 😊 मैं आपकी कैसे मदद कर सकता हूं?",lang)
}

// ── CAMPAIGN REPLY HANDLER ─────────────────────────────────────
// Handles ALL messages when campaignContext is active.
// Returns a reply string for messages it handles, or null to fall through to normal flow.
async function handleCampaignReply({m,message,firstName,campaignContext,campaignService,campaignId,services,newState,conversationId,userId,phone,replyLang,biz}){

  // STOP / UNSUBSCRIBE
  if(/\bstop\b|\bunsubscribe\b|\bopt.?out\b/i.test(m)){
    try{await supabaseAdmin.from("campaign_optouts").insert({user_id:userId,phone,created_at:new Date().toISOString()})}catch(e){}
    return t("You've been unsubscribed. 😊","మీరు అన్‌సబ్‌స్క్రైబ్ చేయబడ్డారు. 😊","आपको अनसब्सक्राइब कर दिया गया है। 😊",replyLang)
  }

  // ── If service already set in state (from previous campaign reply) ─────────
  if(newState.service && newState.stage !== "idle"){

    // Reschedule request
    if(/\breschedule\b|\bpostpone\b|\bchange date\b|\bdifferent date\b/i.test(m)){
      newState.date=null;newState.time=null;newState.stage="awaiting_date"
      await saveState(conversationId,newState)
      return t("No problem! 😊 What date works for your *"+newState.service+"*?","సరే! 😊 *"+newState.service+"* కోసం తేదీ చెప్పండి?","कोई बात नहीं! 😊 *"+newState.service+"* के लिए तारीख बताइए?",replyLang)
    }

    // Awaiting date
    if(newState.stage==="awaiting_date"){
      const msgDate=extractDateFromMessage(message)
      if(msgDate){
        newState.date=msgDate
        newState.stage="awaiting_time"
        await saveState(conversationId,newState)
        return t("What time works on "+formatDate(msgDate)+"? 😊",formatDate(msgDate)+"న ఏ సమయం కావాలి? 😊",formatDate(msgDate)+" को कौन सा समय? 😊",replyLang)
      }
      return t("What date works for your *"+newState.service+"*? 😊\n(e.g. Tomorrow, 25th June, Monday)","*"+newState.service+"* కోసం తేదీ చెప్పండి? 😊\n(ఉదా: రేపు, 25 జూన్, సోమవారం)","*"+newState.service+"* के लिए तारीख बताइए? 😊\n(जैसे: कल, 25 जून, सोमवार)",replyLang)
    }

    // Awaiting time
    if(newState.stage==="awaiting_time"){
      const msgTime=extractTimeFromMessage(message)
      if(msgTime){
        newState.time=msgTime
        newState.stage="awaiting_confirmation"
        await saveState(conversationId,newState)
        return t(
          "Shall I confirm *"+newState.service+"* on "+formatDate(newState.date)+" at "+formatTimeDisplay(msgTime)+"? ✅",
          "*"+newState.service+"* "+formatDate(newState.date)+" "+formatTimeDisplay(msgTime)+"కి బుక్ చేయమా? ✅",
          "*"+newState.service+"* "+formatDate(newState.date)+" "+formatTimeDisplay(msgTime)+" को बुक करें? ✅",
          replyLang
        )
      }
      return t("What time works for you? 😊\n(e.g. 10 AM, 3 PM, 6:30 PM)","ఏ సమయం కావాలి? 😊\n(ఉదా: పొద్దున 10, సాయంత్రం 3, 6:30 PM)","कौन सा समय? 😊\n(जैसे: 10 AM, 3 PM, 6:30 PM)",replyLang)
    }

    // Awaiting confirmation
    if(newState.stage==="awaiting_confirmation"){
      if(CONFIRM_WORDS.test(m)){
        newState.confirmed=true
        await saveState(conversationId,newState)
        return null // fall through to do_booking logic in main orchestrate()
      }
      if(PURE_NEGATION.test(m)){
        newState.time=null;newState.stage="awaiting_time"
        await saveState(conversationId,newState)
        return t("No problem! What time works better? 😊","సరే! ఏ సమయం అనుకూలంగా ఉంటుంది? 😊","कोई बात नहीं! कौन सा समय? 😊",replyLang)
      }
      return t(
        "Shall I confirm *"+newState.service+"* on "+formatDate(newState.date)+" at "+formatTimeDisplay(newState.time)+"? ✅",
        "*"+newState.service+"* "+formatDate(newState.date)+" "+formatTimeDisplay(newState.time)+"కి బుక్ చేయమా? ✅",
        "*"+newState.service+"* "+formatDate(newState.date)+" "+formatTimeDisplay(newState.time)+" को बुक करें? ✅",
        replyLang
      )
    }
  }

  // ── Initial campaign reply (no service set yet) ───────────────

  // RESCHEDULE
  if(/\breschedule\b|\bpostpone\b|\bchange\b|\bshift\b/i.test(m)&&!newState.service){
    newState.stage="awaiting_date";newState.date=null;newState.time=null
    await saveState(conversationId,newState)
    return t("No problem "+firstName+"! 😊 What date works better for you?","సరే "+firstName+"! 😊 మీకు ఏ తేదీ అనుకూలంగా ఉంటుంది?","कोई बात नहीं "+firstName+"! 😊 कौन सी तारीख ठीक रहेगी?",replyLang)
  }

  // ── NEW FIX: Detect a plain SERVICE NAME mention (e.g. "diabetes") ──────
  // Previously only book/yes/interested words triggered service selection.
  // A customer replying with just the service name (very common — they're
  // often just answering "Which would you like to book?") fell through to
  // the generic fallback and never advanced. This check runs BEFORE the
  // book/yes regex so a service name alone is enough to start the flow.
  const directServiceMatch = !newState.service ? extractServiceFromMessage(message, services) : null
  // NEW: Food/Restaurant businesses don't need date scheduling — orders are
  // "now" by default. Skip straight to confirmation instead of asking date.
  const isFoodBiz = ["Food Delivery","Restaurant"].includes(biz?.business_type)

  // BOOK / YES / INTERESTED / DIRECT SERVICE NAME — first touch
  if(directServiceMatch || /\bbook\b|\bbook now\b|\byes\b|\bclaim\b|\binterested\b|\bwant\b|\bavunu\b|^y$|^ok$|^okay$/i.test(m)){

    // CASE 0 (NEW): Customer directly named a service from the list
    if(directServiceMatch){
      newState.service=directServiceMatch
      if(isFoodBiz){
        newState.date=todayStr()
        newState.time=null
        newState.stage="awaiting_confirmation"
        await saveState(conversationId,newState)
        console.log("✅ Campaign: direct service name matched (food/restaurant):",directServiceMatch,"→ confirming order for today")
        return t(
          "Great "+firstName+"! 😊 Shall I confirm your order for *"+directServiceMatch+"* today? ✅",
          "చాలా సంతోషం "+firstName+"! 😊 *"+directServiceMatch+"* ఆర్డర్ ఈరోజుకి నిర్ధారించమా? ✅",
          "बहुत अच्छा "+firstName+"! 😊 *"+directServiceMatch+"* का order आज के लिए confirm करूं? ✅",
          replyLang
        )
      }
      newState.stage="awaiting_date"
      newState.date=null
      newState.time=null
      await saveState(conversationId,newState)
      console.log("✅ Campaign: direct service name matched:",directServiceMatch,"→ asking date")
      return t(
        "Great "+firstName+"! 😊 What date works for your *"+directServiceMatch+"*?",
        "చాలా సంతోషం "+firstName+"! 😊 *"+directServiceMatch+"* కోసం తేదీ చెప్పండి?",
        "बहुत अच्छा "+firstName+"! 😊 *"+directServiceMatch+"* के लिए तारीख बताइए?",
        replyLang
      )
    }

    // CASE 1: Owner mapped service in campaign composer
    if(campaignService){
      const matchedSvc=services.find(s=>
        s.name.toLowerCase()===campaignService.toLowerCase()||
        campaignService.toLowerCase().includes(s.name.toLowerCase())||
        s.name.toLowerCase().includes(campaignService.toLowerCase())
      )
      const serviceName=matchedSvc?.name||campaignService
      newState.service=serviceName
      newState.stage="awaiting_date"
      newState.date=null
      newState.time=null
      await saveState(conversationId,newState)
      console.log("✅ Campaign service set:",serviceName,"→ asking date")
      return t(
        "Great "+firstName+"! 😊 What date works for your *"+serviceName+"*?",
        "చాలా సంతోషం "+firstName+"! 😊 *"+serviceName+"* కోసం తేదీ చెప్పండి?",
        "बहुत अच्छा "+firstName+"! 😊 *"+serviceName+"* के लिए तारीख बताइए?",
        replyLang
      )
    }

    // CASE 2: Try extract from campaign text
    const svcFromText=services.find(s=>(campaignContext||"").toLowerCase().includes(s.name.toLowerCase()))
    if(svcFromText){
      newState.service=svcFromText.name
      newState.stage="awaiting_date"
      newState.date=null
      newState.time=null
      await saveState(conversationId,newState)
      return t(
        "Great! 😊 What date works for your *"+svcFromText.name+"*?",
        "చాలా సంతోషం! 😊 *"+svcFromText.name+"* కోసం తేదీ చెప్పండి?",
        "बहुत अच्छा! 😊 *"+svcFromText.name+"* के लिए तारीख बताइए?",
        replyLang
      )
    }

    // CASE 3: No service known — show list
    newState.stage="awaiting_service"
    await saveState(conversationId,newState)
    const svcList=(services||[]).map(s=>"• *"+s.name+"* — ₹"+s.price).join("\n")
    return t(
      "Which would you like to book? 😊\n\n"+svcList,
      "ఏది బుక్ చేయాలి? 😊\n\n"+svcList,
      "कौन सा book करना है? 😊\n\n"+svcList,
      replyLang
    )
  }

  // General positive / thanks
  if(/\bgreat\b|\bgood\b|\bthank\b|\bsure\b|\bokay\b/i.test(m)){
    return t(
      "Thank you "+firstName+"! 🙏 Let me know if you'd like to book anything. 😊",
      "ధన్యవాదాలు "+firstName+"! 🙏 బుక్ చేయాలంటే చెప్పండి. 😊",
      "धन्यवाद "+firstName+"! 🙏 कुछ book करना हो तो बताइए। 😊",
      replyLang
    )
  }

  // Not interested / negative
  if(PURE_NEGATION.test(m)){
    return t(
      "No problem! 😊 Feel free to message us anytime.",
      "సరే! 😊 ఎప్పుడైనా మెసేజ్ చేయండి.",
      "कोई बात नहीं! 😊 कभी भी message करें।",
      replyLang
    )
  }

  // Anything else in campaign context — guide them to book
  return t(
    "Hi "+firstName+"! 😊 Reply *BOOK* to schedule your appointment, or STOP to unsubscribe.",
    "హాయ్ "+firstName+"! 😊 అపాయింట్‌మెంట్ బుక్ చేయాలంటే *BOOK* అని రిప్లై చేయండి.",
    "हाय "+firstName+"! 😊 appointment book करने के लिए *BOOK* reply करें।",
    replyLang
  )
}

// ── MAIN ORCHESTRATE ───────────────────────────────────────────
async function orchestrate({userId,conversationId,phone,contactName,message,isMediaOnly,phoneNumberId,campaignContext,campaignService,campaignId}){
  let context,state
  try{
    ;[context,state]=await Promise.all([loadContext({userId,conversationId,phone}),loadState(conversationId)])
  }catch(e){
    console.error("❌ context/state load failed:",e.message)
    return"Hi! We're having a brief technical issue. Please try again in a moment 🙏"
  }

  const{biz,services,history,activeBookings}=context
  const firstName=(contactName||"").split(" ")[0]||"there"
  const bizName=biz?.business_name||"us"

  if(isMediaOnly)return"Thanks for sharing! 😊 If you have any questions or want to book, just type here."

  const detectedLang=detectLanguage(message)
  let currentPreferred=state.preferred_language
  if(currentPreferred&&currentPreferred!=="English"&&detectedLang==="English"&&!/speak|language|english|telugu|hindi/i.test(message))currentPreferred=null
  const replyLang=currentPreferred||detectedLang

  const qType=quickRoute(message)
  if(qType==="greeting"){
    const svcPrev=services.slice(0,3).map(s=>s.name).join(", ")
    return t(
      "Hi "+firstName+"! 👋 Welcome to *"+bizName+"*!"+(svcPrev?"\n\nWe offer: "+svcPrev+" and more.":"")+"\n\nHow can I help today? 😊",
      "నమస్కారం "+firstName+"! 👋 *"+bizName+"*కి స్వాగతం!"+(svcPrev?"\n\nమేము: "+svcPrev+" అందిస్తున్నాము.":"")+"\n\nమీకు ఎలా సహాయం చేయగలను? 😊",
      "नमस्ते "+firstName+"! 👋 *"+bizName+"* में स्वागत!"+(svcPrev?"\n\nहम देते हैं: "+svcPrev+"।":"")+"\n\nकैसे मदद करूं? 😊",
      replyLang
    )
  }
  if(qType)return quickReply(qType,firstName,bizName)

  let newState=Object.assign({},state)
  if(!state.stage||state.stage==="idle"){
    newState={...newState,service:null,date:null,time:null,staff:null,pending_next_slot:null,
      missing_fields:[],last_ai_question:null,clarification_for:[],confidence:{},
      preferred_language:currentPreferred||state.preferred_language}
  }

  // Service/menu questions must stay informational. Without this guard,
  // Gemini can see a single configured service in the prompt and incorrectly
  // turn "what services do you offer?" into "book diabetes", pushing the chat
  // into awaiting_date. Reset stale booking state and answer with the menu.
  if(isServiceInquiry(message)){
    newState=clearBookingFields(newState)
    newState.stage="idle"
    newState.pending_next_slot=null
    try{await saveState(conversationId,newState)}catch(e){console.error("❌ saveState failed:",e.message)}
    return stripBadEmojis(buildReply("show_services",newState,services,biz,replyLang,activeBookings))
  }

  // ── CAMPAIGN FLOW ─────────────────────────────────────────────
  if(campaignContext){
    const m=(message||"").toLowerCase().trim()
    const campaignReply=await handleCampaignReply({
      m,message,firstName,campaignContext,
      campaignService:campaignService||null,
      campaignId:campaignId||null,
      services,newState,conversationId,userId,phone,replyLang,biz
    })

    if(campaignReply!==null){
      return stripBadEmojis(campaignReply)
    }
  }

  // ── HARD CONFIRM GUARD ──────────────────────────────────────
  const hardConfirmSkipTime=["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)
  if(!campaignContext
     && newState.stage==="awaiting_confirmation"
     && newState.service && newState.date
     && (newState.time || hardConfirmSkipTime)
     && CONFIRM_WORDS.test((message||"").trim())){
    console.log("🔒 Hard-confirm guard fired — booking directly, skipping Gemini")
    newState.confirmed=true
    try{
      const result=await createBooking({
        userId,customerName:contactName,customerPhone:phone,
        customerId:null,state:newState,services,
        bizName:biz.business_name,language:replyLang,
        bizType:biz?.business_type,deliveryAddress:newState.delivery_address||null
      })
      if(result.ok){
        newState=clearBookingFields(newState)
        newState.stage="idle"
        newState.pending_next_slot=null
        newState.confirmed=false
        newState.last_booking={
          service:result.booking.service,
          date:result.booking.booking_date,
          time:result.booking.booking_time,
          confirmed_at:Date.now()
        }
        await saveState(conversationId,newState)
        await supabaseAdmin.from("conversations")
          .update({last_message:"✅ Booking Confirmed — "+result.booking.service})
          .eq("id",conversationId)

        try{
          const ownerPhone=(biz?.phone||"").replace(/[^0-9]/g,"")
          if(ownerPhone&&ownerPhone.length>=10){
            const{data:waConn}=await supabaseAdmin.from("whatsapp_connections")
              .select("access_token,phone_number_id").eq("user_id",userId).maybeSingle()
            if(waConn?.access_token&&waConn?.phone_number_id){
              const isFood=["Food Delivery","Restaurant"].includes(biz?.business_type)
              const isRE=biz?.business_type==="Real Estate"
              const icon=isFood?"🍽️":isRE?"🏠":"📅"
              const label=isFood?"New Order":isRE?"Site Visit Booked":"New Booking"
              const ownerMsg=`${icon} *${label}!*\n\n👤 Customer: ${contactName||phone}\n📦 Service: ${result.booking.service}\n💰 Amount: ₹${result.booking.amount||0}\n📞 Contact: ${phone}\n\nView: fastrill.com/dashboard/bookings`
              await fetch(
                `https://graph.facebook.com/v22.0/${waConn.phone_number_id}/messages`,
                {method:"POST",headers:{"Authorization":"Bearer "+decrypt(waConn.access_token),"Content-Type":"application/json"},
                 body:JSON.stringify({messaging_product:"whatsapp",to:ownerPhone,type:"text",text:{body:ownerMsg}})}
              )
            }
          }
        }catch(e){
          console.error("⚠️ Owner notification failed:",{userId,bookingId:result.booking?.id,phone,error:e.message})
        }

        return result.confirmMsg
      }else if(result.slotFull){
        const nextSlotTimeMatch=result.message.match(/at (\d{2}:\d{2})/)
        if(nextSlotTimeMatch){
          newState.time=null;newState.pending_next_slot=nextSlotTimeMatch[1]
          newState.stage="awaiting_next_slot_confirm"
        }else{
          newState.time=null;newState.stage="awaiting_time"
        }
        await saveState(conversationId,newState)
        let extraSlots=[]
        if(newState.date&&newState.service)extraSlots=await getAvailableSlots(userId,newState.date,newState.service,services)
        if(extraSlots.length>0)
          return result.message+"\n\nOther available times: "+extraSlots.slice(0,5).map(formatTimeDisplay).join(", ")
        return result.message
      }else{
        console.error("❌ Hard-confirm booking failed:",result.error||"unknown")
        newState.confirmed=false
        await saveState(conversationId,newState)
        return result.message||"Sorry, there was an issue saving your booking 😅 Please try again."
      }
    }catch(e){
      console.error("❌ Hard-confirm createBooking threw:",e.message)
      return"Sorry, there was an issue saving your booking 😅 Please try again."
    }
  }

  // ── NORMAL FLOW ─────────────────────────────────────────────

  const msgDate=extractDateFromMessage(message)
  const msgTime=extractTimeFromMessage(message)
  const msgService=extractServiceFromMessage(message,services)

  if(msgDate&&!newState.date)newState={...newState,date:msgDate}
  if(msgTime){
    newState={...newState,time:msgTime,pending_next_slot:null}
    if(newState.stage==="awaiting_next_slot_confirm")newState.stage="awaiting_confirmation"
  }
  if(msgService&&!newState.service)newState={...newState,service:msgService}

  if(msgService&&newState.service&&msgService!==newState.service){
    const hadDate=!!newState.date,hadTime=!!newState.time
    const skipTime=["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)
    newState={...newState,service:msgService,pending_next_slot:null,
      stage:(hadDate&&(hadTime||skipTime))?"awaiting_confirmation":hadDate?"awaiting_time":"awaiting_date"}
  }

  if(!msgDate&&newState.stage==="awaiting_date"){
    const plainDay=message.trim().match(/^(\d{1,2})$/)
    if(plainDay){
      const day=parseInt(plainDay[1])
      if(day>=1&&day<=31){
        const now=nowIST();let mo=now.getMonth(),yr=now.getFullYear()
        let d=new Date(yr,mo,day)
        if(d<=now){mo++;if(mo>11){mo=0;yr++}}
        d=new Date(yr,mo,day)
        newState={...newState,date:d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
      }
    }
  }

  if(msgDate&&newState.date&&msgDate!==newState.date&&newState.stage==="awaiting_confirmation"){
    newState={...newState,date:msgDate,time:msgTime||null}
  }

  let availableSlots=[]
  if(newState.date&&newState.service){
    availableSlots=await getAvailableSlots(userId,newState.date,newState.service,services)
  }

  const isCampaignConfirmed = campaignContext && newState.confirmed === true

  if(isCampaignConfirmed&&newState.service&&newState.date){
    newState.stage="awaiting_confirmation"
  } else {
    let geminiResult=null
    if(process.env.GEMINI_API_KEY&&!isCampaignConfirmed){
      const raw=await callGeminiWithRetry(buildGeminiPrompt({
        message,services,history,state:newState,firstName,
        activeBookings,biz,campaignContext,availableSlots,replyLang
      }))
      geminiResult=parseJSON(raw)
      if(geminiResult)console.log("✅ Gemini intent:",geminiResult.intent)
    }
    if(!geminiResult){
      console.warn("⚠️ Gemini failed — rule-based fallback")
      geminiResult=ruleBasedClassify(message,newState,services)
    }

    const intent=geminiResult.intent||"unclear"
    const extracted=geminiResult.extracted||{service:null,date:null,time:null,confirmed:false,cancel_scope:null,reminder_preference:null}
    const suggestedReply=geminiResult.suggested_reply||null

    if(geminiResult.preferred_language&&geminiResult.preferred_language!=="null")
      newState.preferred_language=geminiResult.preferred_language
    else if(!currentPreferred&&detectedLang!=="English")
      newState.preferred_language=detectedLang

    if(extracted.service){
      const matched=matchService(extracted.service,services)
      if(matched&&matched.name!==newState.service){
        const hadDate=!!newState.date,hadTime=!!newState.time
        const skipT=["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)
        const nextStage=(hadDate&&(hadTime||skipT))?"awaiting_confirmation":hadDate?"awaiting_time":"awaiting_date"
        newState={...newState,service:matched.name,pending_next_slot:null,
          stage:(newState.stage==="awaiting_confirmation"||newState.stage==="awaiting_next_slot_confirm")?nextStage:newState.stage}
      }else if(matched&&!newState.service){
        newState.service=matched.name
      }
    }
    if(!msgDate&&extracted.date)newState.date=extracted.date
    if(!msgTime&&extracted.time&&!newState.pending_next_slot){
      const nt=normalizeTime(extracted.time)
      if(nt)newState.time=nt
    }
    if(newState.time&&!newState.time.match(/^\d{2}:\d{2}$/))
      newState.time=normalizeTime(newState.time)||newState.time
    if(newState.date&&newState.service&&availableSlots.length===0)
      availableSlots=await getAvailableSlots(userId,newState.date,newState.service,services)

    if(intent==="check_slot"&&(extracted.time||newState.time)&&newState.date&&newState.service){
      const checkTime=extracted.time||newState.time
      const isAvail=availableSlots.includes(checkTime)
      if(isAvail){
        newState.time=checkTime;newState.stage="awaiting_confirmation"
        await saveState(conversationId,newState)
        const displayT=formatTimeDisplay(checkTime),displayD=formatDate(newState.date)
        return t(
          "Yes! "+displayT+" is available 😊 Shall I confirm *"+newState.service+"* on "+displayD+" at "+displayT+"? ✅",
          "అవును! "+displayT+" అందుబాటులో ఉంది 😊 *"+newState.service+"* "+displayD+" "+displayT+"కి బుక్ చేయమా? ✅",
          "हां! "+displayT+" available है 😊 *"+newState.service+"* "+displayD+" "+displayT+" को confirm करूं? ✅",
          replyLang
        )
      }else{
        const displayT=formatTimeDisplay(checkTime)
        if(availableSlots.length>0)
          return t(displayT+" is not available 😅 Available: *"+availableSlots.slice(0,5).map(formatTimeDisplay).join(", ")+"*\n\nWhich works?",displayT+" అందుబాటులో లేదు 😅",displayT+" available नहीं 😅",replyLang)
        return t(displayT+" is fully booked 😅 Want to try another date?",displayT+" నిండిపోయింది 😅",displayT+" fully booked 😅",replyLang)
      }
    }

    let action="none"
    let confirmed=extracted.confirmed||false

    const isConfirmMsg=CONFIRM_WORDS.test((message||"").trim())
    const isDenyMsg=PURE_NEGATION.test((message||"").trim())
    const geminiConfirmed=(intent==="confirm"||extracted.confirmed===true)

    if(isConfirmMsg||geminiConfirmed){
      confirmed=true
      if(newState.stage==="awaiting_next_slot_confirm"&&newState.pending_next_slot){
        const timeMatch=newState.pending_next_slot.match(/(\d{2}:\d{2})/)
        if(timeMatch){
          newState.time=timeMatch[1];newState.stage="awaiting_confirmation"
          newState.pending_next_slot=null;action="do_booking";confirmed=true
        }
      }else if(newState.stage==="reschedule_mode"&&newState.date&&newState.time){
        action="do_reschedule"
      }else if(newState.stage==="awaiting_confirmation"&&newState.service&&newState.date){
        action="do_booking"
      }else if(newState.service&&!newState.date){
        action="collect_date"
      }else if(newState.service&&newState.date&&!newState.time&&!["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)){
        action="collect_time"
      }else{
        action="confirm_booking"
      }
    }else if(isDenyMsg||intent==="deny"){
      confirmed=false
      if(newState.stage==="awaiting_next_slot_confirm"){
        newState.pending_next_slot=null;newState.time=null;newState.stage="awaiting_time"
        await saveState(conversationId,newState)
        const slots=availableSlots.length>0?"\n\nAvailable: "+availableSlots.slice(0,5).map(formatTimeDisplay).join(", "):""
        return t("No problem! What time works better?"+slots+" 😊","సరే! ఏ సమయం అనుకూలంగా ఉంటుంది?"+slots+" 😊","कोई बात नहीं! कौन सा समय?"+slots+" 😊",replyLang)
      }
      if(newState.stage==="awaiting_confirmation")
        return t("No problem! What would you like to change? 😊","సరే! ఏమి మార్చాలనుకుంటున్నారు? 😊","कोई बात नहीं! क्या बदलना है? 😊",replyLang)
    }else if(intent==="show_services") action="show_services"
    else if(intent==="show_bookings")  action="show_bookings"
    else if(intent==="show_location")  action="show_location"
    else if(intent==="show_hours")     action="show_hours"
    else if(intent==="set_reminder")   action="set_reminder"
    else if(intent==="cancel"){
      action="do_cancel"
      if(!extracted.cancel_scope)extracted.cancel_scope=/everything|all|sab/i.test(message)?"all":"specific"
    }
    else if(intent==="reschedule"){
      newState.date=null;newState.time=null;newState.pending_next_slot=null
      action="collect_date"
    }
    else if(intent==="out_of_scope"){
      return stripBadEmojis(t("That's outside my expertise! 😄 Can I help you at *"+bizName+"*?","అది నా పరిధి కాదు! 😄","वो मेरे area में नहीं! 😄",replyLang))
    }
    else if(intent==="qualify_lead"){
      if(suggestedReply){await saveState(conversationId,newState);return stripBadEmojis(suggestedReply)}
      action="collect_service"
    }
    else if(["book","provide_info","unclear"].includes(intent)||(newState.stage&&newState.stage!=="idle")){
      const skipTime=["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)
      if(!newState.service){
        action="collect_service"
      }else if(!newState.date){
        action="collect_date"
      }else if(!newState.time&&!skipTime){
        action="collect_time"
      }else{
        action="confirm_booking"
      }
    }

    const stageMap={
      "collect_service":"awaiting_service",
      "collect_date":"awaiting_date",
      "collect_time":"awaiting_time",
      "confirm_booking":"awaiting_confirmation",
      "do_booking":"awaiting_confirmation",
      "do_reschedule":"reschedule_mode",
      "escalate":"handoff_mode"
    }
    if(stageMap[action])newState.stage=stageMap[action]

    // If all booking details are present and we're already at awaiting_confirmation,
    // promote confirm_booking to do_booking so createBooking() actually runs.
    // Without this, Gemini's suggestedReply can fake a "confirmed!" message
    // that gets returned to the user without ever inserting a booking row.
    if(action==="confirm_booking"&&newState.stage==="awaiting_confirmation"&&newState.service&&newState.date){
      const skipT=["Real Estate","Food Delivery","Consulting","Legal","Finance","Education"].includes(biz?.business_type)
      if(newState.time||skipT){action="do_booking";confirmed=true}
    }

    const bookingActions=["do_booking","do_cancel","do_reschedule","set_reminder"]
    let reply=null
    if(suggestedReply&&!bookingActions.includes(action)&&action!=="confirm_booking")reply=suggestedReply
    else{
      reply=buildReply(action,newState,services,biz,replyLang,activeBookings)
      if(!reply)reply=buildSmartDefault(newState,bizName,replyLang)
    }
    reply=stripBadEmojis(reply)

    if(!["do_booking","do_cancel","do_reschedule","set_reminder"].includes(action)){
      newState.failed_clarifications=(action==="none"&&reply?.includes("?"))?(newState.failed_clarifications||0)+1:0
      try{await saveState(conversationId,newState)}catch(e){console.error("❌ saveState failed:",e.message)}
      return reply
    }

    if(action==="do_cancel"){
      try{
        const cancelScope=extracted?.cancel_scope||"specific"
        if(cancelScope==="all"){
          const{data:all}=await supabaseAdmin.from("bookings").select("id")
            .eq("customer_phone",phone).eq("user_id",userId)
            .in("status",["confirmed","pending"]).gte("booking_date",todayStr())
          if(all?.length)await supabaseAdmin.from("bookings").update({status:"cancelled"}).in("id",all.map(b=>b.id))
        }else{
          if(newState.service||newState.date){
            let q=supabaseAdmin.from("bookings").update({status:"cancelled"})
              .eq("customer_phone",phone).eq("user_id",userId).in("status",["confirmed","pending"])
            if(newState.service)q=q.ilike("service","%"+newState.service+"%")
            if(newState.date)q=q.eq("booking_date",newState.date)
            await q
          }else{
            const{data:latest}=await supabaseAdmin.from("bookings").select("id")
              .eq("customer_phone",phone).eq("user_id",userId)
              .in("status",["confirmed","pending"]).gte("booking_date",todayStr())
              .order("booking_date",{ascending:true}).limit(1).maybeSingle()
            if(latest)await supabaseAdmin.from("bookings").update({status:"cancelled"}).eq("id",latest.id)
          }
        }
        newState=clearBookingFields(newState);newState.pending_next_slot=null
        await saveState(conversationId,newState)
        return t(
          "Your booking has been cancelled 😊 Let me know if you'd like to rebook!",
          "మీ బుకింగ్ రద్దు చేయబడింది 😊 మళ్ళీ బుక్ చేయాలంటే చెప్పండి!",
          "आपकी बुकिंग रद्द हो गई 😊 दोबारा बुक करना हो तो बताइए!",
          replyLang
        )
      }catch(e){console.error("❌ Cancel failed:",e.message)}
    }

    if(action==="do_reschedule"&&confirmed===true&&newState.date&&newState.time){
      try{
        const result=await rescheduleBooking({
          userId,customerPhone:phone,date:newState.date,time:newState.time,
          services,serviceName:newState.service,language:replyLang
        })
        if(result.ok){
          newState=clearBookingFields(newState);newState.stage="idle";newState.pending_next_slot=null
          await saveState(conversationId,newState);return result.message
        }
        if(result.slotFull){
          const mMatch=result.message.match(/at (\d{2}:\d{2})/)
          if(mMatch){newState.pending_next_slot=mMatch[1];newState.stage="awaiting_next_slot_confirm"}
          else{newState.time=null;newState.stage="awaiting_time"}
        }
        await saveState(conversationId,newState);return result.message
      }catch(e){console.error("❌ Reschedule threw:",e.message)}
    }

    if(action==="set_reminder"&&extracted.reminder_preference){
      try{
        const{data:nb}=await supabaseAdmin.from("bookings").select("id")
          .eq("customer_phone",phone).eq("user_id",userId)
          .in("status",["confirmed","pending"]).gte("booking_date",todayStr())
          .order("booking_date",{ascending:true}).limit(1).maybeSingle()
        if(nb)await supabaseAdmin.from("bookings")
          .update({reminder_preference:extracted.reminder_preference}).eq("id",nb.id)
        await saveState(conversationId,newState)
        return t(
          "Sure! I'll remind you "+(extracted.reminder_preference==="2hrs"?"2 hours":"a day")+" before. 😊",
          "తప్పకుండా! "+(extracted.reminder_preference==="2hrs"?"2 గంటల":"ఒక రోజు")+" ముందు రిమైండర్ పంపిస్తాను. 😊",
          "जरूर! "+(extracted.reminder_preference==="2hrs"?"2 घंटे":"एक दिन")+" पहले reminder भेजूंगा। 😊",
          replyLang
        )
      }catch(e){console.error("❌ set_reminder failed:",e.message)}
    }

    // NEW FIX: action==="do_booking" was previously falling through to the
    // unconditional `return reply` below — meaning normal-flow confirmed
    // bookings could return a generic "confirmed" message WITHOUT ever
    // calling createBooking(). This is the exact bug your friend caught:
    // do_booking has no dedicated handler before the bottom save+return.
    // Fix: if action is do_booking, fall through naturally past this
    // try/return block instead of returning early — execution will reach
    // the DO BOOKING block below since it's no longer gated behind the
    // closing brace of this else{} (see structural fix below).
    if(action!=="do_booking"){
      try{await saveState(conversationId,newState)}catch(e){console.error("❌ saveState failed:",e.message)}
      return reply
    }
  }

  // ── DO BOOKING (campaign confirmed OR normal flow OR do_booking action) ──
  if(newState.service&&newState.date){
    try{
      const result=await createBooking({
        userId,customerName:contactName,customerPhone:phone,
        customerId:null,state:newState,services,
        bizName:biz.business_name,language:replyLang,
        bizType:biz?.business_type,deliveryAddress:newState.delivery_address||null
      })
      if(result.ok){
        newState=clearBookingFields(newState)
        newState.stage="idle"
        newState.pending_next_slot=null
        newState.confirmed=false
        newState.last_booking={
          service:result.booking.service,
          date:result.booking.booking_date,
          time:result.booking.booking_time,
          confirmed_at:Date.now()
        }
        await saveState(conversationId,newState)
        await supabaseAdmin.from("conversations")
          .update({last_message:"✅ Booking Confirmed — "+result.booking.service})
          .eq("id",conversationId)

        // NEW FIX: atomic increment via Postgres RPC — no more read-then-write
        // race condition. Requires increment_campaign_booked_count() function
        // to exist in Supabase (see booked_count_fix.sql) — run that SQL first.
        if(campaignId){
          supabaseAdmin.rpc("increment_campaign_booked_count",{campaign_id_input:campaignId})
            .then(({error})=>{
              if(error)console.error("⚠️ booked_count RPC failed:",campaignId,error.message)
              else console.log("📊 booked_count incremented (atomic):",campaignId)
            }).catch(e=>console.error("⚠️ booked_count RPC threw:",campaignId,e.message))
        }

        try{
          const ownerPhone=(biz?.phone||"").replace(/[^0-9]/g,"")
          if(ownerPhone&&ownerPhone.length>=10){
            const{data:waConn}=await supabaseAdmin.from("whatsapp_connections")
              .select("access_token,phone_number_id").eq("user_id",userId).maybeSingle()
            if(waConn?.access_token&&waConn?.phone_number_id){
              const isFood=["Food Delivery","Restaurant"].includes(biz?.business_type)
              const isRE=biz?.business_type==="Real Estate"
              const icon=isFood?"🍽️":isRE?"🏠":"📅"
              const label=isFood?"New Order":isRE?"Site Visit Booked":"New Booking"
              const ownerMsg=`${icon} *${label}!*\n\n👤 Customer: ${contactName||phone}\n📦 Service: ${result.booking.service}\n💰 Amount: ₹${result.booking.amount||0}\n📞 Contact: ${phone}\n\nView: fastrill.com/dashboard/bookings`
              await fetch(
                `https://graph.facebook.com/v22.0/${waConn.phone_number_id}/messages`,
                {method:"POST",headers:{"Authorization":"Bearer "+decrypt(waConn.access_token),"Content-Type":"application/json"},
                 body:JSON.stringify({messaging_product:"whatsapp",to:ownerPhone,type:"text",text:{body:ownerMsg}})}
              )
            }
          }
        }catch(e){
          console.error("⚠️ Owner notification failed:",{userId,bookingId:result.booking?.id,phone,error:e.message})
        }

        return result.confirmMsg
      }else if(result.slotFull){
        const nextSlotTimeMatch=result.message.match(/at (\d{2}:\d{2})/)
        if(nextSlotTimeMatch){
          newState.time=null;newState.pending_next_slot=nextSlotTimeMatch[1]
          newState.stage="awaiting_next_slot_confirm"
        }else{
          newState.time=null;newState.stage="awaiting_time"
        }
        await saveState(conversationId,newState)
        if(availableSlots.length>0)
          return result.message+"\n\nOther available times: "+availableSlots.slice(0,5).map(formatTimeDisplay).join(", ")
        return result.message
      }else{
        console.error("❌ DO BOOKING failed:",result.error||"unknown")
        newState.confirmed=false
        await saveState(conversationId,newState)
        return result.message||"Sorry, there was an issue saving your booking 😅 Please try again."
      }
    }catch(e){
      console.error("❌ createBooking threw:",e.message)
      return"Sorry, there was an issue saving your booking 😅 Please try again."
    }
  }

  // Fallback
  await saveState(conversationId,newState)
  return buildSmartDefault(newState,bizName,replyLang)
}

module.exports={orchestrate}
