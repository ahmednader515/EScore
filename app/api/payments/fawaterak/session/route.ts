import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveAppOrigin } from "@/lib/fawaterak/config";
import { buildFawaterakCustomer } from "@/lib/fawaterak/customer";
import {
  FAWATERAK_ALLOWED_ROLES,
  FAWATERAK_BALANCE_RETURN_PATHS,
  FAWATERAK_DEPOSIT_KIND,
  FAWATERAK_DEPOSIT_STATUS,
  FAWATERAK_MAX_AMOUNT_EGP,
  FAWATERAK_MIN_AMOUNT_EGP,
  getFawaterakPluginScriptUrl,
} from "@/lib/fawaterak/constants";
import { resolveFawaterakCheckoutContext } from "@/lib/fawaterak/resolve-checkout";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const role = session.user.role || "USER";
    if (!FAWATERAK_ALLOWED_ROLES.includes(role as (typeof FAWATERAK_ALLOWED_ROLES)[number])) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);

    const checkout = await resolveFawaterakCheckoutContext(body?.iframeDomain);
    if ("error" in checkout) {
      console.error("[FAWATERAK_SESSION]", checkout.error);
      return NextResponse.json(
        {
          error: checkout.error,
          hint:
            "افتح /api/payments/fawaterak/diagnostics وأنت مسجل الدخول. تأكد أن Vercel فيه نفس FAWATERAK_VENDOR_KEY و FAWATERAK_PROVIDER_KEY.",
        },
        { status: 400 }
      );
    }

    const { secrets, iframeDomain, envType, hashKey } = checkout;

    if (
      !Number.isFinite(amount) ||
      amount < FAWATERAK_MIN_AMOUNT_EGP ||
      amount > FAWATERAK_MAX_AMOUNT_EGP
    ) {
      return new NextResponse(
        `Amount must be between ${FAWATERAK_MIN_AMOUNT_EGP} and ${FAWATERAK_MAX_AMOUNT_EGP} EGP`,
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, phoneNumber: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const origin = resolveAppOrigin() || iframeDomain;

    const deposit = await db.fawaterakDeposit.create({
      data: {
        userId: user.id,
        amount,
        currency: "EGP",
        kind: FAWATERAK_DEPOSIT_KIND.BALANCE_TOPUP,
        status: FAWATERAK_DEPOSIT_STATUS.PENDING,
      },
    });

    const amountStr = amount.toFixed(2);
    const cartName = `شحن رصيد - ${amountStr} جنيه`;

    const requestBody = {
      cartTotal: amountStr,
      currency: "EGP",
      customer: buildFawaterakCustomer(user),
      redirectionUrls: {
        successUrl: `${origin}${FAWATERAK_BALANCE_RETURN_PATHS.success}`,
        failUrl: `${origin}${FAWATERAK_BALANCE_RETURN_PATHS.fail}`,
        pendingUrl: `${origin}${FAWATERAK_BALANCE_RETURN_PATHS.pending}`,
        webhookUrl: `${origin}/api/webhooks/fawaterak_json`,
      },
      cartItems: [
        {
          name: cartName,
          price: amountStr,
          quantity: "1",
        },
      ],
      payLoad: {
        depositId: deposit.id,
        userId: user.id,
        kind: FAWATERAK_DEPOSIT_KIND.BALANCE_TOPUP,
      },
    };

    return NextResponse.json({
      token: secrets.vendorKey,
      envType,
      hashKey,
      iframeDomain,
      pluginScriptUrl: getFawaterakPluginScriptUrl(envType),
      style: { listing: "vertical" as const },
      version: "0",
      redirectOutIframe: true,
      requestBody,
    });
  } catch (error) {
    console.error("[FAWATERAK_SESSION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
