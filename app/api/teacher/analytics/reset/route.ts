import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        hashedPassword: true,
      },
    });

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        { error: "كلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    if (!user.hashedPassword) {
      return NextResponse.json(
        { error: "لا يمكن التحقق من كلمة المرور لهذا الحساب" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      return NextResponse.json(
        { error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const now = new Date();

    await db.analyticsSettings.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        lastResetAt: now,
        resetById: user.id,
      },
      update: {
        lastResetAt: now,
        resetById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      lastResetAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[ANALYTICS_RESET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
