/** Business & contact details — used on legal pages and Fawaterak integration */
export const SITE_INFO = {
  platformName: "E Score",
  legalName: "Mordesu Studio",
  currency: "EGP",
  currencyLabel: "جنيه مصري",
  supportEmail: "support@escore.com",
  whatsapp: "01275597206",
  whatsappLink: "https://wa.me/201275597206",
  address: "جمهورية مصر العربية",
  lastUpdated: "21 مايو 2026",
} as const;

export const LEGAL_PAGES = [
  { href: "/privacy-policy", label: "سياسة الخصوصية" },
  { href: "/terms-and-conditions", label: "الشروط والأحكام" },
  { href: "/refund-policy", label: "سياسة الاسترجاع" },
  { href: "/pricing", label: "الأسعار" },
  { href: "/contact", label: "تواصل معنا" },
] as const;
