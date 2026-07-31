import { PrismaClient } from "@prisma/client";
import { SUBSCRIPTION_PLAN_SEEDS } from "../lib/subscriptions";

const datasourceUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error("Missing DIRECT_DATABASE_URL or DATABASE_URL environment variable.");
}

const prisma = new PrismaClient({
  datasourceUrl,
});

async function seedSubscriptionPlans() {
  for (const plan of SUBSCRIPTION_PLAN_SEEDS) {
    await prisma.subscriptionPlan.upsert({
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
  console.log(`Seeded ${SUBSCRIPTION_PLAN_SEEDS.length} subscription plans.`);
}

async function main() {
  await seedSubscriptionPlans();
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
