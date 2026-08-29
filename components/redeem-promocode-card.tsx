"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RedeemPromocodeCardProps {
  variant?: "card" | "banner";
}

export function RedeemPromocodeCard({ variant = "card" }: RedeemPromocodeCardProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("يرجى إدخال رمز الكوبون");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/promocodes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "تعذر تفعيل الكود");
        return;
      }

      toast.success(`تم الاشتراك في كورس: ${data.courseTitle}`);
      setCode("");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء تفعيل الكود");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 md:p-5 border border-amber-200/60">
        <form
          onSubmit={handleRedeem}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-amber-100 p-2.5 rounded-full">
              <Ticket className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold">تفعيل كود الكورس</p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                أدخل الكود للاشتراك في الكورس
              </p>
            </div>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="أدخل رمز الكوبون"
            disabled={loading}
            className="flex-1 text-center tracking-wider uppercase bg-white dark:bg-background"
            dir="ltr"
          />
          <Button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-[#361e01] hover:bg-[#4a2a02] text-white shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري التفعيل...
              </>
            ) : (
              "تفعيل الكود"
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-100 p-3 rounded-full">
          <Ticket className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">تفعيل كود الكورس</p>
          <p className="text-lg font-bold">أدخل الكود للاشتراك</p>
        </div>
      </div>
      <form onSubmit={handleRedeem} className="space-y-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="أدخل رمز الكوبون"
          disabled={loading}
          className="text-center tracking-wider uppercase"
          dir="ltr"
        />
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-[#361e01] hover:bg-[#4a2a02] text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              جاري التفعيل...
            </>
          ) : (
            "تفعيل الكود"
          )}
        </Button>
      </form>
    </div>
  );
}
