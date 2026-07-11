# AdLens — AI-Powered Ad Campaign Intelligence

Know **why** your campaign is underperforming — in one click, not 40 minutes of Ads Manager digging.

Built for HackAdTech – AI. Next.js 14 · TypeScript · Tailwind · Framer Motion · Recharts · Zustand.

## Run it

```bash
npm install
npm run dev        # → http://localhost:3000
```

That's it. No database, no API keys required — the app runs on a deterministic seeded dataset (55 campaigns, 230+ adsets equivalent, 90 days of metrics with embedded fatigue/saturation/ROAS-crash patterns).

### Optional: real Claude-powered AI chat

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

With the key, the Ask AI panel streams real Claude analysis grounded in the selected campaign's metrics JSON. Without it, a deterministic rule-based responder answers from the same data — so the demo never breaks.

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

## Architecture

- `lib/data.ts` — seeded deterministic dataset (the MockAdapter). Swap for Prisma + Meta Graph API in Phase 1; every page reads through this layer.
- `lib/ai.ts` — `buildCampaignContext()` assembles the metrics JSON every AI answer is grounded in.
- `app/api/ai/chat` — Anthropic API when key present, deterministic fallback otherwise.
- `lib/store.ts` — Zustand: selected campaign drives AI panel visibility (only shows after a campaign is chosen).

## Next (Phase 1)

Meta OAuth → MetaAdapter implementing the same interface → BullMQ sync workers → Postgres. See `adlens-build-blueprint.md`.
