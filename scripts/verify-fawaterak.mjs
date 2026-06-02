/**
 * Run: node scripts/verify-fawaterak.mjs
 * Tests Fawaterak credentials against app.fawaterk.com for each IFRAM domain candidate.
 */
import crypto from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

loadEnv();

const vendorKey = process.env.FAWATERAK_VENDOR_KEY?.trim() || "";
const providerKey = process.env.FAWATERAK_PROVIDER_KEY?.trim() || "";
const base = "https://app.fawaterk.com";

const seeds = [
  process.env.FAWATERAK_IFRAME_DOMAIN?.trim(),
  process.env.NEXT_PUBLIC_APP_URL?.trim(),
  process.env.FAWATERAK_TEST_DOMAIN?.trim(),
  "https://www.escore-lms.com",
  "https://escore-lms.com",
].filter(Boolean);

function normalize(domain) {
  const trimmed = domain.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `https://${new URL(trimmed).hostname}`;
  }
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

const domains = new Set();
for (const seed of seeds) {
  const d = normalize(seed);
  domains.add(d);
  try {
    const host = new URL(d).hostname;
    const apex = host.replace(/^www\./i, "");
    domains.add(normalize(`https://www.${apex}`));
    domains.add(normalize(`https://${apex}`));
  } catch {
    // skip
  }
}

if (!vendorKey || !providerKey) {
  console.error("Missing FAWATERAK_VENDOR_KEY or FAWATERAK_PROVIDER_KEY in .env");
  process.exit(1);
}

function hashFor(hmacDomain) {
  const q = `Domain=${hmacDomain}&ProviderKey=${providerKey}`;
  return crypto.createHmac("sha256", vendorKey).update(q).digest("hex");
}

async function tryDomain(iframeDomain) {
  const hostname = iframeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hashKey = hashFor(iframeDomain);
  const res = await fetch(`${base}/api/v2/getPaymentmethods`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${vendorKey}`,
      "FAWATERAK-HASH-KEY": hashKey,
      "FAWATERAK-DOMAIN": `https://${hostname}`,
      "DOMAIN-VERSION": "0",
    },
  });
  const body = await res.json().catch(() => ({}));
  const ok = body?.status === "success";
  const msg =
    body?.message?.token?.[0] ||
    (typeof body?.message === "string" ? body.message : `HTTP ${res.status}`);
  return { ok, msg };
}

console.log("Fawaterak verify —", base);
console.log("vendorKey length:", vendorKey.length);
console.log("providerKey prefix:", providerKey.slice(0, 12) + "...");

let anyOk = false;
for (const domain of domains) {
  const { ok, msg } = await tryDomain(domain);
  console.log(ok ? "OK  " : "FAIL", domain, "->", msg);
  if (ok) anyOk = true;
}

if (!anyOk) {
  console.log(
    "\nAll domains failed. Regenerate API Key + Provider Key on app.fawaterk.com (same Integrations page), register IFRAM domains, update Vercel, redeploy."
  );
  process.exit(1);
}

console.log("\nAt least one domain validated successfully.");
