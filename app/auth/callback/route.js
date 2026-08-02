import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin))
  }

  if (code) {
    // Collect the session cookies here and attach them to the redirect
    // response at the end. They were previously written onto a throwaway
    // NextResponse.next(), so the browser never received them and only the
    // URL-hash hand-off (which onboarding didn't parse) carried the session.
    const pendingCookies = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet)
          },
        },
      }
    )

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data?.session) {
      console.error("OAuth exchange failed:", exchangeError?.message)
      return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin))
    }

    const session = data.session
    const hashParams = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: "bearer",
      expires_in: String(session.expires_in || 3600),
      type: "signup"
    })

    let dest = next

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (!settings) {
      const { data: configRow } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "early_access_count")
        .single()
      const { data: limitRow } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "early_access_limit")
        .single()

      const count = parseInt(configRow?.value || "0")
      const limit = parseInt(limitRow?.value || "20")
      const isEarlyAccess = count < limit

      const expiry = new Date()
      expiry.setDate(expiry.getDate() + (isEarlyAccess ? 30 : 14))

      const { error: insertError } = await supabaseAdmin.from("business_settings").insert({
        user_id: session.user.id,
        email: session.user.email,
        plan: isEarlyAccess ? "starter" : "trial",
        plan_expires_at: expiry.toISOString(),
        reminders_enabled: false,
        lead_recovery_enabled: false,
        campaigns_enabled: false,
        created_at: new Date().toISOString(),
      })
      if (insertError) {
        console.error("business_settings insert failed:", insertError.message)
      }

      if (isEarlyAccess) {
        await supabaseAdmin
          .from("app_config")
          .update({ value: String(count + 1) })
          .eq("key", "early_access_count")
      }

      dest = "/onboarding"
    }

    const redirect = NextResponse.redirect(
      new URL(dest + "#" + hashParams.toString(), requestUrl.origin)
    )
    pendingCookies.forEach(({ name, value, options }) => {
      redirect.cookies.set(name, value, options)
    })
    return redirect
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin))
}
