"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStudentView } from "@/lib/contexts/student-view-context";

export function EnterStudentViewButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { setStudentView } = useStudentView();
  const [loading, setLoading] = useState(false);

  const enter = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/view-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "student" }),
      });

      if (!res.ok) {
        toast.error("تعذر فتح لوحة الطالب");
        return;
      }

      const data = await res.json();
      setStudentView(true);
      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      toast.error("تعذر فتح لوحة الطالب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={compact ? "ghost" : "outline"}
      className={cn(
        compact
          ? "w-full justify-start gap-x-2 text-slate-500 text-sm font-medium pl-6"
          : "",
        className
      )}
      onClick={enter}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Eye className={cn("h-4 w-4", compact && "text-slate-500")} />
      )}
      {compact ? "لوحة الطالب" : "عرض لوحة الطالب"}
    </Button>
  );
}
