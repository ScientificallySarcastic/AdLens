# fastrill

**WhatsApp AI customer service platform for service businesses.**  
Any salon, clinic, spa, restaurant, or agency can deploy an AI agent that replies instantly, books appointments, captures leads, and runs campaigns — all through WhatsApp.

---

## What it does

- **AI Conversations** — Sarvam AI replies to customers 24/7 in any language
- **Automatic Booking** — AI collects service, date, time and books without human intervention
- **Lead Recovery** — Identifies cold leads and auto-sends win-back messages
- **Campaigns** — Broadcast WhatsApp messages to segmented customer lists
- **Dashboard** — Real-time conversations, bookings calendar, analytics, CRM

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (Postgres + Realtime) |
| Auth | Supabase Auth |
| AI | Sarvam AI (`sarvam-m` model) |
| WhatsApp | Meta WhatsApp Business API (Cloud API) |
| Deployment | Vercel |

---

## Project Structure

```
fastrill/
├── app/
│   ├── api/
│   │   ├── meta/webhook/route.js     ← WhatsApp webhook (core AI engine)
│   │   └── whatsapp/send/route.js    ← Server-side WA message sender
│   ├── dashboard/
│   │   ├── page.jsx                  ← Revenue Engine
│   │   ├── conversations/page.jsx    ← Real-time chat
│   │   ├── bookings/page.jsx         ← Booking management
│   │   ├── campaigns/page.jsx        ← Campaign broadcast
│   │   ├── leads/page.jsx            ← Lead recovery
│   │   ├── contacts/page.jsx         ← Customer CRM
│   │   ├── analytics/page.jsx        ← Analytics
│   │   └── settings/page.jsx         ← Business settings + AI Brain
│   └── onboarding/page.jsx           ← New business setup wizard
├── components/
│   ├── Toast.jsx                     ← Toast notification system
│   ├── ErrorBoundary.jsx             ← React error boundary
│   └── Skeleton.jsx                  ← Loading skeleton components
├── lib/
│   ├── supabase.js                   ← Supabase client
│   ├── env.js                        ← Environment variable validation
│   └── hooks/
│       ├── useAuth.js                ← Auth guard hook
│       └── useTheme.js               ← Theme + color tokens hook
└── sql/
    ├── rls-policies.sql              ← Row Level Security (run once)
    ├── migration-full.sql            ← All table migrations
    └── realtime-enable.sql           ← Enable realtime on tables
```

---

## Environment Setup

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ Yes |
| `WEBHOOK_VERIFY_TOKEN` | Any random string you choose | ✅ Yes |
| `SARVAM_API_KEY` | dashboard.sarvam.ai | Optional (degrades to rule-based AI) |

---

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Database Setup

Run these SQL files in **Supabase SQL Editor** (in order):

```
1. sql/migration-full.sql       ← Creates all tables
2. sql/realtime-enable.sql      ← Enables realtime on messages/conversations
3. sql/rls-policies.sql         ← Enables Row Level Security (IMPORTANT)
```

---

## Deployment (Vercel)

```bash
# One-time setup
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add WEBHOOK_VERIFY_TOKEN
vercel env add SARVAM_API_KEY

# Deploy
vercel --prod
```

---

## WhatsApp Webhook Setup

After deploying:

1. Go to **Meta Developer Console** → Your App → WhatsApp → Configuration
2. Set Webhook URL: `https://fastrill.com/api/meta/webhook`
3. Set Verify Token: same value as your `WEBHOOK_VERIFY_TOKEN` env var
4. Subscribe to: `messages`
5. Click **Verify and Save**

---

## Architecture — How a message flows

```
Customer sends WhatsApp message
        ↓
Meta Cloud API
        ↓
POST /api/meta/webhook
        ↓
1. Deduplicate (wa_message_id)
2. Upsert Customer in CRM
3. Upsert Conversation
4. Save inbound message
5. Check STOP/START compliance
6. Load business intelligence (settings + AI brain + services)
7. Detect intent (booking / pricing / location / greeting / etc.)
8. External venue guard
9. Instant replies (no AI) for pricing / location / hours / greeting
10. Reschedule flow (if applicable)
11. New booking creation (if applicable)
12. AI reply via Sarvam sarvam-m
        ↓
sendAndSave() → WhatsApp Graph API + messages table
```

---

## Security Checklist

- [x] Row Level Security enabled on all Supabase tables
- [x] WhatsApp access_token never exposed to browser (server route only)
- [x] Webhook verify token validation on GET requests
- [x] User ID scoped queries on all API routes
- [x] Service role key server-side only
- [ ] Rate limiting on webhook (TODO: add middleware)
- [ ] Sentry error tracking (TODO: add before prod)

---

## Known Limitations

- **Template campaigns**: Sending to contacts outside 24hr window requires Meta-approved templates. Current setup uses free-text which only works within 24hr conversation window.
- **Scheduling**: Campaigns send immediately. Scheduled campaigns need a background job (Vercel Cron or Supabase Edge Functions).
- **File uploads**: WhatsApp media (images, documents) received are acknowledged but not stored.

---

## Contributing

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test locally: `npm run dev`
4. Check for lint errors: `npm run lint`
5. PR to `main`

---

## License

Private — Fastrill © 2026
