-- CreateTable
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "division" TEXT,
    "durationMonths" INTEGER NOT NULL,
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_grade_durationMonths_key" ON "SubscriptionPlan"("grade", "durationMonths");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_grade_idx" ON "SubscriptionPlan"("grade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_endsAt_idx" ON "Subscription"("endsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
