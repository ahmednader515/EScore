import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { STUDENT_VIEW_COOKIE } from "@/lib/student-view";

// Helper function to get dashboard URL by role
function getDashboardUrlByRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/dashboard/teacher/courses";
    case "ADMIN":
      return "/dashboard/admin/users";
    case "USER":
    default:
      return "/dashboard";
  }
}

function hasStudentViewCookie(req: { cookies: { get: (name: string) => { value: string } | undefined } }) {
  return req.cookies.get(STUDENT_VIEW_COOKIE)?.value === "1";
}

export default withAuth(
  function middleware(req) {
    const isTeacherRoute = req.nextUrl.pathname.startsWith("/dashboard/teacher");
    const isTeacher = req.nextauth.token?.role === "TEACHER";
    const isHomePage = req.nextUrl.pathname === "/";
    const isReelsPage = req.nextUrl.pathname.startsWith("/reels");
    const isPublicInfoPage =
      req.nextUrl.pathname === "/privacy-policy" ||
      req.nextUrl.pathname === "/terms-and-conditions" ||
      req.nextUrl.pathname === "/refund-policy" ||
      req.nextUrl.pathname === "/pricing" ||
      req.nextUrl.pathname === "/contact";
    const isAuthPage = req.nextUrl.pathname.startsWith("/sign-in") || 
                      req.nextUrl.pathname.startsWith("/sign-up") ||
                      req.nextUrl.pathname.startsWith("/forgot-password") ||
                      req.nextUrl.pathname.startsWith("/reset-password");
    
    // Add check for payment status page
    const isPaymentStatusPage = req.nextUrl.pathname.includes("/payment-status");
    const isFawaterakBalanceReturn = req.nextUrl.pathname.startsWith(
      "/balance-payment-return"
    );

    // If user is on auth page and is authenticated, redirect to appropriate dashboard
    if (isAuthPage && req.nextauth.token) {
      const userRole = req.nextauth.token?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }

    // If user is authenticated and hits the homepage, redirect to appropriate dashboard
    if (isHomePage && req.nextauth.token) {
      const userRole = req.nextauth.token?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }

    // If user is not authenticated and trying to access protected routes
    // But exclude payment status page from this check
    if (
      !req.nextauth.token &&
      !isAuthPage &&
      !isPaymentStatusPage &&
      !isFawaterakBalanceReturn &&
      !isHomePage &&
      !isReelsPage &&
      !isPublicInfoPage
    ) {
      return NextResponse.redirect(new URL("/sign-in", req.url), { status: 302 });
    }

    // Check for admin routes
    const isAdminRoute = req.nextUrl.pathname.startsWith("/dashboard/admin");
    const isAdmin = req.nextauth.token?.role === "ADMIN";

    // If user is not a teacher or admin but trying to access teacher routes
    if (isTeacherRoute && !(isTeacher || isAdmin)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // If user is not an admin but trying to access admin routes
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // If staff accesses main student dashboard without student-view mode, send them to their dashboard
    if (req.nextUrl.pathname === "/dashboard" && req.nextauth.token) {
      const userRole = req.nextauth.token?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);
      const studentView = hasStudentViewCookie(req);

      if (userRole !== "USER" && !studentView) {
        return NextResponse.redirect(new URL(dashboardUrl, req.url));
      }
    }

    // Handle POST requests to payment status page
    if (isPaymentStatusPage && req.method === "POST") {
      // Convert POST to GET by redirecting to the same URL
      return NextResponse.redirect(req.url, { status: 303 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We'll handle authorization in the middleware function
    },
  }
);

export const config = {
  matcher: [
    // Skip middleware for API, Next internals, and public static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};