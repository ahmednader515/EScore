import { Purchase } from "@prisma/client";

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
  purchases: Pick<Purchase, "status">[]
): boolean {
  return isFreeCourse(price) || hasActivePurchase(purchases);
}

export function getCourseLink(
  course: {
    id: string;
    price: number | null;
    chapters: { id: string }[];
    purchases: Pick<Purchase, "status">[];
  },
  options?: { previewChapterId?: string }
): { href: string; label: string } {
  const enrolled = hasActivePurchase(course.purchases);
  const free = isFreeCourse(course.price);

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
  isStaff: boolean
): boolean {
  if (isStaff) return true;
  return canAccessCourseContent(price, purchases) || chapterIsFree;
}
