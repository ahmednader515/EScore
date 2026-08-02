"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, X } from "lucide-react";
import { STUDENT_VIEW_COOKIE } from "@/lib/student-view";

function hasStudentViewCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${STUDENT_VIEW_COOKIE}=1`);
}

export function StudentViewBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setVisible(hasStudentViewCookie());
  }, []);

  const exitStudentView = async () => {
    setExiting(true);
    try {
      const res = await fetch("/api/view-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "staff" }),
      });
      const data = await res.json().catch(() => ({}));
      setVisible(false);
      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setExiting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="sticky top-[80px] z-30 border-b border-amber-300 bg-amber-50 px-3 py-1.5 md:px-4 md:py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-amber-950 md:gap-2 md:text-sm">
          <Eye className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          <span className="truncate md:whitespace-normal">
            <span className="md:hidden">وضع لوحة الطالب</span>
            <span className="hidden md:inline">
              أنت تعرض الآن <strong>لوحة الطالب</strong> ويمكنك استخدامها كأي طالب.
            </span>
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-xs border-amber-400 bg-white hover:bg-amber-100 md:h-9 md:px-3 md:text-sm"
          onClick={exitStudentView}
          disabled={exiting}
        >
          {exiting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin md:ml-1" />
          ) : (
            <X className="h-3.5 w-3.5 md:ml-1" />
          )}
          <span className="md:hidden mr-1">خروج</span>
          <span className="hidden md:inline">العودة للوحة الإدارة</span>
        </Button>
      </div>
    </div>
  );
}
