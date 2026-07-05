"use client";

import { usePathname } from "next/navigation";
import { CourseNavbar } from "./_components/course-navbar";
import { CourseSidebar } from "./_components/course-sidebar";

const CourseLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const isHierarchicalView =
    pathname?.includes("/teachers") || pathname?.includes("/units/");

  return (
    <div className="min-h-screen flex flex-col course-layout">
      <div className="h-[80px] fixed inset-x-0 top-0 w-full z-50">
        <CourseNavbar hideSidebar={isHierarchicalView} />
      </div>
      {!isHierarchicalView && (
        <div className="hidden md:flex h-[calc(100vh-80px)] w-64 md:w-80 flex-col fixed inset-y-0 top-[80px] right-0 z-40 border-l">
          <CourseSidebar />
        </div>
      )}
      <main
        className={
          isHierarchicalView
            ? "pt-[80px] flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 pb-8"
            : "pt-[80px] flex-1 md:pr-64 md:lg:pr-80"
        }
      >
        {children}
      </main>
    </div>
  );
};

export default CourseLayout;
