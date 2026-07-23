import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Video, Files, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";
import { ContentItemForm } from "@/app/dashboard/_components/content-item-form";
import { ContentVideoForm } from "@/app/dashboard/_components/content-video-form";
import { ContentAttachmentsForm } from "@/app/dashboard/_components/content-attachments-form";
import { ContentImageForm } from "@/app/dashboard/_components/content-image-form";

export default async function ContentItemEditorPage({
  params,
  basePath,
}: {
  params: Promise<{ courseId: string; unitId: string; contentId: string }>;
  basePath: "/dashboard/teacher" | "/dashboard/admin";
}) {
  const { courseId, unitId, contentId } = await params;
  const { userId, user } = await auth();

  if (!userId) return redirect("/");

  const item = await db.contentItem.findFirst({
    where: { id: contentId, unitId, unit: { courseId } },
    include: {
      unit: { select: { title: true } },
      attachments: { orderBy: { position: "asc" } },
    },
  });

  if (!item) return redirect(`${basePath}/courses/${courseId}/units/${unitId}`);

  if (user?.role === "TEACHER") {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { userId: true },
    });
    if (!course || course.userId !== userId) return redirect("/dashboard");
  } else if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  if (item.type !== "VIDEO") {
    return redirect(`${basePath}/courses/${courseId}/units/${unitId}`);
  }

  const requiredFields = [
    item.title,
    item.description,
    item.videoUrl || item.youtubeVideoId,
  ];
  const completedFields = requiredFields.filter(Boolean).length;

  return (
    <div className="p-6">
      <Link href={`${basePath}/courses/${courseId}/units/${unitId}`}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          الرجوع إلى {item.unit.title}
        </Button>
      </Link>
      <h1 className="text-2xl font-medium mb-2">إعدادات الدرس</h1>
      <span className="text-sm text-muted-foreground">
        أكمل جميع الحقول ({completedFields}/{requiredFields.length})
      </span>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        <div>
          <ContentItemForm
            initialData={item}
            courseId={courseId}
            unitId={unitId}
            contentId={contentId}
          />
          <div className="mt-6">
            <div className="flex items-center gap-x-2">
              <IconBadge icon={ImageIcon} />
              <h2 className="text-xl">صورة الدرس</h2>
            </div>
            <ContentImageForm
              initialData={item}
              courseId={courseId}
              unitId={unitId}
              contentId={contentId}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-x-2">
              <IconBadge icon={Video} />
              <h2 className="text-xl">إضافة فيديو</h2>
            </div>
            <ContentVideoForm
              initialData={item}
              courseId={courseId}
              unitId={unitId}
              contentId={contentId}
            />
          </div>
          <div>
            <div className="flex items-center gap-x-2">
              <IconBadge icon={Files} />
              <h2 className="text-xl">مستندات الدرس</h2>
            </div>
            <ContentAttachmentsForm
              initialData={{ attachments: item.attachments }}
              courseId={courseId}
              unitId={unitId}
              contentId={contentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
