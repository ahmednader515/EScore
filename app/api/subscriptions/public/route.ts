import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SUBSCRIPTION_GRADES } from "@/lib/subscriptions";
import { ensureSubscriptionPlansExist } from "@/lib/subscription-plans-admin";

export async function GET() {
  try {
    await ensureSubscriptionPlansExist();

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        grade: true,
        durationMonths: true,
        price: true,
        label: true,
      },
    });

    const gradeOrder = SUBSCRIPTION_GRADES as readonly string[];
    plans.sort((a, b) => {
      const gi = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
      if (gi !== 0) return gi;
      return a.durationMonths - b.durationMonths;
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[SUBSCRIPTIONS_PUBLIC_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
