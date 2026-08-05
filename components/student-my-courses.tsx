"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCourseReleaseAt } from "@/lib/course-availability";

export type StudentCourseCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  progress: number;
  lessonsCount: number;
  lessonsLabel: string;
  quizzesCount: number;
  href: string;
  isLocked?: boolean;
  availableAt?: string | null;
};

type StudentMyCoursesProps = {
  courses: StudentCourseCard[];
};

export function StudentMyCourses({ courses }: StudentMyCoursesProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) => course.title.toLowerCase().includes(q));
  }, [courses, query]);

  // Auto-unlock: refresh when the nearest release time arrives
  useEffect(() => {
    const upcoming = courses
      .filter((c) => c.isLocked && c.availableAt)
      .map((c) => new Date(c.availableAt!).getTime())
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b);

    if (upcoming.length === 0) return;

    const delay = Math.min(upcoming[0] - Date.now() + 500, 2_147_000_000);
    const timer = setTimeout(() => {
      router.refresh();
    }, delay);

    return () => clearTimeout(timer);
  }, [courses, router]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">كورساتي</h2>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في كورساتك..."
            className="h-11 border-2 pr-10 focus:border-[#361e01]"
            aria-label="بحث في الكورسات"
          />
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl bg-muted/50 p-8">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              لم تقم بشراء أي كورسات بعد
            </h3>
            <p className="mb-6 text-muted-foreground">
              ابدأ رحلة التعلم بشراء أول كورس لك
            </p>
            <Button
              asChild
              className="bg-[#361e01] font-semibold text-white hover:bg-[#361e01]/90"
            >
              <Link href="/dashboard/search">استكشف الكورسات المتاحة</Link>
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card py-12 text-center">
          <p className="text-muted-foreground">
            لا توجد كورسات مطابقة لـ &quot;{query.trim()}&quot;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="group overflow-hidden rounded-2xl border bg-card shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={course.imageUrl || "/placeholder.png"}
                  alt={course.title}
                  fill
                  className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                    course.isLocked ? "brightness-75" : ""
                  }`}
                />
                {course.isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <div className="rounded-full bg-white/95 p-3 shadow">
                      <Lock className="h-6 w-6 text-[#361e01]" />
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-800 backdrop-blur-sm">
                    {Math.round(course.progress)}%
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="mb-3 line-clamp-2 min-h-[3rem] text-xl font-bold text-gray-900">
                    {course.title}
                  </h3>
                  <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {course.lessonsCount} {course.lessonsLabel}
                      </span>
                    </div>
                    {course.quizzesCount > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <span>
                          {course.quizzesCount}{" "}
                          {course.quizzesCount === 1 ? "اختبار" : "اختبارات"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {course.isLocked && course.availableAt ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                      <div className="mb-1 flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4 shrink-0" />
                        الكورس غير متاح بعد
                      </div>
                      <p className="text-sm leading-relaxed">
                        سيكون متاحاً في{" "}
                        <span className="font-bold">
                          {formatCourseReleaseAt(course.availableAt)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-muted-foreground">
                            التقدم
                          </span>
                          <span className="font-bold text-[#361e01]">
                            {Math.round(course.progress)}%
                          </span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-gray-200">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-[#361e01] to-[#361e01]/80 transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        className="w-full bg-[#361e01] py-3 text-base font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-[#361e01]/90"
                        variant="default"
                        asChild
                      >
                        <Link href={course.href}>متابعة التعلم</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
