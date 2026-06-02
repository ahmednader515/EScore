import { normalizeIframeDomain } from "./config";
import {
  resolveCanonicalIframeDomain,
  resolveIframeDomainForHmac,
} from "./iframe-domain";

/**
 * IFRAM/HMAC domains to try — must match entries in Fawaterak dashboard exactly.
 * Includes www/non-www variants when env and browser host share the same apex.
 */
export function listFawaterakIframeDomainCandidates(
  clientDomain?: string
): string[] {
  const out: string[] = [];

  const explicit = process.env.FAWATERAK_IFRAME_DOMAIN?.trim();
  if (explicit) {
    out.push(normalizeIframeDomain(explicit));
  }

  const forHmac = resolveIframeDomainForHmac(clientDomain);
  if (forHmac) out.push(forHmac);

  const canonical = resolveCanonicalIframeDomain(clientDomain);
  if (canonical) out.push(canonical);

  if (clientDomain?.trim()) {
    out.push(normalizeIframeDomain(clientDomain));
  }

  for (const d of [...out]) {
    try {
      const host = new URL(d).hostname;
      const apex = host.replace(/^www\./i, "");
      out.push(normalizeIframeDomain(`https://www.${apex}`));
      out.push(normalizeIframeDomain(`https://${apex}`));
    } catch {
      // skip invalid
    }
  }

  return [...new Set(out)];
}
