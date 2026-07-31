import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFreeCourse } from "@/lib/course-access";
import { userHasCourseAccess } from "@/lib/user-course-access";

/**
 * GET /api/courses/[courseId]/subscription-coverage
 * Returns whether the current user's active subscription covers this course.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    const { courseId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId, isPublished: true },
      select: {
        id: true,
        price: true,
        purchases: {
          where: { userId, status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    const hasPurchase = course.purchases.length > 0;
    const free = isFreeCourse(course.price);
    const hasAccess = free || hasPurchase || (await userHasCourseAccess(userId, courseId));
    const coveredBySubscription = hasAccess && !free && !hasPurchase;

    const subscription = coveredBySubscription
      ? await db.subscription.findFirst({
          where: {
            userId,
            status: "ACTIVE",
            endsAt: { gt: new Date() },
          },
          select: {
            id: true,
            endsAt: true,
            durationMonths: true,
            grade: true,
            plan: { select: { label: true } },
          },
        })
      : null;

    return NextResponse.json({
      hasPurchase,
      coveredBySubscription,
      hasAccess,
      subscription: subscription
        ? {
            id: subscription.id,
            endsAt: subscription.endsAt,
            durationMonths: subscription.durationMonths,
            grade: subscription.grade,
            label: subscription.plan.label,
          }
        : null,
    });
  } catch (error) {
    console.error("[COURSE_SUBSCRIPTION_COVERAGE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
