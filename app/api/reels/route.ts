import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const reels = await db.reelVideo.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        youtubeUrl: true,
        youtubeVideoId: true,
        createdByName: true,
        createdAt: true,
      },
    });

    return NextResponse.json(reels);
  } catch (error) {
    console.error("[PUBLIC_REELS_GET]", error);
    return NextResponse.json(
      { error: "Failed to load reels" },
      { status: 500 }
    );
  }
}

