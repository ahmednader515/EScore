import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { assertCourseStaffAccess } from "@/lib/course-staff";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const { courseId } = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const access = await assertCourseStaffAccess(courseId, userId, user?.role);
        if ("error" in access) {
            return new NextResponse(access.error, { status: access.status });
        }

        const course = await db.course.findUnique({
            where: { id: courseId },
            include: {
                chapters: { select: { isPublished: true } },
                units: {
                    include: {
                        contentItems: { select: { isPublished: true } },
                    },
                },
            },
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        if (!course.isPublished) {
            const hasPublishedChapters = course.chapters.some(
                (chapter) => chapter.isPublished
            );
            const hasPublishedContent = course.units.some((unit) =>
                unit.contentItems.some((item) => item.isPublished)
            );

            const hasPublishedMaterial =
                course.courseType === "HIERARCHICAL"
                    ? hasPublishedContent
                    : hasPublishedChapters;

            if (
                !course.title ||
                !course.description ||
                !course.imageUrl ||
                !hasPublishedMaterial
            ) {
                return new NextResponse("Missing required fields", { status: 400 });
            }
        }

        const publishedCourse = await db.course.update({
            where: { id: courseId },
            data: { isPublished: !course.isPublished },
        });

        return NextResponse.json(publishedCourse);
    } catch (error) {
        console.log("[COURSE_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
