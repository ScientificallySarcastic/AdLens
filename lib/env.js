// lib/env.js
// Validates all required environment variables on startup

const REQUIRED_SERVER = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WEBHOOK_VERIFY_TOKEN",
  "GEMINI_API_KEY",
]

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]

if (typeof window === "undefined") {
  const missing = REQUIRED_SERVER.filter(function(key) {
    return !process.env[key]
  })
  if (missing.length > 0) {
    console.error("\n❌ FASTRILL — Missing environment variables:")
    missing.forEach(function(key) {
      console.error("   • " + key)
    })
    console.error("\nCopy .env.example to .env.local and fill in the values.\n")
    if (process.env.NODE_ENV === "development") {
      throw new Error("Missing environment variables: " + missing.join(", "))
    }
  } else {
    console.log("✅ Environment variables OK")
  }
}

export default {}
