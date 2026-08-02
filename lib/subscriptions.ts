export const INTERMEDIATE_GRADES = [
  "الاول الاعدادي",
  "الثاني الاعدادي",
  "الثالث الاعدادي",
] as const;

export const SECONDARY_GRADES = [
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
] as const;

/** Grades that can buy subscriptions, in display order */
export const SUBSCRIPTION_GRADES = [
  ...INTERMEDIATE_GRADES,
  ...SECONDARY_GRADES,
] as const;

export type IntermediateGrade = (typeof INTERMEDIATE_GRADES)[number];
export type SecondaryGrade = (typeof SECONDARY_GRADES)[number];
export type SubscriptionGrade = (typeof SUBSCRIPTION_GRADES)[number];

export const SUBSCRIPTION_PLAN_SEEDS: {
  grade: SubscriptionGrade;
  durationMonths: number;
  label: string;
  price: number;
}[] = [
  { grade: "الاول الاعدادي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الاول الاعدادي", durationMonths: 4, label: "ترم كامل", price: 0 },
  { grade: "الثاني الاعدادي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الثاني الاعدادي", durationMonths: 4, label: "ترم كامل", price: 0 },
  { grade: "الثالث الاعدادي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الثالث الاعدادي", durationMonths: 4, label: "ترم كامل", price: 0 },
  { grade: "الأول الثانوي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الأول الثانوي", durationMonths: 4, label: "ترم كامل", price: 0 },
  { grade: "الثاني الثانوي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الثاني الثانوي", durationMonths: 3, label: "3 أشهر", price: 0 },
  { grade: "الثالث الثانوي", durationMonths: 1, label: "شهر", price: 0 },
  { grade: "الثالث الثانوي", durationMonths: 3, label: "3 أشهر", price: 0 },
];

const GRADE_ALIASES: Record<string, SubscriptionGrade> = {
  "الأول الاعدادي": "الاول الاعدادي",
  "الصف الاول الاعدادي": "الاول الاعدادي",
  "الصف الأول الاعدادي": "الاول الاعدادي",
  "الصف الثاني الاعدادي": "الثاني الاعدادي",
  "الصف الثالث الاعدادي": "الثالث الاعدادي",
  "الصف الأول الثانوي": "الأول الثانوي",
  "الصف الاول الثانوي": "الأول الثانوي",
  "الصف الثاني الثانوي": "الثاني الثانوي",
  "الصف الثالث الثانوي": "الثالث الثانوي",
  "اول الاعدادي": "الاول الاعدادي",
  "الاول الثانوي": "الأول الثانوي",
};

export function normalizeGrade(
  grade: string | null | undefined
): SubscriptionGrade | null {
  if (grade == null) return null;
  const trimmed = grade.trim();
  if (!trimmed) return null;

  if ((SUBSCRIPTION_GRADES as readonly string[]).includes(trimmed)) {
    return trimmed as SubscriptionGrade;
  }

  return GRADE_ALIASES[trimmed] ?? null;
}

export function isIntermediateGrade(
  grade: string | null | undefined
): grade is IntermediateGrade {
  const normalized = normalizeGrade(grade);
  return (
    !!normalized &&
    (INTERMEDIATE_GRADES as readonly string[]).includes(normalized)
  );
}

export function isSecondaryGrade(
  grade: string | null | undefined
): grade is SecondaryGrade {
  const normalized = normalizeGrade(grade);
  return (
    !!normalized &&
    (SECONDARY_GRADES as readonly string[]).includes(normalized)
  );
}

export function isSubscriptionGrade(
  grade: string | null | undefined
): grade is SubscriptionGrade {
  return normalizeGrade(grade) !== null;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) {
    result.setDate(0);
  }
  return result;
}

export type SubscriptionLike = {
  status: string;
  endsAt: Date;
  grade: string;
};

export type CourseForSubscription = {
  grade: string | null;
};

export function isSubscriptionCurrentlyActive(
  subscription: Pick<SubscriptionLike, "status" | "endsAt">,
  now: Date = new Date()
): boolean {
  return subscription.status === "ACTIVE" && subscription.endsAt > now;
}

/** Active subscription unlocks courses by matching grade (or grade === الكل). */
export function subscriptionCoversCourse(
  subscription: SubscriptionLike,
  course: CourseForSubscription,
  now: Date = new Date()
): boolean {
  if (!isSubscriptionCurrentlyActive(subscription, now)) {
    return false;
  }

  if (course.grade === "الكل") {
    return true;
  }

  const courseGrade = normalizeGrade(course.grade);
  const subscriptionGrade =
    normalizeGrade(subscription.grade) ?? subscription.grade;

  if (!courseGrade || !isSubscriptionGrade(courseGrade)) {
    return false;
  }

  return courseGrade === subscriptionGrade;
}

export function hasActiveSubscriptionForCourse(
  subscriptions: SubscriptionLike[],
  course: CourseForSubscription,
  now: Date = new Date()
): boolean {
  return subscriptions.some((sub) =>
    subscriptionCoversCourse(sub, course, now)
  );
}
