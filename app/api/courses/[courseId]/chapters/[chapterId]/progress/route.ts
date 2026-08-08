import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEffectivelyReleased } from "@/lib/course-availability";
import { isStaff } from "@/lib/course-staff";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!isStaff(user?.role)) {
      const [chapter, dbUser] = await Promise.all([
        db.chapter.findFirst({
          where: {
            id: resolvedParams.chapterId,
            courseId: resolvedParams.courseId,
          },
          select: {
            centerAvailableAt: true,
            onlineAvailableAt: true,
            course: {
              select: {
                centerAvailableAt: true,
                onlineAvailableAt: true,
              },
            },
          },
        }),
        db.user.findUnique({
          where: { id: userId },
          select: { studyType: true },
        }),
      ]);

      if (!chapter) {
        return new NextResponse("Not Found", { status: 404 });
      }

      const released = isEffectivelyReleased(
        [chapter.course, chapter],
        dbUser?.studyType
      );
      if (!released) {
        return new NextResponse("الفصل غير متاح بعد", { status: 403 });
      }
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
      update: {
        isCompleted: true,
      },
      create: {
        userId,
        chapterId: resolvedParams.chapterId,
        isCompleted: true,
      },
    });

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    if (!existingProgress) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await db.userProgress.delete({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
