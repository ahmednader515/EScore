import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeGrades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();

    const data: {
      title?: string;
      message?: string;
      targetGrades?: string[];
      isActive?: boolean;
      startsAt?: Date | null;
      endsAt?: Date | null;
    } = {};

    if (body?.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return new NextResponse(
          JSON.stringify({ error: "عنوان غير صالح" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      data.title = body.title.trim();
    }

    if (body?.message !== undefined) {
      if (typeof body.message !== "string" || !body.message.trim()) {
        return new NextResponse(
          JSON.stringify({ error: "محتوى غير صالح" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      data.message = body.message.trim();
    }

    if (body?.targetGrades !== undefined) {
      data.targetGrades = normalizeGrades(body.targetGrades);
    }

    if (body?.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body?.startsAt !== undefined) {
      data.startsAt =
        typeof body.startsAt === "string" && body.startsAt
          ? new Date(body.startsAt)
          : null;
    }

    if (body?.endsAt !== undefined) {
      data.endsAt =
        typeof body.endsAt === "string" && body.endsAt ? new Date(body.endsAt) : null;
    }

    const updated = await db.globalNotification.update({
      where: { id: resolvedParams.notificationId },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[GLOBAL_NOTIFICATIONS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await db.globalNotification.delete({
      where: { id: resolvedParams.notificationId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[GLOBAL_NOTIFICATIONS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

