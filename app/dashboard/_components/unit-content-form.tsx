"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Grip, Pencil, PlusCircle, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityAvailabilityForm } from "@/components/course-availability-form";

type ContentItemData = {
  id: string;
  type: string;
  title: string;
  position: number;
  isPublished: boolean;
  isFree: boolean;
  centerAvailableAt?: Date | string | null;
  onlineAvailableAt?: Date | string | null;
  videoUrl: string | null;
  videoType: string | null;
  youtubeVideoId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  quizId: string | null;
};

interface UnitContentFormProps {
  courseId: string;
  unitId: string;
  initialItems: ContentItemData[];
}

const typeLabels: Record<string, string> = {
  VIDEO: "درس",
  PDF: "PDF",
  ASSIGNMENT: "اختبار",
};

export const UnitContentForm = ({
  courseId,
  unitId,
  initialItems,
}: UnitContentFormProps) => {
  const [items, setItems] = useState(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState("VIDEO");
  const [newTitle, setNewTitle] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.includes("/dashboard/admin");
  const basePath = isAdmin ? "/dashboard/admin" : "/dashboard/teacher";

  const refresh = () => router.refresh();

  const onCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      setIsUpdating(true);
      const { data } = await axios.post(
        `/api/courses/${courseId}/units/${unitId}/content`,
        { type: newType, title: newTitle }
      );
      toast.success("تم إضافة المحتوى");
      setNewTitle("");
      setCreating(false);
      if (newType === "VIDEO") {
        router.push(
          `${basePath}/courses/${courseId}/units/${unitId}/content/${data.id}`
        );
      } else {
        refresh();
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onDelete = async (contentId: string) => {
    try {
      setIsUpdating(true);
      await axios.delete(
        `/api/courses/${courseId}/units/${unitId}/content/${contentId}`
      );
      toast.success("تم الحذف");
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onTogglePublish = async (item: ContentItemData) => {
    try {
      setIsUpdating(true);
      await axios.patch(
        `/api/courses/${courseId}/units/${unitId}/content/${item.id}`,
        { isPublished: !item.isPublished }
      );
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onToggleFree = async (item: ContentItemData) => {
    try {
      setIsUpdating(true);
      await axios.patch(
        `/api/courses/${courseId}/units/${unitId}/content/${item.id}`,
        { isFree: !item.isFree }
      );
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };


  const onPdfUpload = async (contentId: string, res?: { url: string; name: string }) => {
    if (!res?.url) return;
    await axios.patch(
      `/api/courses/${courseId}/units/${unitId}/content/${contentId}`,
      { fileUrl: res.url, fileName: res.name || itemTitle(contentId) }
    );
    refresh();
  };

  const itemTitle = (contentId: string) =>
    initialItems.find((i) => i.id === contentId)?.title ?? "file";

  const onReorder = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
    try {
      setIsUpdating(true);
      await axios.put(`/api/courses/${courseId}/units/${unitId}/content/reorder`, {
        list: reordered.map((item, i) => ({ id: item.id, position: i + 1 })),
      });
    } catch {
      toast.error("حدث خطأ");
      refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const onEditQuiz = (quizId: string) => {
    router.push(`${basePath}/quizzes/${quizId}/edit`);
  };

  const onEditContent = (item: ContentItemData) => {
    if (item.type === "VIDEO") {
      router.push(
        `${basePath}/courses/${courseId}/units/${unitId}/content/${item.id}`
      );
      return;
    }
    if (item.type === "ASSIGNMENT" && item.quizId) {
      onEditQuiz(item.quizId);
    }
  };

  return (
    <div className="relative border bg-card rounded-md p-4 mt-6">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 rounded-md flex items-center justify-center z-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
        </div>
      )}

      <div className="font-medium flex items-center justify-between mb-4">
        محتوى الوحدة
        <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          إضافة محتوى
        </Button>
      </div>

      {creating && (
        <div className="border rounded-md p-4 mb-4 space-y-3">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIDEO">درس (فيديو)</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="ASSIGNMENT">اختبار / واجب</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="العنوان"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onCreate}>إضافة</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onReorder}>
        <Droppable droppableId="unit-content">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {initialItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "border rounded-md mb-3 p-3 bg-muted/20",
                        item.isPublished && "border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div {...provided.dragHandleProps}>
                          <Grip className="h-4 w-4" />
                        </div>
                        <span className="flex-1 font-medium">{item.title}</span>
                        <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                        {item.isFree && <Badge>مجاني</Badge>}
                        <Badge className={cn(item.isPublished && "bg-primary text-primary-foreground")}>
                          {item.isPublished ? "منشور" : "مسودة"}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => onTogglePublish(item)}>
                          {item.isPublished ? "إلغاء" : "نشر"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onToggleFree(item)}>
                          {item.isFree ? "مدفوع" : "مجاني"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSchedulingId(
                              schedulingId === item.id ? null : item.id
                            )
                          }
                          title="مواعيد الظهور"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        {(item.type === "VIDEO" || item.type === "ASSIGNMENT") && (
                          <Pencil
                            className="h-4 w-4 cursor-pointer"
                            onClick={() => onEditContent(item)}
                          />
                        )}
                        <Trash2
                          className="h-4 w-4 cursor-pointer text-destructive"
                          onClick={() => onDelete(item.id)}
                        />
                      </div>

                      {schedulingId === item.id && (
                        <EntityAvailabilityForm
                          patchUrl={`/api/courses/${courseId}/units/${unitId}/content/${item.id}`}
                          entityLabel={typeLabels[item.type] || "المحتوى"}
                          initialData={{
                            centerAvailableAt: item.centerAvailableAt ?? null,
                            onlineAvailableAt: item.onlineAvailableAt ?? null,
                          }}
                          className="mt-3"
                        />
                      )}

                      {item.type === "PDF" && (
                        <div className="mt-3">
                          <FileUpload
                            endpoint="courseAttachment"
                            onChange={(res) => onPdfUpload(item.id, res)}
                          />
                          {item.fileUrl && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.fileName || item.fileUrl}
                            </p>
                          )}
                        </div>
                      )}

                      {item.type === "VIDEO" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          انقر على أيقونة التعديل لإعداد الفيديو والصورة والوصف والمستندات
                        </p>
                      )}

                      {item.type === "ASSIGNMENT" && item.quizId && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditQuiz(item.quizId!)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل الاختبار
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
