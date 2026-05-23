import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { InfoPageLayout } from "@/components/info-page-layout";
import { Button } from "@/components/ui/button";
import { SITE_INFO } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "تواصل معنا | E Score",
  description: "معلومات التواصل والدعم لمنصة E Score",
};

export default function ContactPage() {
  return (
    <InfoPageLayout
      title="تواصل معنا"
      subtitle="فريق الدعم جاهز لمساعدتك في الحساب، الدفع، والكورسات"
    >
      <p>
        لأي استفسار عن التسجيل، شحن الرصيد، شراء الكورسات، أو مشاكل الدفع عبر
        فواتيرك، تواصل معنا عبر القنوات التالية:
      </p>

      <div className="not-prose grid gap-4 my-8">
        <div className="flex items-start gap-4 p-5 rounded-xl border border-[#361e01]/20 bg-[#fcfaed]">
          <div className="w-12 h-12 rounded-full bg-[#361e01] flex items-center justify-center shrink-0">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#361e01" }}>
              واتساب (الدعم السريع)
            </h3>
            <p className="text-muted-foreground mb-3" dir="ltr">
              {SITE_INFO.whatsapp}
            </p>
            <Button asChild className="bg-[#361e01] hover:bg-[#361e01]/90 text-white">
              <a
                href={SITE_INFO.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح محادثة واتساب
              </a>
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 rounded-xl border border-[#361e01]/20 bg-[#fcfaed]">
          <div className="w-12 h-12 rounded-full bg-[#361e01] flex items-center justify-center shrink-0">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#361e01" }}>
              البريد الإلكتروني
            </h3>
            <p className="mb-3">
              <a
                href={`mailto:${SITE_INFO.supportEmail}`}
                className="text-[#ab8302] hover:underline"
                dir="ltr"
              >
                {SITE_INFO.supportEmail}
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              نرد عادة خلال 1–3 أيام عمل. يرجى ذكر البريد المسجل في المنصة.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 rounded-xl border border-[#361e01]/20 bg-[#fcfaed]">
          <div className="w-12 h-12 rounded-full bg-[#361e01] flex items-center justify-center shrink-0">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#361e01" }}>
              الجهة القانونية
            </h3>
            <p className="text-muted-foreground">
              {SITE_INFO.legalName} — {SITE_INFO.platformName}
            </p>
            <p className="text-muted-foreground mt-1">{SITE_INFO.address}</p>
          </div>
        </div>
      </div>

      <h2>ساعات الدعم</h2>
      <p>
        الدعم عبر واتساب متاح يوميًا من 10 صباحًا حتى 10 مساءً (بتوقيت مصر).
        الاستفسارات عبر البريد تُعالج خلال أيام العمل.
      </p>

      <h2>معلومات مفيدة عند التواصل</h2>
      <ul>
        <li>البريد الإلكتروني المسجل في الحساب</li>
        <li>رقم عملية الدفع (من فواتيرك) إن وُجد</li>
        <li>اسم الكورس أو وصف المشكلة</li>
        <li>لقطة شاشة للخطأ إن أمكن</li>
      </ul>

      <p>
        للاطلاع على الأسعار:{" "}
        <Link href="/pricing" className="text-[#ab8302] hover:underline">
          صفحة الأسعار
        </Link>
        . للاسترداد:{" "}
        <Link href="/refund-policy" className="text-[#ab8302] hover:underline">
          سياسة الاسترجاع
        </Link>
        .
      </p>
    </InfoPageLayout>
  );
}
