"use client";

import Link from "next/link";
import { Download, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_DOWNLOAD_URL =
  "https://www.mediafire.com/file/qxgo34nj64x8nez/escore-lms.apk/file";

const floatingBtnClass =
  "floating-reels-btn h-10 rounded-full border-2 border-white/90 px-3 text-xs font-bold !text-white shadow-2xl shadow-black/40 ring-4 active:scale-[0.98] md:h-14 md:px-6 md:text-base [&_*]:!text-white";

type StudentReelsFabProps = {
  reelsCtaText?: string;
  brandPrimary?: string;
  brandAccent?: string;
  withMobileNavOffset?: boolean;
};

export function StudentReelsFab({
  reelsCtaText = "شاهد الريلز",
  brandPrimary = "var(--brand-primary)",
  brandAccent,
  withMobileNavOffset = true,
}: StudentReelsFabProps) {
  const buttonStyle = {
    backgroundColor: brandPrimary,
    borderColor: "rgba(255,255,255,0.9)",
    boxShadow: brandAccent
      ? `0 0 0 4px ${brandAccent}73`
      : "0 0 0 4px color-mix(in srgb, var(--brand-accent) 45%, transparent)",
    color: "#ffffff",
  };

  return (
    <div
      className={
        withMobileNavOffset
          ? "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-6 z-40 flex flex-col items-end md:bottom-8 md:right-8"
          : "fixed bottom-6 right-6 z-50 flex flex-col items-end md:bottom-8 md:right-8"
      }
    >
      <div className="mb-5" style={{ marginBottom: 20 }}>
        <Button asChild size="lg" className={floatingBtnClass} style={buttonStyle}>
          <a
            href={APP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 !text-white md:gap-2.5"
            style={{ color: "#ffffff" }}
          >
            <Download className="size-4 shrink-0 !text-white md:size-6" aria-hidden />
            <span className="!text-white" style={{ color: "#ffffff" }}>
              حمل التطبيق
            </span>
          </a>
        </Button>
      </div>
      <Button asChild size="lg" className={floatingBtnClass} style={buttonStyle}>
        <Link
          href="/reels"
          className="inline-flex items-center gap-1.5 !text-white md:gap-2.5"
          style={{ color: "#ffffff" }}
        >
          <PlayCircle className="size-4 shrink-0 !text-white md:size-6" aria-hidden />
          <span className="!text-white" style={{ color: "#ffffff" }}>
            {reelsCtaText}
          </span>
        </Link>
      </Button>
    </div>
  );
}
