import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isSubscriptionGrade,
  normalizeGrade,
} from "@/lib/subscriptions";
import { ensureSubscriptionPlansExist } from "@/lib/subscription-plans-admin";
import { getActiveSubscriptionsForUser } from "@/lib/user-course-access";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        grade: true,
        division: true,
        balance: true,
        role: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    await ensureSubscriptionPlansExist();

    const grade = normalizeGrade(user.grade);
    const eligible = isSubscriptionGrade(grade);
    const activeSubscriptions = await getActiveSubscriptionsForUser(userId);
    const isStaff = user.role === "TEACHER" || user.role === "ADMIN";

    if (isStaff) {
      return NextResponse.json({
        eligible: false,
        isSecondary: false,
        grade: grade ?? user.grade ?? null,
        division: user.division,
        balance: user.balance,
        plans: [],
        activeSubscription: null,
        reason: "staff",
        role: user.role,
      });
    }

    if (!eligible || !grade) {
      return NextResponse.json({
        eligible: false,
        isSecondary: false,
        grade: grade ?? user.grade ?? null,
        division: user.division,
        balance: user.balance,
        plans: [],
        activeSubscription: activeSubscriptions[0] ?? null,
        reason: !grade ? "missing_grade" : "unsupported_grade",
        role: user.role,
      });
    }

    const plans = await db.subscriptionPlan.findMany({
      where: {
        grade,
        isActive: true,
      },
      orderBy: { durationMonths: "asc" },
      select: {
        id: true,
        grade: true,
        durationMonths: true,
        price: true,
        label: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      eligible: true,
      isSecondary: true,
      grade,
      division: user.division,
      balance: user.balance,
      plans,
      activeSubscription: activeSubscriptions[0] ?? null,
      reason: null,
      role: user.role,
    });
  } catch (error) {
    console.error("[SUBSCRIPTIONS_PLANS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
