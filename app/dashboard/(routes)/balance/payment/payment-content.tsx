"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FawaterakBalanceCheckout } from "@/components/fawaterak/fawaterak-balance-checkout";

export function BalancePaymentContent() {
  const searchParams = useSearchParams();
  const amountParam = searchParams.get("amount");
  const initialAmount =
    amountParam && !Number.isNaN(parseFloat(amountParam))
      ? amountParam
      : undefined;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-[#361e01]">
          <Link href="/dashboard/balance">
            <ArrowRight className="h-4 w-4 ml-1" />
            العودة للرصيد
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">شحن الرصيد</h1>
        <p className="text-muted-foreground mt-1">
          ادفع بالبطاقة، فوري، أو المحافظ الإلكترونية عبر فواتيرك
        </p>
      </div>

      <Card className="border-[#361e01]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            إتمام الدفع
          </CardTitle>
          <CardDescription>
            أدخل المبلغ ثم اضغط ادفع الآن لإكمال العملية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FawaterakBalanceCheckout initialAmount={initialAmount} />
        </CardContent>
      </Card>
    </div>
  );
}
