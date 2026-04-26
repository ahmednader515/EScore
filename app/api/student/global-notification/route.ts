import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only students should consume this endpoint
    if (user?.role !== "USER") {
      return NextResponse.json(null);
    }

    const now = new Date();
    const grade = user?.grade ?? null;

    const notification = await db.globalNotification.findFirst({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          grade
            ? {
                OR: [{ targetGrades: { isEmpty: true } }, { targetGrades: { has: grade } }],
              }
            : { targetGrades: { isEmpty: true } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("[STUDENT_GLOBAL_NOTIFICATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

