"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Megaphone, Power } from "lucide-react";

type GlobalNotificationDto = {
  id: string;
  title: string;
  message: string;
  targetGrades: string[];
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const ALL_GRADES: { value: string; label: string }[] = [
  { value: "الاول الاعدادي", label: "الاول الاعدادي" },
  { value: "الثاني الاعدادي", label: "الثاني الاعدادي" },
  { value: "الثالث الاعدادي", label: "الثالث الاعدادي" },
  { value: "الأول الثانوي", label: "الأول الثانوي" },
  { value: "الثاني الثانوي", label: "الثاني الثانوي" },
  { value: "الثالث الثانوي", label: "الثالث الثانوي" },
];

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function GlobalNotificationsManager({
  title = "الإشعارات العامة",
}: {
  title?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<GlobalNotificationDto[]>([]);

  const [form, setForm] = useState<{
    title: string;
    message: string;
    targetGrades: string[];
    isActive: boolean;
    startsAt: string;
    endsAt: string;
  }>(() => ({
    title: "",
    message: "",
    targetGrades: [],
    isActive: true,
    startsAt: "",
    endsAt: "",
  }));

  const selectedGradesLabel = useMemo(() => {
    if (form.targetGrades.length === 0) return "كل الصفوف";
    return form.targetGrades.join("، ");
  }, [form.targetGrades]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/global-notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as GlobalNotificationDto[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("فشل تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleGrade = (grade: string) => {
    setForm((prev) => {
      const next = new Set(prev.targetGrades);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return { ...prev, targetGrades: Array.from(next) };
    });
  };

  const create = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("العنوان والمحتوى مطلوبين");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/global-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          targetGrades: form.targetGrades,
          isActive: form.isActive,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create");
      }

      toast.success("تم إنشاء الإشعار");
      setForm({
        title: "",
        message: "",
        targetGrades: [],
        isActive: true,
        startsAt: "",
        endsAt: "",
      });
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("فشل إنشاء الإشعار");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    try {
      const res = await fetch(`/api/global-notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isActive: next } : x)));
      toast.success(next ? "تم تفعيل الإشعار" : "تم إيقاف الإشعار");
    } catch (e) {
      console.error(e);
      toast.error("فشل تحديث الإشعار");
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/global-notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("تم حذف الإشعار");
    } catch (e) {
      console.error(e);
      toast.error("فشل حذف الإشعار");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      </div>

      <Card className="border-[#361e01]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#361e01]" />
            إنشاء إشعار جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="مثال: تنبيه هام"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة</label>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: Boolean(v) }))}
                />
                <span className="text-sm">
                  {form.isActive ? "مفعل (سيظهر للطلاب)" : "غير مفعل"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">المحتوى</label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="اكتب رسالة واضحة تجذب انتباه الطلاب..."
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">تصفية حسب الصف</label>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedGradesLabel}
                </Badge>
                {form.targetGrades.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, targetGrades: [] }))}
                  >
                    عرض لجميع الصفوف
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_GRADES.map((g) => {
                  const checked = form.targetGrades.includes(g.value);
                  return (
                    <div
                      key={g.value}
                      onClick={() => toggleGrade(g.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") toggleGrade(g.value);
                      }}
                      role="button"
                      tabIndex={0}
                      className={[
                        "flex items-center gap-3 rounded-lg border p-3 text-right transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        checked
                          ? "bg-[#361e01] text-white border-[#361e01]"
                          : "hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <Checkbox checked={checked} aria-hidden tabIndex={-1} />
                      <span className="text-sm font-medium">{g.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">يبدأ في (اختياري)</label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                placeholder={toLocalDatetimeValue(new Date())}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ينتهي في (اختياري)</label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={create}
              disabled={saving}
              className="bg-[#361e01] hover:bg-[#361e01]/90 text-white"
            >
              {saving ? "جارٍ الحفظ..." : "نشر الإشعار"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#361e01]/20">
        <CardHeader>
          <CardTitle>كل الإشعارات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              لا توجد إشعارات بعد
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border p-4 bg-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-bold text-lg">{n.title}</div>
                      <Badge variant={n.isActive ? "default" : "outline"}>
                        {n.isActive ? "مفعل" : "متوقف"}
                      </Badge>
                      <Badge variant="secondary">
                        {n.targetGrades?.length ? n.targetGrades.join("، ") : "كل الصفوف"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {n.message}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => toggleActive(n.id, !n.isActive)}
                      className="gap-2"
                    >
                      <Power className="h-4 w-4" />
                      {n.isActive ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => remove(n.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

