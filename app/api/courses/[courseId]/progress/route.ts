import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getHierarchicalProgress } from "@/lib/course-hierarchy";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    const { courseId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { courseType: true },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (course.courseType === "HIERARCHICAL") {
      const { progress } = await getHierarchicalProgress(userId, courseId);
      return NextResponse.json({ progress });
    }

    const { progress } = await getFlatCourseProgress(userId, courseId);
    return NextResponse.json({ progress });
  } catch (error) {
    console.log("[PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

async function getFlatCourseProgress(userId: string, courseId: string) {
  const [totalChapters, totalQuizzes] = await Promise.all([
    db.chapter.count({
      where: { courseId, isPublished: true },
    }),
    db.quiz.count({
      where: { courseId, isPublished: true, unitId: null },
    }),
  ]);

  const totalContent = totalChapters + totalQuizzes;

  const completedChapters = await db.userProgress.count({
    where: {
      userId,
      chapter: { courseId },
      isCompleted: true,
    },
  });

  const completedQuizResults = await db.quizResult.findMany({
    where: {
      studentId: userId,
      quiz: { courseId, isPublished: true, unitId: null },
    },
    select: { quizId: true },
  });

  const uniqueQuizIds = new Set(completedQuizResults.map((r) => r.quizId));
  const completedContent = completedChapters + uniqueQuizIds.size;
  const progress =
    totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0;

  return { progress };
}
