import { normalizeIframeDomain } from "./config";

/**
 * Pick IFRAM/HMAC domain: env canonical URL first, then browser (local dev).
 */
export function resolveCanonicalIframeDomain(clientDomain?: string): string | null {
  const fromEnv =
    process.env.FAWATERAK_IFRAME_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return normalizeIframeDomain(fromEnv);
  }
  if (clientDomain?.trim()) {
    return normalizeIframeDomain(clientDomain);
  }
  return null;
}

function apexHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

/** Exact host or same apex (www.escore-lms.com ≡ escore-lms.com). */
export function hostnamesMatch(a: string, b: string): boolean {
  try {
    const ha = new URL(normalizeIframeDomain(a)).hostname;
    const hb = new URL(normalizeIframeDomain(b)).hostname;
    return ha === hb || apexHostname(ha) === apexHostname(hb);
  } catch {
    return false;
  }
}

/** Domain sent to Fawaterak HMAC — must match IFRAM Domains in the dashboard exactly. */
export function resolveIframeDomainForHmac(clientDomain?: string): string | null {
  const fromEnv = resolveCanonicalIframeDomain(clientDomain);
  if (!fromEnv) return null;
  const clientNorm = clientDomain?.trim()
    ? normalizeIframeDomain(clientDomain)
    : null;
  if (
    clientNorm &&
    clientNorm !== fromEnv &&
    hostnamesMatch(clientNorm, fromEnv)
  ) {
    return clientNorm;
  }
  return fromEnv;
}
