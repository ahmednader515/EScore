"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function BalancePaymentPendingPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card className="border-[#361e01]/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Clock className="h-12 w-12 text-[#ab8302]" />
          </div>
          <CardTitle style={{ color: "#361e01" }}>الدفع قيد المعالجة</CardTitle>
          <CardDescription>
            بعض طرق الدفع (مثل فوري) تحتاج وقتاً للتأكيد. بعد إتمام الدفع
            سيُضاف الرصيد تلقائياً إلى حسابك.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="bg-[#361e01] hover:bg-[#361e01]/90 text-white">
            <Link href="/dashboard/balance">العودة إلى الرصيد</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
