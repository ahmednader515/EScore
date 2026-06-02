export const FAWATERAK_DEPOSIT_KIND = {
  BALANCE_TOPUP: "BALANCE_TOPUP",
} as const;

export const FAWATERAK_DEPOSIT_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export const FAWATERAK_MIN_AMOUNT_EGP = 1;
export const FAWATERAK_MAX_AMOUNT_EGP = 200_000;

export const FAWATERAK_ALLOWED_ROLES = ["USER", "TEACHER", "ADMIN"] as const;

export const DASHBOARD_BALANCE_PATH = "/dashboard/balance";

/** Public routes (no auth) — Fawaterak redirects here after payment; page breaks out of iframe. */
export const FAWATERAK_BALANCE_RETURN_PATHS = {
  success: "/balance-payment-return/success",
  fail: "/balance-payment-return/fail",
  pending: "/balance-payment-return/pending",
} as const;

export type FawaterakBalanceReturnStatus = keyof typeof FAWATERAK_BALANCE_RETURN_PATHS;

export function fawaterakBalanceReturnTarget(
  status: FawaterakBalanceReturnStatus
): string {
  const topup =
    status === "success" ? "success" : status === "fail" ? "failed" : "pending";
  return `${DASHBOARD_BALANCE_PATH}?topup=${topup}`;
}

/** Staging (sandbox) — use with FAWATERAK_ENV=test and staging dashboard keys */
export const FAWATERAK_STAGING_ORIGIN = "https://staging.fawaterk.com";

/** Production */
export const FAWATERAK_LIVE_ORIGIN = "https://app.fawaterk.com";

export function getFawaterakPluginScriptUrl(
  envType: "test" | "live" = "test"
): string {
  const origin =
    envType === "live" ? FAWATERAK_LIVE_ORIGIN : FAWATERAK_STAGING_ORIGIN;
  return `${origin}/fawaterkPlugin/fawaterkPlugin.min.js`;
}
