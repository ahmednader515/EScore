import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface CourseBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const CourseBreadcrumbs = ({ items }: CourseBreadcrumbsProps) => {
  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground mb-6">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronLeft className="h-3 w-3 rotate-180" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};
