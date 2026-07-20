import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [totalStudents, activeStudents] = await Promise.all([
      db.user.count({
        where: { role: "USER" },
      }),
      db.user.count({
        where: {
          role: "USER",
          purchases: {
            some: {
              status: "ACTIVE",
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalStudents,
      activeStudents,
    });
  } catch (error) {
    console.error("[STUDENTS_STATS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
