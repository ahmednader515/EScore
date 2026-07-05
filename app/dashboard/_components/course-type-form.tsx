"use client";

import { Course, CourseType } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface CourseTypeFormProps {
  initialData: Course;
  courseId: string;
  hasContent: boolean;
}

export const CourseTypeForm = ({
  initialData,
  courseId,
  hasContent,
}: CourseTypeFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courseType, setCourseType] = useState<CourseType>(
    initialData.courseType ?? "FLAT"
  );
  const router = useRouter();

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/courses/${courseId}`, { courseType });
      toast.success("تم تحديث نوع الكورس");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 border bg-card rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        نوع الكورس
        {!hasContent && (
          <Button variant="ghost" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "إلغاء" : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                تعديل
              </>
            )}
          </Button>
        )}
      </div>
      {!isEditing && (
        <p className="text-sm mt-2 text-muted-foreground">
          {courseType === "HIERARCHICAL" ? "هرمي (مدرسون → وحدات → محتوى)" : "مسطح (فصول واختبارات)"}
        </p>
      )}
      {isEditing && (
        <div className="space-y-4 mt-4">
          <Select
            value={courseType}
            onValueChange={(v) => setCourseType(v as CourseType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الكورس" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FLAT">مسطح</SelectItem>
              <SelectItem value="HIERARCHICAL">هرمي</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onSubmit} disabled={isLoading} size="sm">
            حفظ
          </Button>
        </div>
      )}
      {hasContent && (
        <p className="text-xs text-muted-foreground mt-2">
          لا يمكن تغيير نوع الكورس بعد إضافة محتوى.
        </p>
      )}
    </div>
  );
};
