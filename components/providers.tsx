"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toaster-provider";
import { Toaster } from "sonner";
import { RTLProvider } from "@/components/providers/rtl-provider";
import { NavigationProvider } from "@/lib/contexts/navigation-context";
import { NavigationLoading } from "@/components/navigation-loading";
import { useEffect, Suspense } from "react";
import { HOMEPAGE_SETTINGS_DEFAULTS } from "@/lib/homepage-settings";

const hexToRgb = (hex: string): [number, number, number] | null => {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const bigint = parseInt(normalized, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const withAlpha = (hex: string, alpha: number, fallback: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};

// Component to handle session loading states
const SessionHandler = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Log session status for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("Session status:", status, "Session:", session);
    }
  }, [session, status]);

  return <>{children}</>;
};

const ThemeColorSync = () => {
  useEffect(() => {
    const applyThemeColors = async () => {
      try {
        const response = await fetch("/api/homepage-settings", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        const brandPrimary = data?.brandPrimary || HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary;
        const brandAccent = data?.brandAccent || HOMEPAGE_SETTINGS_DEFAULTS.brandAccent;
        const brandSurface = "#fcfaed";
        const brandPrimary90 = withAlpha(brandPrimary, 0.9, "rgba(54, 30, 1, 0.9)");
        const brandPrimary10 = withAlpha(brandPrimary, 0.1, "rgba(54, 30, 1, 0.1)");
        const brandAccent20 = withAlpha(brandAccent, 0.2, "rgba(171, 131, 2, 0.2)");
        const brandAccent40 = withAlpha(brandAccent, 0.4, "rgba(171, 131, 2, 0.4)");

        const root = document.documentElement;
        root.style.setProperty("--brand-primary", brandPrimary);
        root.style.setProperty("--brand-accent", brandAccent);
        root.style.setProperty("--brand-surface", brandSurface);
        root.style.setProperty("--brand-primary-90", brandPrimary90);
        root.style.setProperty("--brand-primary-10", brandPrimary10);
        root.style.setProperty("--brand-accent-20", brandAccent20);
        root.style.setProperty("--brand-accent-40", brandAccent40);
        root.style.setProperty("--primary", brandPrimary);
        root.style.setProperty("--sidebar-primary", brandPrimary);
      } catch {
        // Keep default CSS variables if settings fetch fails.
      }
    };

    applyThemeColors();
  }, []);

  return null;
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider
      refetchInterval={0} // Disable automatic refetching
      refetchOnWindowFocus={false} // Disable refetch on window focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <SessionHandler>
        <NavigationProvider>
          <RTLProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <ThemeColorSync />
              <ToastProvider />
              <Suspense fallback={null}>
                <NavigationLoading />
              </Suspense>
              {children}
              <Toaster />
            </ThemeProvider>
          </RTLProvider>
        </NavigationProvider>
      </SessionHandler>
    </SessionProvider>
  );
}; 