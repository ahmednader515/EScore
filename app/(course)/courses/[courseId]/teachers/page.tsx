import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CourseBreadcrumbs } from "@/components/course-breadcrumbs";
import { Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessCourseContent } from "@/lib/course-access";
import { getCourseReleaseStatus } from "@/lib/course-release-status";
import { formatCourseReleaseAt } from "@/lib/course-availability";

export default async function CourseTeachersPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { userId } = await auth();

  if (!userId) return redirect("/sign-in");

  const course = await db.course.findUnique({
    where: { id: courseId, isPublished: true },
    include: {
      purchases: { where: { userId } },
      courseTeachers: {
        orderBy: { position: "asc" },
        include: {
          units: {
            where: { isPublished: true },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) return redirect("/dashboard");
  if (course.courseType !== "HIERARCHICAL") {
    const firstChapter = await db.chapter.findFirst({
      where: { courseId, isPublished: true },
      orderBy: { position: "asc" },
    });
    if (firstChapter) {
      return redirect(`/courses/${courseId}/chapters/${firstChapter.id}`);
    }
    return redirect("/dashboard");
  }

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

  const hasAccess = canAccessCourseContent(course.price, course.purchases, {
    subscriptions,
    course: { grade: course.grade },
  });

  const release = await getCourseReleaseStatus(userId, courseId);

  if (hasAccess && !release.available) {
    return (
      <div className="py-6">
        <CourseBreadcrumbs
          items={[
            { label: "الكورسات", href: "/dashboard" },
            { label: course.title },
          ]}
        />
        <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center text-amber-950">
          <Clock className="mx-auto mb-4 h-10 w-10" />
          <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>
          <p className="mb-4 text-muted-foreground">الكورس غير متاح بعد</p>
          {release.availableAt && (
            <p className="text-base">
              سيكون متاحاً في{" "}
              <span className="font-bold">
                {formatCourseReleaseAt(release.availableAt)}
              </span>
            </p>
          )}
          <Button asChild className="mt-6 bg-[#361e01] text-white hover:bg-[#361e01]/90">
            <Link href="/dashboard">العودة للوحة التحكم</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <CourseBreadcrumbs
        items={[
          { label: "الكورسات", href: "/dashboard" },
          { label: course.title },
        ]}
      />

      <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
      <p className="text-muted-foreground mb-8">اختر المدرس للمتابعة</p>

      {!hasAccess && (
        <div className="mb-6 p-4 border rounded-md bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4" />
            <span>يجب شراء الكورس أو الاشتراك للوصول إلى جميع المحتويات</span>
          </div>
          <Button asChild size="sm">
            <Link href={`/courses/${courseId}/purchase`}>شراء الكورس</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {course.courseTeachers.map((teacher) => (
          <Link
            key={teacher.id}
            href={`/courses/${courseId}/teachers/${teacher.id}/units`}
            className="border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition flex flex-col items-center text-center gap-3 bg-card"
          >
            {teacher.imageUrl ? (
              <Image
                src={teacher.imageUrl}
                alt={teacher.name}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {teacher.name.charAt(0)}
              </div>
            )}
            <h3 className="font-semibold">{teacher.name}</h3>
            <p className="text-xs text-muted-foreground">
              {teacher.units.length} وحدة
            </p>
          </Link>
        ))}
      </div>

      {course.courseTeachers.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          لا يوجد مدرسون في هذا الكورس بعد.
        </p>
      )}

    </div>
  );
}
