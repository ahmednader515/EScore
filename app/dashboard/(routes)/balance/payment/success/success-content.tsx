"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { sanitizeInternalNextPath } from "@/lib/fawaterak/sanitize";

export function BalancePaymentSuccessContent() {
  const searchParams = useSearchParams();
  const next = sanitizeInternalNextPath(searchParams.get("next"));

  useEffect(() => {
    if (window.self !== window.top) {
      window.top!.location.replace(
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card className="border-[#361e01]/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle style={{ color: "#361e01" }}>تم الدفع بنجاح</CardTitle>
          <CardDescription>
            إذا لم يظهر الرصيد فوراً، انتظر بضع ثوانٍ ثم حدّث الصفحة. يتم
            إضافة الرصيد تلقائياً بعد تأكيد فواتيرك.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            asChild
            className="bg-[#361e01] hover:bg-[#361e01]/90 text-white"
          >
            <Link href={next}>العودة إلى الرصيد</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
