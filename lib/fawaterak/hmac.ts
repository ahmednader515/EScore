import crypto from "crypto";

export function generateIframeHashKey(
  vendorKey: string,
  domain: string,
  providerKey: string
): string {
  const queryParam = `Domain=${domain}&ProviderKey=${providerKey}`;
  return crypto.createHmac("sha256", vendorKey).update(queryParam).digest("hex");
}

export function generatePaidWebhookHashKey(
  vendorKey: string,
  invoiceId: number,
  invoiceKey: string,
  paymentMethod: string
): string {
  const queryParam = `InvoiceId=${invoiceId}&InvoiceKey=${invoiceKey}&PaymentMethod=${paymentMethod}`;
  return crypto.createHmac("sha256", vendorKey).update(queryParam).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
