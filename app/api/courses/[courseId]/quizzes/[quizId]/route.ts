import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";
import { userHasCourseAccess } from "@/lib/user-course-access";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get the quiz first to check if it's free
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        // Don't parse options here - the frontend will handle parsing
        // This keeps the original string format for consistency

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check if user has access to the course (unless quiz is free or course is free)
        if (!quiz.isFree) {
            const hasAccess = await userHasCourseAccess(userId, resolvedParams.courseId);

            if (!hasAccess) {
                return new NextResponse("Course access required", { status: 403 });
            }
        }

        // Check if user has already taken this quiz and if they can take it again
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const currentAttemptNumber = existingResults.length + 1;

        if (existingResults.length >= quiz.maxAttempts) {
            return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
        }

        const existingAttempt = await db.quizAttempt.findUnique({
            where: {
                studentId_quizId: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            }
        });

        if (existingAttempt?.completedAt) {
            // Completed attempt: clear it and start a fresh one for the next try
            await db.quizAttempt.delete({
                where: {
                    studentId_quizId: {
                        studentId: userId,
                        quizId: resolvedParams.quizId
                    }
                }
            });
            await db.quizAttempt.create({
                data: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                }
            });
        } else if (!existingAttempt) {
            // Create, but ignore unique races from Strict Mode double-fetch
            try {
                await db.quizAttempt.create({
                    data: {
                        studentId: userId,
                        quizId: resolvedParams.quizId
                    }
                });
            } catch (createError: unknown) {
                const code =
                    createError &&
                    typeof createError === "object" &&
                    "code" in createError
                        ? (createError as { code?: string }).code
                        : undefined;
                if (code !== "P2002") {
                    throw createError;
                }
            }
        }
        // Incomplete attempt: allow resume (do not block)

        // Add attempt information to the quiz response
        const quizWithAttemptInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            maxAttempts: quiz.maxAttempts,
            previousAttempts: existingResults.length
        };

        return NextResponse.json(quizWithAttemptInfo);
    } catch (error) {
        console.error("[QUIZ_GET] Error details:", error);
        if (error instanceof Error) {
            console.error("[QUIZ_GET] Error message:", error.message);
            console.error("[QUIZ_GET] Error stack:", error.stack);
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const course = await db.course.findUnique({
            where: { id: resolvedParams.courseId }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            },
            data: {
                title,
                description,
                position,
                questions: {
                    deleteMany: {},
                    create: questions.map((question: any, index: number) => ({
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: question.correctAnswer,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        position: index + 1
                    }))
                }
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                },
                questions: {
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        return NextResponse.json(updatedQuiz);
    } catch (error) {
        console.log("[QUIZ_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!isStaff(user?.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        await db.quiz.delete({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[QUIZ_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
