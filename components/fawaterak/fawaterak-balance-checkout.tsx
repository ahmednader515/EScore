"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import {
  FAWATERAK_MAX_AMOUNT_EGP,
  FAWATERAK_MIN_AMOUNT_EGP,
  getFawaterakPluginScriptUrl,
} from "@/lib/fawaterak/constants";

type CheckoutPayload = {
  token: string;
  envType: "test" | "live";
  hashKey: string;
  pluginScriptUrl?: string;
  style: { listing: string };
  version: string;
  redirectOutIframe: boolean;
  requestBody: Record<string, unknown>;
};

function loadFawaterkScript(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.fawaterkCheckout === "function") {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Fawaterak script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
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
  const [checkoutPayload, setCheckoutPayload] =
    useState<CheckoutPayload | null>(null);
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    }
  }, [initialAmount]);

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
        let message = "فشل بدء عملية الدفع";
        try {
          const err = await response.json();
          if (err?.error) message = String(err.error);
          if (err?.hint) message += ` — ${err.hint}`;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
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
      const scriptUrl =
        checkoutPayload.pluginScriptUrl ??
        getFawaterakPluginScriptUrl(checkoutPayload.envType);

      await loadFawaterkScript(scriptUrl);

      if (typeof window.fawaterkCheckout !== "function") {
        throw new Error("Fawaterak plugin not available");
      }

      const pluginConfig: Record<string, unknown> = {
        token: checkoutPayload.token,
        envType: checkoutPayload.envType,
        hashKey: checkoutPayload.hashKey,
        style: checkoutPayload.style,
        version: checkoutPayload.version,
        requestBody: checkoutPayload.requestBody,
        redirectOutIframe: checkoutPayload.redirectOutIframe !== false,
      };

      window.pluginConfig = pluginConfig;
      (globalThis as Record<string, unknown>).pluginConfig = pluginConfig;
      window.fawaterkCheckout(pluginConfig);
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

  const cancelCheckout = () => {
    checkoutStartedRef.current = false;
    setCheckoutPayload(null);
    setStep("idle");
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {step !== "checkout" && (
        <Card className="border-[#361e01]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              شحن الرصيد
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              أدخل المبلغ ثم اضغط متابعة الدفع لاختيار طريقة الدفع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
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
                className="shrink-0 bg-[#361e01] text-white hover:bg-[#361e01]/90"
              >
                {step === "loading" ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  "متابعة الدفع"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              طرق الدفع: بطاقة بنكية، فوري، والمحافظ الإلكترونية (حسب تفعيلها
              في فواتيرك).
            </p>
          </CardContent>
        </Card>
      )}

      {step === "checkout" && (
        <Card className="overflow-hidden border-[#361e01]/20">
          <CardHeader className="border-b bg-muted/30 py-3 sm:py-4">
            <CardTitle className="text-base">إتمام الدفع</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              اختر طريقة الدفع. بعد النجاح ستُوجَّه تلقائياً إلى الصفحة
              المناسبة.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div
              id="fawaterkDivId"
              className="min-h-[min(70vh,560px)] w-full bg-background sm:min-h-[520px] lg:min-h-[580px]"
            />
          </CardContent>
          <div className="border-t p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#361e01] text-[#361e01]"
              onClick={cancelCheckout}
            >
              إلغاء والعودة
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
