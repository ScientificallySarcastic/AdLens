# AdLens — Live Meta Data (already wired into this repo)

Every code file is ALREADY in this project. Nothing turns "live" until you add two
values to Vercel — until then the app is byte-for-byte your current prototype.

What's in the repo now:

| File | What it does |
|---|---|
| `lib/meta.ts` | NEW — Graph API fetchers + mappers into the app's own Campaign/DayPoint types |
| `lib/datasource.ts` | UPDATED — `MetaDataSource` is now REAL (was throwing "implement for CP2"); new `MergedDataSource`; `DATA_SOURCE` supports `merged` |
| `app/api/sync/meta/route.ts` | NEW — pulls Meta campaigns + daily insights into Neon |
| `app/api/db/status/route.ts` | NEW — seeded count · live count · last-synced (header-badge data) |
| `app/api/db/campaigns-merged/route.ts` | NEW — live + seeded through the seam, visible in the browser |
| `db/meta-sync.sql` | NEW — three additive tables: `meta_campaigns`, `meta_daily_metrics`, `sync_log` |

The safety rules baked in:

- No token set → sync route is a polite no-op, UI unchanged, build passes.
- Token set but Meta errors → seeded data still renders; last good live rows still render.
- A failed sync never deletes anything — upserts only.
- Dashboard pages still read the seeded dataset directly (deliberate — see "Wiring the UI").

---

## Step 1 — Meta's side (only YOU can do this, ~30–45 min)

You're creating an app (the "key ring") and a token (the "key") that can READ your own
ad account. No app review needed — Development mode is enough for your own assets.

1. **Create the app** — developers.facebook.com → My Apps → **Create App** → type
   **Business** → name it `adlens-sync`.
2. **Add the Marketing API** — app dashboard → Add Product → **Marketing API** → Set up.
   (Stays in Development mode — fine for your own account.)
3. **Create a System User** (token that doesn't expire hourly) — business.facebook.com →
   **Settings** → Users → **System Users** → Add → name `adlens-sync`, role **Employee**.
4. **Assign your ad account** — on the System User page → **Add Assets** → Ad Accounts →
   pick yours → enable **View performance** → Save.
5. **Generate the token** (shown ONCE — save it) — System User page → **Generate New
   Token** → select the `adlens-sync` app → tick **`ads_read`** and **`read_insights`** →
   Generate → copy.
6. **Ad Account ID** — Ads Manager URL contains `act=1234567890123`. Copy **only the
   number** (no `act_` — the code adds it).

> Quick smoke test alternative: Graph API Explorer can mint a short-lived token
> (~1–2 h). Fine for a first try, useless beyond that. The System User token is the keeper.

## Step 2 — Create the tables (Neon, 2 min)

console.neon.tech → your project → **SQL Editor** → paste ALL of `db/meta-sync.sql` →
**Run** → expect `meta tables ready`.

## Step 3 — Flip the switch (Vercel, 3 min)

Settings → Environment Variables:

| Name | Value | Required? |
|---|---|---|
| `META_ACCESS_TOKEN` | System User token | yes |
| `META_AD_ACCOUNT_ID` | number only, e.g. `1234567890123` | yes |
| `SYNC_SECRET` | any random string | optional — locks the sync URL |
| `META_API_VERSION` | e.g. `v23.0` | optional override |
| `DATA_SOURCE` | `merged` | optional — see modes below |

Then **Deployments → Redeploy** (env vars only apply to new deployments).

## Step 4 — Verify (2 min, all in the browser)

1. `/api/db/status` → expect `"liveConfigured": true`
2. `/api/sync/meta?days=7` → expect `"synced": true` with counts
   (add `&key=YOUR_SYNC_SECRET` if you set one)
3. `/api/db/campaigns-merged` → your real campaigns appear first with ids like
   `"meta_1234…"` and `"note": "Live · Meta Graph API"`, the 55 seeded ones follow
4. `/api/db/status` again → `lastSynced` is stamped. That's the badge data.

If step 2 errors, it prints **Meta's actual error message** — 90% of the time it's a
token missing `ads_read`, or an account id typed with the `act_` prefix.

## DATA_SOURCE modes (`lib/datasource.ts`)

| Value | Behavior |
|---|---|
| *(unset)* | MockDataSource — exactly today's prototype |
| `merged` | live Meta rows stacked on top of the seeded portfolio (demo-safe) |
| `meta` | pure live — only synced Meta campaigns |

## Wiring the UI (deliberately NOT done yet)

Dashboard pages currently import the seeded dataset directly (`@/lib/data`) — that's why
the demo cannot break. Once you've eyeballed `/api/db/campaigns-merged` and like it, the
flip is: make a page read through `dataSource` (from `@/lib/datasource`) instead. Do it
page by page, after CP2 unless everything else is finished. Live campaigns have no adset
drill-down yet (`MetaDataSource.getAdsets` returns `[]` — adset-level sync is post-CP2
scope, documented in the code).

## Gotchas

- **Attribution lag:** Meta restates conversions for ~72 h → sync default re-pulls the
  trailing 3 days (upserts overwrite cleanly). Backfill more with `?days=30`.
- **Budgets:** Meta reports `daily_budget` in minor units (cents) — the sync converts to
  dollars. Campaign-level budget may be 0 when budgets live at adset level (pacing shows 0).
- **Keeping fresh:** re-run the sync URL anytime; automate later with a `vercel.json`
  cron hitting `/api/sync/meta` daily. Not needed for CP2.
- **Next platforms:** LinkedIn/Pinterest = one more adapter class each implementing the
  same `DataSource` interface, one more `sync_log` row. The seam is the product.
