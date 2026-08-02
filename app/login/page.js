"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [showPass, setShowPass] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash

    // Google OAuth returns token in hash fragment — handle it here
    if (hash && hash.includes("access_token")) {
      setSigningIn(true)
      // Small delay to let Supabase parse the hash
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          window.location.href = "/dashboard"
        } else {
          setSigningIn(false)
          setError("Authentication failed. Please try again.")
        }
      }, 800)
      return
    }

    if (params.get("error")) setError("Authentication failed. Please try again.")
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim())    { setError("Please enter your email"); return }
    if (!password.trim()) { setError("Please enter your password"); return }
    setLoading(true); setError("")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password: password
      })
      if (error) throw error
      window.location.href = "/dashboard"
    } catch(err) {
      if (err.message?.includes("Invalid login") || err.message?.includes("invalid")) {
        setError("Incorrect email or password. Please try again.")
      } else if (err.message?.includes("Email not confirmed")) {
        setError("Please verify your email first. Check your inbox for the verification code.")
      } else {
        setError(err.message || "Login failed. Please try again.")
      }
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError("")
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options:  { redirectTo: window.location.origin + "/auth/callback" }
      })
      if (error) throw error
    } catch(err) {
      setError("Google login failed. Please try again.")
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff",
    fontSize: "15px", outline: "none", boxSizing: "border-box"
  }

  // Show spinner while processing Google OAuth token
  if (signingIn) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #00C9B1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#888", fontSize: "14px" }}>Signing you in...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} />
            <span style={{fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:"#00C9B1"}}>rill</span></span>
          </div>
          <p style={{ color: "#888", marginTop: "8px", fontSize: "14px" }}>WhatsApp AI for your business</p>
        </div>

        <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.55)" }}>

          {error && (
            <div style={{ background: "#2d1515", border: "1px solid #f87171", borderRadius: "8px", padding: "12px", marginBottom: "20px", color: "#f87171", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Welcome back</h1>
          <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Sign in to your Fastrill account</p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px", opacity: loading ? 0.6 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "#555", fontSize: "13px" }}>or sign in with email</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email" style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>Email address</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={{ ...inputStyle, marginBottom: "16px" }} />

            <label htmlFor="login-password" style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>Password</label>
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <input id="login-password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "13px" }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>

            <div style={{ textAlign: "right", marginBottom: "20px" }}>
              <a href="/forgot-password" style={{ color: "#00C9B1", fontSize: "13px", textDecoration: "none" }}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(255,255,255,0.14)" : "linear-gradient(135deg,#00C9B1,#00a98f)", color: loading ? "#666" : "#000", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "20px", color: "#666", fontSize: "14px" }}>
            Don't have an account? <a href="/signup" style={{ color: "#00C9B1", textDecoration: "none", fontWeight: "600" }}>Sign up free</a>
          </p>
        </div>
      </div>
    </div>
  )
}
