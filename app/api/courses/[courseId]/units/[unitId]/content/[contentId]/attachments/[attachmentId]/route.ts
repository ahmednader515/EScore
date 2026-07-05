import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      courseId: string;
      unitId: string;
      contentId: string;
      attachmentId: string;
    }>;
  }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, contentId, attachmentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    await db.contentItemAttachment.delete({
      where: { id: attachmentId, contentItemId: contentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CONTENT_ATTACHMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
