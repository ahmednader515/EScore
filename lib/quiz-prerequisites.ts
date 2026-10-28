import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { isEffectivelyReleased, type AvailabilityFields } from "@/lib/course-availability";

export const QUIZ_PASS_PERCENTAGE = 50;
const UNAVAILABLE = "المحتوى غير متاح بعد";

type ProgressionItem = AvailabilityFields & {
  id: string;
  title: string;
  type: string;
  quizId: string | null;
  unit: AvailabilityFields;
  quiz: { isPublished: boolean } | null;
  contentProgress: { isCompleted: boolean }[];
};

/** Items are ordered by unit, then by their position within that unit. */
export function buildTeacherProgression(
  items: ProgressionItem[],
  passedQuizIds: Set<string>,
  course: AvailabilityFields,
  studyType?: string | null,
  unifiedCompletedIds: Set<string> = new Set(),
): Map<string, string | null> {
  const errors = new Map<string, string | null>();
  let previousError: string | null = null;
  for (const item of items) {
    const published = item.type !== "ASSIGNMENT" || !item.quizId || item.quiz?.isPublished;
    if (!published) {
      errors.set(item.id, UNAVAILABLE);
      continue;
    }
    const released = isEffectivelyReleased([course, item.unit, item], studyType);
    errors.set(item.id, previousError ?? (released ? null : UNAVAILABLE));
    const completed = unifiedCompletedIds.has(item.id) || (item.type === "ASSIGNMENT" && item.quizId
      ? passedQuizIds.has(item.quizId)
      : item.contentProgress.some((progress) => progress.isCompleted));
    if (!previousError && (!released || !completed)) {
      previousError = item.type === "ASSIGNMENT" && item.quizId
        ? `يجب اجتياز الاختبار «${item.title}» بنسبة ${QUIZ_PASS_PERCENTAGE}% أو أكثر أولاً`
        : `أكمل «${item.title}» أولاً`;
    }
  }
  return errors;
}

type TeacherItem = ProgressionItem & { unit: AvailabilityFields & { teacherId: string | null } };

/** Match the nth video, PDF, or quiz across teacher paths, even if their units differ. */
export function getUnifiedCompletedIds(items: TeacherItem[], passedQuizIds: Set<string>, course: AvailabilityFields, studyType?: string | null) {
  const counters = new Map<string, Map<string, number>>();
  const keys = new Map<string, string>();
  const completedKeys = new Set<string>();
  for (const item of items) {
    if (!item.unit.teacherId || (item.quizId && !item.quiz?.isPublished)) continue;
    let teacherCounters = counters.get(item.unit.teacherId);
    if (!teacherCounters) {
      teacherCounters = new Map();
      counters.set(item.unit.teacherId, teacherCounters);
    }
    const kind = item.quizId ? "QUIZ" : item.type;
    const ordinal = (teacherCounters.get(kind) ?? 0) + 1;
    teacherCounters.set(kind, ordinal);
    const key = `${kind}:${ordinal}`;
    keys.set(item.id, key);
    const completed = item.quizId ? passedQuizIds.has(item.quizId) : item.contentProgress.some((progress) => progress.isCompleted);
    if (completed && isEffectivelyReleased([course, item.unit, item], studyType)) completedKeys.add(key);
  }
  return new Set(items.filter((item) => completedKeys.has(keys.get(item.id) ?? "")).map((item) => item.id));
}

/** Share progression credit within this course while retaining teacher-specific records. */
export async function getTeacherProgressionState(userId: string, courseId: string, teacherId: string | null) {
  const database = db as PrismaClient;
  const errors = new Map<string, string | null>();
  const completedIds = new Set<string>();
  if (!teacherId) return { errors, completedIds };
  const [course, user] = await Promise.all([
    database.course.findUnique({ where: { id: courseId } }),
    database.user.findUnique({ where: { id: userId }, select: { role: true, studyType: true } }),
  ]);
  if (!course || course.courseType !== "HIERARCHICAL" || user?.role === "ADMIN" || user?.role === "TEACHER") return { errors, completedIds };
  const items = await database.contentItem.findMany({
    where: { isPublished: true, unit: { courseId, teacherId: { not: null }, isPublished: true } },
    orderBy: [{ unit: { position: "asc" } }, { unitId: "asc" }, { position: "asc" }, { id: "asc" }],
    include: {
      unit: true,
      quiz: { select: { isPublished: true } },
      contentProgress: { where: { userId }, select: { isCompleted: true } },
    },
  });
  const quizIds = items.flatMap((item) => item.quizId ? [item.quizId] : []);
  const passed = quizIds.length ? await database.quizResult.findMany({
    where: { studentId: userId, quizId: { in: quizIds }, percentage: { gte: QUIZ_PASS_PERCENTAGE } },
    select: { quizId: true },
  }) : [];
  const passedIds = new Set(passed.map((result) => result.quizId));
  const unifiedCompletedIds = getUnifiedCompletedIds(items, passedIds, course, user?.studyType);
  return {
    errors: buildTeacherProgression(items.filter((item) => item.unit.teacherId === teacherId), passedIds, course, user?.studyType, unifiedCompletedIds),
    completedIds: unifiedCompletedIds,
  };
}

export async function getTeacherProgressionErrors(userId: string, courseId: string, teacherId: string | null) {
  return (await getTeacherProgressionState(userId, courseId, teacherId)).errors;
}

export async function getContentPrerequisiteError(userId: string, courseId: string, contentId: string) {
  const database = db as PrismaClient;
  const item = await database.contentItem.findFirst({
    where: { id: contentId, unit: { courseId } },
    include: { unit: { include: { course: true } } },
  });
  if (!item) return UNAVAILABLE;
  const user = await database.user.findUnique({ where: { id: userId }, select: { role: true, studyType: true } });
  if (user?.role === "ADMIN" || user?.role === "TEACHER") return null;
  if (!item.isPublished || !item.unit.isPublished || !item.unit.course.isPublished ||
    !isEffectivelyReleased([item.unit.course, item.unit, item], user?.studyType)) return UNAVAILABLE;
  const errors = await getTeacherProgressionErrors(userId, courseId, item.unit.teacherId);
  return errors.get(item.id) ?? null;
}

export async function getQuizPrerequisiteError(userId: string, courseId: string, quizId: string) {
  const database = db as PrismaClient;
  const item = await database.contentItem.findFirst({ where: { quizId, unit: { courseId } }, select: { id: true } });
  // Shared course quizzes do not participate in any teacher's sequence.
  return item ? getContentPrerequisiteError(userId, courseId, item.id) : null;
}
