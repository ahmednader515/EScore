"use client";

import { useEffect, useState } from "react";
import { BarChart, List, Wallet, Shield, Users, Eye, TrendingUp, BookOpen, FileText, Award, Key, Ticket, Video, Paintbrush, MessageCircle, Megaphone, CreditCard } from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { usePathname } from "next/navigation";
import { EnterStudentViewButton } from "@/components/enter-student-view-button";
import { STUDENT_VIEW_COOKIE } from "@/lib/student-view";
import { studentNavRoutes } from "@/lib/student-nav-routes";

const guestRoutes = studentNavRoutes;

const teacherRoutes = [
    {
        icon: List,
        label: "الكورسات",
        href: "/dashboard/teacher/courses",
    },
    {
        icon: FileText,
        label: "الاختبارات",
        href: "/dashboard/teacher/quizzes",
    },
    {
        icon: Award,
        label: "الدرجات",
        href: "/dashboard/teacher/grades",
    },
    {
        icon: BarChart,
        label: "الاحصائيات",
        href: "/dashboard/teacher/analytics",
    },
    {
        icon: Users,
        label: "إدارة الطلاب",
        href: "/dashboard/teacher/users",
    },
    {
        icon: Wallet,
        label: "إدارة الأرصدة",
        href: "/dashboard/teacher/balances",
    },
    {
        icon: BookOpen,
        label: "اضافة و حذف الكورسات",
        href: "/dashboard/teacher/add-courses",
    },
    {
        icon: Key,
        label: "كلمات المرور",
        href: "/dashboard/teacher/passwords",
    },
    {
        icon: Shield,
        label: "إنشاء حساب طالب",
        href: "/dashboard/teacher/create-account",
    },
    {
        icon: Ticket,
        label: "الاكواد",
        href: "/dashboard/teacher/promocodes",
    },
    {
        icon: CreditCard,
        label: "الاشتراكات",
        href: "/dashboard/teacher/subscriptions",
    },
    {
        icon: Video,
        label: "البث المباشر",
        href: "/dashboard/teacher/livestream",
    },
    {
        icon: Video,
        label: "ريلز يوتيوب",
        href: "/dashboard/teacher/reels",
    },
    {
        icon: Paintbrush,
        label: "تعديل الصفحة الرئيسية",
        href: "/dashboard/teacher/homepage-editor",
    },
    {
        icon: MessageCircle,
        label: "محادثات الطلاب",
        href: "/dashboard/teacher/chats",
    },
    {
        icon: Megaphone,
        label: "إشعارات الطلاب",
        href: "/dashboard/teacher/notifications",
    },
];

const adminRoutes = [
    {
        icon: Users,
        label: "إدارة المستخدمين",
        href: "/dashboard/admin/users",
    },
    {
        icon: List,
        label: "الكورسات",
        href: "/dashboard/admin/courses",
    },
    {
        icon: CreditCard,
        label: "الاشتراكات",
        href: "/dashboard/admin/subscriptions",
    },
    {
        icon: FileText,
        label: "الاختبارات",
        href: "/dashboard/admin/quizzes",
    },
    {
        icon: Award,
        label: "الدرجات",
        href: "/dashboard/admin/grades",
    },
    {
        icon: Shield,
        label: "إنشاء حساب طالب",
        href: "/dashboard/admin/create-account",
    },
    {
        icon: Eye,
        label: "كلمات المرور",
        href: "/dashboard/admin/passwords",
    },
    {
        icon: Wallet,
        label: "إدارة الأرصدة",
        href: "/dashboard/admin/balances",
    },
    {
        icon: TrendingUp,
        label: "تقدم الطلاب",
        href: "/dashboard/admin/progress",
    },
    {
        icon: BookOpen,
        label: "اضافة و حذف الكورسات",
        href: "/dashboard/admin/add-courses",
    },
    {
        icon: Ticket,
        label: "الاكواد",
        href: "/dashboard/admin/promocodes",
    },
    {
        icon: Video,
        label: "البث المباشر",
        href: "/dashboard/admin/livestream",
    },
    {
        icon: Megaphone,
        label: "إشعارات الطلاب",
        href: "/dashboard/admin/notifications",
    },
];

function hasStudentViewCookie() {
    if (typeof document === "undefined") return false;
    return document.cookie
        .split(";")
        .map((part) => part.trim())
        .some((part) => part === `${STUDENT_VIEW_COOKIE}=1`);
}

export const SidebarRoutes = ({ closeOnClick = false }: { closeOnClick?: boolean }) => {
    const pathName = usePathname();
    const [studentView, setStudentView] = useState(false);

    useEffect(() => {
        setStudentView(hasStudentViewCookie());
    }, [pathName]);

    const isTeacherPage = pathName?.includes("/dashboard/teacher");
    const isAdminPage = pathName?.includes("/dashboard/admin");

    // In student-view mode, show student nav unless staff navigates back into staff pages
    const useStudentNav = studentView && !isTeacherPage && !isAdminPage;
    const routes = useStudentNav
        ? guestRoutes
        : isAdminPage
          ? adminRoutes
          : isTeacherPage
            ? teacherRoutes
            : guestRoutes;

    const showEnterStudentView = (isTeacherPage || isAdminPage) && !studentView;

    return (
        <div className="flex flex-col w-full pt-0">
            {routes.map((route) => (
                <SidebarItem
                  key={route.href}
                  icon={route.icon}
                  label={route.label}
                  href={route.href}
                  closeOnClick={closeOnClick}
                />
            ))}
            {showEnterStudentView && (
                <div className="mt-2 border-t pt-2 px-2">
                    <EnterStudentViewButton compact />
                </div>
            )}
        </div>
    );
}
