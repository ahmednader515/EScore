import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getAuthorizedThread(threadId: string, _userId: string, role: string) {
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    include: {
      student: {
        select: { id: true, fullName: true, phoneNumber: true },
      },
      course: {
        select: { id: true, title: true },
      },
    },
  });

  if (!thread) return null;
  if (role === "ADMIN" || role === "TEACHER") return thread;
  return null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const thread = await getAuthorizedThread(
      threadId,
      session.user.id,
      session.user.role
    );

    if (!thread) {
      return new NextResponse("Not found", { status: 404 });
    }

    const messages = await db.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({
      thread: {
        id: thread.id,
        student: thread.student,
        course: thread.course,
        updatedAt: thread.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender,
      })),
    });
  } catch (error) {
    console.error("[TEACHER_CHAT_THREAD_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const thread = await getAuthorizedThread(
      threadId,
      session.user.id,
      session.user.role
    );

    if (!thread) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = await req.json();
    const content = String(body?.content || "").trim();
    if (!content) {
      return NextResponse.json(
        { error: "الرسالة مطلوبة" },
        { status: 400 }
      );
    }

    const message = await db.chatMessage.create({
      data: {
        threadId,
        senderId: session.user.id,
        content: content.slice(0, 2000),
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    await db.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender,
    });
  } catch (error) {
    console.error("[TEACHER_CHAT_THREAD_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

