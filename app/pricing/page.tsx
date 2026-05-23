"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Wallet } from "lucide-react";
import { InfoPageLayout } from "@/components/info-page-layout";
import { Button } from "@/components/ui/button";
import { SITE_INFO } from "@/lib/site-info";

type PublicCourse = {
  id: string;
  title: string;
  price?: number | null;
  imageUrl?: string | null;
};

export default function PricingPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/courses/public");
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch {
        // keep empty list
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <InfoPageLayout
      title="الأسعار"
      subtitle={`جميع الأسعار بالـ ${SITE_INFO.currencyLabel} (${SITE_INFO.currency})`}
    >
      <p>
        تقدّم منصة {SITE_INFO.platformName} محتوى تعليمي رقمي. يمكنك شراء الكورسات
        مباشرة أو شحن رصيد المحفظة ثم الشراء من داخل الحساب. الدفع الإلكتروني
        سيتم عبر بوابة فواتيرك (قريبًا).
      </p>

      <h2>شحن الرصيد (المحفظة)</h2>
      <div className="not-prose p-5 rounded-xl border border-[#361e01]/20 bg-[#fcfaed] mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Wallet className="h-8 w-8 text-[#361e01]" />
          <h3 className="font-bold text-xl m-0" style={{ color: "#361e01" }}>
            رصيد المحفظة
          </h3>
        </div>
        <p className="text-[#361e01]/90 m-0 mb-4">
          اختر المبلغ الذي تريد شحنه (الحد الأدنى 1 {SITE_INFO.currency}).
          يُستخدم الرصيد لشراء أي كورس متاح على المنصة.
        </p>
        <Button asChild className="bg-[#361e01] hover:bg-[#361e01]/90 text-white">
          <Link href="/sign-in?callbackUrl=/dashboard/balance/payment">
            شحن الرصيد (يتطلب تسجيل الدخول)
          </Link>
        </Button>
      </div>

      <h2>أسعار الكورسات</h2>
      <p className="text-sm text-muted-foreground mb-4">
        الأسعار أدناه لكل كورس منشور. قد تُطبَّق أكواد خصم عند الشراء.
      </p>

      {loading ? (
        <div className="not-prose grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-muted animate-pulse border border-[#361e01]/10"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground">
          لا توجد كورسات منشورة بأسعار حالياً. تابع الصفحة الرئيسية أو سجّل
          حساباً للإشعار عند الإطلاق.
        </p>
      ) : (
        <ul className="not-prose grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex gap-4 p-4 rounded-xl border border-[#361e01]/20 bg-white shadow-sm"
            >
              <div className="relative w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.imageUrl || "/placeholder.png"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold text-base line-clamp-2 mb-1"
                  style={{ color: "#361e01" }}
                >
                  {course.title}
                </h3>
                <p className="font-bold text-lg text-[#ab8302] mb-2">
                  {course.price != null && course.price > 0
                    ? `${course.price} ${SITE_INFO.currency}`
                    : "مجاني"}
                </p>
                <Link
                  href={`/sign-in?callbackUrl=${encodeURIComponent(`/courses/${course.id}/purchase`)}`}
                  className="text-sm text-[#361e01] hover:underline inline-flex items-center gap-1"
                >
                  <BookOpen className="h-4 w-4" />
                  عرض الكورس
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>طرق الدفع</h2>
      <ul>
        <li>بطاقات بنكية ومحافظ إلكترونية عبر فواتيرك (عند التفعيل)</li>
        <li>الشراء من رصيد المحفظة بعد الشحن</li>
      </ul>

      <h2>ملاحظات</h2>
      <ul>
        <li>الأسعار لا تشمل ضريبة إضافية ما لم يُذكر خلاف ذلك على صفحة الدفع</li>
        <li>قد تختلف السعر النهائي بعد تطبيق كود الخصم</li>
        <li>
          للاسترداد راجع{" "}
          <Link href="/refund-policy" className="text-[#ab8302] hover:underline">
            سياسة الاسترجاع
          </Link>
        </li>
      </ul>
    </InfoPageLayout>
  );
}
