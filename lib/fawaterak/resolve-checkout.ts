import {
  buildIframeHashKey,
  getFawaterakSecrets,
  normalizeIframeDomain,
  type FawaterakEnvType,
} from "./config";
import { listFawaterakIframeDomainCandidates } from "./domain-candidates";
import {
  hostnamesMatch,
  resolveCanonicalIframeDomain,
} from "./iframe-domain";
import { validateFawaterakIframeCredentials } from "./validate";

export type FawaterakCheckoutContext = {
  secrets: NonNullable<ReturnType<typeof getFawaterakSecrets>>;
  iframeDomain: string;
  envType: FawaterakEnvType;
  hashKey: string;
};

export {
  hostnamesMatch,
  resolveCanonicalIframeDomain,
  resolveIframeDomainForHmac,
} from "./iframe-domain";

export async function resolveFawaterakCheckoutContext(
  clientDomain?: string
): Promise<FawaterakCheckoutContext | { error: string }> {
  const secrets = getFawaterakSecrets();
  if (!secrets) {
    return { error: "Fawaterak is not configured on this server (missing env vars)." };
  }

  const iframeDomainFromEnv = resolveCanonicalIframeDomain(clientDomain);
  if (!iframeDomainFromEnv) {
    return { error: "Missing iframe domain. Set NEXT_PUBLIC_APP_URL or FAWATERAK_IFRAME_DOMAIN" };
  }

  const clientNorm = clientDomain?.trim()
    ? normalizeIframeDomain(clientDomain)
    : null;
  if (clientNorm && !hostnamesMatch(clientNorm, iframeDomainFromEnv)) {
    return {
      error: `يجب فتح الموقع من ${iframeDomainFromEnv} (أنت على ${clientNorm}). الدومين يجب أن يطابق IFRAM Domains في فواتيرك.`,
    };
  }

  const domainCandidates = listFawaterakIframeDomainCandidates(clientDomain);
  if (domainCandidates.length === 0) {
    return { error: "Missing iframe domain. Set NEXT_PUBLIC_APP_URL or FAWATERAK_IFRAME_DOMAIN" };
  }

  const envType: FawaterakEnvType = "live";
  let lastMessage =
    "Invalid Token or inactive vendor. Regenerate API Key + Provider Key together on app.fawaterk.com (Integrations → Fawaterak), add your site under IFRAM Domains, then update Vercel env and redeploy.";

  for (const iframeDomain of domainCandidates) {
    const hashKey = buildIframeHashKey(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain
    );
    const validation = await validateFawaterakIframeCredentials(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain,
      hashKey
    );

    if (validation.ok) {
      return { secrets, iframeDomain, envType, hashKey };
    }

    if (validation.message) {
      lastMessage = validation.message;
    }
  }

  return { error: lastMessage };
}
