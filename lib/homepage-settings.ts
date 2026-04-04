export const HOMEPAGE_SETTINGS_DEFAULTS = {
  heroMainText: "تعلم الإنجليزية بسهولة مع أفضل المدرسين",
  heroSubText: "انضم إلينا في رحلتنا في 2026",
  primaryCtaText: "تسجيل الدخول",
  reelsCtaText: "شاهد الريلز",
  coursesTitle: "الكورسات المتاحة",
  coursesSubtitle: "اكتشف مجموعة متنوعة من الكورسات التعليمية المميزة",
  teacherName1: "علاء الجبيلي",
  teacherName2: "عبد الكريم الزيات",
  teacherName3: "رضا المطراوي",
  heroImage1: "/teacher-image.png",
  heroImage2: "/teacher-image2.png",
  heroImage3: "/teacher-image3.png",
  brandPrimary: "#361e01",
  brandAccent: "#ab8302",
} as const;

export type HomepageSettingsPayload = typeof HOMEPAGE_SETTINGS_DEFAULTS;

