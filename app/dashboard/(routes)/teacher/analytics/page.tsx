"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Loader2, RotateCcw } from "lucide-react";
import axios from "axios";
import { useTheme } from "next-themes";
import { toast } from "sonner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CourseAnalytic {
  id: string;
  title: string;
  sales: number;
  revenue: number;
  completionRate: number;
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface AnalyticsData {
  totalRevenue: number;
  totalSales: number;
  courseCount: number;
  courseAnalytics: CourseAnalytic[];
  revenueData: ChartData;
  salesData: ChartData;
}

const emptyAnalytics: AnalyticsData = {
  totalRevenue: 0,
  totalSales: 0,
  courseCount: 0,
  courseAnalytics: [],
  revenueData: {
    labels: [],
    datasets: [
      {
        label: "الإيرادات",
        data: [],
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  },
  salesData: {
    labels: [],
    datasets: [
      {
        label: "Sales",
        data: [],
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(16, 185, 129, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  },
};

const AnalyticsPage = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/teacher/analytics");
      setAnalytics(response.data);
    } catch (error) {
      console.error("[ANALYTICS_PAGE] Error fetching analytics:", error);
      toast.error("فشل تحميل الإحصائيات");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleReset = async () => {
    if (!password.trim()) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/teacher/analytics/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || "فشل إعادة تعيين الإحصائيات");
        return;
      }

      toast.success("تم إعادة تعيين الإحصائيات بنجاح");
      setResetOpen(false);
      setPassword("");
      await fetchAnalytics();
    } catch {
      toast.error("حدث خطأ أثناء إعادة التعيين");
    } finally {
      setIsResetting(false);
    }
  };

  const textColor = theme === "dark" ? "white" : "#334155";
  const gridColor =
    theme === "dark"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(100, 116, 139, 0.2)";

  const barOptions = {
    responsive: true,
    color: textColor,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: "إيرادات الكورس",
        color: textColor,
        font: {
          family: "Inter, sans-serif",
          size: 16,
          weight: "bold" as const,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    color: textColor,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: "توزيع المبيعات",
        color: textColor,
        font: {
          family: "Inter, sans-serif",
          size: 16,
          weight: "bold" as const,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">لوحة الاحصائيات</h1>
          <p className="text-sm text-muted-foreground">التحليلات الخاصة بك</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            setPassword("");
            setResetOpen(true);
          }}
        >
          <RotateCcw className="h-4 w-4 ml-2" />
          إعادة تعيين الإحصائيات
        </Button>
      </div>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setPassword("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد إعادة التعيين</DialogTitle>
            <DialogDescription>
              سيتم تصفير أرقام المبيعات والإيرادات من الآن فصاعدًا. لن يتم حذف
              اشتراكات الطلاب أو وصولهم للكورسات. أدخل كلمة مرور حسابك للمتابعة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="analytics-reset-password">كلمة المرور</Label>
            <Input
              id="analytics-reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleReset();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={isResetting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting || !password.trim()}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التعيين...
                </>
              ) : (
                "تأكيد إعادة التعيين"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-blue-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            إجمالي الإيرادات
          </h3>
          <p className="text-3xl font-bold">
            EGP {analytics.totalRevenue.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6 bg-green-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            إجمالي المبيعات
          </h3>
          <p className="text-3xl font-bold">{analytics.totalSales}</p>
        </Card>
        <Card className="p-6 bg-amber-50 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">
            الكورسات المنشورة
          </h3>
          <p className="text-3xl font-bold">{analytics.courseCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">الإيرادات بالكورس</h3>
          <div className="h-80">
            <Bar options={barOptions} data={analytics.revenueData} />
          </div>
        </Card>
        <Card className="p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">توزيع المبيعات</h3>
          <div className="h-80 flex items-center justify-center">
            <Pie options={pieOptions} data={analytics.salesData} />
          </div>
        </Card>
      </div>

      <Card className="p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">أداء الكورس</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">الكورس</th>
                <th className="text-center py-3 px-2">المبيعات</th>
                <th className="text-center py-3 px-2">الإيرادات</th>
                <th className="text-center py-3 px-2">معدل الاكتمال</th>
              </tr>
            </thead>
            <tbody>
              {analytics.courseAnalytics.map((course) => (
                <tr
                  key={course.id}
                  className="border-b hover:bg-slate-50 transition"
                >
                  <td className="py-3 px-2">{course.title}</td>
                  <td className="text-center py-3 px-2">{course.sales}</td>
                  <td className="text-center py-3 px-2">
                    EGP {course.revenue.toFixed(2)}
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2 max-w-[150px]">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${course.completionRate}%` }}
                        ></div>
                      </div>
                      <span>{course.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
