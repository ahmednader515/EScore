import { Compass, CreditCard, Home, User, Wallet, type LucideIcon } from "lucide-react";

export type StudentNavRoute = {
  icon: LucideIcon;
  label: string;
  href: string;
};

/** Student dashboard links — used by desktop sidebar and mobile bottom nav */
export const studentNavRoutes: StudentNavRoute[] = [
  {
    icon: Home,
    label: "الرئيسية",
    href: "/dashboard",
  },
  {
    icon: Compass,
    label: "الكورسات",
    href: "/dashboard/search",
  },
  {
    icon: CreditCard,
    label: "الاشتراكات",
    href: "/dashboard/subscriptions",
  },
  {
    icon: Wallet,
    label: "الرصيد",
    href: "/dashboard/balance",
  },
  {
    icon: User,
    label: "تعديل الملف الشخصي",
    href: "/profile/edit",
  },
];

export function isStudentDashboardPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/dashboard/teacher")) return false;
  if (pathname.startsWith("/dashboard/admin")) return false;
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isStudentNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
