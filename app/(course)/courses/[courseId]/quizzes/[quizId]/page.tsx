"use client";

import { use } from "react";
import { QuizRunner } from "@/components/quiz-runner";

export default function QuizPage({ params }: { params: Promise<{ courseId: string; quizId: string }> }) {
    const { courseId, quizId } = use(params);
    return <QuizRunner key={`${courseId}:${quizId}`} courseId={courseId} quizId={quizId} />;
}
