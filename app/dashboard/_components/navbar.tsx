"use client";

import { usePathname } from "next/navigation";
import { NavbarRoutes } from "@/components/navbar-routes";
import { MobileSidebar } from "./mobile-sidebar";
import { Logo } from "./logo";
import { isStudentDashboardPath } from "@/lib/student-nav-routes";

export const Navbar = () => {
  const pathname = usePathname();
  const studentMobile = isStudentDashboardPath(pathname);

  return (
    <div className="p-4 border-b h-full flex items-center bg-card shadow-sm">
      {/* Staff keep hamburger menu; students use bottom nav on mobile */}
      {!studentMobile && <MobileSidebar />}
      <div
        className={
          studentMobile
            ? "flex items-center"
            : "hidden md:flex items-center rtl:mr-4 ltr:ml-4"
        }
      >
        <Logo />
      </div>
      <div className="flex items-center gap-x-4 rtl:mr-auto ltr:ml-auto">
        <NavbarRoutes />
      </div>
    </div>
  );
};
