import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isEffectivelyReleased } from "@/lib/course-availability";

export const SELECT_TEACHER_MESSAGE = "اختر المدرس أولاً ثم أكمل دروسه لفتح الاختبار";
export const COMPLETE_LESSONS_MESSAGE = "أكمل الدروس السابقة لهذا الاختبار عند المدرس المحدد أولاً";

/** Unit exams follow curriculum order. Shared exams conclude the selected teacher's path. */
export async function getQuizPrerequisiteError(userId: string, courseId: string, quizId: string) {
  const database = db as PrismaClient;
  const course = await database.course.findUnique({ where: { id: courseId } });
  if (!course || course.courseType !== "HIERARCHICAL") return null;

  const user = await database.user.findUnique({ where: { id: userId }, select: { role: true, studyType: true } });
  if (user?.role === "ADMIN" || user?.role === "TEACHER") return null;
  if (!course.isPublished || !isEffectivelyReleased([course], user?.studyType)) return COMPLETE_LESSONS_MESSAGE;

  const linkedItem = await database.contentItem.findFirst({
    where: { quizId, unit: { courseId } },
    include: { unit: true },
  });
  const cookieStore = await cookies();
  const teacherId = linkedItem?.unit.teacherId ?? cookieStore.get(`course-teacher-${userId}-${courseId}`)?.value;
  if (!teacherId) return SELECT_TEACHER_MESSAGE;
  const teacher = await database.courseTeacher.findFirst({ where: { id: teacherId, courseId }, select: { id: true } });
  if (!teacher) return SELECT_TEACHER_MESSAGE;
  if (linkedItem && (!linkedItem.isPublished || !linkedItem.unit.isPublished ||
    !isEffectivelyReleased([course, linkedItem.unit, linkedItem], user?.studyType))) return COMPLETE_LESSONS_MESSAGE;

  const lessons = await database.contentItem.findMany({
    where: {
      isPublished: true,
      type: { not: "ASSIGNMENT" },
      unit: { courseId, teacherId, isPublished: true },
      ...(linkedItem ? { OR: [
        { unit: { position: { lt: linkedItem.unit.position } } },
        { unitId: linkedItem.unitId, position: { lt: linkedItem.position } },
      ] } : {}),
    },
    include: { unit: true, contentProgress: { where: { userId, isCompleted: true }, select: { id: true } } },
  });
  return lessons.some((lesson) => !lesson.contentProgress.length ||
    !isEffectivelyReleased([course, lesson.unit, lesson], user?.studyType))
    ? COMPLETE_LESSONS_MESSAGE : null;
}
