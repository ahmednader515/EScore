import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addMonths,
  isSubscriptionGrade,
  normalizeGrade,
} from "@/lib/subscriptions";
import { isStudentViewEnabled } from "@/lib/student-view";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { planId } = body || {};

    if (!planId || typeof planId !== "string") {
      return new NextResponse("planId is required", { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        grade: true,
        balance: true,
        role: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const cookieStore = await cookies();
    const studentView = isStudentViewEnabled(cookieStore);
    const isStaff = user.role === "TEACHER" || user.role === "ADMIN";

    if (user.role !== "USER" && !(isStaff && studentView)) {
      return new NextResponse("Subscriptions are for students only", { status: 403 });
    }

    const grade = normalizeGrade(user.grade);

    if (!grade || !isSubscriptionGrade(grade)) {
      return new NextResponse(
        "يجب تحديد الصف الدراسي في الملف الشخصي أولاً",
        { status: 400 }
      );
    }

    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return new NextResponse("خطة الاشتراك غير متاحة", { status: 404 });
    }

    if (plan.grade !== grade) {
      return new NextResponse("هذه الخطة غير متاحة لصفك الدراسي", { status: 400 });
    }

    const now = new Date();

    // Expire any stale active subscriptions first
    await db.subscription.updateMany({
      where: {
        userId,
        status: "ACTIVE",
        endsAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    const existingActive = await db.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endsAt: { gt: now },
        grade,
      },
    });

    if (existingActive) {
      return new NextResponse(
        "لديك اشتراك نشط بالفعل. يمكنك التجديد بعد انتهائه.",
        { status: 400 }
      );
    }

    if (user.balance < plan.price) {
      return new NextResponse("الرصيد غير كافٍ", { status: 400 });
    }

    const startsAt = now;
    const endsAt = addMonths(startsAt, plan.durationMonths);

    const result = await db.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          grade,
          durationMonths: plan.durationMonths,
          pricePaid: plan.price,
          status: "ACTIVE",
          startsAt,
          endsAt,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: plan.price },
        },
      });

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount: -plan.price,
          type: "SUBSCRIPTION",
          description: `اشتراك ${plan.label || `${plan.durationMonths} شهر`} - ${plan.grade}`,
        },
      });

      return { subscription, updatedUser };
    });

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscription.id,
      startsAt: result.subscription.startsAt,
      endsAt: result.subscription.endsAt,
      newBalance: result.updatedUser.balance,
      pricePaid: plan.price,
    });
  } catch (error) {
    console.error("[SUBSCRIPTIONS_PURCHASE]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
