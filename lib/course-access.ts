import { CourseType, Purchase } from "@prisma/client";
import {
  getHierarchicalEntryHref,
  hasPublishedHierarchicalContent,
  isHierarchicalCourse,
} from "@/lib/course-hierarchy";
import {
  hasActiveSubscriptionForCourse,
  type CourseForSubscription,
  type SubscriptionLike,
} from "@/lib/subscriptions";

export function isFreeCourse(price: number | null | undefined): boolean {
  return price === null || price === 0;
}

export function hasActivePurchase(
  purchases: Pick<Purchase, "status">[]
): boolean {
  return purchases.some((purchase) => purchase.status === "ACTIVE");
}

export function canAccessCourseContent(
  price: number | null | undefined,
  purchases: Pick<Purchase, "status">[],
  options?: {
    subscriptions?: SubscriptionLike[];
    course?: CourseForSubscription;
  }
): boolean {
  if (isFreeCourse(price) || hasActivePurchase(purchases)) {
    return true;
  }

  if (options?.subscriptions && options?.course) {
    return hasActiveSubscriptionForCourse(options.subscriptions, options.course);
  }

  return false;
}

export function getCourseLink(
  course: {
    id: string;
    price: number | null;
    courseType?: CourseType;
    grade?: string | null;
    divisions?: string[];
    chapters: { id: string }[];
    purchases: Pick<Purchase, "status">[];
    courseTeachers?: {
      id: string;
      units: { id: string; contentItems: { id: string }[] }[];
    }[];
  },
  options?: {
    previewChapterId?: string;
    subscriptions?: SubscriptionLike[];
  }
): { href: string; label: string } {
  const subscribed =
    !!options?.subscriptions &&
    hasActiveSubscriptionForCourse(options.subscriptions, {
      grade: course.grade ?? null,
      divisions: course.divisions ?? [],
    });
  const enrolled = hasActivePurchase(course.purchases) || subscribed;
  const free = isFreeCourse(course.price);
  const hierarchical = isHierarchicalCourse(course.courseType ?? "FLAT");

  if (hierarchical) {
    if (enrolled || free) {
      return {
        href: getHierarchicalEntryHref(course.id),
        label: enrolled ? "متابعة التعلم" : "عرض الكورس",
      };
    }

    if (hasPublishedHierarchicalContent(course.courseTeachers)) {
      return {
        href: getHierarchicalEntryHref(course.id),
        label: "معاينة الكورس",
      };
    }

    return {
      href: `/courses/${course.id}/purchase`,
      label: "شراء الكورس",
    };
  }

  if (enrolled) {
    const href =
      course.chapters.length > 0
        ? `/courses/${course.id}/chapters/${course.chapters[0].id}`
        : `/courses/${course.id}`;
    return { href, label: "متابعة التعلم" };
  }

  if (free) {
    const href =
      course.chapters.length > 0
        ? `/courses/${course.id}/chapters/${course.chapters[0].id}`
        : `/courses/${course.id}`;
    return { href, label: "عرض الكورس" };
  }

  if (options?.previewChapterId) {
    return {
      href: `/courses/${course.id}/chapters/${options.previewChapterId}`,
      label: "معاينة مجانية",
    };
  }

  return {
    href: `/courses/${course.id}/purchase`,
    label: "شراء الكورس",
  };
}

export function canAccessChapter(
  price: number | null | undefined,
  purchases: Pick<Purchase, "status">[],
  chapterIsFree: boolean,
  isStaff: boolean,
  options?: {
    subscriptions?: SubscriptionLike[];
    course?: CourseForSubscription;
  }
): boolean {
  if (isStaff) return true;
  return canAccessCourseContent(price, purchases, options) || chapterIsFree;
}

export function canAccessContentItem(
  price: number | null | undefined,
  purchases: Pick<Purchase, "status">[],
  contentIsFree: boolean,
  isStaff: boolean,
  options?: {
    subscriptions?: SubscriptionLike[];
    course?: CourseForSubscription;
  }
): boolean {
  if (isStaff) return true;
  return canAccessCourseContent(price, purchases, options) || contentIsFree;
}
