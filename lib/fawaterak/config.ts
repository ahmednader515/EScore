import { generateIframeHashKey } from "./hmac";
import {
  FAWATERAK_LIVE_ORIGIN,
  FAWATERAK_ORIGIN,
  getFawaterakPluginScriptUrl,
} from "./constants";

export type FawaterakEnvType = "live";

export { FAWATERAK_LIVE_ORIGIN, FAWATERAK_ORIGIN, getFawaterakPluginScriptUrl };

function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r/g, "");
}

export function getFawaterakSecrets() {
  const vendorKey =
    cleanEnvValue(process.env.FAWATERAK_VENDOR_KEY) ||
    cleanEnvValue(process.env.FAWATERAK_API_KEY);
  const providerKey = cleanEnvValue(process.env.FAWATERAK_PROVIDER_KEY);

  if (!vendorKey || !providerKey) {
    return null;
  }

  const envType: FawaterakEnvType = "live";

  const appOrigin = (
    cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanEnvValue(process.env.NEXTAUTH_URL)
  ).replace(/\/$/, "");

  return { vendorKey, providerKey, envType, appOrigin };
}

/** Normalize to https://hostname (matches Fawaterak plugin FAWATERAK-DOMAIN header) */
export function normalizeIframeDomain(domain: string): string {
  const trimmed = domain.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return `https://${url.hostname}`;
    } catch {
      return trimmed;
    }
  }
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

export function resolveAppOrigin(): string {
  const secrets = getFawaterakSecrets();
  return (secrets?.appOrigin || "").replace(/\/$/, "");
}

/**
 * HMAC Domain= value — must be full https://hostname (NOT hostname alone).
 * Using hostname-only causes "Invalid Token or inactive vendor" from Fawaterak.
 */
export function resolveHmacDomain(iframeDomain: string): string {
  return normalizeIframeDomain(iframeDomain);
}

export function buildIframeHashKey(
  vendorKey: string,
  providerKey: string,
  iframeDomain: string
): string {
  const hmacDomain = resolveHmacDomain(iframeDomain);
  return generateIframeHashKey(vendorKey, hmacDomain, providerKey);
}
