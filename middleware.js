import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_API_ROUTES = [
  "/api/meta/webhook",
  "/api/razorpay/webhook",
  "/api/cron/",
  "/api/onboarding/init",
  "/api/health",
]

export async function middleware(request) {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_API_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")
  if (!pathname.startsWith("/api/") && !isProtectedPage) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() validates the JWT against the Supabase Auth server on every
  // request. Never use getSession() here — it only decodes the cookie
  // without verifying it, so a forged cookie would pass the gate.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/onboarding",
  ],
}
