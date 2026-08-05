"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigation } from "@/lib/contexts/navigation-context";

export const NavigationLoading = () => {
  const { isNavigating, startNavigating, stopNavigating } = useNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastLocationRef = useRef<string>("");
  const pendingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLocation = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname || "";
  }, [pathname, searchParams]);

  const clearTimers = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  const finishNavigation = () => {
    pendingRef.current = false;
    clearTimers();
    stopNavigating();
  };

  const beginNavigation = (opts?: { settleQuickly?: boolean }) => {
    pendingRef.current = true;
    startNavigating();
    clearTimers();

    // Safety net if route never reports a change
    fallbackTimerRef.current = setTimeout(finishNavigation, 8000);

    // Back/forward often restores from cache without a "slow" load —
    // clear as soon as the next frames / microtask have painted.
    if (opts?.settleQuickly) {
      settleTimerRef.current = setTimeout(finishNavigation, 50);
      requestAnimationFrame(() => {
        requestAnimationFrame(finishNavigation);
      });
    }
  };

  // Hide overlay as soon as the App Router commits a new URL
  useEffect(() => {
    const previous = lastLocationRef.current;

    if (!previous) {
      lastLocationRef.current = currentLocation;
      return;
    }

    if (previous !== currentLocation) {
      lastLocationRef.current = currentLocation;
      if (pendingRef.current || isNavigating) {
        finishNavigation();
      }
      return;
    }

    lastLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastLocationRef.current = currentLocation;

    const handleClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      let link: HTMLAnchorElement | null = null;
      let button: HTMLButtonElement | null = null;

      while (target && target !== document.body) {
        if (target.tagName === "A") {
          link = target as HTMLAnchorElement;
          break;
        }
        if (target.tagName === "BUTTON") {
          const candidate = target as HTMLButtonElement;
          const isInSidebar = candidate.closest('[class*="sidebar"]') !== null;
          const hasNavIntent =
            candidate.getAttribute("data-navigate") === "true";
          if (isInSidebar || hasNavIntent) {
            button = candidate;
            break;
          }
        }
        target = target.parentElement;
      }

      if (link) {
        const href = link.getAttribute("href");
        if (!href) return;

        if (
          href.startsWith("http") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("#") ||
          link.hasAttribute("download") ||
          (link.hasAttribute("target") &&
            link.getAttribute("target") !== "_self")
        ) {
          return;
        }

        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;

          if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search
          ) {
            return;
          }
        } catch {
          // relative URL — continue
        }

        beginNavigation();
      } else if (button) {
        beginNavigation();
      }
    };

    const handlePopState = () => {
      beginNavigation({ settleQuickly: true });
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || pendingRef.current) {
        finishNavigation();
      }
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      clearTimers();
    };
  }, [startNavigating, stopNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fcfaed] via-[#e8e0c0] to-[#d4c8a0] opacity-90" />

      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-white/10 blur-3xl"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-400/20 blur-3xl"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-300/10 blur-3xl"
          style={{ animationDuration: "5s", animationDelay: "0.5s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-0 backdrop-blur-md" />

      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <div
            className="h-24 w-24 animate-spin rounded-full border-4 border-transparent border-t-[#361e01]/30 border-r-[#361e01]/30"
            style={{ animationDuration: "1.5s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-transparent border-b-[#361e01]/50 border-l-[#361e01]/50"
            style={{ animationDuration: "1s", animationDirection: "reverse" }}
          />
          <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-br from-[#361e01]/20 to-[#361e01]/40" />
          <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#361e01] shadow-lg" />
        </div>

        <div className="space-y-3 text-center">
          <h2 className="animate-pulse bg-gradient-to-r from-[#361e01] via-[#361e01]/80 to-[#361e01] bg-clip-text text-2xl font-bold text-transparent">
            جاري تحميل الصفحة
          </h2>
          <p className="text-sm font-medium text-[#361e01]/80">
            لحظة، من فضلك...
          </p>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-[#361e01] shadow-lg"
            style={{ animationDelay: "0s", animationDuration: "1.4s" }}
          />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-[#361e01]/70 shadow-lg"
            style={{ animationDelay: "0.2s", animationDuration: "1.4s" }}
          />
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-[#361e01] shadow-lg"
            style={{ animationDelay: "0.4s", animationDuration: "1.4s" }}
          />
        </div>

        <div className="h-1 w-64 overflow-hidden rounded-full bg-[#361e01]/20">
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-[#361e01]/40 via-[#361e01] to-[#361e01]/40" />
        </div>
      </div>
    </div>
  );
};
