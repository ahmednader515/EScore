import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildIframeHashKey, getFawaterakSecrets } from "@/lib/fawaterak/config";
import { getFawaterakPluginScriptUrl, FAWATERAK_ORIGIN } from "@/lib/fawaterak/constants";
import { listFawaterakIframeDomainCandidates } from "@/lib/fawaterak/domain-candidates";
import {
  resolveFawaterakCheckoutContext,
  resolveCanonicalIframeDomain,
} from "@/lib/fawaterak/resolve-checkout";
import { validateFawaterakIframeCredentials } from "@/lib/fawaterak/validate";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const secrets = getFawaterakSecrets();
  if (!secrets) {
    return NextResponse.json({
      configured: false,
      valid: false,
      message: "FAWATERAK_VENDOR_KEY or FAWATERAK_PROVIDER_KEY missing on this server.",
    });
  }

  const url = new URL(req.url);
  const clientDomain =
    url.searchParams.get("domain") ||
    process.env.FAWATERAK_IFRAME_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://www.escore-lms.com";

  const domainCandidates = listFawaterakIframeDomainCandidates(clientDomain);
  const domainTests: Record<string, { ok: boolean; message: string }> = {};

  for (const iframeDomain of domainCandidates) {
    const hashKey = buildIframeHashKey(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain
    );
    const result = await validateFawaterakIframeCredentials(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain,
      hashKey
    );
    domainTests[iframeDomain] = {
      ok: result.ok,
      message: result.ok ? "OK" : result.message,
    };
  }

  const resolved = await resolveFawaterakCheckoutContext(clientDomain);
  const anyDomainOk = Object.values(domainTests).some((t) => t.ok);

  return NextResponse.json({
    configured: true,
    valid: !("error" in resolved),
    anyDomainOk,
    resolvedEnvType: "error" in resolved ? null : resolved.envType,
    resolvedIframeDomain: "error" in resolved ? null : resolved.iframeDomain,
    resolvedError: "error" in resolved ? resolved.error : null,
    configuredEnvType: secrets.envType,
    fawaterakOrigin: FAWATERAK_ORIGIN,
    appOrigin: secrets.appOrigin || null,
    canonicalDomain: resolveCanonicalIframeDomain(clientDomain),
    clientDomainParam: clientDomain,
    domainCandidates,
    domainTests,
    vendorKeyLength: secrets.vendorKey.length,
    vendorKeyPreview: `${secrets.vendorKey.slice(0, 8)}...${secrets.vendorKey.slice(-6)}`,
    providerKeyPreview: secrets.providerKey.startsWith("FAWATERAK.")
      ? `FAWATERAK.${secrets.providerKey.slice(9, 13)}...`
      : `${secrets.providerKey.slice(0, 6)}...`,
    pluginScriptUrl: getFawaterakPluginScriptUrl(),
    checklist: [
      "On app.fawaterk.com → Integrations → Fawaterak: regenerate API Key and Provider Key together (same page).",
      "IFRAM Domains: add every URL you use, e.g. https://www.escore-lms.com and https://escore-lms.com (HTTPS, no trailing slash).",
      "Set FAWATERAK_VENDOR_KEY, FAWATERAK_PROVIDER_KEY, NEXT_PUBLIC_APP_URL on Vercel Production, then redeploy.",
      "Optional: FAWATERAK_IFRAME_DOMAIN exactly matching the IFRAM entry you use in the browser.",
      "If all domainTests fail with Invalid Token, the keys or vendor account are inactive — contact Fawaterak support.",
    ],
  });
}
