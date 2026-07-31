import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasActivePurchase, isFreeCourse } from "@/lib/course-access";
import { userHasCourseAccess } from "@/lib/user-course-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const resolvedParams = await params;
  const { courseId } = resolvedParams;

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        purchases: {
          where: {
            userId,
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Free courses are always accessible and should appear as purchased
    if (isFreeCourse(course.price)) {
      const existingPurchase = course.purchases[0];
      if (!existingPurchase) {
        await db.purchase.create({
          data: {
            userId,
            courseId,
            status: "ACTIVE",
          },
        });
      } else if (existingPurchase.status !== "ACTIVE") {
        await db.purchase.update({
          where: { id: existingPurchase.id },
          data: { status: "ACTIVE" },
        });
      }

      return NextResponse.json({ hasAccess: true });
    }

    const hasAccess =
      hasActivePurchase(course.purchases) ||
      (await userHasCourseAccess(userId, courseId));

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error("[COURSE_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
