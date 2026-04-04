import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const threads = await db.chatThread.findMany({
      where: {},
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      threads.map((thread) => ({
        id: thread.id,
        updatedAt: thread.updatedAt,
        student: thread.student,
        course: thread.course,
        messagesCount: thread._count.messages,
        lastMessage: thread.messages[0]
          ? {
              id: thread.messages[0].id,
              content: thread.messages[0].content,
              createdAt: thread.messages[0].createdAt,
              sender: thread.messages[0].sender,
            }
          : null,
      }))
    );
  } catch (error) {
    console.error("[TEACHER_CHATS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

