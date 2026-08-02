# AdLens — AI-Powered Ad Campaign Intelligence

Know **why** your campaign is underperforming — in one click, not 40 minutes of Ads Manager digging.

Built for HackAdTech – AI. Next.js 14 · TypeScript · Tailwind · Framer Motion · Recharts · Zustand.

## Run it locally

**Prerequisite:** Node.js 18.17 or newer (`node -v` to check). Nothing else — no
database, no Docker, no API keys.

```bash
# 1. unzip / clone, then from the project folder:
npm install          # ~1 min

# 2. start the dev server
npm run dev          # → http://localhost:3000
```

Open **http://localhost:3000** and you're in. The app runs on a deterministic
seeded dataset (55 campaigns, 230+ ad sets, 90 days of metrics with embedded
fatigue / saturation / ROAS-crash patterns), so every screen has realistic data
on first load.

Other commands:

```bash
npm run build && npm start   # production build, → http://localhost:3000
npm test                     # unit tests (date ranges, intent, citations)
npx tsx tests/periods.test.mts         # WoW / MoM comparison
npx tsx tests/pacing-status.test.mts   # pacing + status
npx tsx tests/ai-pipeline.test.mts     # AI retrieval ordering, no canned answers
npx tsx tests/oauth.test.mts           # OAuth token-encryption + CSRF
```

Port already in use? `npm run dev -- -p 3001`.

### Where to click first

| Page | Path |
| --- | --- |
| Today's brief | `/` |
| Campaign portfolio | `/overview` |
| Account wizard (+ Connect with Facebook) | `/check` |

### Optional: real Claude-powered AI chat

Create a `.env.local` file in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Restart `npm run dev`. The Ask AI panel then streams real Claude analysis
grounded in the selected campaign's metrics JSON. Without it, a deterministic
rule-based responder answers from the same data — so the demo never breaks.

### Optional: live Meta data + self-service account connection

Also in `.env.local` (all optional — the app runs fine without them):

```bash
DATABASE_URL=postgres://...        # Neon; enables live sync + persistence
META_APP_ID=...                    # enables "Connect with Facebook" on /check
META_APP_SECRET=...
TOKEN_ENCRYPTION_KEY=...           # openssl rand -hex 32
```

For local OAuth testing, add `http://localhost:3000/api/auth/meta/callback` to
your Meta app's **Valid OAuth Redirect URIs**. Database tables are created
automatically on first use — no migration step. Full setup: [CONNECT-META.md](CONNECT-META.md).

> Without `DATABASE_URL` everything still works, but connected accounts live
> in memory and reset when the server restarts.

## What's inside

| Page | What it does |
|---|---|
| **Home** | Today's Brief — Needs action / Watch / Opportunity cards + money-on-the-table strip |
| **Campaign overview** | Portfolio KPI strip (animated counters), 55 campaigns with sparklines, health dots, pacing bars, animated sort/filter/search |
| **Account check** | Platform → account → campaign wizard; 1 platform = deep dive, 2+ = cross-platform |
| **Analysis** | KPI strip, pacing gauge, anomaly chips, timeline presets (Daily/Weekly/Monthly/Overall/Custom), compare-periods A/B panel, 4 tabs |
| **Adset drill-down** | Per-adset KPIs, CTR/CPA trends, ad cards with Scale/Pause/Monitor, AI insight |
| **Cross-platform** | Meta vs LinkedIn, 3 plain metrics, visual bars, budget slider simulator |
| **Reporting** | 3-step selection → report view with charts, comparison table, AI narrative, PDF export |
| **Ledger** | Every recommendation → followed/ignored → measured outcome. 64% action rate, +31% avg improvement |
| **Alerts** | Rules-engine alerts (ROAS/CTR/CPC/pacing thresholds) |
| **Connect with Facebook** | Users add their own Meta ad accounts with one click — OAuth, no app setup or pasted tokens, unlimited accounts per deployment — see [CONNECT-META.md](CONNECT-META.md) |

## Architecture

- `lib/data.ts` — seeded deterministic dataset (the MockAdapter). Swap for Prisma + Meta Graph API in Phase 1; every page reads through this layer.
- `lib/aiPipeline.ts` — the AI query pipeline: parse → resolve → fetch live Meta data → build context → analyze → generate. The model is only called on data that was actually retrieved.
- `app/api/ai/chat` — runs that pipeline. If retrieval fails or no model is configured it returns an explicit error; there is no templated answer path.
- `lib/pacing.ts` — time-aware pacing (spend vs budget × elapsed time) for campaigns and ad sets.
- `lib/status.ts` — Meta `effective_status` → Active / Paused / Archived / In Review.
- `lib/periods.ts` — week-over-week and month-over-month. Ratios are recomputed from period totals (never averaged across days), and a comparison is withheld when either window lacks history.
- `app/api/cron/sync` — nightly 02:00 UTC sync of **every** account, OAuth-connected and env-credential alike (schedule in `vercel.json`).
- `lib/store.ts` — Zustand: selected campaign drives AI panel visibility (only shows after a campaign is chosen).


