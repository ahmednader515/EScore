-- CreateTable
CREATE TABLE "StudentQuizAttemptLimit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentQuizAttemptLimit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "copiedAt" TIMESTAMP(3),
ADD COLUMN "copiedById" TEXT;

-- CreateIndex
CREATE INDEX "StudentQuizAttemptLimit_quizId_idx" ON "StudentQuizAttemptLimit"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuizAttemptLimit_studentId_quizId_key" ON "StudentQuizAttemptLimit"("studentId", "quizId");

-- CreateIndex
CREATE INDEX "PromoCode_copiedAt_idx" ON "PromoCode"("copiedAt");

-- AddForeignKey
ALTER TABLE "StudentQuizAttemptLimit" ADD CONSTRAINT "StudentQuizAttemptLimit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentQuizAttemptLimit" ADD CONSTRAINT "StudentQuizAttemptLimit_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
