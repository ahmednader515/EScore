# Fawaterak setup (EScore)

## Environment variables (`.env`)

```env
FAWATERAK_VENDOR_KEY=your_api_key_from_dashboard
FAWATERAK_PROVIDER_KEY=FAWATERAK.xxxx
FAWATERAK_ENV=test
NEXT_PUBLIC_APP_URL=https://your-escore-domain.com
```

Optional:

```env
FAWATERAK_API_KEY=same_as_vendor_key
FAWATERAK_IFRAME_DOMAIN=https://your-escore-domain.com
FAWATERAK_HMAC_DOMAIN_MODE=hostname-only
```

| Variable | Purpose |
|----------|---------|
| `FAWATERAK_VENDOR_KEY` | API Key from Fawaterak dashboard (Integrations → Fawaterak) |
| `FAWATERAK_PROVIDER_KEY` | Provider Key from same page |
| `FAWATERAK_ENV` | `test` for staging keys, `live` for production |
| `NEXT_PUBLIC_APP_URL` | Public site URL, no trailing slash (redirects + webhook) |

## Fawaterak dashboard (Integrations → Fawaterak)

Replace `https://your-escore-domain.com` with your real domain (e.g. Vercel URL).

| Field | Value |
|-------|--------|
| **Success Redirect Url** | `https://your-escore-domain.com/dashboard/balance/payment/success` |
| **Fail Redirect Url** | `https://your-escore-domain.com/dashboard/balance/payment/fail` |
| **IFRAM Domains** | `https://your-escore-domain.com` (HTTPS, no trailing slash) |
| **Paid transactions webhook** | `https://your-escore-domain.com/api/webhooks/fawaterak_json` |

Pending payments (Fawry): users land on `/dashboard/balance/payment/pending` via `pendingUrl` in the session payload.

## Payment methods

Enable **Card**, **Fawry**, and **mobile wallets** in the Fawaterak dashboard. The iframe plugin lists whatever is activated for your vendor account.

## Staging vs live

- Staging dashboard (`staging.fawaterk.com`) → `FAWATERAK_ENV=test` + staging API/provider keys
- Live dashboard → `FAWATERAK_ENV=live` + live keys
- Checkout script: `https://staging.fawaterk.com/...` when `FAWATERAK_ENV=test`, `https://app.fawaterk.com/...` when `live`

Keys and `envType` must match or you may see **“Invalid Token or inactive vendor”**.

### Fixing “Invalid Token or inactive vendor”

1. **IFRAM Domains** (staging dashboard): add the exact site URL(s), e.g. `https://escore-lms.com` and `https://www.escore-lms.com` if you use both (HTTPS, no trailing slash).
2. **Keys**: use API Key + Provider Key from the **same** environment as `FAWATERAK_ENV` (staging keys with `test`, live keys with `live`).
3. **Vercel/host env**: set `FAWATERAK_*` and `NEXT_PUBLIC_APP_URL=https://escore-lms.com` on production (not only in local `.env`).
4. **HMAC domain** must match the browser hostname (the app sends `https://` + `location.hostname` for the hash).

## Docs

- [Fawaterak iframe checkout](https://fawaterak-api.readme.io/reference/fawaterk-hosted-checkout.md)
- [Webhooks](https://fawaterak-api.readme.io/reference/web-hook.md)
- [Test cards](https://fawaterak-api.readme.io/reference/test-cards.md)
