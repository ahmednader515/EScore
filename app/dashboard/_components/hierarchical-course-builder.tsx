"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Grip, PlusCircle, Trash2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StaffUser = { id: string; fullName: string; image: string | null };
type UnitItem = {
  id: string;
  title: string;
  position: number;
  isPublished: boolean;
  contentItems: { id: string; title: string; type: string; isPublished: boolean }[];
};
type TeacherItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  position: number;
  userId: string | null;
  units: UnitItem[];
};

interface HierarchicalCourseBuilderProps {
  courseId: string;
  initialTeachers: TeacherItem[];
}

export const HierarchicalCourseBuilder = ({
  courseId,
  initialTeachers,
}: HierarchicalCourseBuilderProps) => {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  useEffect(() => {
    setTeachers(initialTeachers);
  }, [initialTeachers]);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherUserId, setNewTeacherUserId] = useState<string>("");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [unitTitle, setUnitTitle] = useState<Record<string, string>>({});

  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.includes("/dashboard/admin");
  const basePath = isAdmin ? "/dashboard/admin" : "/dashboard/teacher";

  const loadStaffUsers = async () => {
    if (staffUsers.length) return;
    const res = await axios.get("/api/staff-users");
    setStaffUsers(res.data);
  };

  const refresh = () => router.refresh();

  const onCreateTeacher = async () => {
    if (!newTeacherName.trim() && !newTeacherUserId) {
      toast.error("أدخل اسم المدرس أو اختر مستخدم");
      return;
    }
    try {
      setIsUpdating(true);
      await axios.post(`/api/courses/${courseId}/teachers`, {
        name: newTeacherName,
        userId: newTeacherUserId || undefined,
      });
      toast.success("تم إضافة المدرس");
      setNewTeacherName("");
      setNewTeacherUserId("");
      setCreatingTeacher(false);
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onDeleteTeacher = async (teacherId: string) => {
    try {
      setIsUpdating(true);
      await axios.delete(`/api/courses/${courseId}/teachers/${teacherId}`);
      toast.success("تم حذف المدرس");
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onReorderTeachers = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(teachers);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setTeachers(reordered);
    try {
      setIsUpdating(true);
      await axios.put(`/api/courses/${courseId}/teachers/reorder`, {
        list: reordered.map((t, i) => ({ id: t.id, position: i + 1 })),
      });
    } catch {
      toast.error("حدث خطأ في الترتيب");
      refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const onCreateUnit = async (teacherId: string) => {
    const title = unitTitle[teacherId]?.trim();
    if (!title) return;
    try {
      setIsUpdating(true);
      await axios.post(`/api/courses/${courseId}/teachers/${teacherId}/units`, { title });
      toast.success("تم إضافة الوحدة");
      setUnitTitle((prev) => ({ ...prev, [teacherId]: "" }));
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onDeleteUnit = async (teacherId: string, unitId: string) => {
    try {
      setIsUpdating(true);
      await axios.delete(`/api/courses/${courseId}/units/${unitId}`);
      toast.success("تم حذف الوحدة");
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onToggleUnitPublish = async (unitId: string, isPublished: boolean) => {
    try {
      setIsUpdating(true);
      await axios.patch(`/api/courses/${courseId}/units/${unitId}`, { isPublished });
      refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsUpdating(false);
    }
  };

  const onEditUnit = (unitId: string) => {
    router.push(`${basePath}/courses/${courseId}/units/${unitId}`);
  };

  return (
    <div className="relative mt-6 border bg-card rounded-md p-4">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 rounded-md flex items-center justify-center z-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
        </div>
      )}

      <div className="font-medium flex flex-wrap items-center justify-between gap-2 mb-4">
        <span>المدرسون والوحدات</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCreatingTeacher(true);
            loadStaffUsers();
          }}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          إضافة مدرس
        </Button>
      </div>

      {creatingTeacher && (
        <div className="border rounded-md p-4 mb-4 space-y-3">
          <Input
            placeholder="اسم المدرس"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
          />
          <Select value={newTeacherUserId} onValueChange={setNewTeacherUserId}>
            <SelectTrigger>
              <SelectValue placeholder="ربط بحساب مدرس (اختياري)" />
            </SelectTrigger>
            <SelectContent>
              {staffUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={onCreateTeacher}>إضافة</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatingTeacher(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onReorderTeachers}>
        <Droppable droppableId="teachers">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {teachers.map((teacher, index) => (
                <Draggable key={teacher.id} draggableId={teacher.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border rounded-md bg-muted/30"
                    >
                      <div className="flex items-center gap-2 p-3">
                        <div {...provided.dragHandleProps} className="cursor-grab px-1 shrink-0">
                          <Grip className="h-4 w-4" />
                        </div>
                        {teacher.imageUrl && (
                          <Image
                            src={teacher.imageUrl}
                            alt={teacher.name}
                            width={36}
                            height={36}
                            className="rounded-full object-cover shrink-0"
                          />
                        )}
                        <span className="font-medium flex-1 min-w-0 truncate">
                          {teacher.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setExpandedTeacher(
                                expandedTeacher === teacher.id ? null : teacher.id
                              )
                            }
                          >
                            {expandedTeacher === teacher.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDeleteTeacher(teacher.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedTeacher === teacher.id && (
                        <div className="border-t p-3 space-y-3">
                          {teacher.units.map((unit) => (
                            <div
                              key={unit.id}
                              className={cn(
                                "flex flex-col gap-2 p-3 rounded-md bg-background text-sm sm:flex-row sm:items-center sm:gap-2",
                                unit.isPublished && "border border-primary/30"
                              )}
                            >
                              <span className="font-medium min-w-0 break-words sm:flex-1">
                                {unit.title}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="shrink-0">
                                  {unit.contentItems.length} عنصر
                                </Badge>
                                <Badge
                                  className={cn(
                                    "shrink-0",
                                    unit.isPublished &&
                                      "bg-primary text-primary-foreground"
                                  )}
                                >
                                  {unit.isPublished ? "منشور" : "مسودة"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() =>
                                    onToggleUnitPublish(unit.id, !unit.isPublished)
                                  }
                                >
                                  {unit.isPublished ? "إلغاء النشر" : "نشر"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onEditUnit(unit.id)}
                                  aria-label="تعديل الوحدة"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => onDeleteUnit(teacher.id, unit.id)}
                                  aria-label="حذف الوحدة"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              placeholder="عنوان الوحدة"
                              className="sm:flex-1"
                              value={unitTitle[teacher.id] || ""}
                              onChange={(e) =>
                                setUnitTitle((prev) => ({
                                  ...prev,
                                  [teacher.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              className="w-full sm:w-auto shrink-0"
                              onClick={() => onCreateUnit(teacher.id)}
                            >
                              إضافة وحدة
                            </Button>
                          </div>
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

      {teachers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          لا يوجد مدرسون. أضف مدرساً للبدء.
        </p>
      )}
    </div>
  );
};
