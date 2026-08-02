"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function ConfirmPage() {
  useEffect(() => {
    async function exchange() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const next = params.get("next") || "/dashboard"

      if (!code) {
        window.location.href = "/login?error=oauth"
        return
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) throw error

        const { data: settings } = await supabase
          .from("business_settings")
          .select("id")
          .eq("user_id", data.session.user.id)
          .maybeSingle()

        if (!settings) {
          await fetch("/api/onboarding/init", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${data.session.access_token}`
            }
          })
          window.location.href = "/onboarding"
        } else {
          window.location.href = next
        }
      } catch (err) {
        console.error("Confirm error:", err)
        window.location.href = "/login?error=oauth"
      }
    }

    exchange()
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter,sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px", height: "48px", border: "3px solid #00d4ff",
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px"
        }} />
        <p style={{ color: "#888", fontSize: "14px" }}>Signing you in...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
