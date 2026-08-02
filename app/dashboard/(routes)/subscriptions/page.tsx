"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { Calendar, CheckCircle, CreditCard, Wallet } from "lucide-react";

interface Plan {
  id: string;
  grade: string;
  durationMonths: number;
  price: number;
  label: string | null;
  isActive: boolean;
}

interface ActiveSubscription {
  id: string;
  endsAt: string;
  startsAt: string;
  grade: string;
  durationMonths: number;
  pricePaid: number;
}

interface PlansResponse {
  eligible?: boolean;
  isSecondary: boolean;
  grade: string | null;
  balance: number;
  plans: Plan[];
  activeSubscription: ActiveSubscription | null;
  reason?: "missing_grade" | "unsupported_grade" | "staff" | null;
  role?: string;
}

export default function StudentSubscriptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/subscriptions/plans");
      if (!res.ok) {
        toast.error("حدث خطأ أثناء تحميل خطط الاشتراك");
        return;
      }
      const json: PlansResponse = await res.json();

      // Staff should manage prices on their own subscriptions page
      if (json.reason === "staff") {
        router.replace(
          json.role === "ADMIN"
            ? "/dashboard/admin/subscriptions"
            : "/dashboard/teacher/subscriptions"
        );
        return;
      }

      setData(json);
    } catch {
      toast.error("حدث خطأ أثناء تحميل خطط الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handlePurchase = async (planId: string) => {
    setPurchasingPlanId(planId);
    try {
      const res = await fetch("/api/subscriptions/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("تم تفعيل الاشتراك بنجاح!");
        setData((prev) =>
          prev
            ? {
                ...prev,
                balance: result.newBalance,
                activeSubscription: {
                  id: result.subscriptionId,
                  startsAt: result.startsAt,
                  endsAt: result.endsAt,
                  grade: prev.grade || "",
                  durationMonths: prev.plans.find((p) => p.id === planId)?.durationMonths || 0,
                  pricePaid: result.pricePaid,
                },
              }
            : prev
        );
      } else {
        const error = await res.text();
        if (error.includes("الرصيد غير كاف") || error.includes("Insufficient")) {
          toast.error("رصيد غير كافٍ. يرجى إضافة رصيد إلى حسابك");
        } else {
          toast.error(error || "حدث خطأ أثناء الاشتراك");
        }
      }
    } catch {
      toast.error("حدث خطأ أثناء الاشتراك");
    } finally {
      setPurchasingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#361e01]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        تعذر تحميل بيانات الاشتراك
      </div>
    );
  }

  const eligible = data.eligible ?? data.isSecondary;

  if (!eligible) {
    const missingGrade = data.reason === "missing_grade" || !data.grade;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>الاشتراكات</CardTitle>
            <CardDescription>
              {missingGrade
                ? "يجب تحديد صفك الدراسي في الملف الشخصي أولاً لعرض خطط الاشتراك المناسبة لك."
                : `الاشتراكات غير متاحة لصفك الحالي (${data.grade}). متاحة لطلاب الاعدادي والثانوي.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="bg-[#361e01] hover:bg-[#361e01]/90">
              <Link href="/profile/edit">تعديل الملف الشخصي</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/search">تصفح الكورسات</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasActive = !!data.activeSubscription;
  const endsAtFormatted = data.activeSubscription
    ? new Date(data.activeSubscription.endsAt).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">الاشتراكات</h1>
        <p className="text-muted-foreground">
          اشترك للوصول إلى جميع كورسات صفك ({data.grade}) طوال مدة الاشتراك، بما في ذلك الكورسات الجديدة.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#361e01]" />
            <span className="font-medium">رصيدك:</span>
            <span>{formatPrice(data.balance)}</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/balance/payment">شحن الرصيد</Link>
          </Button>
        </CardContent>
      </Card>

      {hasActive && data.activeSubscription && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              اشتراك نشط
            </CardTitle>
            <CardDescription className="text-green-700">
              يمكنك الوصول لجميع كورسات صفك حتى {endsAtFormatted}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-green-800 flex flex-wrap gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              المدة: {data.activeSubscription.durationMonths}{" "}
              {data.activeSubscription.durationMonths === 1 ? "شهر" : "أشهر"}
            </span>
            <span>الصف: {data.activeSubscription.grade}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.plans.map((plan) => {
          const canBuy = !hasActive && data.balance >= plan.price;
          const needsBalance = !hasActive && data.balance < plan.price;

          return (
            <Card key={plan.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.label || `${plan.durationMonths} شهر`}</CardTitle>
                  <Badge variant="secondary">
                    {plan.durationMonths}{" "}
                    {plan.durationMonths === 1 ? "شهر" : "أشهر"}
                  </Badge>
                </div>
                <CardDescription>{plan.grade}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-[#361e01]">
                  {formatPrice(plan.price)}
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• الوصول لجميع كورسات صفك</li>
                  <li>• يشمل الكورسات المنشورة حالياً والمستقبلية</li>
                  <li>• ينتهي تلقائياً بعد المدة المحددة</li>
                </ul>

                {hasActive ? (
                  <Button disabled className="w-full">
                    لديك اشتراك نشط
                  </Button>
                ) : needsBalance ? (
                  <Button asChild className="w-full bg-[#361e01] hover:bg-[#361e01]/90">
                    <Link href="/dashboard/balance/payment">
                      <CreditCard className="h-4 w-4 ml-2" />
                      شحن الرصيد للاشتراك
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-[#361e01] hover:bg-[#361e01]/90"
                    disabled={!canBuy || purchasingPlanId === plan.id}
                    onClick={() => handlePurchase(plan.id)}
                  >
                    {purchasingPlanId === plan.id
                      ? "جاري التفعيل..."
                      : "اشترك الآن"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data.plans.length === 0 && (
        <p className="text-center text-muted-foreground">
          لا توجد خطط اشتراك متاحة حالياً لصفك.
        </p>
      )}
    </div>
  );
}
