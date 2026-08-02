import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getHierarchicalProgress } from "@/lib/course-hierarchy";

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const { title, courseType } = await req.json();

        if(!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.create({
            data: {
                userId,
                title: title || "كورس غير معرفة",
                courseType: courseType === "HIERARCHICAL" ? "HIERARCHICAL" : "FLAT",
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[Courses]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';
    
    // Try to get user, but don't fail if not authenticated
    let userId = null;
    let student = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      
      // Get student's grade for filtering
      if (userId) {
        student = await db.user.findUnique({
          where: { id: userId },
          select: { grade: true, role: true }
        });
      }
    } catch (error) {
      // User is not authenticated, which is fine for the home page
      console.log("User not authenticated, showing courses without progress");
    }

    // Build where clause for course filtering
    // If user is a student, filter by grade
    // If course has no grade (old courses), show to everyone (backward compatibility)
    // If user is teacher/admin or not authenticated, show all published courses
    const whereClause: any = {
      isPublished: true,
    };

    // Filter by student's grade if they're a regular user
    if (student && student.role === "USER" && student.grade) {
      whereClause.OR = [
        // Courses for all grades (الكل)
        { grade: "الكل" },
        { grade: student.grade },
        // Old courses: no grade set yet (backward compatibility)
        { grade: null },
      ];
    }

    const courses = await db.course.findMany({
      where: whereClause,
      include: {
        user: true,
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
        purchases: includeProgress && userId ? {
          where: {
            userId: userId,
            status: "ACTIVE"
          }
        } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (includeProgress && userId) {
      const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
          if (course.courseType === "HIERARCHICAL") {
            const { progress } = await getHierarchicalProgress(userId!, course.id);
            return { ...course, progress };
          }

          const totalChapters = course.chapters.length;
          const totalQuizzes = course.quizzes.length;
          const totalContent = totalChapters + totalQuizzes;

          let completedChapters = 0;
          let completedQuizzes = 0;

          if (course.purchases && course.purchases.length > 0) {
            // Get completed chapters
            completedChapters = await db.userProgress.count({
              where: {
                userId,
                chapterId: {
                  in: course.chapters.map(chapter => chapter.id)
                },
                isCompleted: true
              }
            });

            // Get completed quizzes
            const completedQuizResults = await db.quizResult.findMany({
                where: {
                    studentId: userId,
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
            completedQuizzes = uniqueQuizIds.size;
          }

          const completedContent = completedChapters + completedQuizzes;
          const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

          return {
            ...course,
            progress
          };
        })
      );

      return NextResponse.json(coursesWithProgress);
    }

    // For unauthenticated users, return courses without progress
    const coursesWithoutProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    return NextResponse.json(coursesWithoutProgress);
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}