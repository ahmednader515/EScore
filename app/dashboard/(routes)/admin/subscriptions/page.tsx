"use client";

import { SubscriptionPlansManager } from "@/components/subscription-plans-manager";

export default function AdminSubscriptionsPage() {
  return <SubscriptionPlansManager apiBase="/api/admin/subscriptions/plans" />;
}
