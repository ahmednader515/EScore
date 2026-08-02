import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST redeem a course-linked promocode and enroll the student
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { code } = body || {};

    if (!userId) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "يرجى إدخال رمز الكوبون" }, { status: 400 });
    }

    const promocode = await db.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            isPublished: true,
          },
        },
      },
    });

    if (!promocode) {
      return NextResponse.json({ error: "رمز الكوبون غير صحيح" }, { status: 404 });
    }

    if (!promocode.isActive) {
      return NextResponse.json({ error: "هذا الكوبون غير نشط" }, { status: 400 });
    }

    if (promocode.usedCount > 0) {
      return NextResponse.json({ error: "تم استخدام هذا الكود مسبقاً" }, { status: 400 });
    }

    if (!promocode.courseId || !promocode.course) {
      return NextResponse.json(
        { error: "هذا الكود غير مرتبط بكورس. استخدم صفحة شراء الكورس لتطبيقه." },
        { status: 400 }
      );
    }

    if (!promocode.course.isPublished) {
      return NextResponse.json({ error: "الكورس المرتبط بهذا الكود غير متاح حالياً" }, { status: 400 });
    }

    const now = new Date();
    if (promocode.validFrom && new Date(promocode.validFrom) > now) {
      return NextResponse.json({ error: "هذا الكوبون لم يبدأ بعد" }, { status: 400 });
    }

    if (promocode.validUntil && new Date(promocode.validUntil) < now) {
      return NextResponse.json({ error: "هذا الكوبون منتهي الصلاحية" }, { status: 400 });
    }

    const courseId = promocode.courseId;
    const course = promocode.course;

    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingPurchase && existingPurchase.status === "ACTIVE") {
      return NextResponse.json(
        { error: "أنت مشترك بالفعل في هذا الكورس" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    let coursePrice = course.price || 0;
    let discountAmount = 0;

    if (promocode.minPurchase && coursePrice < promocode.minPurchase) {
      return NextResponse.json(
        { error: `يجب أن يكون سعر الشراء ${promocode.minPurchase} جنيه على الأقل` },
        { status: 400 }
      );
    }

    if (promocode.discountType === "PERCENTAGE") {
      discountAmount = (coursePrice * promocode.discountValue) / 100;
      if (promocode.maxDiscount && discountAmount > promocode.maxDiscount) {
        discountAmount = promocode.maxDiscount;
      }
    } else {
      discountAmount = Math.min(promocode.discountValue, coursePrice);
    }

    const finalPrice = Math.max(0, coursePrice - discountAmount);

    if (user.balance < finalPrice) {
      return NextResponse.json(
        {
          error: `رصيدك غير كافٍ. المطلوب: ${finalPrice.toFixed(2)} جنيه`,
          requiredBalance: finalPrice,
        },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      if (existingPurchase && existingPurchase.status === "FAILED") {
        await tx.purchase.delete({
          where: { id: existingPurchase.id },
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          userId,
          courseId,
          status: "ACTIVE",
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: finalPrice,
          },
        },
      });

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount: -finalPrice,
          type: "PURCHASE",
          description: `تم شراء الكورس: ${course.title} (كوبون خصم: ${promocode.code})`,
        },
      });

      const claimed = await tx.promoCode.updateMany({
        where: {
          id: promocode.id,
          usedCount: 0,
        },
        data: {
          usedCount: 1,
          isActive: false,
        },
      });

      if (claimed.count === 0) {
        throw new Error("تم استخدام هذا الكود مسبقاً");
      }

      return { purchase, updatedUser };
    });

    return NextResponse.json({
      success: true,
      purchaseId: result.purchase.id,
      courseId,
      courseTitle: course.title,
      newBalance: result.updatedUser.balance,
      originalPrice: coursePrice.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      promocode: promocode.code,
    });
  } catch (error) {
    console.error("[PROMOCODE_REDEEM]", error);
    if (error instanceof Error && error.message === "تم استخدام هذا الكود مسبقاً") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ أثناء تفعيل الكود" }, { status: 500 });
  }
}
