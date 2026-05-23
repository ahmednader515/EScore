import { generateIframeHashKey } from "./hmac";

export type FawaterakEnvType = "test" | "live";

export function getFawaterakSecrets() {
  const vendorKey =
    process.env.FAWATERAK_VENDOR_KEY?.trim() ||
    process.env.FAWATERAK_API_KEY?.trim() ||
    "";
  const providerKey = process.env.FAWATERAK_PROVIDER_KEY?.trim() || "";

  if (!vendorKey || !providerKey) {
    return null;
  }

  const envType: FawaterakEnvType =
    process.env.FAWATERAK_ENV?.trim().toLowerCase() === "live" ? "live" : "test";

  const appOrigin = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    ""
  ).replace(/\/$/, "");

  return { vendorKey, providerKey, envType, appOrigin };
}

export function resolveIframeDomain(clientDomain?: string): string | null {
  const override = process.env.FAWATERAK_IFRAME_DOMAIN?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }

  if (clientDomain?.trim()) {
    return clientDomain.trim().replace(/\/$/, "");
  }

  const secrets = getFawaterakSecrets();
  if (secrets?.appOrigin) {
    return secrets.appOrigin;
  }

  return null;
}

export function resolveHmacDomain(iframeDomain: string): string {
  if (process.env.FAWATERAK_HMAC_DOMAIN_MODE === "hostname-only") {
    try {
      return new URL(iframeDomain).hostname;
    } catch {
      return iframeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  }
  return iframeDomain;
}

export function buildIframeHashKey(
  vendorKey: string,
  providerKey: string,
  iframeDomain: string
): string {
  const hmacDomain = resolveHmacDomain(iframeDomain);
  return generateIframeHashKey(vendorKey, hmacDomain, providerKey);
}
