"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentReelsFab() {
  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
      <Button
        asChild
        size="lg"
        className="floating-reels-btn h-14 rounded-full border-2 border-white/90 px-6 text-base font-bold !text-white shadow-2xl shadow-black/40 ring-4 active:scale-[0.98] [&_*]:!text-white"
        style={{
          backgroundColor: "var(--brand-primary)",
          borderColor: "rgba(255,255,255,0.9)",
          boxShadow:
            "0 0 0 4px color-mix(in srgb, var(--brand-accent) 45%, transparent)",
          color: "#ffffff",
        }}
      >
        <Link
          href="/reels"
          className="inline-flex items-center gap-2.5 !text-white"
          style={{ color: "#ffffff" }}
        >
          <PlayCircle className="h-6 w-6 shrink-0 !text-white" aria-hidden />
          <span className="!text-white" style={{ color: "#ffffff" }}>
            شاهد الريلز
          </span>
        </Link>
      </Button>
    </div>
  );
}
