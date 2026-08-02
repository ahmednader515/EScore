import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CourseBreadcrumbs } from "@/components/course-breadcrumbs";
import { ClipboardList, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessCourseContent } from "@/lib/course-access";

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
      quizzes: {
        where: {
          isPublished: true,
          unitId: null,
        },
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          isFree: true,
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

      {course.quizzes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-2">الاختبارات المشتركة</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            اختبارات عامة للكورس متاحة لجميع الطلاب
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.quizzes.map((quiz) => {
              const canOpen = hasAccess || quiz.isFree;
              const href = canOpen
                ? `/courses/${courseId}/quizzes/${quiz.id}`
                : `/courses/${courseId}/purchase`;

              return (
                <Link
                  key={quiz.id}
                  href={href}
                  className="border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition flex items-start gap-3 bg-card"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {canOpen ? (
                      <ClipboardList className="h-6 w-6 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}
                    {quiz.isFree && (
                      <p className="text-xs text-primary mt-2">مجاني</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
