import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildIframeHashKey,
  getFawaterakSecrets,
  resolveAppOrigin,
  resolveIframeDomain,
} from "@/lib/fawaterak/config";
import { buildFawaterakCustomer } from "@/lib/fawaterak/customer";
import {
  FAWATERAK_ALLOWED_ROLES,
  FAWATERAK_DEPOSIT_KIND,
  FAWATERAK_DEPOSIT_STATUS,
  FAWATERAK_MAX_AMOUNT_EGP,
  FAWATERAK_MIN_AMOUNT_EGP,
  getFawaterakPluginScriptUrl,
} from "@/lib/fawaterak/constants";

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

    const secrets = getFawaterakSecrets();
    if (!secrets) {
      return new NextResponse("Fawaterak is not configured", { status: 503 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const iframeDomain = resolveIframeDomain(body?.iframeDomain);

    if (!iframeDomain) {
      return new NextResponse("Missing iframe domain", { status: 400 });
    }

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
        successUrl: `${origin}/dashboard/balance/payment/success`,
        failUrl: `${origin}/dashboard/balance/payment/fail`,
        pendingUrl: `${origin}/dashboard/balance/payment/pending`,
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

    const hashKey = buildIframeHashKey(
      secrets.vendorKey,
      secrets.providerKey,
      iframeDomain
    );

    return NextResponse.json({
      token: secrets.vendorKey,
      envType: secrets.envType,
      hashKey,
      iframeDomain,
      pluginScriptUrl: getFawaterakPluginScriptUrl(secrets.envType),
      style: { listing: "horizontal" as const },
      version: "0",
      redirectOutIframe: true,
      requestBody,
    });
  } catch (error) {
    console.error("[FAWATERAK_SESSION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
