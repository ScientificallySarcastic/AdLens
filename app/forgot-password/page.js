"use client"
// Force dynamic rendering — no static pre-render
export const dynamic = "force-dynamic"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

// Shared cookie-based client — a standalone supabase-js client stored the
// recovery session in localStorage, so the post-reset redirect to /dashboard
// (which reads cookies) bounced the user back to /login.
function getSupabase() {
  return supabase
}

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { setError("Please enter your email"); return }
    setLoading(true); setError("")
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin + "/reset-password" }
      )
      if (error) throw error
      setSent(true)
    } catch(e) {
      setError(e.message || "Failed to send reset email. Please try again.")
    } finally { setLoading(false) }
  }

  const wrap  = { minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }
  const card  = { background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.55)" }
  const inp   = { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "16px" }
  const btn   = (disabled) => ({ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: disabled ? "rgba(255,255,255,0.14)" : "linear-gradient(135deg, #00C9B1, #00a98f)", color: disabled ? "#666" : "#000", fontSize: "15px", fontWeight: "700", cursor: disabled ? "not-allowed" : "pointer" })

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}><img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} /><span style={{fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:"#00C9B1"}}>rill</span></span></div>
        </div>
        <div style={card}>
          {!sent ? (
            <>
              <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Forgot password?</h1>
              <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>We will send a reset link to your email</p>
              {error && <div style={{ background: "#2d1515", border: "1px solid #f87171", borderRadius: "8px", padding: "12px", marginBottom: "20px", color: "#f87171", fontSize: "14px" }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inp} />
                <button type="submit" disabled={loading} style={btn(loading)}>{loading ? "Sending..." : "Send reset link →"}</button>
              </form>
              <p style={{ textAlign: "center", marginTop: "20px" }}>
                <a href="/login" style={{ color: "#00C9B1", fontSize: "14px", textDecoration: "none" }}>← Back to login</a>
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📬</div>
              <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Check your inbox</h1>
              <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Reset link sent to<br /><span style={{ color: "#fff" }}>{email}</span></p>
              <p style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}>
                Didn't get it? Check spam or{" "}
                <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: "#00C9B1", cursor: "pointer", fontSize: "13px", padding: 0 }}>try again</button>
              </p>
              <a href="/login" style={{ display: "block", padding: "13px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", fontSize: "15px", textAlign: "center" }}>← Back to login</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
