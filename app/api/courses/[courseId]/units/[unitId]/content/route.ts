import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string }> }
) {
  try {
    const { userId } = await auth();
    const { courseId, unitId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const items = await db.contentItem.findMany({
      where: { unitId, unit: { courseId } },
      orderBy: { position: "asc" },
      include: {
        quiz: { select: { id: true, title: true, isPublished: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.log("[UNIT_CONTENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
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

    const unit = await db.unit.findUnique({
      where: { id: unitId, courseId },
    });

    if (!unit) {
      return new NextResponse("Unit not found", { status: 404 });
    }

    const { type, title, quizId } = body;
    if (!type || !title) {
      return new NextResponse("Type and title are required", { status: 400 });
    }

    const last = await db.contentItem.findFirst({
      where: { unitId },
      orderBy: { position: "desc" },
    });

    let linkedQuizId: string | null = quizId || null;

    if (type === "ASSIGNMENT" && !linkedQuizId) {
      const lastQuiz = await db.quiz.findFirst({
        where: { courseId },
        orderBy: { position: "desc" },
      });

      const quiz = await db.quiz.create({
        data: {
          courseId,
          unitId,
          title,
          position: lastQuiz ? lastQuiz.position + 1 : 1,
          isPublished: false,
        },
      });
      linkedQuizId = quiz.id;
    }

    const item = await db.contentItem.create({
      data: {
        unitId,
        type,
        title,
        position: last ? last.position + 1 : 1,
        quizId: type === "ASSIGNMENT" ? linkedQuizId : null,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || null,
        videoUrl: body.videoUrl || null,
        videoType: body.videoType || null,
        youtubeVideoId: body.youtubeVideoId || null,
        isFree: body.isFree ?? false,
        isPublished: body.isPublished ?? false,
      },
      include: {
        quiz: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.log("[UNIT_CONTENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
