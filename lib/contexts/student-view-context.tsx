"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { STUDENT_VIEW_COOKIE } from "@/lib/student-view";

const STUDENT_VIEW_EVENT = "escore-student-view-change";

function readStudentViewCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${STUDENT_VIEW_COOKIE}=1`);
}

function clearStudentViewCookieClient() {
  document.cookie = `${STUDENT_VIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

type StudentViewContextValue = {
  isStudentView: boolean;
  isStaffPath: boolean;
  /** Banner only on student-facing dashboard paths while mode is on */
  showBanner: boolean;
  /** Enter button on teacher/admin paths when mode is off */
  showEnterButton: boolean;
  setStudentView: (enabled: boolean) => void;
  syncFromCookie: () => void;
};

const StudentViewContext = createContext<StudentViewContextValue | null>(null);

export function StudentViewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isStudentView, setIsStudentView] = useState(false);

  const isStaffPath =
    !!pathname?.startsWith("/dashboard/teacher") ||
    !!pathname?.startsWith("/dashboard/admin");

  const syncFromCookie = useCallback(() => {
    setIsStudentView(readStudentViewCookie());
  }, []);

  const setStudentView = useCallback((enabled: boolean) => {
    setIsStudentView(enabled);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(STUDENT_VIEW_EVENT, { detail: { enabled } })
      );
    }
  }, []);

  // Keep in sync with cookie + route changes
  useLayoutEffect(() => {
    // Visiting staff area ends student-view mode
    if (isStaffPath && readStudentViewCookie()) {
      clearStudentViewCookieClient();
      setStudentView(false);
      return;
    }
    syncFromCookie();
  }, [pathname, isStaffPath, setStudentView, syncFromCookie]);

  useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setIsStudentView(detail.enabled);
      } else {
        syncFromCookie();
      }
    };
    const onFocus = () => syncFromCookie();

    window.addEventListener(STUDENT_VIEW_EVENT, onEvent);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(STUDENT_VIEW_EVENT, onEvent);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncFromCookie]);

  const value = useMemo<StudentViewContextValue>(
    () => ({
      isStudentView,
      isStaffPath,
      showBanner: isStudentView && !isStaffPath,
      showEnterButton: isStaffPath && !isStudentView,
      setStudentView,
      syncFromCookie,
    }),
    [isStudentView, isStaffPath, setStudentView, syncFromCookie]
  );

  return (
    <StudentViewContext.Provider value={value}>
      {children}
    </StudentViewContext.Provider>
  );
}

export function useStudentView() {
  const ctx = useContext(StudentViewContext);
  if (!ctx) {
    throw new Error("useStudentView must be used within StudentViewProvider");
  }
  return ctx;
}
