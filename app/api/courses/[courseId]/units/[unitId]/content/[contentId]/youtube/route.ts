import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtube";
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

    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
      return new NextResponse("Invalid YouTube URL", { status: 400 });
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      return new NextResponse("Could not extract video ID", { status: 400 });
    }

    await db.contentItem.update({
      where: { id: contentId, unitId, unit: { courseId } },
      data: {
        videoUrl: youtubeUrl,
        videoType: "YOUTUBE",
        youtubeVideoId,
      },
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}/units/${unitId}/content/${contentId}`);
    revalidatePath(`/dashboard/admin/courses/${courseId}/units/${unitId}/content/${contentId}`);
    revalidatePath(`/courses/${courseId}/units/${unitId}`);

    return NextResponse.json({ success: true, youtubeVideoId, url: youtubeUrl });
  } catch (error) {
    console.log("[CONTENT_YOUTUBE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
