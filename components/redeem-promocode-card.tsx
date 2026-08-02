"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedeemPromocodeCard() {
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
