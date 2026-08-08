import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess, isStaff } from "@/lib/course-staff";
import { canAccessCourseContent } from "@/lib/course-access";
import {
  getEffectiveReleaseAt,
  isEffectivelyReleased,
  normalizeAvailabilityPatch,
} from "@/lib/course-availability";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const staff = isStaff(user?.role);

    const [unit, dbUser] = await Promise.all([
      db.unit.findUnique({
        where: { id: unitId, courseId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              grade: true,
              courseType: true,
              centerAvailableAt: true,
              onlineAvailableAt: true,
              purchases: {
                where: { userId },
                select: { status: true },
              },
            },
          },
          teacher: {
            select: { id: true, name: true, imageUrl: true },
          },
          contentItems: {
            where: staff ? undefined : { isPublished: true },
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
              attachments: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  name: true,
                  url: true,
                  position: true,
                },
              },
              contentProgress: {
                where: { userId },
                select: { isCompleted: true },
              },
            },
          },
        },
      }),
      staff
        ? Promise.resolve(null)
        : db.user.findUnique({
            where: { id: userId },
            select: { studyType: true },
          }),
    ]);

    if (!unit) {
      return new NextResponse("Not found", { status: 404 });
    }

    const studyType = dbUser?.studyType ?? null;
    const courseLayer = {
      centerAvailableAt: unit.course.centerAvailableAt,
      onlineAvailableAt: unit.course.onlineAvailableAt,
    };
    const unitLayer = {
      centerAvailableAt: unit.centerAvailableAt,
      onlineAvailableAt: unit.onlineAvailableAt,
    };

    if (!staff && !isEffectivelyReleased([courseLayer, unitLayer], studyType)) {
      const availableAt = getEffectiveReleaseAt(
        [courseLayer, unitLayer],
        studyType
      );
      return NextResponse.json(
        {
          id: unit.id,
          title: unit.title,
          locked: true,
          availableAt: availableAt?.toISOString() ?? null,
          hasAccess: false,
          course: {
            id: unit.course.id,
            title: unit.course.title,
            price: unit.course.price,
          },
          teacher: unit.teacher,
          contentItems: [],
        },
        { status: 403 }
      );
    }

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

    const hasAccess =
      staff ||
      canAccessCourseContent(unit.course.price, unit.course.purchases, {
        subscriptions,
        course: {
          grade: unit.course.grade,
        },
      });

    const sanitizedItems = unit.contentItems.map((item) => {
      const itemLayer = {
        centerAvailableAt: item.centerAvailableAt,
        onlineAvailableAt: item.onlineAvailableAt,
      };
      const released =
        staff ||
        isEffectivelyReleased([courseLayer, unitLayer, itemLayer], studyType);
      const itemAvailableAt = released
        ? null
        : getEffectiveReleaseAt([courseLayer, unitLayer, itemLayer], studyType);

      const itemAccess =
        staff ||
        hasAccess ||
        item.isFree ||
        (item.type === "ASSIGNMENT" && item.quiz?.isFree);

      if (itemAccess && released) return { ...item, locked: false };

      return {
        ...item,
        description: null,
        videoUrl: null,
        youtubeVideoId: null,
        videoType: null,
        fileUrl: null,
        fileName: null,
        attachments: [],
        quiz: item.quiz ? { ...item.quiz, id: item.quiz.id } : null,
        locked: true,
        releaseLocked: !released,
        availableAt: itemAvailableAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      ...unit,
      contentItems: sanitizedItems,
      hasAccess: staff || hasAccess,
      locked: false,
    });
  } catch (error) {
    console.log("[UNIT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId } = await params;
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const data: Record<string, unknown> = {
      ...normalizeAvailabilityPatch(body),
    };
    if (body.title !== undefined) data.title = body.title;
    if (body.isPublished !== undefined) data.isPublished = body.isPublished;

    const unit = await db.unit.update({
      where: { id: unitId, courseId },
      data,
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.log("[UNIT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    await db.unit.delete({
      where: { id: unitId, courseId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[UNIT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
