# AdLens Partner API

Partners fetch their results with **zero manual setup**. The old flow — create an
App, generate a token, register it in Partners config, then call the API — is
gone. Credentials are **auto-provisioned the moment a partner is created** and
returned in the same response, ready to use.

## Architecture in one paragraph

Every partner is an org-level service account. At creation it automatically
receives **(1)** an API key (`ak_live_…`) for instant integrations and
**(2)** an OAuth 2.0 client (`oc_…`/`ocs_…`) for enterprise teams that prefer the
client-credentials grant with short-lived JWTs (15 min). Both credentials resolve
to the same `partner_id` inside one shared auth middleware, and every data read
filters on that id — so tenant isolation is enforced in exactly one place.
Secrets are stored only as SHA-256 hashes; multiple keys can be active at once,
which makes rotation zero-downtime; revocation is instant for keys and bounded
by the 15-minute TTL for OAuth tokens.

## Setup

- **Demo mode (no DB):** works out of the box — partners live in memory and reset on restart.
- **Production:** run `db/partner-auth.sql` once in the Neon SQL Editor, then set:

```
DATABASE_URL=postgres://…          # already set if you use live sync
PARTNER_ADMIN_TOKEN=<random>       # guards the provisioning endpoint
PARTNER_JWT_SECRET=<random>        # signs OAuth access tokens
```

## 1. Create a partner (internal/admin — your onboarding flow calls this)

```bash
curl -X POST http://localhost:3000/api/partners \
  -H "X-Admin-Token: dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Agency"}'
```

Response (secrets shown **once**, never retrievable again):

```json
{
  "partner": { "id": "ptr_ab12…", "name": "Acme Agency", "campaignScope": null },
  "credentials": {
    "apiKey": "ak_live_<keyId>_<secret>",
    "oauth": { "clientId": "oc_…", "clientSecret": "ocs_…", "tokenUrl": "/api/oauth/token" }
  }
}
```

Optional: `"campaignScope": ["summer-sale", "retargeting"]` restricts the partner
to specific campaigns (omit for all).

## 2. Partner fetches results — the entire integration

```bash
curl http://localhost:3000/api/partner/results \
  -H "Authorization: Bearer ak_live_<keyId>_<secret>"

# with per-day series:
curl "http://localhost:3000/api/partner/results?include=daily" \
  -H "Authorization: Bearer ak_live_…"
```

## 3. Enterprise path — OAuth 2.0 client credentials

```bash
# exchange client credentials for a 15-minute access token
curl -X POST http://localhost:3000/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"oc_…","client_secret":"ocs_…"}'

# use it exactly like an API key
curl http://localhost:3000/api/partner/results \
  -H "Authorization: Bearer <access_token>"
```

## 4. Rotation & revocation (partner self-service, zero downtime)

```bash
# create a new key alongside the old one
curl -X POST http://localhost:3000/api/partner/keys \
  -H "Authorization: Bearer ak_live_<old>" -d '{"label":"2026 rotation"}'

# list keys (masked) with last_used_at for dead-key auditing
curl http://localhost:3000/api/partner/keys -H "Authorization: Bearer ak_live_…"

# revoke the old key once migrated — instant
curl -X DELETE http://localhost:3000/api/partner/keys/<keyId> \
  -H "Authorization: Bearer ak_live_<new>"
```

## Security properties

| Property | How |
| --- | --- |
| Secrets at rest | SHA-256 hashes only; DB leak ≠ credential leak |
| Verification | Constant-time compares (`timingSafeEqual`) |
| Tenant isolation | Single middleware resolves credential → `partner_id`; all reads filter on it |
| Scopes | `results:read`, `keys:manage` per credential |
| Rotation | Multiple concurrent keys; create → migrate → revoke |
| Revocation | Keys: instant. OAuth: revoke client; tokens expire ≤ 15 min |
| JWT secret rollover | Set `PARTNER_JWT_SECRET`, keep old value working via code's previous-secret hook |
| Rate limiting | Token bucket per partner (120/min), `429 + Retry-After` |
| Audit | `partner_audit` trail + `last_used_at` on every key |

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/partners` | `X-Admin-Token` | Create partner + auto-provision credentials |
| GET | `/api/partners` | `X-Admin-Token` | List partners with masked keys |
| POST | `/api/oauth/token` | client credentials | Issue 15-min access token |
| GET | `/api/partner/results` | key or token | Partner's campaign results (`?include=daily`) |
| GET | `/api/partner/keys` | key or token | List own keys (masked) |
| POST | `/api/partner/keys` | key or token | Rotate: create additional key |
| DELETE | `/api/partner/keys/:keyId` | key or token | Revoke a key |
