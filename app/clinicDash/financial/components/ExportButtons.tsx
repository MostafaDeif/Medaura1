"use client";

import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { exportToCSV } from "../lib/calculations";
import type { DoctorFinancialRecord } from "../lib/types";

interface Props {
  records: DoctorFinancialRecord[];
  period: string; // e.g. "2025-06"
}

export default function ExportButtons({ records, period }: Props) {
  const handleCSV = () => {
    if (records.length === 0) return;
    const csv = exportToCSV(records, period);
    const BOM = "\uFEFF"; // UTF-8 BOM for Arabic Excel compatibility
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" dir="rtl">
      <button
        onClick={handleCSV}
        disabled={records.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) text-xs font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-500 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-soft)]"
        title="تصدير CSV"
      >
        <FileSpreadsheet size={14} />
        تصدير CSV
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) text-xs font-semibold hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-500 transition-all duration-200 shadow-[var(--shadow-soft)]"
        title="طباعة / حفظ PDF"
      >
        <Printer size={14} />
        طباعة / PDF
      </button>

      <button
        onClick={handleCSV}
        disabled={records.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-teal-500/30"
        title="تنزيل التقرير"
      >
        <Download size={14} />
        تنزيل التقرير
      </button>
    </div>
  );
}
