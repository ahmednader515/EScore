"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, PlusCircle, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type SharedQuiz = {
  id: string;
  title: string;
  position: number;
  isPublished: boolean;
  isFree?: boolean;
  isGlobalShared?: boolean;
  sharedUnitPosition?: number | null;
  sharedAfterPosition?: number | null;
};

interface SharedQuizzesFormProps {
  courseId: string;
  initialQuizzes: SharedQuiz[];
  teachers: { id: string; name: string; units: { position: number; title: string; contentItems: { position: number; title: string }[] }[] }[];
}

export const SharedQuizzesForm = ({
  courseId,
  initialQuizzes,
  teachers,
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
            اربط الاختبار بموضع داخل الوحدة ليظهر بنفس الأسئلة والنتائج في مسار كل مدرس. النجاح فيه يفتح المحتوى التالي عند الجميع.
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
              <span className="flex flex-wrap items-center gap-2">
                {quiz.title}
                {quiz.isGlobalShared && quiz.sharedUnitPosition != null && quiz.sharedAfterPosition != null ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    تم تحديد الموضع
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    لم يتم تحديد الموضع
                  </span>
                )}
              </span>
              {quiz.isGlobalShared && (
                <span className="block mt-1 text-xs text-primary">
                  {quiz.sharedAfterPosition === 0
                    ? "بداية الوحدة"
                    : <>بعد المحتوى: <bdi>{teachers[0]?.units
                        .find((unit) => unit.position === quiz.sharedUnitPosition)
                        ?.contentItems.find((item) => item.position === quiz.sharedAfterPosition)
                        ?.title ?? "محتوى غير متاح"}</bdi></>}
                </span>
              )}
            </span>
            <SharedPlacementEditor quiz={quiz} teachers={teachers} onSaved={() => router.refresh()} />
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

function SharedPlacementEditor({ quiz, teachers, onSaved }: {
  quiz: SharedQuiz;
  teachers: SharedQuizzesFormProps["teachers"];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [unitPosition, setUnitPosition] = useState(String(quiz.sharedUnitPosition ?? ""));
  const [afterPosition, setAfterPosition] = useState(String(quiz.sharedAfterPosition ?? 0));
  const [saving, setSaving] = useState(false);
  const units = (teachers[0]?.units ?? []).filter((unit) => teachers.every((teacher) => teacher.units.filter((candidate) => candidate.position === unit.position).length === 1));
  const unit = units.find((candidate) => candidate.position === Number(unitPosition));
  const positions = (unit?.contentItems ?? []).filter((item) => teachers.every((teacher) => teacher.units.find((candidate) => candidate.position === unit?.position)?.contentItems.some((candidate) => candidate.position === item.position)));
  const save = async (enabled: boolean) => {
    setSaving(true);
    try {
      await axios.patch(`/api/teacher/quizzes/${quiz.id}/placement`, {
        isGlobalShared: enabled,
        sharedUnitPosition: Number(unitPosition), sharedAfterPosition: Number(afterPosition),
      });
      toast.success(enabled ? "تم دمج الاختبار في مسارات جميع المدرسين" : "تم إلغاء دمج الاختبار");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(axios.isAxiosError(error) && typeof error.response?.data === "string" ? error.response.data : "تعذر حفظ موضع الاختبار");
    } finally { setSaving(false); }
  };
  if (!editing) return <Button size="sm" variant="outline" onClick={() => setEditing(true)}>موضع الاختبار</Button>;
  return <div className="space-y-2 rounded-md border p-3 w-full sm:max-w-sm">
    <p className="text-xs text-muted-foreground">اختر الوحدة والمحتوى المقابلين عند كل المدرسين. الأسماء المعروضة من مسار {teachers[0]?.name}.</p>
    <label className="block text-xs">الوحدة
      <select className="block w-full mt-1 border rounded p-2 bg-background" value={unitPosition} onChange={(event) => { setUnitPosition(event.target.value); setAfterPosition("0"); }} disabled={saving}>
        <option value="">اختر الوحدة</option>
        {units.map((candidate) => <option key={candidate.position} value={candidate.position}>{candidate.title}</option>)}
      </select>
    </label>
    <label className="block text-xs">يظهر الاختبار بعد
      <select className="block w-full mt-1 border rounded p-2 bg-background" value={afterPosition} onChange={(event) => setAfterPosition(event.target.value)} disabled={saving || !unit}>
        <option value="0">بداية الوحدة</option>
        {positions.map((item) => <option key={item.position} value={item.position}>{item.title}</option>)}
      </select>
    </label>
    <p className="text-xs text-muted-foreground">يجب إكمال المحتوى السابق واجتياز هذا الاختبار بنسبة 50% لفتح ما بعده في أي مسار.</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={saving || !unit} onClick={() => save(true)}>حفظ الموضع للجميع</Button>
      {quiz.isGlobalShared && <Button size="sm" variant="outline" disabled={saving} onClick={() => save(false)}>إلغاء الدمج</Button>}
      <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>إلغاء</Button>
    </div>
  </div>;
}
