"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"

const NAV = [
  { id:"overview",  label:"Revenue Engine", icon:"⬡", path:"/dashboard" },
  { id:"inbox",     label:"Conversations",  icon:"◎", path:"/dashboard/conversations" },
  { id:"bookings",  label:"Bookings",       icon:"◷", path:"/dashboard/bookings" },
  { id:"campaigns", label:"Campaigns",      icon:"◆", path:"/dashboard/campaigns" },
  { id:"leads",     label:"Lead Recovery",  icon:"◉", path:"/dashboard/leads" },
  { id:"contacts",  label:"Customers",      icon:"◑", path:"/dashboard/contacts" },
  { id:"analytics", label:"Analytics",      icon:"▦", path:"/dashboard/analytics" },
  { id:"settings",  label:"Settings",       icon:"◌", path:"/dashboard/settings" },
]

export default function DashboardLayout({ children, activeId, title, topbarRight }) {
  const router  = useRouter()
  const toast   = useToast()

  const [dark, setDark]               = useState(true)
  const [userEmail, setUserEmail]     = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile]       = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("fastrill-theme")
    if (saved) setDark(saved === "dark")
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserEmail(data.user.email || "")
    })
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch(e) {
      toast.error("Sign out failed — " + e.message)
    }
  }

  const toggleTheme = () => {
    const n = !dark
    setDark(n)
    localStorage.setItem("fastrill-theme", n ? "dark" : "light")
  }

  const bg              = dark ? "#08080e" : "#f0f2f5"
  const sidebar         = dark ? "#0c0c15" : "#ffffff"
  const border          = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
  const cardBorder      = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"
  const text            = dark ? "#eeeef5" : "#111827"
  const textMuted       = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)"
  const textFaint       = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"
  const inputBg         = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
  const accent          = dark ? "#00d084" : "#00935a"
  const navText         = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)"
  const navActive       = dark ? "rgba(0,196,125,0.1)" : "rgba(0,180,115,0.08)"
  const navActiveBorder = dark ? "rgba(0,196,125,0.2)" : "rgba(0,180,115,0.2)"
  const navActiveText   = dark ? "#00c47d" : "#00935a"
  const userInitial     = userEmail ? userEmail[0].toUpperCase() : "G"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${bg}!important;color:${text}!important;font-family:'Plus Jakarta Sans',sans-serif!important;}
        .dl-wrap{display:flex;height:100vh;overflow:hidden;background:${bg};}
        .dl-sidebar{width:224px;flex-shrink:0;background:${sidebar};border-right:1px solid ${border};display:flex;flex-direction:column;overflow-y:auto;transition:transform 0.25s ease;z-index:200;}
        @media(max-width:767px){
          .dl-sidebar{position:fixed;top:0;left:0;height:100vh;transform:translateX(-100%);}
          .dl-sidebar.open{transform:translateX(0);box-shadow:4px 0 24px rgba(0,0,0,0.5);}
        }
        .dl-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:199;}
        @media(max-width:767px){.dl-overlay.open{display:block;}}
        .dl-logo{padding:22px 20px 18px;font-weight:800;font-size:20px;letter-spacing:-0.3px;color:${text};text-decoration:none;display:flex;align-items:center;gap:9px;border-bottom:1px solid ${border};}
        .dl-logo img{display:block;object-fit:contain;flex-shrink:0;}
        .dl-logo span{color:${dark ? "#00C9B1" : "#009a89"};}
        .nav-section{padding:18px 16px 7px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${textFaint};font-weight:600;}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;color:${navText};font-weight:500;transition:all 0.13s;border:1px solid transparent;background:none;width:calc(100% - 16px);text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .nav-item:hover{background:${inputBg};color:${text};}
        .nav-item.active{background:${navActive};color:${navActiveText};font-weight:600;border-color:${navActiveBorder};}
        .nav-icon{font-size:13px;width:18px;text-align:center;flex-shrink:0;}
        .dl-sidebar-footer{margin-top:auto;padding:14px;border-top:1px solid ${border};}
        .user-card{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;background:${inputBg};border:1px solid ${cardBorder};}
        .user-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${accent},#0ea5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;}
        .user-email{font-size:11.5px;color:${textMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .logout-btn{margin-top:7px;width:100%;padding:7px;border-radius:7px;background:transparent;border:1px solid ${cardBorder};font-size:12px;color:${textMuted};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
        .logout-btn:hover{border-color:#fca5a5;color:#ef4444;}
        .dl-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
        .dl-topbar{height:54px;flex-shrink:0;border-bottom:1px solid ${border};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${sidebar};gap:12px;}
        @media(max-width:767px){.dl-topbar{padding:0 14px;}}
        .dl-tb-left{display:flex;align-items:center;gap:10px;}
        .dl-tb-title{font-weight:700;font-size:15px;color:${text};}
        .dl-topbar-r{display:flex;align-items:center;gap:8px;}
        .hamburger{display:none;background:${inputBg};border:1px solid ${cardBorder};border-radius:8px;padding:6px 8px;cursor:pointer;font-size:16px;color:${text};line-height:1;}
        @media(max-width:767px){.hamburger{display:flex;align-items:center;}}
        .theme-toggle{display:flex;align-items:center;gap:6px;padding:5px 10px;background:${inputBg};border:1px solid ${cardBorder};border-radius:8px;cursor:pointer;font-size:11.5px;color:${textMuted};font-family:'Plus Jakarta Sans',sans-serif;}
        .toggle-pill{width:30px;height:16px;border-radius:100px;background:${dark ? accent : "#d1d5db"};position:relative;flex-shrink:0;}
        .toggle-pill::after{content:'';position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;left:${dark ? "16px" : "2px"};}
        .dl-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:${sidebar};border-top:1px solid ${border};padding:6px 0 max(6px,env(safe-area-inset-bottom));z-index:100;}
        @media(max-width:767px){.dl-bottom-nav{display:flex;}.dl-main{padding-bottom:64px;}}
        .dl-bottom-nav-inner{display:flex;width:100%;justify-content:space-around;}
        .bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 8px;border-radius:8px;cursor:pointer;border:none;background:transparent;font-family:'Plus Jakarta Sans',sans-serif;flex:1;min-width:0;}
        .bnav-item.active .bnav-icon,.bnav-item.active .bnav-label{color:${accent};}
        .bnav-icon{font-size:16px;color:${textFaint};}
        .bnav-label{font-size:9px;font-weight:600;color:${textFaint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56px;}
        @media(max-width:480px){.theme-toggle span:last-child,.theme-toggle span:first-child{display:none;}}
        select option{background-color:#0c0c15!important;color:#eeeef5!important;}
      `}</style>

      <div className="dl-wrap">
        <div className={"dl-overlay" + (sidebarOpen ? " open" : "")} onClick={() => setSidebarOpen(false)} />

        <aside className={"dl-sidebar" + (sidebarOpen ? " open" : "")}>
          <a href="/dashboard" className="dl-logo">
            <img src="/logo.png" width="26" height="26" alt="Fastrill" />
            <span style={{color:text}}>fast<span>rill</span></span>
          </a>
          <div className="nav-section">Platform</div>
          {NAV.map(item => (
            <button key={item.id}
              className={"nav-item" + (item.id === activeId ? " active" : "")}
              onClick={() => { router.push(item.path); setSidebarOpen(false) }}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div className="dl-sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{userInitial}</div>
              <div className="user-email">{userEmail || "Loading..."}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>↩ Sign out</button>
          </div>
        </aside>

        <div className="dl-main">
          <div className="dl-topbar">
            <div className="dl-tb-left">
              <button className="hamburger" onClick={() => setSidebarOpen(s => !s)}>☰</button>
              <span className="dl-tb-title">{title}</span>
            </div>
            <div className="dl-topbar-r">
              {topbarRight}
              <button className="theme-toggle" onClick={toggleTheme}>
                <span>{dark ? "🌙" : "☀️"}</span>
                <div className="toggle-pill" />
                <span>{dark ? "Dark" : "Light"}</span>
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>

      <nav className="dl-bottom-nav">
        <div className="dl-bottom-nav-inner">
          {[
            { id:"overview", icon:"⬡", label:"Dashboard" },
            { id:"inbox",    icon:"◎", label:"Chats" },
            { id:"bookings", icon:"◷", label:"Bookings" },
            { id:"leads",    icon:"◉", label:"Leads" },
            { id:"contacts", icon:"◑", label:"Customers" },
          ].map(item => (
            <button key={item.id}
              className={"bnav-item" + (item.id === activeId ? " active" : "")}
              onClick={() => router.push(NAV.find(n => n.id === item.id)?.path || "/dashboard")}>
              <span className="bnav-icon">{item.icon}</span>
              <span className="bnav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
