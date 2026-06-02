# Fawaterak setup (EScore)

## Environment variables (`.env`)

```env
FAWATERAK_VENDOR_KEY=your_api_key_from_dashboard
FAWATERAK_PROVIDER_KEY=FAWATERAK.xxxx
FAWATERAK_ENV=live
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
| `FAWATERAK_ENV` | Optional; app always uses **live** (`app.fawaterk.com`) |
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

## Production (app.fawaterk.com)

- Dashboard: [app.fawaterk.com](https://app.fawaterk.com) → Integrations → Fawaterak
- API, iframe plugin, and checkout all use `https://app.fawaterk.com`
- Plugin script: `https://app.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js`
- Session/checkout always sends `envType: "live"` to the plugin

Use **live** API Key + Provider Key from the app dashboard.

### Fixing “Invalid Token or inactive vendor”

1. **IFRAM Domains** (app dashboard): add the exact site URL(s), e.g. `https://escore-lms.com` and `https://www.escore-lms.com` if you use both (HTTPS, no trailing slash).
2. **Keys**: use API Key + Provider Key from **app.fawaterk.com** (not staging).
3. **Vercel/host env**: set `FAWATERAK_*` and `NEXT_PUBLIC_APP_URL=https://escore-lms.com` on production (not only in local `.env`).
4. **HMAC domain** must be the full URL `https://escore-lms.com` (not `escore-lms.com` alone). Do **not** set `FAWATERAK_HMAC_DOMAIN_MODE=hostname-only`.
5. **Vercel**: copy all `FAWATERAK_*` and `NEXT_PUBLIC_APP_URL` to Production env vars, then redeploy.

## Docs

- [Fawaterak iframe checkout](https://fawaterak-api.readme.io/reference/fawaterk-hosted-checkout.md)
- [Webhooks](https://fawaterak-api.readme.io/reference/web-hook.md)
- [Test cards](https://fawaterak-api.readme.io/reference/test-cards.md)
