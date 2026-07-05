import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/course-staff";

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId || !isStaff(user?.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const users = await db.user.findMany({
      where: {
        role: { in: ["TEACHER", "ADMIN"] },
      },
      select: {
        id: true,
        fullName: true,
        image: true,
        role: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.log("[STAFF_USERS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
