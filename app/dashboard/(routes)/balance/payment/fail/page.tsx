"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function BalancePaymentFailPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card className="border-[#361e01]/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle style={{ color: "#361e01" }}>فشلت عملية الدفع</CardTitle>
          <CardDescription>
            لم تكتمل العملية. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع
            أخرى.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full bg-[#361e01] hover:bg-[#361e01]/90 text-white">
            <Link href="/dashboard/balance/payment">المحاولة مرة أخرى</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
