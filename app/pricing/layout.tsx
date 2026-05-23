import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الأسعار | E Score",
  description: "أسعار الكورسات وشحن الرصيد على منصة E Score",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
