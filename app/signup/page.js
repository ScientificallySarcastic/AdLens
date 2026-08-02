"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

// The shared @supabase/ssr client stores the session in cookies — the rest of
// the app (dashboard, onboarding, middleware) reads cookies. A standalone
// supabase-js client here kept the session in localStorage, so verified
// signups landed on /onboarding with "no session" and bounced to /login.
function getSupabase() {
  return supabase
}

export default function SignupPage() {
  const [step, setStep]         = useState("form")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [otp, setOtp]           = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [message, setMessage]   = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthLabel = ["","Weak","Fair","Good","Strong"][strength]
  const strengthColor = ["","#f87171","#fbbf24","#4ade80","#00C9B1"][strength]

  useEffect(() => {
    const hash = window.location.hash

    // Handle Google OAuth hash fragment on signup page
    if (hash && hash.includes("access_token")) {
      setSigningIn(true)
      const supabase = getSupabase()
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Check if new user — no business_settings means first time
          const { data: settings } = await supabase
            .from("business_settings")
            .select("id")
            .eq("user_id", session.user.id)
            .single()

          if (!settings) {
            // New Google user — init and send to onboarding
            await fetch("/api/onboarding/init", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
              }
            })
            window.location.href = "/onboarding"
          } else {
            window.location.href = "/dashboard"
          }
        } else {
          setSigningIn(false)
          setError("Authentication failed. Please try again.")
        }
      }, 800)
      return
    }
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  async function handleSignup(e) {
    e.preventDefault()
    setError("")
    if (!email.trim())           { setError("Please enter your email"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return }
    if (password.length < 8)     { setError("Password must be at least 8 characters"); return }
    if (password !== confirm)    { setError("Passwords do not match"); return }

    setLoading(true)
    try {
      // signUp() itself emails the confirmation code ({{ .Token }} in the
      // "Confirm signup" template). Do NOT call signInWithOtp() right after —
      // Supabase allows one email per address per 60s, so that second call
      // always failed silently and was why codes never arrived.
      const { data, error } = await getSupabase().auth.signUp({
        email:    email.trim().toLowerCase(),
        password: password,
        options:  { emailRedirectTo: undefined }
      })
      if (error) throw error

      setStep("otp")
      setMessage("We sent a 6-digit verification code to " + email)
      setResendTimer(60)
    } catch(err) {
      if (err.message?.includes("already registered")) {
        setError("This email is already registered. Please login instead.")
      } else {
        setError(err.message || "Signup failed. Please try again.")
      }
    } finally { setLoading(false) }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    if (!otp || otp.length < 6) { setError("Please enter the 6-digit code"); return }
    setLoading(true); setError("")
    try {
      // Codes from the confirm-signup email verify as type "signup";
      // fall back to "email" for codes minted by a later resend/OTP flow.
      let { data, error } = await getSupabase().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type:  "signup"
      })
      if (error) {
        const fallback = await getSupabase().auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          type:  "email"
        })
        data = fallback.data
        error = fallback.error
      }
      if (error) throw error

      const session = data?.session
      if (session?.access_token) {
        await fetch("/api/onboarding/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          }
        })
      }

      window.location.href = "/onboarding"
    } catch(err) {
      if (err.message?.includes("expired")) {
        setError("Code expired. Please request a new one.")
      } else if (err.message?.includes("invalid")) {
        setError("Invalid code. Please check and try again.")
      } else {
        setError(err.message || "Verification failed. Please try again.")
      }
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true); setError(""); setMessage("")
    try {
      // "email" is not a valid resend type — signup confirmations resend
      // with type "signup". The old value made every resend fail.
      const { error } = await getSupabase().auth.resend({
        type:  "signup",
        email: email.trim().toLowerCase()
      })
      if (error) throw error
      setMessage("New code sent to " + email)
      setResendTimer(60)
    } catch(err) {
      setError("Failed to resend. Please try again.")
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError("")
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options:  { redirectTo: window.location.origin + "/auth/callback" }
      })
      if (error) throw error
    } catch(err) {
      setError("Google signup failed. Please try again.")
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff",
    fontSize: "15px", outline: "none", boxSizing: "border-box"
  }

  // Spinner while processing Google OAuth
  if (signingIn) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #00C9B1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#888", fontSize: "14px" }}>Setting up your account...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,201,177,0.12), transparent), #08080e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
            <img src="/logo.png" width="34" height="34" alt="Fastrill" style={{display:"block",objectFit:"contain",flexShrink:0}} />
            <span style={{fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.3px",lineHeight:1}}>fast<span style={{color:"#00C9B1"}}>rill</span></span>
          </div>
          <p style={{ color: "#888", marginTop: "8px", fontSize: "14px" }}>WhatsApp AI for your business</p>
        </div>

        <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.55)" }}>

          {error   && <div style={{ background: "#2d1515", border: "1px solid #f87171", borderRadius: "8px", padding: "12px", marginBottom: "20px", color: "#f87171", fontSize: "14px" }}>{error}</div>}
          {message && <div style={{ background: "#0d2d1a", border: "1px solid #4ade80", borderRadius: "8px", padding: "12px", marginBottom: "20px", color: "#4ade80", fontSize: "14px" }}>{message}</div>}

          {step === "form" && (
            <>
              <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "4px" }}>Create your account</h1>
              <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Start your free Fastrill account</p>

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
                <span style={{ color: "#555", fontSize: "13px" }}>or sign up with email</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              </div>

              <form onSubmit={handleSignup}>
                <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }} htmlFor="signup-email">Email address</label>
                <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={{ ...inputStyle, marginBottom: "16px" }} />

                <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }} htmlFor="signup-password">Password</label>
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <input id="signup-password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8} style={{ ...inputStyle, paddingRight: "44px" }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "13px" }}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>

                {password.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", marginBottom: "4px" }}>
                      <div style={{ height: "100%", width: (strength * 25) + "%", borderRadius: "2px", background: strengthColor, transition: "all 0.3s" }} />
                    </div>
                    <span style={{ fontSize: "12px", color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}

                <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px" }} htmlFor="signup-confirm">Confirm password</label>
                <div style={{ position: "relative", marginBottom: "20px" }}>
                  <input id="signup-confirm" type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required style={{ ...inputStyle, paddingRight: "44px", border: confirm && confirm !== password ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.12)" }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "13px" }}>
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
                {confirm && confirm !== password && <p style={{ color: "#f87171", fontSize: "12px", marginTop: "-16px", marginBottom: "12px" }}>Passwords do not match</p>}

                <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: loading ? "rgba(255,255,255,0.14)" : "linear-gradient(135deg,#00C9B1,#00a98f)", color: loading ? "#666" : "#000", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Creating account..." : "Create Account →"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: "20px", color: "#666", fontSize: "14px" }}>
                Already have an account? <a href="/login" style={{ color: "#00C9B1", textDecoration: "none", fontWeight: "600" }}>Sign in</a>
              </p>
              <p style={{ textAlign: "center", marginTop: "12px", color: "#555", fontSize: "12px" }}>
                By signing up you agree to our <a href="/terms" style={{ color: "#00C9B1", textDecoration: "none" }}>Terms</a> and <a href="/privacy" style={{ color: "#00C9B1", textDecoration: "none" }}>Privacy Policy</a>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📧</div>
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Verify your email</h1>
                <p style={{ color: "#888", fontSize: "14px" }}>Enter the 6-digit code sent to<br /><span style={{ color: "#fff", fontWeight: "600" }}>{email}</span></p>
              </div>

              <form onSubmit={handleVerifyOTP}>
                <input
                  type="text" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,"").substring(0,6))}
                  placeholder="000000" maxLength={6} autoFocus
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "28px", fontWeight: "700", textAlign: "center", outline: "none", letterSpacing: "8px", boxSizing: "border-box", marginBottom: "16px" }}
                />
                <button type="submit" disabled={loading || otp.length < 6} style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: otp.length < 6 ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#00C9B1,#00a98f)", color: otp.length < 6 ? "#555" : "#000", fontSize: "15px", fontWeight: "700", cursor: otp.length < 6 ? "not-allowed" : "pointer", marginBottom: "16px" }}>
                  {loading ? "Verifying..." : "Verify & Continue →"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <button onClick={handleResend} disabled={resendTimer > 0 || loading} style={{ background: "none", border: "none", color: resendTimer > 0 ? "#555" : "#00C9B1", fontSize: "14px", cursor: resendTimer > 0 ? "not-allowed" : "pointer" }}>
                  {resendTimer > 0 ? "Resend in " + resendTimer + "s" : "Resend code"}
                </button>
              </div>

              <button onClick={() => { setStep("form"); setOtp(""); setError(""); setMessage("") }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#888", fontSize: "14px", cursor: "pointer" }}>
                ← Change email or password
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
