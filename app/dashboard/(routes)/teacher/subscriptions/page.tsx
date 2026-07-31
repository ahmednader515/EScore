"use client";

import { SubscriptionPlansManager } from "@/components/subscription-plans-manager";

export default function TeacherSubscriptionsPage() {
  return <SubscriptionPlansManager apiBase="/api/teacher/subscriptions/plans" />;
}
