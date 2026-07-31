import { NextResponse } from "next/server";
import {
  listSubscriptionPlans,
  requireStaffSession,
} from "@/lib/subscription-plans-admin";

export async function GET() {
  try {
    const auth = await requireStaffSession();
    if (auth.error) return auth.error;

    if (auth.session.user.role !== "TEACHER" && auth.session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const plans = await listSubscriptionPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("[TEACHER_SUBSCRIPTION_PLANS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
