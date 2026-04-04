import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ reelId: string }> }
) {
  try {
    const { reelId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const thumbnailUrlRaw = body?.thumbnailUrl;
    const thumbnailUrl =
      thumbnailUrlRaw === null || thumbnailUrlRaw === undefined || thumbnailUrlRaw === ""
        ? null
        : String(thumbnailUrlRaw).trim() || null;

    if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) {
      return NextResponse.json(
        { error: "رابط الصورة المصغرة غير صالح" },
        { status: 400 }
      );
    }

    const reel = await db.reelVideo.update({
      where: { id: reelId },
      data: { thumbnailUrl },
    });

    return NextResponse.json(reel);
  } catch (error) {
    console.error("[TEACHER_REELS_PATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ reelId: string }> }
) {
  try {
    const { reelId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await db.reelVideo.delete({
      where: { id: reelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_REELS_DELETE]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
