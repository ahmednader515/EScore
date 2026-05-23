import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { LEGAL_PAGES } from "@/lib/site-info";
import { cn } from "@/lib/utils";

type InfoPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function InfoPageLayout({
  title,
  subtitle,
  children,
  className,
}: InfoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <header className="mb-10 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: "#361e01" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-lg">{subtitle}</p>
          )}
        </header>

        <article
          className={cn(
            "prose prose-neutral max-w-none text-[#361e01]",
            "prose-headings:text-[#361e01] prose-headings:font-bold",
            "prose-p:text-[#361e01]/90 prose-li:text-[#361e01]/90",
            "prose-a:text-[#ab8302] prose-a:no-underline hover:prose-a:underline",
            className
          )}
        >
          {children}
        </article>

        <nav
          className="mt-12 pt-8 border-t border-[#361e01]/20"
          aria-label="صفحات قانونية ومعلومات"
        >
          <p className="text-sm text-muted-foreground mb-4 text-center">
            صفحات ذات صلة
          </p>
          <ul className="flex flex-wrap justify-center gap-3">
            {LEGAL_PAGES.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-[#361e01]/20 bg-[#fcfaed] hover:bg-[#361e01]/5 transition-colors"
                  style={{ color: "#361e01" }}
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
