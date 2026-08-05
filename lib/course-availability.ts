export const STUDY_TYPE_CENTER = "سنتر";
export const STUDY_TYPE_ONLINE = "أون لاين";

export type CourseAvailabilityFields = {
  centerAvailableAt?: Date | string | null;
  onlineAvailableAt?: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStudyType(studyType?: string | null): "center" | "online" | null {
  if (!studyType) return null;
  const trimmed = studyType.trim();
  if (trimmed === STUDY_TYPE_CENTER || trimmed === "center") return "center";
  if (
    trimmed === STUDY_TYPE_ONLINE ||
    trimmed === "اونلاين" ||
    trimmed === "أونلاين" ||
    trimmed === "online"
  ) {
    return "online";
  }
  return null;
}

/** Release datetime for this student's study type (null = available immediately). */
export function getCourseReleaseAt(
  course: CourseAvailabilityFields,
  studyType?: string | null
): Date | null {
  const kind = normalizeStudyType(studyType);
  if (kind === "center") return toDate(course.centerAvailableAt);
  if (kind === "online") return toDate(course.onlineAvailableAt);
  // Unknown study type: use the later of the two if both set, else whichever exists
  const center = toDate(course.centerAvailableAt);
  const online = toDate(course.onlineAvailableAt);
  if (center && online) {
    return center.getTime() > online.getTime() ? center : online;
  }
  return center ?? online;
}

export function isCourseReleasedForStudyType(
  course: CourseAvailabilityFields,
  studyType?: string | null,
  now: Date = new Date()
): boolean {
  const releaseAt = getCourseReleaseAt(course, studyType);
  if (!releaseAt) return true;
  return now.getTime() >= releaseAt.getTime();
}

export function formatCourseReleaseAt(date: Date | string): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

/** Value for `<input type="datetime-local" />` in the browser's local timezone */
export function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
