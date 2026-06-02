import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildIframeHashKey, getFawaterakSecrets } from "@/lib/fawaterak/config";
import { getFawaterakPluginScriptUrl } from "@/lib/fawaterak/constants";
import {
  resolveFawaterakCheckoutContext,
  resolveIframeDomainForHmac,
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
  const iframeDomain =
    resolveIframeDomainForHmac(clientDomain) || clientDomain;

  const hashKey = buildIframeHashKey(
    secrets.vendorKey,
    secrets.providerKey,
    iframeDomain
  );
  const liveTest = await validateFawaterakIframeCredentials(
    secrets.vendorKey,
    secrets.providerKey,
    iframeDomain,
    hashKey
  );

  const resolved = await resolveFawaterakCheckoutContext(clientDomain);

  return NextResponse.json({
    configured: true,
    valid: !("error" in resolved),
    resolvedEnvType: "error" in resolved ? null : resolved.envType,
    resolvedError: "error" in resolved ? resolved.error : null,
    configuredEnvType: secrets.envType,
    appOrigin: secrets.appOrigin || null,
    iframeDomainForHmac: iframeDomain,
    clientDomainParam: clientDomain,
    vendorKeyLength: secrets.vendorKey.length,
    vendorKeyPreview: `${secrets.vendorKey.slice(0, 8)}...${secrets.vendorKey.slice(-6)}`,
    providerKey: secrets.providerKey,
    pluginScriptUrl: getFawaterakPluginScriptUrl(),
    fawaterakOrigin: "https://app.fawaterk.com",
    liveCredentialTest: {
      ok: liveTest.ok,
      message: liveTest.ok ? "OK" : liveTest.message,
    },
  });
}
