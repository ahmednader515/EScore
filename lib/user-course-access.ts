import { db } from "@/lib/db";
import { canAccessCourseContent, isFreeCourse } from "@/lib/course-access";

/**
 * Server-side check: does this user have access to the given course
 * via free price, ACTIVE purchase, or ACTIVE grade subscription?
 */
export async function userHasCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      price: true,
      grade: true,
      divisions: true,
      purchases: {
        where: { userId },
        select: { status: true },
      },
    },
  });

  if (!course) {
    return false;
  }

  if (isFreeCourse(course.price)) {
    return true;
  }

  if (course.purchases.some((p) => p.status === "ACTIVE")) {
    return true;
  }

  const now = new Date();

  await db.subscription.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      endsAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      endsAt: { gt: now },
    },
    select: {
      status: true,
      endsAt: true,
      grade: true,
      division: true,
    },
  });

  return canAccessCourseContent(course.price, course.purchases, {
    subscriptions,
    course: { grade: course.grade, divisions: course.divisions },
  });
}

export async function getActiveSubscriptionsForUser(userId: string) {
  const now = new Date();

  await db.subscription.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      endsAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  return db.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      endsAt: { gt: now },
    },
    select: {
      id: true,
      status: true,
      endsAt: true,
      startsAt: true,
      grade: true,
      division: true,
      durationMonths: true,
      pricePaid: true,
      planId: true,
    },
  });
}
