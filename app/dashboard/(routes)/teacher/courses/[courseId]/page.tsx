import { IconBadge } from "@/components/icon-badge";
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { LayoutDashboard } from "lucide-react";
import { redirect } from "next/navigation";
import { TitleForm } from "./_components/title-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { PriceForm } from "./_components/price-form";
import { CourseGradeDivisionForm } from "./_components/course-grade-division-form";
import { CourseContentForm } from "./_components/course-content-form";
import { Banner } from "@/components/banner";
import { Actions } from "./_components/actions";
import { HierarchicalCourseBuilder } from "@/app/dashboard/_components/hierarchical-course-builder";
import { SharedQuizzesForm } from "@/app/dashboard/_components/shared-quizzes-form";
import { CourseTypeForm } from "@/app/dashboard/_components/course-type-form";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export default async function CourseIdPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    const { userId, user } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const course = await db.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            chapters: {
                orderBy: {
                    position: "asc",
                },
            },
            quizzes: {
                where: {
                    unitId: null,
                },
                orderBy: {
                    position: "asc",
                },
            },
            courseTeachers: {
                orderBy: { position: "asc" },
                include: {
                    units: {
                        orderBy: { position: "asc" },
                        include: {
                            contentItems: { orderBy: { position: "asc" } },
                        },
                    },
                },
            },
        }
    });

    if (!course) {
        return redirect("/");
    }

    if (!isStaff(user?.role)) {
        return redirect("/dashboard");
    }

    // Grade is complete if set (including "الكل")
    const hasGrade = !!course.grade;

    if (user?.role !== "ADMIN" && course.userId !== userId) {
        return redirect("/dashboard");
    }

    const isHierarchical = course.courseType === "HIERARCHICAL";

    const hasPublishedHierarchicalContent = course.courseTeachers.some((teacher) =>
        teacher.units.some((unit) =>
            unit.isPublished &&
            unit.contentItems.some((item) => item.isPublished)
        )
    );

    const hasContent = isHierarchical
        ? course.courseTeachers.length > 0
        : course.chapters.length > 0 || course.quizzes.length > 0;

    const requiredFields = [
        !!course.title,
        !!course.description,
        !!course.imageUrl,
        course.price !== null && course.price !== undefined,
        isHierarchical
            ? hasPublishedHierarchicalContent
            : course.chapters.some((chapter) => chapter.isPublished),
        hasGrade,
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;

    const completionText = `(${completedFields}/${totalFields})`;

    const isComplete = requiredFields.every(Boolean);

    // Create detailed completion status
    const completionStatus = {
        title: !!course.title,
        description: !!course.description,
        imageUrl: !!course.imageUrl,
        price: course.price !== null && course.price !== undefined,
        publishedChapters: isHierarchical
            ? hasPublishedHierarchicalContent
            : course.chapters.some((chapter) => chapter.isPublished),
        grade: hasGrade
    };

    return (
        <>
            {!course.isPublished && (
                <Banner
                    variant="warning"
                    label="هذه الكورس غير منشورة. لن تكون مرئية للطلاب."
                />
            )}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-y-2">
                        <h1 className="text-2xl font-medium">
                            إعداد الكورس
                        </h1>
                        <span className="text-sm text-slate-700">
                            أكمل جميع الحقول {completionText}
                        </span>
                        {!isComplete && (
                            <div className="text-xs text-muted-foreground mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={`flex items-center gap-1 ${completionStatus.title ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.title ? '✓' : '✗'}</span>
                                        <span>العنوان</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.description ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.description ? '✓' : '✗'}</span>
                                        <span>الوصف</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.imageUrl ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.imageUrl ? '✓' : '✗'}</span>
                                        <span>الصورة</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.price ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.price ? '✓' : '✗'}</span>
                                        <span>السعر</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.publishedChapters ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.publishedChapters ? '✓' : '✗'}</span>
                                        <span>{isHierarchical ? "محتوى منشور" : "فصل منشور"}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.grade ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{completionStatus.grade ? '✓' : '✗'}</span>
                                        <span>الصف الدراسي</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <Actions
                        disabled={!isComplete}
                        courseId={courseId}
                        isPublished={course.isPublished}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={LayoutDashboard} />
                            <h2 className="text-xl">
                                تخصيص دورتك
                            </h2>
                        </div>
                        <TitleForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <DescriptionForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <PriceForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <CourseGradeDivisionForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <CourseTypeForm
                            initialData={course}
                            courseId={course.id}
                            hasContent={hasContent}
                        />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    {isHierarchical ? "المدرسون والوحدات" : "الموارد والفصول"}
                                </h2>
                            </div>
                            {isHierarchical ? (
                                <HierarchicalCourseBuilder
                                    courseId={course.id}
                                    initialTeachers={course.courseTeachers}
                                />
                            ) : (
                                <CourseContentForm
                                    initialData={course}
                                    courseId={course.id}
                                />
                            )}
                        </div>
                        {isHierarchical && (
                            <div>
                                <div className="flex items-center gap-x-2">
                                    <IconBadge icon={LayoutDashboard} />
                                    <h2 className="text-xl">
                                        الاختبارات المشتركة
                                    </h2>
                                </div>
                                <SharedQuizzesForm
                                    courseId={course.id}
                                    initialQuizzes={course.quizzes}
                                />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    إعدادات الكورس
                                </h2>
                            </div>
                            <ImageForm
                                initialData={course}
                                courseId={course.id}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}