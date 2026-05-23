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

/** Staging (sandbox) — use with FAWATERAK_ENV=test and staging dashboard keys */
export const FAWATERAK_STAGING_ORIGIN = "https://staging.fawaterk.com";

/** Production */
export const FAWATERAK_LIVE_ORIGIN = "https://app.fawaterk.com";

/**
 * When true, checkout loads the plugin from staging.fawaterk.com (not app).
 * Set to false when going live with FAWATERAK_ENV=live.
 */
export const FAWATERAK_USE_STAGING_PLUGIN = true;

export function getFawaterakPluginScriptUrl(
  envType: "test" | "live" = "test"
): string {
  const origin =
    FAWATERAK_USE_STAGING_PLUGIN || envType !== "live"
      ? FAWATERAK_STAGING_ORIGIN
      : FAWATERAK_LIVE_ORIGIN;
  return `${origin}/fawaterkPlugin/fawaterkPlugin.min.js`;
}
