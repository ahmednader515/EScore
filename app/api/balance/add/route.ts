import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Direct balance credit is disabled — use Fawaterak checkout on /dashboard/balance/payment.
 * Admins/teachers adjust balances via /dashboard/admin/balances or /dashboard/teacher/balances.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return new NextResponse(
      "Direct balance top-up is disabled. Use Fawaterak payment on the balance page.",
      { status: 403 }
    );
  } catch (error) {
    console.error("[BALANCE_ADD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
