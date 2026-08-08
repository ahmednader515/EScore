export const STUDY_TYPE_CENTER = "سنتر";
export const STUDY_TYPE_ONLINE = "أون لاين";

/** Business timezone for release schedules (Egypt). Avoids VPS UTC vs local mismatch. */
export const APP_TIMEZONE = "Africa/Cairo";

export type AvailabilityFields = {
  centerAvailableAt?: Date | string | null;
  onlineAvailableAt?: Date | string | null;
};

/** @deprecated Prefer AvailabilityFields — kept for existing call sites */
export type CourseAvailabilityFields = AvailabilityFields;

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

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour") === "24" ? "0" : get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Offset (ms) such that: zonedWallClockAsUTC - instant = offset */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const z = getZonedParts(date, timeZone);
  const asUTC = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return asUTC - date.getTime();
}

/**
 * Parse `<input type="datetime-local" />` value as APP_TIMEZONE wall clock → UTC Date.
 * Example: "2026-08-10T10:00" means 10:00 in Cairo, not the browser/VPS local zone.
 */
export function parseDateTimeLocalAsAppTz(value: string): Date {
  const trimmed = value.trim();
  const [datePart, timePart = "00:00"] = trimmed.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s = 0] = timePart.split(":").map(Number);

  // First guess treating the wall time as if it were UTC, then correct by Cairo offset
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  let offset = getTimeZoneOffsetMs(new Date(utcMs), APP_TIMEZONE);
  utcMs = Date.UTC(y, mo - 1, d, h, mi, s || 0) - offset;

  // Second pass handles DST transitions
  offset = getTimeZoneOffsetMs(new Date(utcMs), APP_TIMEZONE);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s || 0) - offset);
}

/** Release datetime for this student's study type (null = available immediately). */
export function getEntityReleaseAt(
  entity: AvailabilityFields,
  studyType?: string | null
): Date | null {
  const kind = normalizeStudyType(studyType);
  if (kind === "center") return toDate(entity.centerAvailableAt);
  if (kind === "online") return toDate(entity.onlineAvailableAt);
  // Unknown study type: use the later of the two if both set, else whichever exists
  const center = toDate(entity.centerAvailableAt);
  const online = toDate(entity.onlineAvailableAt);
  if (center && online) {
    return center.getTime() > online.getTime() ? center : online;
  }
  return center ?? online;
}

export function getCourseReleaseAt(
  course: AvailabilityFields,
  studyType?: string | null
): Date | null {
  return getEntityReleaseAt(course, studyType);
}

export function isEntityReleasedForStudyType(
  entity: AvailabilityFields,
  studyType?: string | null,
  now: Date = new Date()
): boolean {
  const releaseAt = getEntityReleaseAt(entity, studyType);
  if (!releaseAt) return true;
  return now.getTime() >= releaseAt.getTime();
}

export function isCourseReleasedForStudyType(
  course: AvailabilityFields,
  studyType?: string | null,
  now: Date = new Date()
): boolean {
  return isEntityReleasedForStudyType(course, studyType, now);
}

/**
 * Effective release = latest of all non-null layer dates for this study type.
 * Layers typically: [course, unit, contentItem]
 */
export function getEffectiveReleaseAt(
  layers: AvailabilityFields[],
  studyType?: string | null
): Date | null {
  let latest: Date | null = null;
  for (const layer of layers) {
    const at = getEntityReleaseAt(layer, studyType);
    if (!at) continue;
    if (!latest || at.getTime() > latest.getTime()) {
      latest = at;
    }
  }
  return latest;
}

export function isEffectivelyReleased(
  layers: AvailabilityFields[],
  studyType?: string | null,
  now: Date = new Date()
): boolean {
  const releaseAt = getEffectiveReleaseAt(layers, studyType);
  if (!releaseAt) return true;
  return now.getTime() >= releaseAt.getTime();
}

/** Always show times in Egypt (Africa/Cairo), including on a UTC VPS. */
export function formatCourseReleaseAt(date: Date | string): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(d);
}

/** Value for `<input type="datetime-local" />` in APP_TIMEZONE (not browser/VPS local). */
export function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  const z = getZonedParts(d, APP_TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${z.year}-${pad(z.month)}-${pad(z.day)}T${pad(z.hour)}:${pad(z.minute)}`;
}

/** Normalize PATCH body date fields to Date | null for Prisma */
export function normalizeAvailabilityPatch(
  body: Record<string, unknown>
): { centerAvailableAt?: Date | null; onlineAvailableAt?: Date | null } {
  const out: { centerAvailableAt?: Date | null; onlineAvailableAt?: Date | null } = {};
  if ("centerAvailableAt" in body) {
    out.centerAvailableAt = body.centerAvailableAt
      ? new Date(body.centerAvailableAt as string)
      : null;
  }
  if ("onlineAvailableAt" in body) {
    out.onlineAvailableAt = body.onlineAvailableAt
      ? new Date(body.onlineAvailableAt as string)
      : null;
  }
  return out;
}
