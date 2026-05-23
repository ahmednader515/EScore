import {
  buildIframeHashKey,
  getFawaterakSecrets,
  normalizeIframeDomain,
  type FawaterakEnvType,
} from "./config";
import { validateFawaterakIframeCredentials } from "./validate";

export type FawaterakCheckoutContext = {
  secrets: NonNullable<ReturnType<typeof getFawaterakSecrets>>;
  iframeDomain: string;
  envType: FawaterakEnvType;
  hashKey: string;
};

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

export function hostnamesMatch(a: string, b: string): boolean {
  try {
    return new URL(normalizeIframeDomain(a)).hostname === new URL(normalizeIframeDomain(b)).hostname;
  } catch {
    return false;
  }
}

/** Try test then live — fixes wrong FAWATERAK_ENV on Vercel. */
export async function resolveFawaterakCheckoutContext(
  clientDomain?: string
): Promise<FawaterakCheckoutContext | { error: string }> {
  const secrets = getFawaterakSecrets();
  if (!secrets) {
    return { error: "Fawaterak is not configured on this server (missing env vars)." };
  }

  const iframeDomain = resolveCanonicalIframeDomain(clientDomain);
  if (!iframeDomain) {
    return { error: "Missing iframe domain. Set NEXT_PUBLIC_APP_URL=https://escore-lms.com" };
  }

  const clientNorm = clientDomain?.trim()
    ? normalizeIframeDomain(clientDomain)
    : null;
  if (clientNorm && !hostnamesMatch(clientNorm, iframeDomain)) {
    return {
      error: `يجب فتح الموقع من ${iframeDomain} (أنت على ${clientNorm}). الدومين يجب أن يطابق IFRAM Domains في فواتيرك.`,
    };
  }

  const order: FawaterakEnvType[] =
    secrets.envType === "live" ? ["live", "test"] : ["test", "live"];

  for (const envType of order) {
    const hashKey = buildIframeHashKey(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain
    );
    const validation = await validateFawaterakIframeCredentials(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain,
      hashKey,
      envType
    );
    if (validation.ok) {
      return { secrets, iframeDomain, envType, hashKey };
    }
  }

  return {
    error:
      "Invalid Token or inactive vendor. Keys work only on staging OR live — check FAWATERAK_ENV and copy keys from the matching Fawaterak dashboard.",
  };
}
