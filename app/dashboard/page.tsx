import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Course, Purchase } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getDashboardUrlByRole } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Play, Clock, Trophy, Wallet, TrendingUp, BookOpen as BookOpenIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getCourseLink } from "@/lib/course-access";
import { getHierarchicalProgress } from "@/lib/course-hierarchy";
import { StudentReelsFab } from "@/components/student-reels-fab";
import { RedeemPromocodeCard } from "@/components/redeem-promocode-card";
import { StudentMyCourses } from "@/components/student-my-courses";
import { subscriptionCoversCourse } from "@/lib/subscriptions";
import { isStudentViewEnabled } from "@/lib/student-view";

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
  courseTeachers?: {
    id: string;
    units: { id: string; contentItems: { id: string }[] }[];
  }[];
}

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
}

const CoursesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect staff to their dashboard unless student-view mode is enabled
  if (session.user.role !== "USER") {
    const cookieStore = await cookies();
    if (!isStudentViewEnabled(cookieStore)) {
      const dashboardUrl = getDashboardUrlByRole(session.user.role);
      return redirect(dashboardUrl);
    }
  }

  // Get user's current balance
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true, grade: true }
  });

  const activeSubscriptions = await db.subscription.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      endsAt: { gt: new Date() },
    },
    select: {
      status: true,
      endsAt: true,
      grade: true,
    },
  });

  const hasActiveSubscription = activeSubscriptions.length > 0;

  // Get the latest active global notification for this student's grade (if any)
  const now = new Date();
  const grade = user?.grade ?? null;
  const globalNotification = await db.globalNotification.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        grade
          ? { OR: [{ targetGrades: { isEmpty: true } }, { targetGrades: { has: grade } }] }
          : { targetGrades: { isEmpty: true } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, message: true },
  });

  // Get last watched chapter
  const lastWatchedChapter = await db.userProgress.findFirst({
    where: {
      userId: session.user.id,
      isCompleted: false // Get the last incomplete chapter
    },
    include: {
      chapter: {
        include: {
          course: {
            select: {
              title: true,
              imageUrl: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  // Get student statistics
  const totalCourses = await db.purchase.count({
    where: {
      userId: session.user.id,
      status: "ACTIVE"
    }
  });

  const totalChapters = await db.userProgress.count({
    where: {
      userId: session.user.id
    }
  });

  const completedChapters = await db.userProgress.count({
    where: {
      userId: session.user.id,
      isCompleted: true
    }
  });

  // Get total quizzes from courses the student has purchased
  const totalQuizzes = await db.quiz.count({
    where: {
      course: {
        purchases: {
          some: {
            userId: session.user.id,
            status: "ACTIVE"
          }
        }
      },
      isPublished: true
    }
  });

  // Get unique completed quizzes by using findMany and counting the results
  const completedQuizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true
    }
  });

  // Count unique quizIds
  const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
  const completedQuizzes = uniqueQuizIds.size;

  // Calculate average score from quiz results (using best attempt for each quiz)
  const quizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true,
      percentage: true
    },
    orderBy: {
      percentage: 'desc' // Order by percentage descending to get best attempts first
    }
  });

  // Get only the best attempt for each quiz
  const bestAttempts = new Map();
  quizResults.forEach(result => {
    if (!bestAttempts.has(result.quizId)) {
      bestAttempts.set(result.quizId, result.percentage);
    }
  });

  const averageScore = bestAttempts.size > 0 
    ? Math.round(Array.from(bestAttempts.values()).reduce((sum, percentage) => sum + percentage, 0) / bestAttempts.size)
    : 0;

  const studentStats: StudentStats = {
    totalCourses,
    totalChapters,
    completedChapters,
    totalQuizzes,
    completedQuizzes,
    averageScore
  };

  const courses = await db.course.findMany({
    where: {
      isPublished: true,
      OR: [
        {
          purchases: {
            some: {
              userId: session.user.id,
              status: "ACTIVE",
            },
          },
        },
        ...(hasActiveSubscription
          ? [
              {
                OR: [
                  { grade: "الكل" },
                  ...activeSubscriptions.map((sub) => ({
                    grade: sub.grade,
                  })),
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        select: {
          id: true,
        }
      },
      quizzes: {
        where: {
          isPublished: true,
        },
        select: {
          id: true,
        }
      },
      purchases: {
        where: {
          userId: session.user.id,
        }
      },
      courseTeachers: {
        orderBy: { position: "asc" },
        include: {
          units: {
            where: { isPublished: true },
            include: {
              contentItems: {
                where: { isPublished: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  // Filter subscription matches by grade
  const accessibleCourses = courses.filter((course) => {
    const purchased = course.purchases.some((p) => p.status === "ACTIVE");
    if (purchased) return true;
    return activeSubscriptions.some((sub) =>
      subscriptionCoversCourse(sub, {
        grade: course.grade,
      })
    );
  });

  studentStats.totalCourses = Math.max(studentStats.totalCourses, accessibleCourses.length);

  const coursesWithProgress = await Promise.all(
    accessibleCourses.map(async (course) => {
      if (course.courseType === "HIERARCHICAL") {
        const { progress } = await getHierarchicalProgress(
          session.user.id,
          course.id
        );
        return { ...course, progress } as CourseWithProgress;
      }

      const totalChapters = course.chapters.length;
      const totalQuizzes = course.quizzes.length;
      const totalContent = totalChapters + totalQuizzes;

      const completedChapters = await db.userProgress.count({
        where: {
          userId: session.user.id,
          chapterId: {
            in: course.chapters.map(chapter => chapter.id)
          },
          isCompleted: true
        }
      });

      // Get unique completed quizzes by using findMany and counting the results
      const completedQuizResults = await db.quizResult.findMany({
        where: {
          studentId: session.user.id,
          quizId: {
            in: course.quizzes.map(quiz => quiz.id)
          }
        },
        select: {
          quizId: true
        }
      });

      // Count unique quizIds
      const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
      const completedQuizzes = uniqueQuizIds.size;

      const completedContent = completedChapters + completedQuizzes;

      const progress = totalContent > 0 
        ? (completedContent / totalContent) * 100 
        : 0;

      return {
        ...course,
        progress
      } as CourseWithProgress;
    })
  );

  const myCourses = coursesWithProgress.map((course) => ({
    id: course.id,
    title: course.title,
    imageUrl: course.imageUrl,
    progress: course.progress,
    chaptersCount: course.chapters.length,
    quizzesCount: course.quizzes.length,
    href: getCourseLink(course, { subscriptions: activeSubscriptions }).href,
  }));

  return (
    <div className="p-6 space-y-6">
      <StudentReelsFab />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground">حلها... يمكن تطلع الإجابة صح!</p>
      </div>

      {/* Global Notification Banner */}
      {globalNotification && (
        <Alert className="border-2 border-[#ab8302] bg-gradient-to-r from-[#fff7d1] to-[#fff0b3] shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 rounded-full bg-[#ab8302] text-white flex items-center justify-center text-lg font-bold">
              !
            </div>
            <div className="w-full">
              <AlertTitle className="text-xl md:text-2xl font-extrabold text-[#361e01]">
                {globalNotification.title}
              </AlertTitle>
              <AlertDescription className="text-base md:text-lg text-[#361e01]/90 whitespace-pre-line">
                {globalNotification.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* My Courses — top */}
      <StudentMyCourses courses={myCourses} />

      {/* Stats and Balance Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">الرصيد الحالي</p>
              <p className="text-2xl font-bold">{user?.balance?.toFixed(2) || "0.00"} جنيه</p>
            </div>
            <Wallet className="h-8 w-8 text-green-200" />
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">الكورسات المشتراة</p>
              <p className="text-2xl font-bold">{studentStats.totalCourses}</p>
            </div>
            <BookOpenIcon className="h-8 w-8 text-green-200" />
          </div>
        </div>

        {/* Completed Chapters */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">الفصول المكتملة</p>
              <p className="text-2xl font-bold">{studentStats.completedChapters}</p>
            </div>
            <Trophy className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">متوسط الدرجات</p>
              <p className="text-2xl font-bold">{studentStats.averageScore}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Last Watched Chapter - Big Square */}
      {lastWatchedChapter && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">آخر فصل كنت تشاهده</h2>
          <div className="bg-card rounded-xl overflow-hidden border shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image Section */}
              <div className="relative h-64 lg:h-full">
                <Image
                  src={lastWatchedChapter.chapter.course.imageUrl || "/placeholder.png"}
                  alt={lastWatchedChapter.chapter.course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 flex flex-col justify-center">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {lastWatchedChapter.chapter.course.title}
                  </p>
                  <h3 className="text-2xl font-bold mb-2">
                    {lastWatchedChapter.chapter.title}
                  </h3>
                  <p className="text-muted-foreground">
                    الفصل رقم {lastWatchedChapter.chapter.position}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>آخر مشاهدة منذ ساعة</span>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#361e01] hover:bg-[#361e01]/90 text-white" 
                    size="lg"
                    asChild
                  >
                    <Link href={`/courses/${lastWatchedChapter.chapter.courseId}/chapters/${lastWatchedChapter.chapter.id}`}>
                      <Play className="h-4 w-4 ml-2" />
                      متابعة المشاهدة
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">إحصائيات التعلم</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <BookOpenIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفصول</p>
                <p className="text-2xl font-bold">{studentStats.totalChapters}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedChapters / Math.max(studentStats.totalChapters, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedChapters} من {studentStats.totalChapters} مكتمل
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الاختبارات المكتملة</p>
                <p className="text-2xl font-bold">{studentStats.completedQuizzes}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedQuizzes / Math.max(studentStats.totalQuizzes, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedQuizzes} من {studentStats.totalQuizzes} مكتمل
            </p>
          </div>

          <RedeemPromocodeCard />
        </div>
      </div>
    </div>
  );
}

export default CoursesPage; 