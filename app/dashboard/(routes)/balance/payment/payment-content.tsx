"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FawaterakBalanceCheckout } from "@/components/fawaterak/fawaterak-balance-checkout";

export function BalancePaymentContent() {
  const searchParams = useSearchParams();
  const amountParam = searchParams.get("amount");
  const initialAmount =
    amountParam && !Number.isNaN(parseFloat(amountParam))
      ? amountParam
      : undefined;

  return (
    <div
      className="mx-auto w-full max-w-2xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-4 md:max-w-4xl md:py-6 lg:max-w-6xl lg:px-6 xl:max-w-7xl"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-[#361e01]">
          <Link href="/dashboard/balance">
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة للرصيد
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">شحن الرصيد</h1>
        <p className="mt-1 text-muted-foreground">
          ادفع بالبطاقة، فوري، أو المحافظ الإلكترونية عبر فواتيرك
        </p>
      </div>

      <FawaterakBalanceCheckout initialAmount={initialAmount} />
    </div>
  );
}
