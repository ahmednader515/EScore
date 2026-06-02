import { PaymentTopRedirect } from "@/components/fawaterak/payment-top-redirect";
import { fawaterakBalanceReturnTarget } from "@/lib/fawaterak/constants";

export default function BalancePaymentReturnFailPage() {
  return <PaymentTopRedirect targetPath={fawaterakBalanceReturnTarget("fail")} />;
}
