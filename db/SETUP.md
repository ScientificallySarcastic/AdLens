# AdLens — Neon Database Setup WITHOUT a Terminal

Everything happens in three browser tabs: Neon, GitHub, Vercel.
Total time: ~20 minutes. Do the steps in order.

---

## Step 1 — Create the tables and data (Neon tab)

1. Open your project at **console.neon.tech**
2. Left sidebar → **SQL Editor**
3. Open the file `db/neon-setup.sql` (inside this project), copy ALL of it, paste into the editor
4. Click **Run**
5. The last line shows a check — you should see:
   `campaigns: 55 · adsets: 4 · ads: 11 · recs: 5 · alerts: 3`

Your database is now filled. Done with Neon.

## Step 2 — Push this project to GitHub (already wired)

Good news: every code file is ALREADY in this project —
`lib/db.ts`, the four routes under `app/api/db/...`, and the
`@neondatabase/serverless` dependency in package.json.

Just upload/push this project to your GitHub repo (drag-and-drop the
files on github.com works too). Vercel installs and builds it for you.

## Step 3 — Give Vercel the database address (Vercel tab)

1. In Neon → **Dashboard → Connection string** → select **Pooled connection** → copy it
2. In Vercel → your project → **Settings → Environment Variables**
3. Add: Name = `DATABASE_URL` · Value = the copied string · all environments
4. **Deployments** tab → ⋯ on the latest → **Redeploy**

## Step 4 — Check it worked

Open in your browser:

```
https://YOUR-APP.vercel.app/api/db/campaigns
```

If you see a wall of campaign data — congratulations, your app has a real
backend. The seeded sample data now lives in Postgres, served by real API
routes. (Checkpoint 1 demo keeps using the built-in data; this is your
Checkpoint 2 foundation.)

## What NOT to worry about

- **Prisma** — skipped on purpose; it needs terminal commands. The Neon
  driver does the same job with plain SQL.
- **Migrations** — for schema changes, just edit tables in Neon's SQL Editor.
- **Meta API** — next phase. It will be one more file that fetches from
  Meta and INSERTs into these same tables.

## Troubleshooting

- `/api/db/campaigns` shows `DB not reachable` → DATABASE_URL missing or
  wrong in Vercel → re-check Step 3, redeploy.
- Build fails on Vercel → check package.json line has the comma exactly as
  shown (JSON is picky).
- Neon says relation already exists → the script starts with DROP TABLE,
  so just run the whole file again, not parts of it.
