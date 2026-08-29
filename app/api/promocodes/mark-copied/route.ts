import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "يجب تحديد أكواد للنسخ" },
        { status: 400 }
      );
    }

    const result = await db.promoCode.updateMany({
      where: {
        id: { in: ids },
        usedCount: 0,
        copiedAt: null,
      },
      data: {
        copiedAt: new Date(),
        copiedById: userId,
      },
    });

    return NextResponse.json({
      message: `تم تعليم ${result.count} كود كمنسوخ`,
      count: result.count,
    });
  } catch (error) {
    console.error("[PROMOCODES_MARK_COPIED]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
