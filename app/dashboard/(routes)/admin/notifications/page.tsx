import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GlobalNotificationsManager } from "../../_components/global-notifications-manager";

export default async function AdminNotificationsPage() {
  const { userId, user } = await auth();

  if (!userId) {
    return redirect("/");
  }

  if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  return <GlobalNotificationsManager title="إشعارات الطلاب (عامة)" />;
}

