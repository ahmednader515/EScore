"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HOMEPAGE_SETTINGS_DEFAULTS, type HomepageSettingsPayload } from "@/lib/homepage-settings";
import { FileUpload } from "@/components/file-upload";
import Image from "next/image";

const TeacherHomepageEditorPage = () => {
  const [form, setForm] = useState<HomepageSettingsPayload>(HOMEPAGE_SETTINGS_DEFAULTS);
  const [initialColors, setInitialColors] = useState({
    brandPrimary: HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary,
    brandAccent: HOMEPAGE_SETTINGS_DEFAULTS.brandAccent,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/teacher/homepage-settings");
        if (!res.ok) {
          toast.error("تعذر تحميل إعدادات الصفحة الرئيسية");
          return;
        }
        const data = await res.json();
        setForm({
          heroMainText: data.heroMainText || HOMEPAGE_SETTINGS_DEFAULTS.heroMainText,
          heroSubText: data.heroSubText || HOMEPAGE_SETTINGS_DEFAULTS.heroSubText,
          primaryCtaText: data.primaryCtaText || HOMEPAGE_SETTINGS_DEFAULTS.primaryCtaText,
          reelsCtaText: data.reelsCtaText || HOMEPAGE_SETTINGS_DEFAULTS.reelsCtaText,
          coursesTitle: data.coursesTitle || HOMEPAGE_SETTINGS_DEFAULTS.coursesTitle,
          coursesSubtitle: data.coursesSubtitle || HOMEPAGE_SETTINGS_DEFAULTS.coursesSubtitle,
          teacherName1: data.teacherName1 || HOMEPAGE_SETTINGS_DEFAULTS.teacherName1,
          teacherName2: data.teacherName2 || HOMEPAGE_SETTINGS_DEFAULTS.teacherName2,
          teacherName3: data.teacherName3 || HOMEPAGE_SETTINGS_DEFAULTS.teacherName3,
          heroImage1: data.heroImage1 || HOMEPAGE_SETTINGS_DEFAULTS.heroImage1,
          heroImage2: data.heroImage2 || HOMEPAGE_SETTINGS_DEFAULTS.heroImage2,
          heroImage3: data.heroImage3 || HOMEPAGE_SETTINGS_DEFAULTS.heroImage3,
          brandPrimary: data.brandPrimary || HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary,
          brandAccent: data.brandAccent || HOMEPAGE_SETTINGS_DEFAULTS.brandAccent,
        });
        setInitialColors({
          brandPrimary: data.brandPrimary || HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary,
          brandAccent: data.brandAccent || HOMEPAGE_SETTINGS_DEFAULTS.brandAccent,
        });
      } catch (error) {
        console.error(error);
        toast.error("حدث خطأ أثناء تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const setField = <K extends keyof HomepageSettingsPayload>(key: K, value: HomepageSettingsPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeHexColor = (value: string, fallback: string) => {
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/homepage-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        toast.error("تعذر حفظ الإعدادات");
        return;
      }

      toast.success("تم حفظ إعدادات الصفحة الرئيسية");

      const normalizedPrimary = normalizeHexColor(form.brandPrimary, HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary).toLowerCase();
      const normalizedAccent = normalizeHexColor(form.brandAccent, HOMEPAGE_SETTINGS_DEFAULTS.brandAccent).toLowerCase();
      const previousPrimary = normalizeHexColor(initialColors.brandPrimary, HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary).toLowerCase();
      const previousAccent = normalizeHexColor(initialColors.brandAccent, HOMEPAGE_SETTINGS_DEFAULTS.brandAccent).toLowerCase();

      if (normalizedPrimary !== previousPrimary || normalizedAccent !== previousAccent) {
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">جاري تحميل الإعدادات...</div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-28 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">تعديل الصفحة الرئيسية</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>النصوص</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>العنوان الرئيسي</Label>
            <Input value={form.heroMainText} onChange={(e) => setField("heroMainText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>النص الفرعي</Label>
            <Input value={form.heroSubText} onChange={(e) => setField("heroSubText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>زر تسجيل الدخول</Label>
            <Input value={form.primaryCtaText} onChange={(e) => setField("primaryCtaText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>زر الريلز</Label>
            <Input value={form.reelsCtaText} onChange={(e) => setField("reelsCtaText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>عنوان قسم الكورسات</Label>
            <Input value={form.coursesTitle} onChange={(e) => setField("coursesTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>وصف قسم الكورسات</Label>
            <Input value={form.coursesSubtitle} onChange={(e) => setField("coursesSubtitle", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الألوان العامة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>اللون الأساسي</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={normalizeHexColor(form.brandPrimary, HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary)}
                onChange={(e) => setField("brandPrimary", e.target.value)}
                className="h-11 w-16 cursor-pointer p-1"
              />
              <Input
                value={form.brandPrimary}
                onChange={(e) => setField("brandPrimary", e.target.value)}
                placeholder="#361e01"
              />
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: normalizeHexColor(form.brandPrimary, HOMEPAGE_SETTINGS_DEFAULTS.brandPrimary) }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>لون التمييز</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={normalizeHexColor(form.brandAccent, HOMEPAGE_SETTINGS_DEFAULTS.brandAccent)}
                onChange={(e) => setField("brandAccent", e.target.value)}
                className="h-11 w-16 cursor-pointer p-1"
              />
              <Input
                value={form.brandAccent}
                onChange={(e) => setField("brandAccent", e.target.value)}
                placeholder="#ab8302"
              />
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: normalizeHexColor(form.brandAccent, HOMEPAGE_SETTINGS_DEFAULTS.brandAccent) }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصور الثابتة وأسماء المدرسين</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <Label>المدرس الأول</Label>
            <Input value={form.teacherName1} onChange={(e) => setField("teacherName1", e.target.value)} />
            <Input value={form.heroImage1} onChange={(e) => setField("heroImage1", e.target.value)} placeholder="رابط الصورة" />
            <div className="relative h-56 w-full overflow-hidden rounded-md border bg-muted">
              <Image src={form.heroImage1} alt={form.teacherName1} fill className="object-cover" unoptimized />
            </div>
            <FileUpload
              endpoint="courseImage"
              onChange={(res) => {
                if (res?.url) {
                  setField("heroImage1", res.url);
                  toast.success("تم رفع صورة المدرس الأول");
                }
              }}
            />
          </div>
          <div className="space-y-3">
            <Label>المدرس الثاني</Label>
            <Input value={form.teacherName2} onChange={(e) => setField("teacherName2", e.target.value)} />
            <Input value={form.heroImage2} onChange={(e) => setField("heroImage2", e.target.value)} placeholder="رابط الصورة" />
            <div className="relative h-56 w-full overflow-hidden rounded-md border bg-muted">
              <Image src={form.heroImage2} alt={form.teacherName2} fill className="object-cover" unoptimized />
            </div>
            <FileUpload
              endpoint="courseImage"
              onChange={(res) => {
                if (res?.url) {
                  setField("heroImage2", res.url);
                  toast.success("تم رفع صورة المدرس الثاني");
                }
              }}
            />
          </div>
          <div className="space-y-3">
            <Label>المدرس الثالث</Label>
            <Input value={form.teacherName3} onChange={(e) => setField("teacherName3", e.target.value)} />
            <Input value={form.heroImage3} onChange={(e) => setField("heroImage3", e.target.value)} placeholder="رابط الصورة" />
            <div className="relative h-56 w-full overflow-hidden rounded-md border bg-muted">
              <Image src={form.heroImage3} alt={form.teacherName3} fill className="object-cover" unoptimized />
            </div>
            <FileUpload
              endpoint="courseImage"
              onChange={(res) => {
                if (res?.url) {
                  setField("heroImage3", res.url);
                  toast.success("تم رفع صورة المدرس الثالث");
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-center p-4">
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-[#361e01] hover:bg-[#361e01]/90 min-w-64 h-12 text-base font-bold">
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherHomepageEditorPage;

