import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { STUDENT_VIEW_COOKIE } from "@/lib/student-view";
import { getDashboardUrlByRole } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const role = session.user.role || "USER";
    if (role !== "TEACHER" && role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "staff" ? "staff" : "student";

    const response = NextResponse.json({
      success: true,
      mode,
      redirectTo:
        mode === "student" ? "/dashboard" : getDashboardUrlByRole(role),
    });

    if (mode === "student") {
      response.cookies.set(STUDENT_VIEW_COOKIE, "1", {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        httpOnly: false,
      });
    } else {
      response.cookies.set(STUDENT_VIEW_COOKIE, "", {
        path: "/",
        sameSite: "lax",
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    console.error("[VIEW_MODE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({
      role: session.user.role,
      canUseStudentView:
        session.user.role === "TEACHER" || session.user.role === "ADMIN",
    });
  } catch (error) {
    console.error("[VIEW_MODE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
