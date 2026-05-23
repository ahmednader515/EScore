import { Suspense } from "react";
import { BalancePaymentContent } from "./payment-content";

export default function BalancePaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>
      }
    >
      <BalancePaymentContent />
    </Suspense>
  );
}
