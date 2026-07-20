"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SharedQuiz = {
  id: string;
  title: string;
  position: number;
  isPublished: boolean;
  isFree?: boolean;
};

interface SharedQuizzesFormProps {
  courseId: string;
  initialQuizzes: SharedQuiz[];
}

export const SharedQuizzesForm = ({
  courseId,
  initialQuizzes,
}: SharedQuizzesFormProps) => {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.includes("/dashboard/admin");
  const basePath = isAdmin ? "/dashboard/admin" : "/dashboard/teacher";

  useEffect(() => {
    setQuizzes(initialQuizzes);
  }, [initialQuizzes]);

  const onCreate = () => {
    router.push(`${basePath}/quizzes/create?courseId=${courseId}`);
  };

  const onEdit = (quizId: string) => {
    router.push(`${basePath}/quizzes/${quizId}/edit`);
  };

  const onDelete = async (quizId: string) => {
    try {
      setIsUpdating(true);
      await axios.delete(`/api/teacher/quizzes/${quizId}`);
      toast.success("تم حذف الاختبار");
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onTogglePublish = async (quizId: string, isPublished: boolean) => {
    try {
      setIsUpdating(true);
      await axios.patch(`/api/teacher/quizzes/${quizId}/publish`, {
        isPublished: !isPublished,
      });
      toast.success(!isPublished ? "تم نشر الاختبار" : "تم إلغاء النشر");
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative mt-6 border bg-card rounded-md p-4">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 rounded-md flex items-center justify-center z-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
        </div>
      )}

      <div className="font-medium flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <span>الاختبارات المشتركة</span>
          <p className="text-xs text-muted-foreground font-normal mt-1">
            تظهر لجميع الطلاب في صفحة الكورس، وليست مرتبطة بمدرس أو وحدة
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          إضافة اختبار مشترك
        </Button>
      </div>

      <div className="space-y-3 mt-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className={cn(
              "flex flex-col gap-2 p-3 rounded-md bg-muted/30 text-sm sm:flex-row sm:items-center",
              quiz.isPublished && "border border-primary/30"
            )}
          >
            <span className="font-medium min-w-0 break-words sm:flex-1">
              {quiz.title}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {quiz.isFree && (
                <Badge variant="outline" className="shrink-0">
                  مجاني
                </Badge>
              )}
              <Badge
                className={cn(
                  "shrink-0",
                  quiz.isPublished && "bg-primary text-primary-foreground"
                )}
              >
                {quiz.isPublished ? "منشور" : "مسودة"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onTogglePublish(quiz.id, quiz.isPublished)}
              >
                {quiz.isPublished ? "إلغاء النشر" : "نشر"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(quiz.id)}
                aria-label="تعديل الاختبار"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(quiz.id)}
                aria-label="حذف الاختبار"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {quizzes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            لا توجد اختبارات مشتركة بعد.
          </p>
        )}
      </div>
    </div>
  );
};
