import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId } = await params;
    const { list } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    for (const item of list as { id: string; position: number }[]) {
      await db.contentItem.update({
        where: { id: item.id, unitId },
        data: { position: item.position },
      });
    }

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.log("[CONTENT_REORDER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
