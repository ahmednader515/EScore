"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { CreditCard, Save } from "lucide-react";

interface Plan {
  id: string;
  grade: string;
  durationMonths: number;
  price: number;
  label: string | null;
  isActive: boolean;
}

interface SubscriptionPlansManagerProps {
  /** e.g. "/api/admin/subscriptions/plans" or "/api/teacher/subscriptions/plans" */
  apiBase: string;
}

export function SubscriptionPlansManager({ apiBase }: SubscriptionPlansManagerProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<
    Record<string, { price: string; label: string; isActive: boolean }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch(apiBase);
      if (!res.ok) {
        toast.error("فشل تحميل خطط الاشتراك");
        return;
      }
      const data: Plan[] = await res.json();
      setPlans(data);
      const next: Record<string, { price: string; label: string; isActive: boolean }> = {};
      for (const plan of data) {
        next[plan.id] = {
          price: String(plan.price),
          label: plan.label || "",
          isActive: plan.isActive,
        };
      }
      setDrafts(next);
    } catch {
      toast.error("فشل تحميل خطط الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const handleSave = async (planId: string) => {
    const draft = drafts[planId];
    if (!draft) return;

    const price = parseFloat(draft.price);
    if (Number.isNaN(price) || price < 0) {
      toast.error("السعر غير صالح");
      return;
    }

    setSavingId(planId);
    try {
      const res = await fetch(`${apiBase}/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          label: draft.label.trim() || null,
          isActive: draft.isActive,
        }),
      });

      if (!res.ok) {
        toast.error("فشل حفظ الخطة");
        return;
      }

      const updated: Plan = await res.json();
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      toast.success("تم حفظ الخطة");
    } catch {
      toast.error("فشل حفظ الخطة");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#361e01]" />
      </div>
    );
  }

  const grouped = plans.reduce<Record<string, Plan[]>>((acc, plan) => {
    if (!acc[plan.grade]) acc[plan.grade] = [];
    acc[plan.grade].push(plan);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-[#361e01]" />
        <div>
          <h1 className="text-3xl font-bold">اشتراكات الثانوي</h1>
          <p className="text-muted-foreground">
            حدد سعر كل فترة لكل صف. المدد ثابتة (شهر / ترم / 3 أشهر).
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([grade, gradePlans]) => (
        <Card key={grade}>
          <CardHeader>
            <CardTitle>{grade}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المدة</TableHead>
                  <TableHead className="text-right">الاسم المعروض</TableHead>
                  <TableHead className="text-right">السعر (جنيه)</TableHead>
                  <TableHead className="text-right">الحالي</TableHead>
                  <TableHead className="text-right">نشط</TableHead>
                  <TableHead className="text-right">حفظ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradePlans.map((plan) => {
                  const draft = drafts[plan.id];
                  if (!draft) return null;

                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <Badge variant="secondary">
                          {plan.durationMonths}{" "}
                          {plan.durationMonths === 1 ? "شهر" : "أشهر"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draft.label}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [plan.id]: { ...draft, label: e.target.value },
                            }))
                          }
                          placeholder="شهر / ترم كامل / 3 أشهر"
                          className="max-w-[180px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.price}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [plan.id]: { ...draft, price: e.target.value },
                            }))
                          }
                          className="max-w-[120px]"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPrice(plan.price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={draft.isActive}
                            onCheckedChange={(checked) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [plan.id]: {
                                  ...draft,
                                  isActive: checked === true,
                                },
                              }))
                            }
                          />
                          <Label className="text-sm">
                            {draft.isActive ? "مفعّل" : "معطّل"}
                          </Label>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSave(plan.id)}
                          disabled={savingId === plan.id}
                          className="bg-[#361e01] hover:bg-[#361e01]/90"
                        >
                          <Save className="h-4 w-4 ml-1" />
                          {savingId === plan.id ? "..." : "حفظ"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
