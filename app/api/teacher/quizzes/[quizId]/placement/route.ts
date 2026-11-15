import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/course-staff";

const database = db as PrismaClient;

export async function PATCH(req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const { userId, user } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!isStaff(user?.role)) return new NextResponse("Forbidden", { status: 403 });
    const { quizId } = await params;
    const body = await req.json();
    if (typeof body.isGlobalShared !== "boolean") return new NextResponse("Invalid shared assessment flag", { status: 400 });
    if (body.isGlobalShared && (!Number.isSafeInteger(body.sharedUnitPosition) || body.sharedUnitPosition < 1 ||
        !Number.isSafeInteger(body.sharedAfterPosition) || body.sharedAfterPosition < 0)) {
      return new NextResponse("حدد ترتيب الوحدة وموضع الاختبار بشكل صحيح", { status: 400 });
    }
    const result = await database.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({ where: { id: quizId }, include: { course: { select: { courseType: true } } } });
      if (!quiz) return new NextResponse("Quiz not found", { status: 404 });
      if (quiz.unitId || quiz.course.courseType !== "HIERARCHICAL") return new NextResponse("Only shared hierarchical course quizzes support milestones", { status: 400 });
      if (body.isGlobalShared) {
        const teachers = await tx.courseTeacher.findMany({
          where: { courseId: quiz.courseId },
          select: { units: { where: { position: body.sharedUnitPosition }, select: { contentItems: { select: { position: true } } } } },
        });
        if (!teachers.length || teachers.some((teacher) => teacher.units.length !== 1 ||
          (body.sharedAfterPosition > 0 && !teacher.units[0].contentItems.some((item) => item.position === body.sharedAfterPosition)))) {
          return new NextResponse("يجب وجود الوحدة ونقطة المحتوى المحددة عند جميع المدرسين قبل ربط الاختبار", { status: 400 });
        }
        const existing = await tx.contentItem.count({ where: { quizId } });
        if (existing) return new NextResponse("هذا الاختبار مرتبط بمحتوى بالفعل؛ استخدم اختبارًا مشتركًا غير مرتبط", { status: 400 });
      }
      return tx.quiz.update({
        where: { id: quizId },
        data: {
          isGlobalShared: body.isGlobalShared,
          sharedUnitPosition: body.isGlobalShared ? body.sharedUnitPosition : null,
          sharedAfterPosition: body.isGlobalShared ? body.sharedAfterPosition : null,
        },
      });
    });
    return result instanceof NextResponse ? result : NextResponse.json(result);
  } catch (error) {
    console.error("[SHARED_ASSESSMENT_PLACEMENT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
