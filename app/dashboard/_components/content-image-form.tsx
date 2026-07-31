"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ImageIcon, Pencil, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";

interface ContentImageFormProps {
  initialData: { imageUrl: string | null };
  courseId: string;
  unitId: string;
  contentId: string;
}

export const ContentImageForm = ({
  initialData,
  courseId,
  unitId,
  contentId,
}: ContentImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const onSubmit = async (values: { imageUrl: string }) => {
    try {
      await axios.patch(
        `/api/courses/${courseId}/units/${unitId}/content/${contentId}`,
        values
      );
      toast.success("تم تحديث صورة الدرس");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  return (
    <div className="mt-6 border bg-card rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        صورة الدرس
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && <>إلغاء</>}
          {!isEditing && !initialData.imageUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              إضافة صورة
            </>
          )}
          {!isEditing && initialData.imageUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              تعديل الصورة
            </>
          )}
        </Button>
      </div>

      {!isEditing &&
        (!initialData.imageUrl ? (
          <div className="flex items-center justify-center h-60 bg-muted rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            <Image
              alt="صورة الدرس"
              fill
              className="object-cover rounded-md"
              src={initialData.imageUrl}
            />
          </div>
        ))}

      {isEditing && (
        <div>
          <FileUpload
            endpoint="courseImage"
            onChange={(res) => {
              if (res) {
                onSubmit({ imageUrl: res.url });
              }
            }}
          />
          <div className="text-xs text-muted-foreground mt-4">
            النسبة العرضية 16:9 موصى بها
          </div>
        </div>
      )}
    </div>
  );
};
