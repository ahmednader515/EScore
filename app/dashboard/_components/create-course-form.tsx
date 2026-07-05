"use client";

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
import { CourseType } from "@prisma/client";

interface CreateCourseFormProps {
  editorBasePath: "/dashboard/admin" | "/dashboard/teacher";
  title?: string;
}

export const CreateCourseForm = ({
  editorBasePath,
  title = "إنشاء كورس جديد",
}: CreateCourseFormProps) => {
  const [courseType, setCourseType] = useState<CourseType>("FLAT");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onCreate = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.post("/api/courses", {
        title: "كورس غير معرفة",
        courseType,
      });
      toast.success("تم إنشاء الكورس");
      router.push(`${editorBasePath}/courses/${data.id}`);
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-16 space-y-6 border rounded-md bg-card">
      <h1 className="text-xl font-medium">{title}</h1>
      <div className="space-y-2">
        <label className="text-sm font-medium">نوع الكورس</label>
        <Select
          value={courseType}
          onValueChange={(v) => setCourseType(v as CourseType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FLAT">مسطح (فصول واختبارات)</SelectItem>
            <SelectItem value="HIERARCHICAL">
              هرمي (مدرسون → وحدات → محتوى)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onCreate} disabled={isLoading} className="w-full">
        إنشاء الكورس
      </Button>
    </div>
  );
};
