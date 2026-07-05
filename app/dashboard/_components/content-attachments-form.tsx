"use client";

import { useState, useEffect } from "react";
import { FileText, Pencil, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import toast from "react-hot-toast";

interface ContentAttachment {
  id: string;
  name: string;
  url: string;
  position: number;
}

interface ContentAttachmentsFormProps {
  initialData: { attachments: ContentAttachment[] };
  courseId: string;
  unitId: string;
  contentId: string;
}

export const ContentAttachmentsForm = ({
  initialData,
  courseId,
  unitId,
  contentId,
}: ContentAttachmentsFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<ContentAttachment[]>(
    initialData.attachments || []
  );

  const apiBase = `/api/courses/${courseId}/units/${unitId}/content/${contentId}/attachments`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setAttachments(initialData.attachments || []);
  }, [initialData.attachments]);

  const onSubmitUpload = async (url: string, name: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name }),
      });
      if (!response.ok) throw new Error("Failed");
      const newAttachment = await response.json();
      setAttachments((prev) => [...prev, newAttachment]);
      toast.success("تم رفع المستند بنجاح");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (attachmentId: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${apiBase}/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("تم حذف المستند");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  const renderAttachment = (attachment: ContentAttachment, showDelete: boolean) => (
    <div
      key={attachment.id}
      className="flex items-center p-3 w-full bg-secondary/50 border-secondary/50 border text-secondary-foreground rounded-md"
    >
      <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">مستند الدرس</p>
      </div>
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(attachment.url, "_blank")}
        >
          عرض
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={attachment.url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-3 w-3 mr-1" />
            تحميل
          </a>
        </Button>
        {showDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(attachment.id)}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-6 border bg-card rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        مستندات الدرس
        <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
          {isEditing ? (
            <>إلغاء</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              إدارة المستندات
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="mt-2 space-y-2">
          {attachments.length > 0 ? (
            attachments.map((a) => renderAttachment(a, false))
          ) : (
            <p className="text-sm mt-2 text-muted-foreground italic">
              لا توجد مستندات مرفوعة
            </p>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            {attachments.map((a) => renderAttachment(a, true))}
          </div>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
            <FileUpload
              endpoint="courseAttachment"
              onChange={(res) => {
                if (res) onSubmitUpload(res.url, res.name);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
