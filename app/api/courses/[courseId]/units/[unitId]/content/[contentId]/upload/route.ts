import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";
import { revalidatePath } from "next/cache";

export async function POST(
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

    const { url } = await req.json();
    if (!url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    await db.contentItem.update({
      where: { id: contentId, unitId, unit: { courseId } },
      data: {
        videoUrl: url,
        videoType: "UPLOAD",
        youtubeVideoId: null,
      },
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}/units/${unitId}/content/${contentId}`);
    revalidatePath(`/dashboard/admin/courses/${courseId}/units/${unitId}/content/${contentId}`);
    revalidatePath(`/courses/${courseId}/units/${unitId}`);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.log("[CONTENT_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
