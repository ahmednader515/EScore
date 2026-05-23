import { generateIframeHashKey } from "./hmac";
import {
  FAWATERAK_LIVE_ORIGIN,
  FAWATERAK_STAGING_ORIGIN,
  getFawaterakPluginScriptUrl,
} from "./constants";

export type FawaterakEnvType = "test" | "live";

export { FAWATERAK_STAGING_ORIGIN, FAWATERAK_LIVE_ORIGIN, getFawaterakPluginScriptUrl };

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

/**
 * Domain used for iframe HMAC — must match what the plugin sends:
 * https:// + window.location.hostname
 */
export function resolveIframeDomain(clientDomain?: string): string | null {
  if (clientDomain?.trim()) {
    return normalizeIframeDomain(clientDomain);
  }

  const override = process.env.FAWATERAK_IFRAME_DOMAIN?.trim();
  if (override) {
    return normalizeIframeDomain(override);
  }

  const secrets = getFawaterakSecrets();
  if (secrets?.appOrigin) {
    return normalizeIframeDomain(secrets.appOrigin);
  }

  return null;
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
