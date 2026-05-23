"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, History, ArrowUpRight, CreditCard } from "lucide-react";
import { FAWATERAK_MIN_AMOUNT_EGP } from "@/lib/fawaterak/constants";

interface BalanceTransaction {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PURCHASE";
  description: string;
  createdAt: string;
}

export default function BalancePage() {
  const [balance, setBalance] = useState(0);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/balance/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  const paymentHref = (() => {
    const parsed = parseFloat(topUpAmount);
    if (Number.isFinite(parsed) && parsed >= FAWATERAK_MIN_AMOUNT_EGP) {
      return `/dashboard/balance/payment?amount=${parsed}`;
    }
    return "/dashboard/balance/payment";
  })();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الرصيد</h1>
          <p className="text-muted-foreground">
            شحن رصيدك عبر فواتيرك لشراء الكورسات
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            رصيد الحساب
          </CardTitle>
          <CardDescription>الرصيد المتاح في حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#361e01]">
            {balance.toFixed(2)} جنيه
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            شحن الرصيد
          </CardTitle>
          <CardDescription>
            انتقل لصفحة الدفع لإتمام الشحن بالبطاقة، فوري، أو المحافظ الإلكترونية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="number"
              placeholder={`المبلغ (اختياري — الحد الأدنى ${FAWATERAK_MIN_AMOUNT_EGP} جنيه)`}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              min={FAWATERAK_MIN_AMOUNT_EGP}
              step="1"
              className="flex-1"
            />
            <Button
              asChild
              className="bg-[#361e01] hover:bg-[#361e01]/90 text-white shrink-0"
            >
              <Link href={paymentHref}>
                <CreditCard className="h-4 w-4 ml-2" />
                الذهاب للدفع
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل المعاملات
          </CardTitle>
          <CardDescription>تاريخ جميع المعاملات المالية</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#361e01] mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد معاملات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "DEPOSIT"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transaction.type === "DEPOSIT" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.description.includes("Added") &&
                        transaction.type === "DEPOSIT"
                          ? transaction.description.replace(
                              /Added (\d+(?:\.\d+)?) EGP to balance/,
                              "تم إضافة $1 جنيه إلى الرصيد"
                            )
                          : transaction.description.includes("Purchased course:") &&
                              transaction.type === "PURCHASE"
                            ? transaction.description.replace(
                                /Purchased course: (.+)/,
                                "تم شراء الكورس: $1"
                              )
                            : transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.type === "DEPOSIT" ? "إيداع" : "شراء كورس"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`font-bold ${
                      transaction.type === "DEPOSIT"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "DEPOSIT" ? "+" : "-"}
                    {Math.abs(transaction.amount).toFixed(2)} جنيه
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
