import * as XLSX from "xlsx";

type ExportablePromoCode = {
  code: string;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  copiedAt?: string | null;
  course: { title: string } | null;
};

export function exportPromocodesToExcel(
  codes: ExportablePromoCode[],
  filename = `promocodes-${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const rows = codes.map((code) => ({
    الكود: code.code,
    الكورس: code.course?.title || "-",
    "حالة الاستخدام": code.usedCount > 0 ? "مستخدم" : code.copiedAt ? "تم نسخه" : "متاح",
    الحالة: code.isActive ? "نشط" : "غير نشط",
    "تاريخ الإنشاء": new Date(code.createdAt).toLocaleDateString("ar-EG"),
    "تاريخ النسخ": code.copiedAt
      ? new Date(code.copiedAt).toLocaleDateString("ar-EG")
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الأكواد");
  XLSX.writeFile(workbook, filename);
}
