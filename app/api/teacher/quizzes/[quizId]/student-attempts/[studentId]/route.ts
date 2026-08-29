import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getStudentAttemptsUsed } from "@/lib/quiz-attempts";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizId: string; studentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { quizId, studentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStaff(user?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { maxAttempts } = await req.json();

    if (!maxAttempts || typeof maxAttempts !== "number" || maxAttempts < 1) {
      return NextResponse.json(
        { error: "يجب أن يكون عدد المحاولات 1 على الأقل" },
        { status: 400 }
      );
    }

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const student = await db.user.findUnique({
      where: { id: studentId, role: "USER" },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const attemptsUsed = await getStudentAttemptsUsed(studentId, quizId);

    if (maxAttempts < attemptsUsed) {
      return NextResponse.json(
        {
          error: `لا يمكن ضبط المحاولات أقل من المستخدمة (${attemptsUsed})`,
        },
        { status: 400 }
      );
    }

    const record = await db.studentQuizAttemptLimit.upsert({
      where: {
        studentId_quizId: { studentId, quizId },
      },
      create: { studentId, quizId, maxAttempts },
      update: { maxAttempts },
    });

    return NextResponse.json({
      studentId,
      customMaxAttempts: record.maxAttempts,
      effectiveMaxAttempts: record.maxAttempts,
      attemptsUsed,
    });
  } catch (error) {
    console.error("[STUDENT_ATTEMPTS_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ quizId: string; studentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { quizId, studentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStaff(user?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.studentQuizAttemptLimit.deleteMany({
      where: { studentId, quizId },
    });

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: { maxAttempts: true },
    });

    const attemptsUsed = await getStudentAttemptsUsed(studentId, quizId);

    return NextResponse.json({
      studentId,
      customMaxAttempts: null,
      effectiveMaxAttempts: quiz?.maxAttempts ?? 1,
      attemptsUsed,
    });
  } catch (error) {
    console.error("[STUDENT_ATTEMPTS_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
