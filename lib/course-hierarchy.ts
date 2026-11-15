import { CourseType, Purchase, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getCourseProgressionState, getLearningMilestoneKeys, QUIZ_PASS_PERCENTAGE } from "@/lib/quiz-prerequisites";

export function isHierarchicalCourse(courseType?: CourseType): boolean {
  return courseType === "HIERARCHICAL";
}

export function getHierarchicalEntryHref(courseId: string): string {
  return `/courses/${courseId}/teachers`;
}

export function hasPublishedHierarchicalContent(
  courseTeachers?: {
    id: string;
    units: { id: string; contentItems: { id: string }[] }[];
  }[]
): boolean {
  if (!courseTeachers?.length) return false;
  return courseTeachers.some((teacher) =>
    teacher.units.some((unit) => unit.contentItems.length > 0)
  );
}

export async function getCourseHierarchy(courseId: string, publishedOnly = false) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      courseTeachers: {
        orderBy: { position: "asc" },
        include: {
          user: {
            select: { id: true, fullName: true, image: true },
          },
          units: {
            where: publishedOnly ? { isPublished: true } : undefined,
            orderBy: { position: "asc" },
            include: {
              contentItems: {
                where: publishedOnly ? { isPublished: true } : undefined,
                orderBy: { position: "asc" },
                include: {
                  quiz: {
                    select: {
                      id: true,
                      title: true,
                      isPublished: true,
                      isFree: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return course;
}

export async function getUnitWithCourse(unitId: string) {
  return db.unit.findUnique({
    where: { id: unitId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          price: true,
          courseType: true,
          isPublished: true,
        },
      },
      teacher: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
      contentItems: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              isPublished: true,
              isFree: true,
            },
          },
        },
      },
    },
  });
}

export async function resolveContentItemCourseId(contentItemId: string) {
  const item = await db.contentItem.findUnique({
    where: { id: contentItemId },
    select: {
      unit: {
        select: { courseId: true },
      },
    },
  });
  return item?.unit.courseId ?? null;
}

export async function getHierarchicalProgress(
  userId: string,
  courseId: string
): Promise<{ progress: number; total: number; completed: number }> {
  const state = await getCourseProgressionState(userId, courseId);
  const keys = getLearningMilestoneKeys(state.items);
  const totalKeys = new Set(keys.values());
  const completedKeys = new Set(state.items.filter((item) => state.completedIds.has(item.id)).map((item) => keys.get(item.id)!));
  // Preserve old standalone quizzes, counting a quiz only after it is passed.
  const standalone = await (db as PrismaClient).quiz.findMany({
    where: { courseId, isPublished: true, unitId: null, isGlobalShared: false, contentItems: { none: {} } },
    select: { id: true, quizResults: { where: { studentId: userId, percentage: { gte: QUIZ_PASS_PERCENTAGE } }, select: { id: true }, take: 1 } },
  });
  for (const quiz of standalone) {
    const key = `standalone:${quiz.id}`;
    totalKeys.add(key);
    if (quiz.quizResults.length) completedKeys.add(key);
  }
  const total = totalKeys.size;
  const completed = completedKeys.size;
  return { progress: total ? Math.round(completed / total * 100) : 0, total, completed };
}

export type CourseLinkInput = {
  id: string;
  price: number | null;
  courseType?: CourseType;
  chapters: { id: string }[];
  purchases: Pick<Purchase, "status">[];
  courseTeachers?: {
    id: string;
    units: { id: string; contentItems: { id: string }[] }[];
  }[];
};
