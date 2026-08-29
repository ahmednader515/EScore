"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface StudentAttempt {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  attemptsUsed: number;
  quizDefaultMaxAttempts: number;
  customMaxAttempts: number | null;
  effectiveMaxAttempts: number;
}

interface QuizStudentAttemptsManagerProps {
  quizId: string;
}

export function QuizStudentAttemptsManager({
  quizId,
}: QuizStudentAttemptsManagerProps) {
  const [students, setStudents] = useState<StudentAttempt[]>([]);
  const [quizDefaultMaxAttempts, setQuizDefaultMaxAttempts] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editStudent, setEditStudent] = useState<StudentAttempt | null>(null);
  const [editMaxAttempts, setEditMaxAttempts] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStudentAttempts = async () => {
    try {
      const response = await fetch(
        `/api/teacher/quizzes/${quizId}/student-attempts`
      );
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setQuizDefaultMaxAttempts(data.quizDefaultMaxAttempts ?? 1);
      } else {
        toast.error("حدث خطأ أثناء تحميل محاولات الطلاب");
      }
    } catch (error) {
      console.error("Error fetching student attempts:", error);
      toast.error("حدث خطأ أثناء تحميل محاولات الطلاب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizId) {
      fetchStudentAttempts();
    }
  }, [quizId]);

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phoneNumber.includes(searchTerm)
  );

  const openEditDialog = (student: StudentAttempt) => {
    setEditStudent(student);
    setEditMaxAttempts(String(student.effectiveMaxAttempts));
  };

  const handleSave = async () => {
    if (!editStudent) return;

    const maxAttempts = parseInt(editMaxAttempts, 10);
    if (Number.isNaN(maxAttempts) || maxAttempts < 1) {
      toast.error("يجب إدخال عدد محاولات صحيح (1 على الأقل)");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/teacher/quizzes/${quizId}/student-attempts/${editStudent.studentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxAttempts }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("تم تحديث عدد المحاولات");
        setEditStudent(null);
        fetchStudentAttempts();
      } else {
        toast.error(data.error || "حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      console.error("Error saving attempt limit:", error);
      toast.error("حدث خطأ أثناء التحديث");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (student: StudentAttempt) => {
    if (student.customMaxAttempts === null) return;

    try {
      const response = await fetch(
        `/api/teacher/quizzes/${quizId}/student-attempts/${student.studentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("تم إعادة المحاولات للإعداد الافتراضي");
        fetchStudentAttempts();
      } else {
        const data = await response.json();
        toast.error(data.error || "حدث خطأ أثناء الإعادة");
      }
    } catch (error) {
      console.error("Error resetting attempt limit:", error);
      toast.error("حدث خطأ أثناء الإعادة");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          جاري تحميل محاولات الطلاب...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>إدارة محاولات الطلاب</CardTitle>
          <p className="text-sm text-muted-foreground">
            الإعداد الافتراضي للاختبار: {quizDefaultMaxAttempts} محاولة
            {quizDefaultMaxAttempts > 1 ? "" : ""}
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              لا يوجد طلاب مرتبطون بهذا الاختبار
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الطالب</TableHead>
                  <TableHead className="text-right">المحاولات المستخدمة</TableHead>
                  <TableHead className="text-right">الحد الأقصى</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>
                      <div className="font-medium">{student.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.phoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>{student.attemptsUsed}</TableCell>
                    <TableCell>{student.effectiveMaxAttempts}</TableCell>
                    <TableCell>
                      {student.customMaxAttempts !== null ? (
                        <Badge variant="default">مخصص</Badge>
                      ) : (
                        <Badge variant="secondary">
                          افتراضي ({student.quizDefaultMaxAttempts})
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(student)}
                        >
                          <Pencil className="h-4 w-4 ml-1" />
                          تعديل
                        </Button>
                        {student.customMaxAttempts !== null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReset(student)}
                          >
                            <RotateCcw className="h-4 w-4 ml-1" />
                            افتراضي
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل عدد المحاولات</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                الطالب: {editStudent.fullName} — المحاولات المستخدمة:{" "}
                {editStudent.attemptsUsed}
              </p>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">عدد المحاولات المسموحة</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min={Math.max(1, editStudent.attemptsUsed)}
                  value={editMaxAttempts}
                  onChange={(e) => setEditMaxAttempts(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
