import { db } from "@/lib/db";

/**
 * Returns the effective max attempts for a student on a quiz.
 * Per-student override replaces the quiz default when set.
 */
export async function getEffectiveMaxAttempts(
  studentId: string,
  quizId: string
): Promise<number> {
  const [override, quiz] = await Promise.all([
    db.studentQuizAttemptLimit.findUnique({
      where: {
        studentId_quizId: { studentId, quizId },
      },
      select: { maxAttempts: true },
    }),
    db.quiz.findUnique({
      where: { id: quizId },
      select: { maxAttempts: true },
    }),
  ]);

  if (override) {
    return override.maxAttempts;
  }

  return quiz?.maxAttempts ?? 1;
}

export async function getStudentAttemptsUsed(
  studentId: string,
  quizId: string
): Promise<number> {
  return db.quizResult.count({
    where: { studentId, quizId },
  });
}
