export const STUDENT_VIEW_COOKIE = "escore_student_view";

export function isStudentViewEnabled(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): boolean {
  return cookieStore.get(STUDENT_VIEW_COOKIE)?.value === "1";
}

export function parseStudentViewCookieHeader(
  cookieHeader: string | null | undefined
): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${STUDENT_VIEW_COOKIE}=1`);
}
