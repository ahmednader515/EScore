import { NextResponse } from "next/server";
import {
  requireStaffSession,
  updateSubscriptionPlan,
} from "@/lib/subscription-plans-admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const auth = await requireStaffSession();
    if (auth.error) return auth.error;

    if (auth.session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { planId } = await params;
    const body = await req.json();
    const result = await updateSubscriptionPlan(planId, body);
    if (result.error) return result.error;

    return NextResponse.json(result.plan);
  } catch (error) {
    console.error("[ADMIN_SUBSCRIPTION_PLAN_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
