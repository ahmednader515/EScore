import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitContentForm } from "@/app/dashboard/_components/unit-content-form";

export default async function AdminUnitPage({
  params,
}: {
  params: Promise<{ courseId: string; unitId: string }>;
}) {
  const { courseId, unitId } = await params;
  const { userId, user } = await auth();

  if (!userId) return redirect("/");
  if (user?.role !== "ADMIN") return redirect("/dashboard/admin/users");

  const unit = await db.unit.findUnique({
    where: { id: unitId, courseId },
    include: {
      contentItems: { orderBy: { position: "asc" } },
      teacher: { select: { name: true } },
    },
  });

  if (!unit) return redirect(`/dashboard/admin/courses/${courseId}`);

  return (
    <div className="p-6">
      <Link href={`/dashboard/admin/courses/${courseId}`}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          الرجوع إلى إعدادات الكورس
        </Button>
      </Link>
      <h1 className="text-2xl font-medium mb-2">{unit.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        المدرس: {unit.teacher?.name}
      </p>
      <UnitContentForm
        courseId={courseId}
        unitId={unitId}
        initialItems={unit.contentItems}
      />
    </div>
  );
}
