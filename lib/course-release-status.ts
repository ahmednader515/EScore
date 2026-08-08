import { db } from "@/lib/db";
import {
  getCourseReleaseAt,
  isCourseReleasedForStudyType,
} from "@/lib/course-availability";

/**
 * Returns whether course content is open for this user, and when it opens if locked.
 * Staff always get available=true.
 * If DB columns are missing (undeployed migration), fail open so the site stays up.
 */
export async function getCourseReleaseStatus(userId: string, courseId: string) {
  try {
    const [course, user] = await Promise.all([
      db.course.findUnique({
        where: { id: courseId },
        select: {
          centerAvailableAt: true,
          onlineAvailableAt: true,
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { studyType: true, role: true },
      }),
    ]);

    if (!course) {
      return { available: false as const, availableAt: null as Date | null };
    }

    if (user?.role === "ADMIN" || user?.role === "TEACHER") {
      return { available: true as const, availableAt: null as Date | null };
    }

    const availableAt = getCourseReleaseAt(course, user?.studyType);
    const available = isCourseReleasedForStudyType(course, user?.studyType);

    return { available, availableAt: available ? null : availableAt };
  } catch (error) {
    console.error("[COURSE_RELEASE_STATUS]", error);
    return { available: true as const, availableAt: null as Date | null };
  }
}
