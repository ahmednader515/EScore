import { db } from "@/lib/db";
import { canAccessCourseContent } from "@/lib/course-access";
import { isCourseReleasedForStudyType } from "@/lib/course-availability";

/**
 * Server-side check: does this user have access to the given course
 * via free price, ACTIVE purchase, or ACTIVE grade subscription,
 * and has the course been released for their study type?
 */
export async function userHasCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  const [course, user] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: {
        price: true,
        grade: true,
        centerAvailableAt: true,
        onlineAvailableAt: true,
        purchases: {
          where: { userId },
          select: { status: true },
        },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { studyType: true, role: true },
    }),
  ]);

  if (!course) {
    return false;
  }

  if (user?.role === "ADMIN" || user?.role === "TEACHER") {
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
    },
  });

  const entitled = canAccessCourseContent(course.price, course.purchases, {
    subscriptions,
    course: { grade: course.grade },
  });

  if (!entitled) {
    return false;
  }

  return isCourseReleasedForStudyType(course, user?.studyType, now);
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
      durationMonths: true,
      pricePaid: true,
      planId: true,
    },
  });
}
