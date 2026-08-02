"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

const formSchema = z.object({
  grade: z.string().optional(),
});

interface CourseGradeDivisionFormProps {
  initialData: Course;
  courseId: string;
}

export const CourseGradeDivisionForm = ({
  initialData,
  courseId,
}: CourseGradeDivisionFormProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grade: initialData.grade || "",
    },
  });

  const toggleEdit = () => {
    if (isEditing) {
      form.reset({ grade: initialData.grade || "" });
    }
    setIsEditing((current) => !current);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/courses/${courseId}`, {
        grade: values.grade || null,
      });
      toast.success("تم تحديث الصف الدراسي");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("حدث خطأ ما");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        الصف الدراسي
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>إلغاء</>
          ) : (
            <>
              <Pencil className="h-4 w-4 ml-2" />
              تعديل الصف
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <p className="text-sm mt-2">
          {initialData.grade || "لم يتم تحديد الصف"}
        </p>
      )}
      {isEditing && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الصف الدراسي</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصف" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="الكل">الكل (جميع الصفوف)</SelectItem>
                      <SelectItem value="الاول الاعدادي">
                        الاول الاعدادي
                      </SelectItem>
                      <SelectItem value="الثاني الاعدادي">
                        الثاني الاعدادي
                      </SelectItem>
                      <SelectItem value="الثالث الاعدادي">
                        الثالث الاعدادي
                      </SelectItem>
                      <SelectItem value="الأول الثانوي">الأول الثانوي</SelectItem>
                      <SelectItem value="الثاني الثانوي">
                        الثاني الثانوي
                      </SelectItem>
                      <SelectItem value="الثالث الثانوي">
                        الثالث الثانوي
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    حدد الصف الذي يستهدف هذا الكورس
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-x-2">
              <Button disabled={isLoading} type="submit">
                حفظ
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
