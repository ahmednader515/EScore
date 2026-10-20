"use client";

import { useEffect } from "react";

export function RememberCourseTeacher({ userId, courseId, teacherId }: { userId: string; courseId: string; teacherId: string }) {
  useEffect(() => {
    document.cookie = `course-teacher-${userId}-${courseId}=${encodeURIComponent(teacherId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [userId, courseId, teacherId]);
  return null;
}
