import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCourseHierarchy } from "@/lib/course-hierarchy";
import { isStaff } from "@/lib/course-staff";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const publishedOnly = searchParams.get("publishedOnly") === "true";

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await getCourseHierarchy(
      courseId,
      publishedOnly || !isStaff(user?.role)
    );

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.log("[COURSE_HIERARCHY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
