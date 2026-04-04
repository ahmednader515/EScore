import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const chapterId = req.nextUrl.searchParams.get("chapterId");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        userId: true,
        title: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    if (session.user.role === "USER") {
      const purchase = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId,
          },
        },
      });

      let hasFreeChapterAccess = false;
      if (chapterId) {
        const freeChapter = await db.chapter.findFirst({
          where: {
            id: chapterId,
            courseId,
            isPublished: true,
            isFree: true,
          },
          select: { id: true },
        });
        hasFreeChapterAccess = !!freeChapter;
      }

      const hasAccess =
        course.price === 0 ||
        (!!purchase && purchase.status === "ACTIVE") ||
        hasFreeChapterAccess;
      if (!hasAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (
      session.user.role !== "TEACHER" &&
      session.user.role !== "ADMIN"
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let thread = null;
    if (session.user.role === "USER") {
      thread = await db.chatThread.findUnique({
        where: {
          studentId_courseId: {
            studentId: session.user.id,
            courseId,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: { id: true, fullName: true, role: true },
              },
            },
          },
        },
      });
    } else {
      thread = await db.chatThread.findFirst({
        where: {
          courseId,
          teacherId: course.userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: { id: true, fullName: true, role: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({
      course: { id: course.id, title: course.title },
      teacher: {
        id: course.user.id,
        fullName: course.user.fullName,
      },
      threadId: thread?.id ?? null,
      messages:
        thread?.messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          sender: m.sender,
        })) ?? [],
    });
  } catch (error) {
    console.error("[COURSE_CHAT_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const chapterId = req.nextUrl.searchParams.get("chapterId");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const content = String(body?.content || "").trim();
    if (!content) {
      return NextResponse.json(
        { error: "الرسالة مطلوبة" },
        { status: 400 }
      );
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, userId: true, title: true },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    if (session.user.role !== "USER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    let hasFreeChapterAccess = false;
    if (chapterId) {
      const freeChapter = await db.chapter.findFirst({
        where: {
          id: chapterId,
          courseId,
          isPublished: true,
          isFree: true,
        },
        select: { id: true },
      });
      hasFreeChapterAccess = !!freeChapter;
    }

    const hasAccess =
      course.price === 0 ||
      (!!purchase && purchase.status === "ACTIVE") ||
      hasFreeChapterAccess;
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const thread = await db.chatThread.upsert({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        studentId: session.user.id,
        teacherId: course.userId,
        courseId,
      },
    });

    const message = await db.chatMessage.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        content: content.slice(0, 2000),
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender,
    });
  } catch (error) {
    console.error("[COURSE_CHAT_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

