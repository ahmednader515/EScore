"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, Award, TrendingUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface QuizResult {
  id: string;
  quizId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  attemptNumber: number;
  submittedAt: string;
  quiz: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
  answers: QuizAnswer[];
}

interface QuizAnswer {
  questionId: string;
  question: {
    text: string;
    type: string;
    points: number;
  };
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

const StudentGradesPage = () => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchQuizResults();
  }, []);

  const fetchQuizResults = async () => {
    try {
      const response = await fetch("/api/user/quiz-results");
      if (response.ok) {
        const data = await response.json();
        setQuizResults(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
    } finally {
      setLoading(false);
    }
  };

  const courses = Array.from(
    new Map(
      quizResults.map((r) => [r.quiz.course.id, r.quiz.course])
    ).values()
  );

  const filteredResults = quizResults.filter((result) => {
    const matchesSearch =
      result.quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.quiz.course.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse =
      selectedCourse === "all" || result.quiz.course.id === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  const uniqueQuizzes = new Set(quizResults.map((r) => r.quizId)).size;

  const averagePercentage =
    quizResults.length > 0
      ? Math.round(
          quizResults.reduce((sum, r) => sum + r.percentage, 0) /
            quizResults.length
        )
      : 0;

  const bestPercentage =
    quizResults.length > 0
      ? Math.max(...quizResults.map((r) => r.percentage))
      : 0;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 70) return "text-green-400";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 90)
      return { variant: "default" as const, className: "bg-green-600 text-white" };
    if (percentage >= 80)
      return { variant: "default" as const, className: "bg-green-500 text-white" };
    if (percentage >= 70)
      return { variant: "default" as const, className: "bg-green-400 text-white" };
    if (percentage >= 60)
      return { variant: "default" as const, className: "bg-orange-600 text-white" };
    return { variant: "destructive" as const, className: "" };
  };

  const handleViewResult = (result: QuizResult) => {
    setSelectedResult(result);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          درجاتي
        </h1>
        <p className="text-muted-foreground mt-1">
          عرض نتائج الاختبارات التي أكملتها
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  الاختبارات المكتملة
                </p>
                <p className="text-2xl font-bold">{quizResults.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {uniqueQuizzes} اختبار مختلف
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  متوسط الدرجات
                </p>
                <p className="text-2xl font-bold">{averagePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  أعلى درجة
                </p>
                <p className="text-2xl font-bold">{bestPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تصفية النتائج</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث</label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="البحث بالاختبار أو الكورس..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الكورس</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الكورسات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الكورسات</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نتائج الاختبارات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاختبار</TableHead>
                <TableHead className="text-right">الكورس</TableHead>
                <TableHead className="text-right">المحاولة</TableHead>
                <TableHead className="text-right">الدرجة</TableHead>
                <TableHead className="text-right">النسبة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {quizResults.length === 0
                      ? "لم تكمل أي اختبار بعد"
                      : "لا توجد نتائج تطابق البحث"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((result) => {
                  const gradeBadge = getGradeBadge(result.percentage);
                  return (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        {result.quiz.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {result.quiz.course.title}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {result.attemptNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">
                          {result.score}/{result.totalPoints}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge {...gradeBadge}>{result.percentage}%</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(result.submittedAt), "dd/MM/yyyy", {
                          locale: ar,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewResult(result)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            تفاصيل
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link
                              href={`/courses/${result.quiz.course.id}/quizzes/${result.quizId}/result`}
                            >
                              عرض
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedResult?.quiz.title} — {selectedResult?.quiz.course.title}
            </DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ملخص النتيجة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedResult.score}/{selectedResult.totalPoints}
                      </div>
                      <div className="text-sm text-muted-foreground">الدرجة</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getGradeColor(selectedResult.percentage)}`}
                      >
                        {selectedResult.percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        النسبة المئوية
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          selectedResult.answers.filter((a) => a.isCorrect)
                            .length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        إجابات صحيحة
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {
                          selectedResult.answers.filter((a) => !a.isCorrect)
                            .length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        إجابات خاطئة
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">التقدم العام</span>
                      <span className="text-sm font-medium">
                        {selectedResult.percentage}%
                      </span>
                    </div>
                    <Progress
                      value={selectedResult.percentage}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الإجابات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedResult.answers.map((answer, index) => (
                      <div
                        key={answer.questionId}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">السؤال {index + 1}</h4>
                          <Badge
                            variant={
                              answer.isCorrect ? "default" : "destructive"
                            }
                          >
                            {answer.isCorrect ? "صحيح" : "خاطئ"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {answer.question.text}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">إجابتك:</span>
                            <p className="text-muted-foreground">
                              {answer.studentAnswer}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">
                              الإجابة الصحيحة:
                            </span>
                            <p className="text-green-600">
                              {answer.correctAnswer}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">الدرجات:</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {answer.pointsEarned}/{answer.question.points}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentGradesPage;
