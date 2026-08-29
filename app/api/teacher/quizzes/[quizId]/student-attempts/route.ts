import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { quizId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStaff(user?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, maxAttempts: true, courseId: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const [results, overrides, coursePurchases] = await Promise.all([
      db.quizResult.findMany({
        where: { quizId },
        select: { studentId: true },
      }),
      db.studentQuizAttemptLimit.findMany({
        where: { quizId },
        select: { studentId: true, maxAttempts: true },
      }),
      db.purchase.findMany({
        where: { courseId: quiz.courseId, status: "ACTIVE" },
        select: { userId: true },
      }),
    ]);

    const studentIds = new Set<string>();
    for (const r of results) studentIds.add(r.studentId);
    for (const o of overrides) studentIds.add(o.studentId);
    for (const p of coursePurchases) studentIds.add(p.userId);

    if (studentIds.size === 0) {
      return NextResponse.json({
        quizDefaultMaxAttempts: quiz.maxAttempts,
        students: [],
      });
    }

    const overrideMap = new Map(
      overrides.map((o) => [o.studentId, o.maxAttempts])
    );

    const attemptCounts = await db.quizResult.groupBy({
      by: ["studentId"],
      where: { quizId, studentId: { in: [...studentIds] } },
      _count: { id: true },
    });
    const attemptsUsedMap = new Map(
      attemptCounts.map((a) => [a.studentId, a._count.id])
    );

    const students = await db.user.findMany({
      where: { id: { in: [...studentIds] }, role: "USER" },
      select: { id: true, fullName: true, phoneNumber: true },
      orderBy: { fullName: "asc" },
    });

    const response = students.map((student) => {
      const customMaxAttempts = overrideMap.get(student.id) ?? null;
      const attemptsUsed = attemptsUsedMap.get(student.id) ?? 0;
      const effectiveMaxAttempts =
        customMaxAttempts !== null ? customMaxAttempts : quiz.maxAttempts;

      return {
        studentId: student.id,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        attemptsUsed,
        quizDefaultMaxAttempts: quiz.maxAttempts,
        customMaxAttempts,
        effectiveMaxAttempts,
      };
    });

    return NextResponse.json({
      quizDefaultMaxAttempts: quiz.maxAttempts,
      students: response,
    });
  } catch (error) {
    console.error("[STUDENT_ATTEMPTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
