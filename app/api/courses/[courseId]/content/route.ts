import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEffectiveReleaseAt,
  isEffectivelyReleased,
} from "@/lib/course-availability";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const staff = isStaff(session?.user?.role);

    const [course, dbUser, chapters, quizzes] = await Promise.all([
      db.course.findUnique({
        where: { id: resolvedParams.courseId },
        select: {
          centerAvailableAt: true,
          onlineAvailableAt: true,
        },
      }),
      userId
        ? db.user.findUnique({
            where: { id: userId },
            select: { studyType: true },
          })
        : Promise.resolve(null),
      db.chapter.findMany({
        where: {
          courseId: resolvedParams.courseId,
          isPublished: true,
        },
        include: {
          userProgress: userId
            ? {
                where: { userId },
                select: { isCompleted: true },
              }
            : false,
        },
        orderBy: {
          position: "asc",
        },
      }),
      db.quiz.findMany({
        where: {
          courseId: resolvedParams.courseId,
          isPublished: true,
        },
        include: {
          quizResults: userId
            ? {
                where: { userId },
                select: {
                  id: true,
                  score: true,
                  totalPoints: true,
                  percentage: true,
                },
              }
            : {
                select: {
                  id: true,
                  score: true,
                  totalPoints: true,
                  percentage: true,
                },
              },
        },
        orderBy: {
          position: "asc",
        },
      }),
    ]);

    const studyType = dbUser?.studyType ?? null;
    const courseLayer = {
      centerAvailableAt: course?.centerAvailableAt ?? null,
      onlineAvailableAt: course?.onlineAvailableAt ?? null,
    };

    const allContent = [
      ...chapters.map((chapter) => {
        const chapterLayer = {
          centerAvailableAt: chapter.centerAvailableAt,
          onlineAvailableAt: chapter.onlineAvailableAt,
        };
        const released =
          staff ||
          isEffectivelyReleased([courseLayer, chapterLayer], studyType);
        const availableAt = released
          ? null
          : getEffectiveReleaseAt([courseLayer, chapterLayer], studyType);
        return {
          ...chapter,
          type: "chapter" as const,
          releaseLocked: !released,
          availableAt: availableAt?.toISOString() ?? null,
        };
      }),
      ...quizzes.map((quiz) => ({
        ...quiz,
        type: "quiz" as const,
      })),
    ].sort((a, b) => a.position - b.position);

    return NextResponse.json(allContent);
  } catch (error) {
    console.log("[COURSE_CONTENT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
