import { CourseType, Purchase } from "@prisma/client";
import { db } from "@/lib/db";

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
  const [contentItems, sharedQuizzes] = await Promise.all([
    db.contentItem.findMany({
      where: {
        isPublished: true,
        unit: {
          isPublished: true,
          courseId,
        },
      },
      select: {
        id: true,
        type: true,
        quizId: true,
      },
    }),
    db.quiz.findMany({
      where: {
        courseId,
        isPublished: true,
        unitId: null,
      },
      select: { id: true },
    }),
  ]);

  const sharedQuizIds = sharedQuizzes.map((quiz) => quiz.id);
  const total = contentItems.length + sharedQuizIds.length;
  if (total === 0) {
    return { progress: 0, total: 0, completed: 0 };
  }

  const nonQuizIds = contentItems
    .filter((item) => item.type !== "ASSIGNMENT")
    .map((item) => item.id);

  const unitQuizIds = contentItems
    .filter((item) => item.type === "ASSIGNMENT" && item.quizId)
    .map((item) => item.quizId!)
    .filter(Boolean);

  const allQuizIds = Array.from(new Set([...unitQuizIds, ...sharedQuizIds]));

  const [completedContent, completedQuizResults] = await Promise.all([
    db.contentProgress.count({
      where: {
        userId,
        contentItemId: { in: nonQuizIds },
        isCompleted: true,
      },
    }),
    allQuizIds.length
      ? db.quizResult.findMany({
          where: {
            studentId: userId,
            quizId: { in: allQuizIds },
          },
          select: { quizId: true },
        })
      : Promise.resolve([] as { quizId: string }[]),
  ]);

  const completedQuizzes = new Set(completedQuizResults.map((r) => r.quizId)).size;
  const assignmentItemsWithoutQuiz = contentItems.filter(
    (item) => item.type === "ASSIGNMENT" && !item.quizId
  );

  const completedAssignmentsWithoutQuiz = assignmentItemsWithoutQuiz.length
    ? await db.contentProgress.count({
        where: {
          userId,
          contentItemId: {
            in: assignmentItemsWithoutQuiz.map((item) => item.id),
          },
          isCompleted: true,
        },
      })
    : 0;

  const completed =
    completedContent + completedQuizzes + completedAssignmentsWithoutQuiz;
  const progress = Math.round((completed / total) * 100);

  return { progress, total, completed };
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
