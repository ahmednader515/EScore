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
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const existing = await db.contentItem.findFirst({
      where: { id: contentId, unitId, unit: { courseId } },
    });

    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const allowed = [
      "title",
      "description",
      "isPublished",
      "isFree",
      "videoUrl",
      "videoType",
      "youtubeVideoId",
      "imageUrl",
      "fileUrl",
      "fileName",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const item = await db.contentItem.update({
      where: { id: contentId },
      data,
      include: {
        quiz: { select: { id: true, title: true } },
      },
    });

    if (existing.type === "ASSIGNMENT" && item.quizId && body.title) {
      await db.quiz.update({
        where: { id: item.quizId },
        data: { title: body.title },
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.log("[CONTENT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
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

    if (item.quizId) {
      await db.quiz.delete({ where: { id: item.quizId } });
    }

    await db.contentItem.delete({ where: { id: contentId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CONTENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
