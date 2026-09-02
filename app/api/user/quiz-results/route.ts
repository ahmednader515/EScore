import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizResults = await db.quizResult.findMany({
      where: { studentId: session.user.id },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                text: true,
                type: true,
                points: true,
                position: true,
              },
            },
          },
          orderBy: {
            question: {
              position: "asc",
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return NextResponse.json(quizResults);
  } catch (error) {
    console.error("[USER_QUIZ_RESULTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
