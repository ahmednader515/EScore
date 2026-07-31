import { NextResponse } from "next/server";
import {
  listSubscriptionPlans,
  requireStaffSession,
} from "@/lib/subscription-plans-admin";

export async function GET() {
  try {
    const auth = await requireStaffSession();
    if (auth.error) return auth.error;

    // Keep admin route admin-only for consistency with other admin APIs
    if (auth.session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const plans = await listSubscriptionPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("[ADMIN_SUBSCRIPTION_PLANS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
