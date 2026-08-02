"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

// Shared cookie-based client — a standalone supabase-js client stored the
// recovery session in localStorage, so the post-reset redirect to /dashboard
// (which reads cookies) bounced the user back to /login.
function getSupabase() {
  return supabase
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true)
      else setError("Invalid or expired reset link. Please request a new one.")
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return }
    if (password !== confirm)  { setError("Passwords don't match"); return }
    setLoading(true); setError("")
    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => { window.location.href = "/dashboard" }, 2000)
    } catch(err) {
      setError(err.message || "Failed to reset password. Please try again.")
    } finally { setLoading(false) }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthLabel = ["","Weak","Fair","Good","Strong"][strength]
  const strengthColor = ["","#f87171","#fbbf24","#4ade80","#00C9B1"][strength]

  if (!mounted) return null

  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"420px" }}>
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}><img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} /><span style={{fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:"#00C9B1"}}>rill</span></span></div>
        </div>
        <div style={{ background:"#0f0f1a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"32px", boxShadow:"0 24px 64px rgba(0,0,0,0.55)" }}>
          {success ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"48px", marginBottom:"16px" }}>✅</div>
              <h1 style={{ color:"#fff", fontSize:"22px", fontWeight:"700", marginBottom:"8px" }}>Password updated!</h1>
              <p style={{ color:"#888", fontSize:"14px" }}>Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <h1 style={{ color:"#fff", fontSize:"22px", fontWeight:"700", marginBottom:"8px" }}>Set new password</h1>
              <p style={{ color:"#888", fontSize:"14px", marginBottom:"24px" }}>Choose a strong password</p>
              {error && <div style={{ background:"#2d1515", border:"1px solid #f87171", borderRadius:"8px", padding:"12px", marginBottom:"20px", color:"#f87171", fontSize:"14px" }}>{error}</div>}
              <form onSubmit={handleReset}>
                <label style={{ display:"block", color:"#aaa", fontSize:"13px", marginBottom:"6px" }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8} style={{ width:"100%", padding:"12px 14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"#fff", fontSize:"15px", outline:"none", boxSizing:"border-box", marginBottom:"8px" }} />
                {password.length > 0 && (
                  <div style={{ marginBottom:"16px" }}>
                    <div style={{ height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.08)", marginBottom:"4px" }}>
                      <div style={{ height:"100%", width:(strength*25)+"%", borderRadius:"2px", background:strengthColor, transition:"all 0.3s" }} />
                    </div>
                    <span style={{ fontSize:"12px", color:strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
                <label style={{ display:"block", color:"#aaa", fontSize:"13px", marginBottom:"6px" }}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required style={{ width:"100%", padding:"12px 14px", borderRadius:"10px", border:confirm&&confirm!==password?"1px solid #f87171":"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"#fff", fontSize:"15px", outline:"none", boxSizing:"border-box", marginBottom:"16px" }} />
                <button type="submit" disabled={loading||!validSession} style={{ width:"100%", padding:"13px", borderRadius:"10px", border:"none", background:loading?"rgba(255,255,255,0.14)":"linear-gradient(135deg,#00C9B1,#00a98f)", color:loading?"#666":"#000", fontSize:"15px", fontWeight:"700", cursor:loading?"not-allowed":"pointer" }}>
                  {loading ? "Updating..." : "Update password →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
