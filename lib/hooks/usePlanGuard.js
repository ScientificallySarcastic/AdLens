"use client"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function usePlanGuard() {
  useEffect(() => {
    async function check() {
      // Must use the shared @supabase/ssr browser client — it stores the
      // session in cookies. A fresh createClient() from supabase-js reads
      // localStorage instead, never sees the session, and bounced every
      // logged-in user back to /login (looked like an auto-logout).
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { window.location.href = "/login"; return }

      const { data: biz } = await supabase
        .from("business_settings")
        .select("plan, plan_expires_at")
        .eq("user_id", user.id)
        .maybeSingle()

      if (biz?.plan_expires_at && new Date(biz.plan_expires_at) < new Date()) {
        window.location.href = "/dashboard/settings?tab=billing&expired=1"
      }
    }
    check()
  }, [])
}
