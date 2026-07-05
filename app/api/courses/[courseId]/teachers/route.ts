import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

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

    const teachers = await db.courseTeacher.findMany({
      where: { courseId },
      orderBy: { position: "asc" },
      include: {
        user: { select: { id: true, fullName: true, image: true } },
        units: {
          orderBy: { position: "asc" },
          include: {
            contentItems: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.log("[COURSE_TEACHERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId } = await params;
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const last = await db.courseTeacher.findFirst({
      where: { courseId },
      orderBy: { position: "desc" },
    });

    let name = body.name as string | undefined;
    let imageUrl = body.imageUrl as string | undefined;

    if (body.userId) {
      const linkedUser = await db.user.findUnique({
        where: { id: body.userId },
        select: { fullName: true, image: true, role: true },
      });
      if (!linkedUser || (linkedUser.role !== "TEACHER" && linkedUser.role !== "ADMIN")) {
        return new NextResponse("Invalid teacher user", { status: 400 });
      }
      name = name || linkedUser.fullName;
      imageUrl = imageUrl ?? linkedUser.image ?? undefined;
    }

    if (!name?.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const teacher = await db.courseTeacher.create({
      data: {
        courseId,
        userId: body.userId || null,
        name: name.trim(),
        imageUrl: imageUrl || null,
        position: last ? last.position + 1 : 1,
      },
      include: {
        user: { select: { id: true, fullName: true, image: true } },
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.log("[COURSE_TEACHERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
