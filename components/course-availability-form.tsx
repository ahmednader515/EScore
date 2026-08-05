"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCourseReleaseAt,
  toDateTimeLocalValue,
} from "@/lib/course-availability";

type AvailabilityFormProps = {
  courseId: string;
  initialData: {
    centerAvailableAt: Date | string | null;
    onlineAvailableAt: Date | string | null;
  };
};

export function CourseAvailabilityForm({
  courseId,
  initialData,
}: AvailabilityFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [centerAvailableAt, setCenterAvailableAt] = useState(
    toDateTimeLocalValue(initialData.centerAvailableAt)
  );
  const [onlineAvailableAt, setOnlineAvailableAt] = useState(
    toDateTimeLocalValue(initialData.onlineAvailableAt)
  );

  const toggleEdit = () => {
    setCenterAvailableAt(toDateTimeLocalValue(initialData.centerAvailableAt));
    setOnlineAvailableAt(toDateTimeLocalValue(initialData.onlineAvailableAt));
    setIsEditing((current) => !current);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.patch(`/api/courses/${courseId}`, {
        centerAvailableAt: centerAvailableAt
          ? new Date(centerAvailableAt).toISOString()
          : null,
        onlineAvailableAt: onlineAvailableAt
          ? new Date(onlineAvailableAt).toISOString()
          : null,
      });
      toast.success("تم تحديث مواعيد ظهور الكورس");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearField = (field: "center" | "online") => {
    if (field === "center") setCenterAvailableAt("");
    else setOnlineAvailableAt("");
  };

  return (
    <div className="mt-6 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between font-medium">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          مواعيد ظهور الكورس
        </span>
        <Button onClick={toggleEdit} variant="ghost" type="button">
          {isEditing ? (
            "إلغاء"
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              تعديل
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">سنتر: </span>
            {initialData.centerAvailableAt
              ? formatCourseReleaseAt(initialData.centerAvailableAt)
              : "متاح فوراً"}
          </p>
          <p>
            <span className="font-medium text-foreground">أون لاين: </span>
            {initialData.onlineAvailableAt
              ? formatCourseReleaseAt(initialData.onlineAvailableAt)
              : "متاح فوراً"}
          </p>
          <p className="text-xs">
            اترك الحقل فارغاً ليظهر الكورس فوراً لهذا النوع من الطلاب.
          </p>
        </div>
      )}

      {isEditing && (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="centerAvailableAt">موعد ظهور كورس السنتر</Label>
            <div className="flex gap-2">
              <Input
                id="centerAvailableAt"
                type="datetime-local"
                value={centerAvailableAt}
                onChange={(e) => setCenterAvailableAt(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => clearField("center")}
              >
                فوري
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onlineAvailableAt">موعد ظهور كورس الأون لاين</Label>
            <div className="flex gap-2">
              <Input
                id="onlineAvailableAt"
                type="datetime-local"
                value={onlineAvailableAt}
                onChange={(e) => setOnlineAvailableAt(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => clearField("online")}
              >
                فوري
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#361e01] text-white hover:bg-[#361e01]/90"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ المواعيد"}
          </Button>
        </form>
      )}
    </div>
  );
}
