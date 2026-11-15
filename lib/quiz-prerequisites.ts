import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { isEffectivelyReleased, type AvailabilityFields } from "@/lib/course-availability";
import { embedSharedAssessments, getSharedAssessments, sharedAssessmentItemId } from "@/lib/shared-assessments";

export const QUIZ_PASS_PERCENTAGE = 50;
const UNAVAILABLE = "المحتوى غير متاح بعد";

type ProgressionItem = AvailabilityFields & {
  id: string;
  title: string;
  type: string;
  quizId: string | null;
  unit: AvailabilityFields & { isPublished?: boolean };
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
    const released = item.unit.isPublished !== false && isEffectivelyReleased([course, item.unit, item], studyType);
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

type TeacherItem = ProgressionItem & { isGlobalShared?: boolean; unit: AvailabilityFields & { teacherId: string | null; position?: number } };

/** Match content within the same numbered unit; shared exams retain their exact identity. */
export function getLearningMilestoneKeys(items: TeacherItem[]) {
  const counters = new Map<string, Map<string, number>>();
  const keys = new Map<string, string>();
  for (const item of items) {
    if (!item.unit.teacherId || (item.quizId && !item.quiz?.isPublished)) continue;
    let teacherCounters = counters.get(item.unit.teacherId);
    if (!teacherCounters) {
      teacherCounters = new Map();
      counters.set(item.unit.teacherId, teacherCounters);
    }
    // Global assessments can only be credited by passing this exact quiz.
    if (item.isGlobalShared && item.quizId) {
      keys.set(item.id, `SHARED:${item.quizId}`);
      continue;
    }
    const kind = `${item.unit.position ?? 0}:${item.quizId ? "QUIZ" : item.type}`;
    const ordinal = (teacherCounters.get(kind) ?? 0) + 1;
    teacherCounters.set(kind, ordinal);
    const key = `${kind}:${ordinal}`;
    keys.set(item.id, key);
  }
  return keys;
}

export function getUnifiedCompletedIds(items: TeacherItem[], passedQuizIds: Set<string>, course: AvailabilityFields, studyType?: string | null) {
  const keys = getLearningMilestoneKeys(items);
  const completedKeys = new Set<string>();
  for (const item of items) {
    const key = keys.get(item.id);
    if (!key) continue;
    const completed = item.quizId ? passedQuizIds.has(item.quizId) : item.contentProgress.some((progress) => progress.isCompleted);
    if (completed && item.unit.isPublished !== false && isEffectivelyReleased([course, item.unit, item], studyType)) completedKeys.add(key);
  }
  return new Set(items.filter((item) => completedKeys.has(keys.get(item.id) ?? "")).map((item) => item.id));
}

/** Share progression credit within this course while retaining teacher-specific records. */
export async function getCourseProgressionState(userId: string, courseId: string) {
  const database = db as PrismaClient;
  const empty = { errorsByTeacher: new Map<string, Map<string, string | null>>(), completedIds: new Set<string>(), items: [] as TeacherItem[] };
  const [course, user] = await Promise.all([
    database.course.findUnique({ where: { id: courseId } }),
    database.user.findUnique({ where: { id: userId }, select: { role: true, studyType: true } }),
  ]);
  if (!course || !course.isPublished || course.courseType !== "HIERARCHICAL" || user?.role === "ADMIN" || user?.role === "TEACHER") return empty;
  const [teacherItems, sharedQuizzes, units] = await Promise.all([database.contentItem.findMany({
    where: { isPublished: true, unit: { courseId, teacherId: { not: null }, isPublished: true } },
    orderBy: [{ unit: { position: "asc" } }, { unitId: "asc" }, { position: "asc" }, { id: "asc" }],
    include: {
      unit: true,
      quiz: { select: { isPublished: true } },
      contentProgress: { where: { userId }, select: { isCompleted: true } },
    },
  }), getSharedAssessments(courseId, userId), database.unit.findMany({
    where: { courseId, teacherId: { not: null } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  })]);
  // A missing/unpublished milestone unit must not let a later unit bypass its exam.
  const teacherIds = [...new Set(units.map((unit) => unit.teacherId).filter((id): id is string => !!id))];
  for (const teacherId of teacherIds) {
    for (const quiz of sharedQuizzes) {
      if (quiz.sharedUnitPosition === null || units.some((unit) => unit.teacherId === teacherId && unit.position === quiz.sharedUnitPosition)) continue;
      units.push({ ...units.find((unit) => unit.teacherId === teacherId)!,
        id: `missing:${teacherId}:${quiz.sharedUnitPosition}`, position: quiz.sharedUnitPosition, isPublished: false });
    }
  }
  units.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const items = units.flatMap((unit) => embedSharedAssessments(
    teacherItems.filter((item) => item.unitId === unit.id), unit, sharedQuizzes,
  ).map((item) => ({ ...item, unit })));
  const quizIds = items.flatMap((item) => item.quizId ? [item.quizId] : []);
  const passed = quizIds.length ? await database.quizResult.findMany({
    where: { studentId: userId, quizId: { in: quizIds }, percentage: { gte: QUIZ_PASS_PERCENTAGE } },
    select: { quizId: true },
  }) : [];
  const passedIds = new Set(passed.map((result) => result.quizId));
  const unifiedCompletedIds = getUnifiedCompletedIds(items, passedIds, course, user?.studyType);
  const errorsByTeacher = new Map(teacherIds.map((teacherId) => [teacherId,
    buildTeacherProgression(items.filter((item) => item.unit.teacherId === teacherId), passedIds, course, user?.studyType, unifiedCompletedIds),
  ]));
  return { errorsByTeacher, completedIds: unifiedCompletedIds, items };
}

export async function getTeacherProgressionState(userId: string, courseId: string, teacherId: string | null) {
  if (!teacherId) return { errors: new Map<string, string | null>(), completedIds: new Set<string>() };
  const state = await getCourseProgressionState(userId, courseId);
  return { errors: state.errorsByTeacher.get(teacherId) ?? new Map<string, string | null>(), completedIds: state.completedIds };
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
  const quiz = await database.quiz.findFirst({ where: { id: quizId, courseId }, select: { isGlobalShared: true, sharedUnitPosition: true } });
  if (quiz?.isGlobalShared) {
    const user = await database.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === "ADMIN" || user?.role === "TEACHER") return null;
    const units = await database.unit.findMany({ where: { courseId, position: quiz.sharedUnitPosition!, teacherId: { not: null }, isPublished: true } });
    const state = await getCourseProgressionState(userId, courseId);
    let error = UNAVAILABLE;
    for (const unit of units) {
      const errors = state.errorsByTeacher.get(unit.teacherId!);
      const id = sharedAssessmentItemId(quizId, unit.id);
      if (errors?.has(id) && errors.get(id) === null) return null;
      error = errors?.get(id) ?? error;
    }
    return error;
  }
  const item = await database.contentItem.findFirst({ where: { quizId, unit: { courseId } }, select: { id: true } });
  // Legacy standalone quizzes remain available outside teacher sequences.
  return item ? getContentPrerequisiteError(userId, courseId, item.id) : null;
}
