import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, unitId, contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const access = await assertCourseStaffAccess(courseId, userId, user?.role);
    if ("error" in access) {
      return new NextResponse(access.error, { status: access.status });
    }

    const { url, name } = await req.json();
    if (!url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    const last = await db.contentItemAttachment.findFirst({
      where: { contentItemId: contentId },
      orderBy: { position: "desc" },
    });

    const attachment = await db.contentItemAttachment.create({
      data: {
        contentItemId: contentId,
        name: name || "مستند جديد",
        url,
        position: last ? last.position + 1 : 0,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.log("[CONTENT_ATTACHMENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; unitId: string; contentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { contentId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const attachments = await db.contentItemAttachment.findMany({
      where: { contentItemId: contentId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.log("[CONTENT_ATTACHMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
