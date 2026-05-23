"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import {
  FAWATERAK_MAX_AMOUNT_EGP,
  FAWATERAK_MIN_AMOUNT_EGP,
} from "@/lib/fawaterak/constants";

const FAWATERK_SCRIPT_URL =
  "https://app.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js";

type CheckoutPayload = {
  token: string;
  envType: string;
  hashKey: string;
  style: { listing: string };
  version: string;
  redirectOutIframe: boolean;
  requestBody: Record<string, unknown>;
};

function loadFawaterkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.fawaterkCheckout === "function") {
      resolve();
      return;
    }

    const existing = document.querySelector(
      `script[src="${FAWATERK_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Fawaterak script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = FAWATERK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Fawaterak script"));
    document.body.appendChild(script);
  });
}

type FawaterakBalanceCheckoutProps = {
  initialAmount?: string;
  onCheckoutStarted?: () => void;
};

export function FawaterakBalanceCheckout({
  initialAmount,
  onCheckoutStarted,
}: FawaterakBalanceCheckoutProps) {
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [step, setStep] = useState<"idle" | "loading" | "checkout">("idle");

  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    }
  }, [initialAmount]);

  const [checkoutPayload, setCheckoutPayload] =
    useState<CheckoutPayload | null>(null);
  const checkoutStartedRef = useRef(false);

  const startCheckout = async () => {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < FAWATERAK_MIN_AMOUNT_EGP) {
      toast.error(`الحد الأدنى للشحن ${FAWATERAK_MIN_AMOUNT_EGP} جنيه`);
      return;
    }
    if (parsed > FAWATERAK_MAX_AMOUNT_EGP) {
      toast.error(`الحد الأقصى للشحن ${FAWATERAK_MAX_AMOUNT_EGP} جنيه`);
      return;
    }

    setStep("loading");
    checkoutStartedRef.current = false;

    try {
      const iframeDomain = `https://${window.location.hostname}`;

      const response = await fetch("/api/payments/fawaterak/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, iframeDomain }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "فشل بدء عملية الدفع");
      }

      const data = (await response.json()) as CheckoutPayload;
      setCheckoutPayload(data);
      setStep("checkout");
      onCheckoutStarted?.();
    } catch (error) {
      console.error("[FAWATERAK_CHECKOUT]", error);
      toast.error(
        error instanceof Error ? error.message : "حدث خطأ أثناء بدء الدفع"
      );
      setStep("idle");
    }
  };

  const launchPlugin = useCallback(async () => {
    if (!checkoutPayload || checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;

    try {
      await loadFawaterkScript();

      if (typeof window.fawaterkCheckout !== "function") {
        throw new Error("Fawaterak plugin not available");
      }

      window.fawaterkCheckout({
        token: checkoutPayload.token,
        envType: checkoutPayload.envType,
        hashKey: checkoutPayload.hashKey,
        style: checkoutPayload.style,
        version: checkoutPayload.version,
        requestBody: checkoutPayload.requestBody,
        redirectOutIframe: checkoutPayload.redirectOutIframe !== false,
      });
    } catch (error) {
      console.error("[FAWATERAK_PLUGIN]", error);
      toast.error("تعذر تحميل بوابة الدفع. حاول مرة أخرى.");
      checkoutStartedRef.current = false;
      setStep("idle");
      setCheckoutPayload(null);
    }
  }, [checkoutPayload]);

  useEffect(() => {
    if (step === "checkout" && checkoutPayload) {
      launchPlugin();
    }
  }, [step, checkoutPayload, launchPlugin]);

  return (
    <div className="space-y-4">
      {step !== "checkout" && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="number"
              placeholder={`المبلغ (${FAWATERAK_MIN_AMOUNT_EGP} - ${FAWATERAK_MAX_AMOUNT_EGP} جنيه)`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={FAWATERAK_MIN_AMOUNT_EGP}
              max={FAWATERAK_MAX_AMOUNT_EGP}
              step="1"
              className="flex-1"
              disabled={step === "loading"}
            />
            <Button
              onClick={startCheckout}
              disabled={step === "loading"}
              className="bg-[#361e01] hover:bg-[#361e01]/90 text-white shrink-0"
            >
              {step === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري التحميل...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 ml-2" />
                  ادفع الآن
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            طرق الدفع المتاحة: بطاقة بنكية، فوري، والمحافظ الإلكترونية (حسب
            تفعيلها في فواتيرك).
          </p>
        </>
      )}

      {step === "checkout" && (
        <div className="rounded-lg border border-[#361e01]/20 p-4 bg-[#fcfaed]/50">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            أكمل الدفع في النافذة أدناه
          </p>
          <div id="fawaterkDivId" className="min-h-[200px]" />
          <Button
            variant="outline"
            className="mt-4 w-full border-[#361e01] text-[#361e01]"
            onClick={() => {
              checkoutStartedRef.current = false;
              setCheckoutPayload(null);
              setStep("idle");
            }}
          >
            إلغاء والعودة
          </Button>
        </div>
      )}
    </div>
  );
}
