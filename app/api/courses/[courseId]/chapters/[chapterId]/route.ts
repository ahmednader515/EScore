import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessChapter } from "@/lib/course-access";
import {
  getEffectiveReleaseAt,
  isEffectivelyReleased,
  normalizeAvailabilityPatch,
} from "@/lib/course-availability";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [chapter, dbUser] = await Promise.all([
      db.chapter.findUnique({
        where: {
          id: chapterId,
          courseId: courseId,
        },
        include: {
          course: {
            select: {
              userId: true,
              price: true,
              grade: true,
              centerAvailableAt: true,
              onlineAvailableAt: true,
              purchases: {
                where: { userId },
              },
            },
          },
          userProgress: {
            where: {
              userId,
            },
          },
          attachments: {
            orderBy: {
              position: "asc",
            },
          },
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { studyType: true, role: true },
      }),
    ]);

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    const staff = isStaff(session.user.role);
    const studyType = dbUser?.studyType ?? null;
    const courseLayer = {
      centerAvailableAt: chapter.course.centerAvailableAt,
      onlineAvailableAt: chapter.course.onlineAvailableAt,
    };
    const chapterLayer = {
      centerAvailableAt: chapter.centerAvailableAt,
      onlineAvailableAt: chapter.onlineAvailableAt,
    };
    const released =
      staff || isEffectivelyReleased([courseLayer, chapterLayer], studyType);
    const availableAt = released
      ? null
      : getEffectiveReleaseAt([courseLayer, chapterLayer], studyType);

    const subscriptions = staff
      ? []
      : (
          await db.subscription.findMany({
            where: {
              userId,
              status: "ACTIVE",
              endsAt: { gt: new Date() },
            },
            select: {
              status: true,
              endsAt: true,
              grade: true,
            },
          })
        );

    const hasAccess = canAccessChapter(
      chapter.course.price,
      chapter.course.purchases,
      chapter.isFree,
      staff,
      {
        subscriptions,
        course: {
          grade: chapter.course.grade,
        },
      }
    );

    const [chapters, quizzes] = await db.$transaction([
      db.chapter.findMany({
        where: {
          courseId: courseId,
          isPublished: true,
        },
        select: {
          id: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      }),
      db.quiz.findMany({
        where: {
          courseId: courseId,
          isPublished: true,
        },
        select: {
          id: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      }),
    ]);

    const chaptersWithType = chapters.map((c) => ({
      ...c,
      type: "chapter" as const,
    }));
    const quizzesWithType = quizzes.map((quiz) => ({
      ...quiz,
      type: "quiz" as const,
    }));

    const sortedContent = [...chaptersWithType, ...quizzesWithType].sort(
      (a, b) => a.position - b.position
    );

    const currentIndex = sortedContent.findIndex(
      (content) => content.id === chapterId && content.type === "chapter"
    );

    const nextContent =
      currentIndex !== -1 && currentIndex < sortedContent.length - 1
        ? sortedContent[currentIndex + 1]
        : null;

    const previousContent =
      currentIndex > 0 ? sortedContent[currentIndex - 1] : null;

    const canViewMedia = hasAccess && released;

    const response = {
      ...chapter,
      nextChapterId: nextContent?.id || null,
      previousChapterId: previousContent?.id || null,
      nextContentType: nextContent?.type || null,
      previousContentType: previousContent?.type || null,
      releaseLocked: !released,
      availableAt: availableAt?.toISOString() ?? null,
      ...(canViewMedia
        ? {}
        : {
            videoUrl: null,
            youtubeVideoId: null,
            documentUrl: null,
            documentName: null,
            attachments: [],
          }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[CHAPTER_ID] Detailed error:", error);
    if (error instanceof Error) {
      return new NextResponse(
        `Internal Error: ${error.message}\nStack: ${error.stack}`,
        { status: 500 }
      );
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const resolvedParams = await params;
    const values = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!isStaff(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const course = await db.course.findUnique({
      where: {
        id: resolvedParams.courseId,
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const data = {
      ...values,
      ...normalizeAvailabilityPatch(values),
    };

    const chapter = await db.chapter.update({
      where: {
        id: resolvedParams.chapterId,
        courseId: resolvedParams.courseId,
      },
      data,
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.log("[CHAPTER_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!isStaff(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const existingChapter = await db.chapter.findUnique({
      where: {
        id: resolvedParams.chapterId,
        courseId: resolvedParams.courseId,
      },
    });

    if (!existingChapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    await db.chapter.delete({
      where: {
        id: resolvedParams.chapterId,
        courseId: resolvedParams.courseId,
      },
    });

    return new NextResponse("Chapter deleted successfully", { status: 200 });
  } catch (error) {
    console.error("[CHAPTER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
