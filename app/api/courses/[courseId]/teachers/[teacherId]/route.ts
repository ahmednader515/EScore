import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; teacherId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, teacherId } = await params;
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.userId !== undefined) data.userId = body.userId || null;

    if (body.userId) {
      const linkedUser = await db.user.findUnique({
        where: { id: body.userId },
        select: { role: true },
      });
      if (!linkedUser || (linkedUser.role !== "TEACHER" && linkedUser.role !== "ADMIN")) {
        return new NextResponse("Invalid teacher user", { status: 400 });
      }
    }

    const teacher = await db.courseTeacher.update({
      where: { id: teacherId, courseId },
      data,
      include: {
        user: { select: { id: true, fullName: true, image: true } },
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.log("[COURSE_TEACHER_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; teacherId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, teacherId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    await db.courseTeacher.delete({
      where: { id: teacherId, courseId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[COURSE_TEACHER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
