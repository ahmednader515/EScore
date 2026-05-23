import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFawaterakSecrets } from "@/lib/fawaterak/config";
import {
  FAWATERAK_DEPOSIT_KIND,
  FAWATERAK_DEPOSIT_STATUS,
} from "@/lib/fawaterak/constants";
import {
  generatePaidWebhookHashKey,
  timingSafeEqualHex,
} from "@/lib/fawaterak/hmac";
import { parsePayLoad } from "@/lib/fawaterak/payload";

type FawaterakWebhookBody = {
  hashKey?: string;
  invoice_id?: number;
  invoice_key?: string;
  payment_method?: string;
  invoice_status?: string;
  pay_load?: unknown;
  referenceNumber?: string;
};

export async function POST(req: NextRequest) {
  try {
    const secrets = getFawaterakSecrets();
    if (!secrets) {
      return new NextResponse("Not configured", { status: 503 });
    }

    const body = (await req.json()) as FawaterakWebhookBody;

    const invoiceStatus = body.invoice_status?.toLowerCase();
    if (invoiceStatus !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const invoiceId = body.invoice_id;
    const invoiceKey = body.invoice_key;
    const paymentMethod = body.payment_method;
    const receivedHash = body.hashKey;

    if (
      invoiceId == null ||
      !invoiceKey ||
      !paymentMethod ||
      !receivedHash
    ) {
      return new NextResponse("Invalid webhook payload", { status: 400 });
    }

    const expectedHash = generatePaidWebhookHashKey(
      secrets.vendorKey,
      invoiceId,
      invoiceKey,
      paymentMethod
    );

    if (!timingSafeEqualHex(receivedHash, expectedHash)) {
      console.error("[FAWATERAK_WEBHOOK] Invalid HMAC");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payLoad = parsePayLoad(body.pay_load);
    if (!payLoad) {
      return new NextResponse("Invalid pay_load", { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const deposit = await tx.fawaterakDeposit.findUnique({
        where: { id: payLoad.depositId },
      });

      if (!deposit) {
        return { error: "Deposit not found", status: 404 as const };
      }

      if (deposit.userId !== payLoad.userId) {
        return { error: "User mismatch", status: 403 as const };
      }

      if (deposit.kind !== FAWATERAK_DEPOSIT_KIND.BALANCE_TOPUP) {
        return { error: "Unsupported deposit kind", status: 400 as const };
      }

      if (deposit.status === FAWATERAK_DEPOSIT_STATUS.COMPLETED) {
        return { ok: true, idempotent: true };
      }

      if (deposit.status === FAWATERAK_DEPOSIT_STATUS.FAILED) {
        return { error: "Deposit failed", status: 400 as const };
      }

      const existingByInvoice = await tx.fawaterakDeposit.findUnique({
        where: { invoiceId },
      });

      if (existingByInvoice && existingByInvoice.id !== deposit.id) {
        return { error: "Invoice already used", status: 409 as const };
      }

      await tx.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: deposit.amount } },
      });

      const ref = body.referenceNumber || String(invoiceId);
      await tx.balanceTransaction.create({
        data: {
          userId: deposit.userId,
          amount: deposit.amount,
          type: "DEPOSIT",
          description: `تم شحن ${deposit.amount} جنيه عبر فواتيرك (مرجع: ${ref})`,
        },
      });

      await tx.fawaterakDeposit.update({
        where: { id: deposit.id },
        data: {
          status: FAWATERAK_DEPOSIT_STATUS.COMPLETED,
          invoiceId,
          invoiceKey,
          referenceNumber: body.referenceNumber || null,
        },
      });

      return { ok: true };
    });

    if ("error" in result && result.error) {
      return new NextResponse(result.error, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
