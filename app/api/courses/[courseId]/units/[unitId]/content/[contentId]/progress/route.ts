import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const progress = await db.contentProgress.upsert({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
      update: { isCompleted: true },
      create: {
        userId,
        contentItemId: contentId,
        isCompleted: true,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.log("[CONTENT_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existing = await db.contentProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
    });

    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    await db.contentProgress.delete({
      where: {
        userId_contentItemId: {
          userId,
          contentItemId: contentId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CONTENT_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
