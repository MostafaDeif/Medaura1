"use client";

import { useState } from "react";
import { Edit3, CheckCircle, Clock, User, ChevronUp, ChevronDown } from "lucide-react";
import { formatCurrency } from "../lib/calculations";
import type { DoctorFinancialRecord } from "../lib/types";

interface Props {
  records: DoctorFinancialRecord[];
  loading: boolean;
  period: string;
  onEditPercentage: (record: DoctorFinancialRecord) => void;
  onMarkPaid: (doctorId: number, period: string, paid: boolean) => Promise<void>;
}

type SortKey = "doctorName" | "totalRevenue" | "completedAppointments" | "doctorShare" | "clinicShare";

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-(--semi-card-bg) animate-pulse" />
      ))}
    </div>
  );
}

export default function DoctorEarningsTable({ records, loading, period, onEditPercentage, onMarkPaid }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((p) => !p);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...records].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB, "ar") : valB.localeCompare(valA, "ar");
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const handleTogglePaid = async (record: DoctorFinancialRecord) => {
    setTogglingId(record.doctorId);
    try {
      await onMarkPaid(record.doctorId, period, record.paymentStatus !== "paid");
    } finally {
      setTogglingId(null);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />;
    return sortAsc
      ? <ChevronUp size={12} className="text-teal-500" />
      : <ChevronDown size={12} className="text-teal-500" />;
  };

  const cols: { label: string; key?: SortKey; align?: string }[] = [
    { label: "الطبيب", key: "doctorName" },
    { label: "سعر الاستشارة", align: "text-center" },
    { label: "المواعيد", key: "completedAppointments", align: "text-center" },
    { label: "الإجمالي", key: "totalRevenue", align: "text-center" },
    { label: "% الطبيب", align: "text-center" },
    { label: "% العيادة", align: "text-center" },
    { label: "حصة الطبيب", key: "doctorShare", align: "text-center" },
    { label: "حصة العيادة", key: "clinicShare", align: "text-center" },
    { label: "الحالة", align: "text-center" },
    { label: "إجراء", align: "text-center" },
  ];

  if (loading) return <Skeleton />;

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-(--semi-card-bg) flex items-center justify-center">
          <User size={28} className="text-(--text-secondary)" />
        </div>
        <div className="text-center">
          <p className="text-(--text-secondary) text-sm font-medium">لا توجد إيرادات في هذه الفترة</p>
          <p className="text-(--text-secondary) text-xs opacity-60 mt-1">تظهر البيانات عند اكتمال المواعيد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[900px]" dir="rtl">
        <thead>
          <tr className="border-b border-(--card-border)">
            {cols.map((col) => (
              <th
                key={col.label}
                className={`px-4 py-3 text-xs font-semibold text-(--text-secondary) uppercase tracking-wide whitespace-nowrap ${col.align ?? "text-right"}`}
              >
                {col.key ? (
                  <button
                    onClick={() => handleSort(col.key!)}
                    className="inline-flex items-center gap-1 hover:text-(--text-primary) transition-colors"
                  >
                    {col.label}
                    <SortIcon k={col.key} />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--card-border)">
          {sorted.map((rec, idx) => (
            <tr
              key={rec.doctorId}
              className="group hover:bg-(--semi-card-bg) transition-colors duration-150"
              style={{ animation: "fadeUp 0.3s ease both", animationDelay: `${idx * 40}ms` }}
            >
              {/* Doctor */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <User size={14} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-(--text-primary) text-sm">{rec.doctorName}</p>
                    <p className="text-[11px] text-(--text-secondary)">{rec.specialist}</p>
                  </div>
                </div>
              </td>

              {/* Consultation Fee */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <span className="font-medium text-(--text-primary)">{formatCurrency(rec.consultationFee)}</span>
              </td>

              {/* Appointments */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                  {rec.completedAppointments}
                </span>
              </td>

              {/* Total Revenue */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <span className="font-bold text-(--text-primary)">{formatCurrency(rec.totalRevenue)}</span>
              </td>

              {/* Doctor % */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-(--semi-card-bg) overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${rec.doctorPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {rec.doctorPercentage}%
                  </span>
                </div>
              </td>

              {/* Clinic % */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-(--semi-card-bg) overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${rec.clinicPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    {rec.clinicPercentage}%
                  </span>
                </div>
              </td>

              {/* Doctor Share */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(rec.doctorShare)}
                </span>
              </td>

              {/* Clinic Share */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  {formatCurrency(rec.clinicShare)}
                </span>
              </td>

              {/* Payment Status */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                {rec.paymentStatus === "paid" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle size={11} /> مدفوع
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Clock size={11} /> معلق
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEditPercentage(rec)}
                    className="p-1.5 rounded-lg hover:bg-(--hover-bg) text-(--text-secondary) hover:text-teal-500 transition-colors"
                    title="تعديل نسبة الأرباح"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleTogglePaid(rec)}
                    disabled={togglingId === rec.doctorId}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                      rec.paymentStatus === "paid"
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                    }`}
                  >
                    {togglingId === rec.doctorId ? (
                      <span className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin inline-block" />
                    ) : rec.paymentStatus === "paid" ? (
                      "إلغاء الدفع"
                    ) : (
                      "تحديد كمدفوع"
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>

        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-(--card-border) bg-(--semi-card-bg)">
            <td className="px-4 py-3 font-bold text-(--text-primary) text-sm">الإجمالي</td>
            <td className="px-4 py-3 text-center">—</td>
            <td className="px-4 py-3 text-center font-bold text-(--text-primary)">
              {records.reduce((s, r) => s + r.completedAppointments, 0)}
            </td>
            <td className="px-4 py-3 text-center font-bold text-(--text-primary)">
              {formatCurrency(records.reduce((s, r) => s + r.totalRevenue, 0))}
            </td>
            <td className="px-4 py-3 text-center">—</td>
            <td className="px-4 py-3 text-center">—</td>
            <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(records.reduce((s, r) => s + r.doctorShare, 0))}
            </td>
            <td className="px-4 py-3 text-center font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(records.reduce((s, r) => s + r.clinicShare, 0))}
            </td>
            <td className="px-4 py-3 text-center">—</td>
            <td className="px-4 py-3 text-center">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
