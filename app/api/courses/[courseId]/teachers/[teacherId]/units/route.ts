import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; teacherId: string }> }
) {
  try {
    const { userId } = await auth();
    const { courseId, teacherId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const units = await db.unit.findMany({
      where: { courseId, teacherId },
      orderBy: { position: "asc" },
      include: {
        contentItems: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(units);
  } catch (error) {
    console.log("[TEACHER_UNITS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; teacherId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, teacherId } = await params;
    const { title } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const teacher = await db.courseTeacher.findUnique({
      where: { id: teacherId, courseId },
    });

    if (!teacher) {
      return new NextResponse("Teacher not found", { status: 404 });
    }

    const last = await db.unit.findFirst({
      where: { teacherId },
      orderBy: { position: "desc" },
    });

    const unit = await db.unit.create({
      data: {
        courseId,
        teacherId,
        title,
        position: last ? last.position + 1 : 1,
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.log("[TEACHER_UNITS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
