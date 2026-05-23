import { Suspense } from "react";
import { BalancePaymentSuccessContent } from "./success-content";

export default function BalancePaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>
      }
    >
      <BalancePaymentSuccessContent />
    </Suspense>
  );
}
