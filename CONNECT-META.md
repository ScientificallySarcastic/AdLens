# Connect with Facebook — self-service account onboarding

Users add their own Meta ad accounts by clicking a button. No developer console,
no System User, no copied access token, and no redeploy per customer.

**Account check → Connect with Facebook → pick accounts on Meta's screen → done.**

## What changed

| Before | Now |
| --- | --- |
| Each account needed a Meta app + System User token (~30–45 min in developers.facebook.com) | User clicks Connect, approves on Facebook |
| Token pasted into `META_ACCESS_TOKEN` | Token received via OAuth callback, encrypted, stored |
| One env var ⇒ **one ad account per deployment** | **Unlimited accounts**, many users, one deployment |
| Adding an account = redeploy | Adding an account = a click |

The old `META_ACCESS_TOKEN` path still works untouched — OAuth connections simply
take precedence when present.

## One-time setup (you, once — not per customer)

1. **developers.facebook.com** → My Apps → **Create App** → type **Business**.
2. Add Product → **Facebook Login** → Settings → add the redirect URI:
   `https://YOUR-DOMAIN/api/auth/meta/callback` (and your localhost URL for dev).
3. Add Product → **Marketing API**.
4. Copy the **App ID** and **App Secret** (Settings → Basic).
5. Set environment variables:

```
META_APP_ID=<app id>
META_APP_SECRET=<app secret>
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>   # encrypts stored tokens
META_OAUTH_REDIRECT_URI=                       # optional; defaults to <origin>/api/auth/meta/callback
```

**No migration step.** The tables are created automatically on first use
(`CREATE TABLE IF NOT EXISTS`, run once per process). `db/meta-oauth.sql` is kept
as the explicit reference if you prefer to run migrations by hand — but you never
have to, and a fresh database will not fail with "relation does not exist".

To let people outside your own Business use it, submit **`ads_read`** for App
Review and take the app Live. Until then it works for anyone with a role on your
Meta app (fine for pilots and internal use).

## What the user does

1. Opens **Account check**
2. Clicks **Connect with Facebook**
3. Approves on Meta's consent screen and ticks which ad accounts to share
4. Lands back on the wizard — their accounts are listed and ready to sync

## How it works

```
/api/auth/meta          → redirect to Facebook's OAuth dialog (signed CSRF state)
   ↓ user approves
/api/auth/meta/callback → verify state → code → short-lived token
                        → exchange for long-lived (~60 day) token
                        → GET /me/adaccounts (paged) → store → back to /check
/api/connections        → list connected accounts · DELETE to disconnect
```

The requested scope is `ads_read` only — read-only, and it already covers the
`/insights` edges the dashboard reads. (`read_insights` is a Page-insights
permission, not a valid Login scope; asking for it makes Meta refuse the dialog
with "Invalid Scopes".) AdLens cannot
create, edit, pause, or spend anything.

## Security

- Tokens encrypted at rest with **AES-256-GCM** (`lib/tokenCrypto.ts`); a DB dump
  yields no usable credentials.
- **CSRF**: the `state` parameter is HMAC-signed and expires after 10 minutes.
- `TOKEN_ENCRYPTION_KEY` **fails closed in production** — unset means the app
  refuses to encrypt rather than falling back to a known dev key.
- Tokens never reach the browser; `/api/connections` returns metadata only.
- Every synced row is stamped with the ad account it came from, so two connected
  accounts can never mix data.
- **Disconnect** revokes the stored grant immediately.

## Token lifetime

Long-lived tokens last ~60 days. `token_expires` is stored per connection, so a
reminder or refresh job can be added later; today an expired connection surfaces
Meta's auth error and the user simply clicks Connect again.

## Going Live (App Review)

Development mode lets anyone with a role on the Meta app connect — enough for
testing and pilots. Serving real customers needs `ads_read` at **Advanced
Access**, which is a separate gate from the Live toggle.

Order matters:

1. **Business Verification** — Meta verifies your business with documents.
   Required before `ads_read` can reach Advanced Access. Start it first; it is
   the slowest step.
2. **App Review** → Permissions and Features → request **Advanced Access** for
   `ads_read`. Include a screencast of a real user clicking Connect, approving
   on Meta's screen, and data appearing — so deploy OAuth before submitting.
3. **Flip App Mode to Live** (top of the app dashboard).

### Dashboard URLs Meta requires

| Field | Value |
| --- | --- |
| Valid OAuth Redirect URI | `https://YOUR-DOMAIN/api/auth/meta/callback` |
| Deauthorize Callback URL | `https://YOUR-DOMAIN/api/auth/meta/deauthorize` |
| Data Deletion Callback URL | `https://YOUR-DOMAIN/api/auth/meta/data-deletion` |
| Privacy Policy URL | you must supply one |

The deauthorize and data-deletion callbacks are **implemented in this repo**.
Both verify Meta's `signed_request` HMAC before acting, and both delete the
stored connection — token included — so access stops the moment a user removes
AdLens from their Facebook settings. `GET /api/auth/meta/data-deletion?id=<user>`
returns the deletion status Meta requires.

Still on you: a Privacy Policy URL, an app icon (1024×1024), and a category.

## Limitation

The connection is stored against a single workspace (`owner = 'default'`), since
AdLens has no user login yet. Add real per-user auth and the `owner` column is
already there to scope connections per user.
