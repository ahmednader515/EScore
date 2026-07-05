import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId, contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const item = await db.contentItem.findFirst({
      where: { id: contentId, unitId, unit: { courseId } },
    });

    if (!item) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updated = await db.contentItem.update({
      where: { id: contentId },
      data: { isPublished: !item.isPublished },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[CONTENT_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
