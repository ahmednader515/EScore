"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";
import { StudentViewBanner } from "@/components/student-view-banner";
import { MobileBottomNav } from "./_components/mobile-bottom-nav";
import { isStudentDashboardPath } from "@/lib/student-nav-routes";
import { cn } from "@/lib/utils";

const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const studentMobile = isStudentDashboardPath(pathname);

  return (
    <div className="min-h-screen flex flex-col dashboard-layout">
      <div className="h-[80px] fixed inset-x-0 top-0 w-full z-50">
        <Navbar />
      </div>
      <div className="hidden md:flex h-[calc(100vh-80px)] w-56 flex-col fixed inset-x-0 top-[80px] rtl:right-0 ltr:left-0 z-40">
        <Sidebar />
      </div>
      <main
        className={cn(
          "md:rtl:pr-56 md:ltr:pl-56 pt-[80px] flex-1",
          studentMobile &&
            "pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
        )}
      >
        <StudentViewBanner />
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
