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
- Checkout script URL: **`https://staging.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js`** (not `app.fawaterk.com`) while `FAWATERAK_USE_STAGING_PLUGIN` is `true` in [`lib/fawaterak/constants.ts`](lib/fawaterak/constants.ts)

When going production: set `FAWATERAK_ENV=live`, live keys, and set `FAWATERAK_USE_STAGING_PLUGIN = false` in constants.

Keys and `envType` must match or you may see “Invalid Token or inactive vendor”.

## Docs

- [Fawaterak iframe checkout](https://fawaterak-api.readme.io/reference/fawaterk-hosted-checkout.md)
- [Webhooks](https://fawaterak-api.readme.io/reference/web-hook.md)
- [Test cards](https://fawaterak-api.readme.io/reference/test-cards.md)
