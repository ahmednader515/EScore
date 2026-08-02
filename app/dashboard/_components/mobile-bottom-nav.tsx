"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  isStudentDashboardPath,
  isStudentNavActive,
  studentNavRoutes,
} from "@/lib/student-nav-routes";

export function MobileBottomNav() {
  const pathname = usePathname();

  if (!isStudentDashboardPath(pathname)) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="التنقل الرئيسي"
    >
      {studentNavRoutes.map((route) => {
        const Icon = route.icon;
        const active = isStudentNavActive(pathname, route.href);

        return (
          <Link
            key={route.href}
            href={route.href}
            data-navigate="true"
            onClick={() => {
              if (typeof window !== "undefined" && !active) {
                window.dispatchEvent(new CustomEvent("navigation-start"));
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 mx-0.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
              active
                ? "bg-[#361e01]/10 text-[#361e01]"
                : "text-muted-foreground hover:text-[#361e01]"
            )}
          >
            <Icon
              className={cn("h-5 w-5 shrink-0", active && "text-[#361e01]")}
            />
            <span className="truncate max-w-full px-0.5">{route.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
