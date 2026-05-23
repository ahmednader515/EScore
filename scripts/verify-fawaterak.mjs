/**
 * Run: node scripts/verify-fawaterak.mjs
 * Tests Fawaterak credentials + HMAC against staging (same as iframe plugin).
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
const envType = process.env.FAWATERAK_ENV?.trim().toLowerCase() === "live" ? "live" : "test";
const domain = process.env.FAWATERAK_TEST_DOMAIN?.trim() || "https://escore-lms.com";

if (!vendorKey || !providerKey) {
  console.error("Missing FAWATERAK_VENDOR_KEY or FAWATERAK_PROVIDER_KEY in .env");
  process.exit(1);
}

const base =
  envType === "live" ? "https://app.fawaterk.com" : "https://staging.fawaterk.com";

function hashFor(hmacDomain) {
  const q = `Domain=${hmacDomain}&ProviderKey=${providerKey}`;
  return crypto.createHmac("sha256", vendorKey).update(q).digest("hex");
}

const hostname = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
const hashFull = hashFor(`https://${hostname}`);
const hashHost = hashFor(hostname);

const paths = ["/api/v2/getPaymentmethods"];

async function tryCall(path, hashKey) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
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
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 200);
  }
  return { url, status: res.status, body: json };
}

console.log("envType:", envType, "base:", base);
console.log("domain:", `https://${hostname}`);
console.log("vendorKey length:", vendorKey.length);
console.log("providerKey:", providerKey);

for (const path of paths) {
  for (const [label, hash] of [
    ["full-url", hashFull],
    ["hostname", hashHost],
  ]) {
    try {
      const r = await tryCall(path, hash);
      console.log("\n---", path, label, "---");
      console.log("status:", r.status);
      console.log("body:", JSON.stringify(r.body, null, 2).slice(0, 500));
    } catch (e) {
      console.log(path, label, "error", e.message);
    }
  }
}
