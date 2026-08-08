import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CourseBreadcrumbs } from "@/components/course-breadcrumbs";
import { ChevronLeft, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessCourseContent } from "@/lib/course-access";
import { getCourseReleaseStatus } from "@/lib/course-release-status";
import {
  formatCourseReleaseAt,
  getEffectiveReleaseAt,
  isEffectivelyReleased,
} from "@/lib/course-availability";
import { cn } from "@/lib/utils";

export default async function TeacherUnitsPage({
  params,
}: {
  params: Promise<{ courseId: string; teacherId: string }>;
}) {
  const { courseId, teacherId } = await params;
  const { userId } = await auth();

  if (!userId) return redirect("/sign-in");

  const release = await getCourseReleaseStatus(userId, courseId);
  if (!release.available) {
    return redirect(`/courses/${courseId}/teachers`);
  }

  const [teacher, dbUser] = await Promise.all([
    db.courseTeacher.findUnique({
      where: { id: teacherId, courseId },
      include: {
        course: {
          include: {
            purchases: { where: { userId } },
          },
        },
        units: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          include: {
            contentItems: {
              where: { isPublished: true },
              select: { id: true },
            },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { studyType: true, role: true },
    }),
  ]);

  if (!teacher) return redirect(`/courses/${courseId}/teachers`);

  const subscriptions = await db.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      endsAt: { gt: new Date() },
    },
    select: {
      status: true,
      endsAt: true,
      grade: true,
    },
  });

  const hasAccess = canAccessCourseContent(
    teacher.course.price,
    teacher.course.purchases,
    {
      subscriptions,
      course: {
        grade: teacher.course.grade,
      },
    }
  );

  const isStaff =
    dbUser?.role === "ADMIN" || dbUser?.role === "TEACHER";
  const studyType = dbUser?.studyType ?? null;
  const courseLayer = {
    centerAvailableAt: teacher.course.centerAvailableAt,
    onlineAvailableAt: teacher.course.onlineAvailableAt,
  };

  const unitsWithRelease = teacher.units.map((unit) => {
    const unitLayer = {
      centerAvailableAt: unit.centerAvailableAt,
      onlineAvailableAt: unit.onlineAvailableAt,
    };
    const released =
      isStaff || isEffectivelyReleased([courseLayer, unitLayer], studyType);
    const availableAt = released
      ? null
      : getEffectiveReleaseAt([courseLayer, unitLayer], studyType);
    return { ...unit, released, availableAt };
  });

  return (
    <div className="py-6">
      <CourseBreadcrumbs
        items={[
          { label: "الكورسات", href: "/dashboard" },
          { label: teacher.course.title, href: `/courses/${courseId}/teachers` },
          { label: teacher.name },
        ]}
      />

      <h1 className="text-2xl font-bold mb-2">{teacher.name}</h1>
      <p className="text-muted-foreground mb-8">اختر الوحدة للمتابعة</p>

      {!hasAccess && (
        <div className="mb-6 p-4 border rounded-md bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4" />
            <span>يجب شراء الكورس للوصول إلى جميع المحتويات</span>
          </div>
          <Button asChild size="sm">
            <Link href={`/courses/${courseId}/purchase`}>شراء الكورس</Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {unitsWithRelease.map((unit) => {
          const content = (
            <div
              className={cn(
                "flex items-center justify-between border rounded-lg p-4 transition bg-card",
                unit.released
                  ? "hover:border-primary/50 hover:shadow-sm"
                  : "opacity-80"
              )}
            >
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {!unit.released && <Lock className="h-4 w-4 shrink-0" />}
                  {unit.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {unit.released
                    ? `${unit.contentItems.length} عنصر`
                    : unit.availableAt
                      ? `متاح في ${formatCourseReleaseAt(unit.availableAt)}`
                      : "غير متاح بعد"}
                </p>
              </div>
              {unit.released ? (
                <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          );

          if (!unit.released) {
            return (
              <div key={unit.id} aria-disabled>
                {content}
              </div>
            );
          }

          return (
            <Link key={unit.id} href={`/courses/${courseId}/units/${unit.id}`}>
              {content}
            </Link>
          );
        })}
      </div>

      {teacher.units.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          لا توجد وحدات منشورة لهذا المدرس.
        </p>
      )}
    </div>
  );
}
