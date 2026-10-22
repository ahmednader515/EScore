import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEffectivelyReleased } from "@/lib/course-availability";
import { isStaff } from "@/lib/course-staff";
import { getContentPrerequisiteError } from "@/lib/quiz-prerequisites";
import { userHasCourseAccess } from "@/lib/user-course-access";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId, contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!isStaff(user?.role)) {
      const prerequisiteError = await getContentPrerequisiteError(userId, courseId, contentId);
      if (prerequisiteError) return new NextResponse(prerequisiteError, { status: 403 });
      const [item, dbUser] = await Promise.all([
        db.contentItem.findFirst({
          where: { id: contentId, unitId, unit: { courseId } },
          select: {
            isFree: true,
            quizId: true,
            centerAvailableAt: true,
            onlineAvailableAt: true,
            unit: {
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
            },
          },
        }),
        db.user.findUnique({
          where: { id: userId },
          select: { studyType: true },
        }),
      ]);

      if (!item) {
        return new NextResponse("Not found", { status: 404 });
      }
      if (item.quizId) return new NextResponse("يجب اجتياز الاختبار لتسجيل إكماله", { status: 403 });
      if (!item.isFree && !await userHasCourseAccess(userId, courseId)) {
        return new NextResponse("Course access required", { status: 403 });
      }

      const released = isEffectivelyReleased(
        [
          item.unit.course,
          item.unit,
          {
            centerAvailableAt: item.centerAvailableAt,
            onlineAvailableAt: item.onlineAvailableAt,
          },
        ],
        dbUser?.studyType
      );

      if (!released) {
        return new NextResponse("المحتوى غير متاح بعد", { status: 403 });
      }
    }

    const progress = await db.contentProgress.upsert({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
      update: { isCompleted: true },
      create: {
        userId,
        contentItemId: contentId,
        isCompleted: true,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.log("[CONTENT_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existing = await db.contentProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
    });

    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    await db.contentProgress.delete({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CONTENT_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
