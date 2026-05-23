"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEGAL_PAGES, SITE_INFO } from "@/lib/site-info";

export const Footer = () => {
  const pathname = usePathname();

  const hasSidebar =
    pathname?.startsWith("/dashboard") || pathname?.startsWith("/courses");

  return (
    <footer className="py-8 border-t bg-white">
      <div className="container mx-auto px-4">
        <div
          className={`text-center text-muted-foreground ${
            hasSidebar
              ? "md:rtl:pr-56 md:ltr:pl-56 lg:rtl:pr-80 lg:ltr:pl-80"
              : ""
          }`}
        >
          <nav
            className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6"
            aria-label="روابط قانونية ومعلومات"
          >
            {LEGAL_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="text-sm hover:text-[#361e01] transition-colors"
                style={{ color: pathname === page.href ? "#361e01" : undefined }}
              >
                {page.label}
              </Link>
            ))}
          </nav>

          <div className="inline-block bg-[#361e01]/10 border-2 border-[#361e01]/20 rounded-lg px-6 py-3 mb-4">
            <p className="font-semibold text-lg text-[#361e01]">
              واتساب:{" "}
              <a
                href={SITE_INFO.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                dir="ltr"
              >
                {SITE_INFO.whatsapp}
              </a>
            </p>
          </div>

          <p>
            © {new Date().getFullYear()} {SITE_INFO.legalName}. جميع الحقوق
            محفوظة
          </p>
        </div>
      </div>
    </footer>
  );
};
