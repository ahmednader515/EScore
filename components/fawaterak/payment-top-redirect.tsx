"use client";

import { useEffect } from "react";

type PaymentTopRedirectProps = {
  targetPath: string;
};

/**
 * Breaks out of Fawaterak's nested iframe and navigates the top window.
 * Used on public return routes so auth cookies are not required in the iframe.
 */
export function PaymentTopRedirect({ targetPath }: PaymentTopRedirectProps) {
  useEffect(() => {
    const target = targetPath.startsWith("/")
      ? `${window.location.origin}${targetPath}`
      : targetPath;

    try {
      if (window.self !== window.top && window.top) {
        window.top.location.replace(target);
        return;
      }
    } catch {
      // cross-origin parent — fall through
    }

    window.location.replace(target);
  }, [targetPath]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-muted-foreground">
      جاري إعادة التوجيه...
    </div>
  );
}
