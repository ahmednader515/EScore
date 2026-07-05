import { db } from "@/lib/db";

export const isStaff = (role?: string | null) =>
  role === "ADMIN" || role === "TEACHER";

export async function assertCourseStaffAccess(
  courseId: string,
  userId: string,
  userRole?: string | null
) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { userId: true },
  });

  if (!course) {
    return { error: "Course not found" as const, status: 404 as const };
  }

  if (!isStaff(userRole)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  const isAdmin = userRole === "ADMIN";
  const isOwner = course.userId === userId;

  if (!isAdmin && !isOwner) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { course };
}
