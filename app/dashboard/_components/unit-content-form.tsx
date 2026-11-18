"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Grip, Pencil, PlusCircle, Trash2, Clock, Eye, EyeOff, LockKeyhole, LockKeyholeOpen } from "lucide-react";
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
  sharedQuizzes?: { id: string; title: string; isPublished: boolean; sharedAfterPosition: number | null }[];
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
  sharedQuizzes = [],
}: UnitContentFormProps) => {
  const [items, setItems] = useState(initialItems);
  useEffect(() => { setItems(initialItems); }, [initialItems]);
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

  const renderShared = (after: number) => sharedQuizzes.filter((quiz) => quiz.sharedAfterPosition === after).map((quiz) => (
    <div key={quiz.id} className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-2">
      <span className="flex-1 font-medium">{quiz.title}</span>
      <Badge variant="outline">موحد لجميع المدرسين</Badge>
      <Badge>{quiz.isPublished ? "منشور" : "مسودة"}</Badge>
      <Button size="sm" variant="outline" onClick={() => onEditQuiz(quiz.id)}>تعديل الاختبار للجميع</Button>
      <p className="w-full text-xs text-muted-foreground">موضع مشترك ثابت بعد المحتوى رقم {after}. لتغيير الموضع، افتح الاختبارات المشتركة في إعدادات الكورس.</p>
    </div>
  ));

  return (
    <div className="relative border bg-card rounded-md p-4 mt-6">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 rounded-md flex items-center justify-center z-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
        </div>
      )}

      <div className="font-medium flex flex-wrap items-center justify-between gap-2 mb-4">
        محتوى الوحدة
        <Button size="sm" className="h-10" onClick={() => setCreating(true)}>
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
              {renderShared(0)}
              {items.map((item, index) => (
                <Fragment key={item.id}>
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "overflow-hidden border rounded-lg mb-3 bg-background shadow-sm",
                        item.isPublished && "border-primary/30"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3 p-4">
                        <div {...provided.dragHandleProps} className="shrink-0 cursor-grab rounded-md border bg-muted/50 p-2 text-muted-foreground" title="اسحب لترتيب المحتوى">
                          <Grip className="h-4 w-4" />
                        </div>
                        <span className="min-w-0 flex-1 break-words text-base font-semibold">{item.title}</span>
                        <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                        {item.isFree && <Badge>مجاني</Badge>}
                        <Badge className={cn(item.isPublished && "bg-primary text-primary-foreground")}>
                          {item.isPublished ? "منشور" : "مسودة"}
                        </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-4 py-3">
                        {(item.type === "VIDEO" || (item.type === "ASSIGNMENT" && item.quizId)) && (
                          <Button size="sm" className="h-10 flex-1 sm:flex-none" onClick={() => onEditContent(item)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            {item.type === "ASSIGNMENT" ? "تعديل الاختبار" : "تعديل المحتوى"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-10 flex-1 sm:flex-none",
                            !item.isPublished && "border-emerald-600/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200"
                          )}
                          onClick={() => onTogglePublish(item)}
                        >
                          {item.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                          {item.isPublished ? "إلغاء النشر" : "نشر المحتوى"}
                        </Button>
                        <Button variant="outline" size="sm" className="h-10" onClick={() => onToggleFree(item)}>
                          {item.isFree ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />}
                          {item.isFree ? "جعله مدفوعًا" : "جعله مجانيًا"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10"
                          aria-expanded={schedulingId === item.id}
                          onClick={() =>
                            setSchedulingId(
                              schedulingId === item.id ? null : item.id
                            )
                          }
                          title="مواعيد الظهور"
                        >
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          مواعيد الظهور
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ms-auto"
                          onClick={() => onDelete(item.id)}
                          aria-label="حذف المحتوى"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          حذف
                        </Button>
                      </div>

                      {schedulingId === item.id && (
                        <EntityAvailabilityForm
                          patchUrl={`/api/courses/${courseId}/units/${unitId}/content/${item.id}`}
                          entityLabel={typeLabels[item.type] || "المحتوى"}
                          initialData={{
                            centerAvailableAt: item.centerAvailableAt ?? null,
                            onlineAvailableAt: item.onlineAvailableAt ?? null,
                          }}
                          className="m-4"
                        />
                      )}

                      {item.type === "PDF" && (
                        <div className="p-4">
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
                        <p className="px-4 py-3 text-xs text-muted-foreground">
                          انقر على تعديل المحتوى لإعداد الفيديو والصورة والوصف والمستندات
                        </p>
                      )}
                    </div>
                  )}
                </Draggable>
                {renderShared(item.position)}
                </Fragment>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
