import { PaymentTopRedirect } from "@/components/fawaterak/payment-top-redirect";
import { fawaterakBalanceReturnTarget } from "@/lib/fawaterak/constants";

export default function BalancePaymentReturnPendingPage() {
  return <PaymentTopRedirect targetPath={fawaterakBalanceReturnTarget("pending")} />;
}
