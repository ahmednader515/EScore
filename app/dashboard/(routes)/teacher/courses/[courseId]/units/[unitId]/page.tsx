import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitContentForm } from "@/app/dashboard/_components/unit-content-form";
import { EntityAvailabilityForm } from "@/components/course-availability-form";

const isStaff = (role?: string | null) => role === "ADMIN" || role === "TEACHER";

export default async function TeacherUnitPage({
  params,
}: {
  params: Promise<{ courseId: string; unitId: string }>;
}) {
  const { courseId, unitId } = await params;
  const { userId, user } = await auth();

  if (!userId) return redirect("/");
  if (!isStaff(user?.role)) return redirect("/dashboard");

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { userId: true },
  });

  if (!course || (user?.role !== "ADMIN" && course.userId !== userId)) {
    return redirect("/dashboard");
  }

  const unit = await db.unit.findUnique({
    where: { id: unitId, courseId },
    include: {
      contentItems: { orderBy: { position: "asc" } },
      teacher: { select: { name: true } },
    },
  });

  if (!unit) return redirect(`/dashboard/teacher/courses/${courseId}`);

  return (
    <div className="p-6">
      <Link href={`/dashboard/teacher/courses/${courseId}`}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          الرجوع إلى إعدادات الكورس
        </Button>
      </Link>
      <h1 className="text-2xl font-medium mb-2">{unit.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        المدرس: {unit.teacher?.name}
      </p>
      <EntityAvailabilityForm
        patchUrl={`/api/courses/${courseId}/units/${unitId}`}
        entityLabel="الوحدة"
        initialData={{
          centerAvailableAt: unit.centerAvailableAt,
          onlineAvailableAt: unit.onlineAvailableAt,
        }}
        className="mt-0 mb-6"
      />
      <UnitContentForm
        courseId={courseId}
        unitId={unitId}
        initialItems={unit.contentItems}
      />
    </div>
  );
}
