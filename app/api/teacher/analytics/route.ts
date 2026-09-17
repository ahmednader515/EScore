import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Course, Purchase, Chapter, UserProgress } from "@prisma/client";

type CourseWithRelations = Course & {
  purchases: (Purchase & {
    user: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
  })[];
  chapters: (Chapter & {
    userProgress: UserProgress[];
  })[];
};

const emptyChart = () => ({
  labels: [] as string[],
  datasets: [
    {
      label: "Revenue",
      data: [] as number[],
      backgroundColor: "rgba(75, 192, 192, 0.5)",
    },
  ],
});

const emptySalesChart = () => ({
  labels: [] as string[],
  datasets: [
    {
      label: "Sales",
      data: [] as number[],
      backgroundColor: [
        "rgba(255, 99, 132, 0.6)",
        "rgba(54, 162, 235, 0.6)",
        "rgba(255, 206, 86, 0.6)",
        "rgba(75, 192, 192, 0.6)",
        "rgba(153, 102, 255, 0.6)",
      ],
    },
  ],
});

function extractPromoCodeFromDescription(description: string): string | null {
  const match = description.match(/\(كوبون خصم:\s*(.+)\)$/);
  return match?.[1]?.trim() || null;
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return new NextResponse(
        "Forbidden - Only teachers and admins can access analytics",
        { status: 403 }
      );
    }

    const analyticsSettings = await db.analyticsSettings.findUnique({
      where: { id: "global" },
      select: { lastResetAt: true },
    });
    const lastResetAt = analyticsSettings?.lastResetAt ?? null;
    const afterReset = lastResetAt
      ? { createdAt: { gt: lastResetAt } }
      : undefined;

    const [courses, fawaterakDeposits, codePurchaseTxns] = await Promise.all([
      db.course.findMany({
        where: { isPublished: true },
        include: {
          purchases: {
            where: afterReset,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          chapters: {
            where: { isPublished: true },
            include: { userProgress: true },
          },
        },
      }) as Promise<CourseWithRelations[]>,

      db.fawaterakDeposit.findMany({
        where: {
          status: "COMPLETED",
          ...(afterReset || {}),
        },
        select: { amount: true, id: true },
      }),

      db.balanceTransaction.findMany({
        where: {
          type: "PURCHASE",
          description: { contains: "كوبون خصم" },
          ...(afterReset || {}),
        },
        select: { amount: true, description: true },
      }),
    ]);

    const fawaterakDepositsTotal = fawaterakDeposits.reduce(
      (sum, d) => sum + (d.amount || 0),
      0
    );
    const fawaterakDepositsCount = fawaterakDeposits.length;

    const promoCodesUsed = Array.from(
      new Set(
        codePurchaseTxns
          .map((txn) => extractPromoCodeFromDescription(txn.description))
          .filter((code): code is string => Boolean(code))
      )
    );

    const promoCodeRecords =
      promoCodesUsed.length > 0
        ? await db.promoCode.findMany({
            where: { code: { in: promoCodesUsed } },
            select: {
              code: true,
              course: {
                select: { id: true, title: true, price: true },
              },
            },
          })
        : [];

    const promoByCode = new Map(
      promoCodeRecords.map((p) => [p.code, p] as const)
    );

    const codeRevenueByCourseMap = new Map<
      string,
      { title: string; count: number; revenue: number }
    >();

    let codeRedemptionListRevenue = 0;
    let codeRedemptionPaidFromBalance = 0;

    for (const txn of codePurchaseTxns) {
      codeRedemptionPaidFromBalance += Math.abs(txn.amount || 0);
      const code = extractPromoCodeFromDescription(txn.description);
      const promo = code ? promoByCode.get(code) : undefined;
      const course = promo?.course;
      const listPrice = course?.price || 0;
      codeRedemptionListRevenue += listPrice;

      if (course) {
        const existing = codeRevenueByCourseMap.get(course.id) || {
          title: course.title,
          count: 0,
          revenue: 0,
        };
        existing.count += 1;
        existing.revenue += listPrice;
        codeRevenueByCourseMap.set(course.id, existing);
      }
    }

    const codeRedemptionsCount = codePurchaseTxns.length;
    const codeRevenueByCourse = Array.from(
      codeRevenueByCourseMap.entries()
    ).map(([id, data]) => ({ id, ...data }));

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        totalRevenue: 0,
        totalSales: 0,
        courseCount: 0,
        courseAnalytics: [],
        revenueData: emptyChart(),
        salesData: emptySalesChart(),
        fawaterakDepositsTotal: 0,
        fawaterakDepositsCount: 0,
        codeRedemptionsCount: 0,
        codeRedemptionListRevenue: 0,
        codeRedemptionPaidFromBalance: 0,
        codeRevenueByCourse: [],
        moneyBreakdown: {
          labels: ["رصيد فواتيرك", "إيرادات الأكواد"],
          data: [0, 0],
        },
      });
    }

    const courseAnalytics = courses.map((course) => {
      try {
        const courseRevenue = course.purchases.reduce(
          (total: number, purchase) => {
            if (purchase.status === "ACTIVE") {
              return total + (course.price || 0);
            }
            return total;
          },
          0
        );

        let completedChaptersCount = 0;
        let totalUserProgressCount = 0;

        course.chapters.forEach((chapter) => {
          const completedCount = chapter.userProgress.filter(
            (progress) => progress.isCompleted
          ).length;
          completedChaptersCount += completedCount;
          totalUserProgressCount += chapter.userProgress.length;
        });

        const completionRate =
          totalUserProgressCount > 0
            ? Math.round(
                (completedChaptersCount / totalUserProgressCount) * 100
              )
            : 0;

        const codeStats = codeRevenueByCourseMap.get(course.id);

        return {
          id: course.id,
          title: course.title,
          sales: course.purchases.length,
          revenue: courseRevenue,
          completionRate,
          codeSales: codeStats?.count ?? 0,
          codeRevenue: codeStats?.revenue ?? 0,
        };
      } catch (error) {
        console.error(`[ANALYTICS] Error processing course ${course.id}:`, error);
        return {
          id: course.id,
          title: course.title,
          sales: 0,
          revenue: 0,
          completionRate: 0,
          codeSales: 0,
          codeRevenue: 0,
        };
      }
    });

    courseAnalytics.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = courseAnalytics.reduce(
      (total, course) => total + course.revenue,
      0
    );
    const totalSales = courseAnalytics.reduce(
      (total, course) => total + course.sales,
      0
    );

    const revenueData = {
      labels: courseAnalytics.map((course) => course.title),
      datasets: [
        {
          label: "إيرادات الاشتراكات",
          data: courseAnalytics.map((course) => course.revenue),
          backgroundColor: "rgba(75, 192, 192, 0.5)",
        },
        {
          label: "إيرادات الأكواد",
          data: courseAnalytics.map((course) => course.codeRevenue),
          backgroundColor: "rgba(249, 115, 22, 0.55)",
        },
      ],
    };

    const salesData = {
      labels: courseAnalytics.map((course) => course.title),
      datasets: [
        {
          label: "Sales",
          data: courseAnalytics.map((course) => course.sales),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(201, 203, 207, 0.6)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(201, 203, 207, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    return NextResponse.json({
      totalRevenue,
      totalSales,
      courseCount: courses.length,
      courseAnalytics,
      revenueData,
      salesData,
      fawaterakDepositsTotal,
      fawaterakDepositsCount,
      codeRedemptionsCount,
      codeRedemptionListRevenue,
      codeRedemptionPaidFromBalance,
      codeRevenueByCourse,
      moneyBreakdown: {
        labels: ["رصيد فواتيرك", "إيرادات الأكواد"],
        data: [fawaterakDepositsTotal, codeRedemptionListRevenue],
      },
    });
  } catch (error) {
    console.error("[TEACHER_ANALYTICS_ERROR]", error);
    return new NextResponse(
      JSON.stringify({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
