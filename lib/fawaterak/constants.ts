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

/** Production Fawaterak host (dashboard, API, iframe plugin). */
export const FAWATERAK_LIVE_ORIGIN = "https://app.fawaterk.com";

export const FAWATERAK_ORIGIN = FAWATERAK_LIVE_ORIGIN;

export function getFawaterakPluginScriptUrl(): string {
  return `${FAWATERAK_ORIGIN}/fawaterkPlugin/fawaterkPlugin.min.js`;
}
