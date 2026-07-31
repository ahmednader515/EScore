import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUBSCRIPTION_GRADES, SUBSCRIPTION_PLAN_SEEDS } from "@/lib/subscriptions";

export async function ensureSubscriptionPlansExist() {
  for (const plan of SUBSCRIPTION_PLAN_SEEDS) {
    await db.subscriptionPlan.upsert({
      where: {
        grade_durationMonths: {
          grade: plan.grade,
          durationMonths: plan.durationMonths,
        },
      },
      create: {
        grade: plan.grade,
        durationMonths: plan.durationMonths,
        label: plan.label,
        price: plan.price,
        isActive: true,
      },
      update: {},
    });
  }
}

export async function requireStaffSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: new NextResponse("Unauthorized", { status: 401 }) };
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  }

  return { session };
}

export async function listSubscriptionPlans() {
  await ensureSubscriptionPlansExist();

  const plans = await db.subscriptionPlan.findMany({
    orderBy: [{ grade: "asc" }, { durationMonths: "asc" }],
  });

  const gradeOrder = SUBSCRIPTION_GRADES as readonly string[];
  plans.sort((a, b) => {
    const gi = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
    if (gi !== 0) return gi;
    return a.durationMonths - b.durationMonths;
  });

  return plans;
}

export async function updateSubscriptionPlan(
  planId: string,
  body: { price?: unknown; label?: unknown; isActive?: unknown }
) {
  const { price, label, isActive } = body || {};

  const data: {
    price?: number;
    label?: string | null;
    isActive?: boolean;
  } = {};

  if (price !== undefined) {
    const parsed = typeof price === "number" ? price : parseFloat(String(price));
    if (Number.isNaN(parsed) || parsed < 0) {
      return { error: new NextResponse("Invalid price", { status: 400 }) };
    }
    data.price = parsed;
  }

  if (label !== undefined) {
    data.label = typeof label === "string" ? label.trim() || null : null;
  }

  if (isActive !== undefined) {
    data.isActive = Boolean(isActive);
  }

  if (Object.keys(data).length === 0) {
    return { error: new NextResponse("No fields to update", { status: 400 }) };
  }

  const plan = await db.subscriptionPlan.update({
    where: { id: planId },
    data,
  });

  return { plan };
}
