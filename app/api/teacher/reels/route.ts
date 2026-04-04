import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtube";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const reels = await db.reelVideo.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reels);
  } catch (error) {
    console.error("[TEACHER_REELS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const youtubeUrl = String(body?.youtubeUrl || "").trim();
    const thumbnailUrlRaw = body?.thumbnailUrl;
    const thumbnailUrl =
      thumbnailUrlRaw === null || thumbnailUrlRaw === undefined || thumbnailUrlRaw === ""
        ? null
        : String(thumbnailUrlRaw).trim() || null;

    if (!title) {
      return NextResponse.json(
        { error: "العنوان مطلوب" },
        { status: 400 }
      );
    }

    if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
      return NextResponse.json(
        { error: "رابط يوتيوب غير صالح" },
        { status: 400 }
      );
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      return NextResponse.json(
        { error: "تعذر قراءة رابط الفيديو" },
        { status: 400 }
      );
    }

    if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) {
      return NextResponse.json(
        { error: "رابط الصورة المصغرة غير صالح" },
        { status: 400 }
      );
    }

    const reel = await db.reelVideo.create({
      data: {
        title,
        youtubeUrl,
        youtubeVideoId,
        thumbnailUrl,
        createdById: session.user.id,
        createdByName: session.user.name || null,
        isPublished: true,
      },
    });

    return NextResponse.json(reel);
  } catch (error) {
    console.error("[TEACHER_REELS_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

