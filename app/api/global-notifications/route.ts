import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

function normalizeGrades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const notifications = await db.globalNotification.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        targetGrades: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[GLOBAL_NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const targetGrades = normalizeGrades(body?.targetGrades);
    const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);

    const startsAt =
      typeof body?.startsAt === "string" && body.startsAt
        ? new Date(body.startsAt)
        : null;
    const endsAt =
      typeof body?.endsAt === "string" && body.endsAt ? new Date(body.endsAt) : null;

    if (!title || !message) {
      return new NextResponse(
        JSON.stringify({ error: "العنوان والمحتوى مطلوبين" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const notification = await db.globalNotification.create({
      data: {
        title,
        message,
        targetGrades,
        isActive,
        startsAt,
        endsAt,
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        targetGrades: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("[GLOBAL_NOTIFICATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

