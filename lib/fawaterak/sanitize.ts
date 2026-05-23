/** Allow only same-origin internal paths for post-payment redirects */
export function sanitizeInternalNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") {
    return "/dashboard/balance";
  }

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard/balance";
  }

  return trimmed;
}
