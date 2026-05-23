import {
  FAWATERAK_LIVE_ORIGIN,
  FAWATERAK_STAGING_ORIGIN,
  type FawaterakEnvType,
} from "./config";

const PAYMENT_METHODS_PATH = "/api/v2/getPaymentmethods";

export type FawaterakValidateResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Same request the iframe plugin makes on load — used to fail fast with a clear error.
 */
export async function validateFawaterakIframeCredentials(
  vendorKey: string,
  providerKey: string,
  iframeDomain: string,
  hashKey: string,
  envType: FawaterakEnvType
): Promise<FawaterakValidateResult> {
  const base =
    envType === "live" ? FAWATERAK_LIVE_ORIGIN : FAWATERAK_STAGING_ORIGIN;

  try {
    const hostname = iframeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const res = await fetch(`${base}${PAYMENT_METHODS_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${vendorKey}`,
        "FAWATERAK-HASH-KEY": hashKey,
        "FAWATERAK-DOMAIN": `https://${hostname}`,
        "DOMAIN-VERSION": "0",
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.status === "success") {
      return { ok: true };
    }

    const tokenMsg = data?.message?.token;
    if (Array.isArray(tokenMsg) && tokenMsg[0]) {
      return { ok: false, message: String(tokenMsg[0]) };
    }

    if (typeof data?.message === "string") {
      return { ok: false, message: data.message };
    }

    return {
      ok: false,
      message: `Fawaterak rejected credentials (HTTP ${res.status}). Check API key, provider key, IFRAM domain, and FAWATERAK_ENV.`,
    };
  } catch (error) {
    console.error("[FAWATERAK_VALIDATE]", error);
    return {
      ok: false,
      message: "Could not reach Fawaterak. Try again later.",
    };
  }
}
