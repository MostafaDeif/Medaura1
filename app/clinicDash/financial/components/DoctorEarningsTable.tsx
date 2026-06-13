"use client";

import { useState } from "react";
import {
  Edit3, CheckCircle, Clock, User, ChevronUp, ChevronDown,
  XCircle, AlertCircle, Stethoscope,
} from "lucide-react";
import { formatCurrency } from "../lib/calculations";
import type { AppointmentRecord, DoctorFinancialRecord } from "../lib/types";

interface Props {
  records: AppointmentRecord[];
  /** Doctor-level records, used to open the profit-sharing modal */
  doctorRecords: DoctorFinancialRecord[];
  loading: boolean;
  period: string;
  hideDoctorColumn?: boolean;
  onEditPercentage: (record: DoctorFinancialRecord) => void;
  onMarkPaid: (bookingId: string | number, status: "paid" | "cancelled") => Promise<void>;
}

type SortKey =
  | "patientName"
  | "doctorName"
  | "bookingDate"
  | "consultationFee"
  | "paymentStatus";

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-(--semi-card-bg) animate-pulse" />
      ))}
    </div>
  );
}

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_BADGE = {
  paid: {
    wrapper: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Icon: CheckCircle,
    label: "مدفوع",
  },
  pending: {
    wrapper: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Icon: Clock,
    label: "معلق",
  },
  cancelled: {
    wrapper: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    Icon: XCircle,
    label: "ملغي",
  },
} as const;

// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorEarningsTable({
  records,
  doctorRecords,
  loading,
  period,
  hideDoctorColumn,
  onEditPercentage,
  onMarkPaid,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("bookingDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...records].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB, "ar") : valB.localeCompare(valA, "ar");
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  // ── Toggle payment status ──────────────────────────────────────────────────
  const handleToggle = async (rec: AppointmentRecord) => {
    setProcessingId(rec.bookingId);
    try {
      const next = rec.paymentStatus === "paid" ? "cancelled" : "paid";
      await onMarkPaid(rec.bookingId, next);
    } finally {
      setProcessingId(null);
    }
  };

  // ── Open profit-sharing modal for this booking's doctor ───────────────────
  const handleEditDoctor = (rec: AppointmentRecord) => {
    const docRecord = doctorRecords.find(
      (d) => String(d.doctorId) === String(rec.doctorId)
    );
    if (docRecord) {
      onEditPercentage(docRecord);
    }
  };

  // ── Sort icon ──────────────────────────────────────────────────────────────
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />;
    return sortAsc
      ? <ChevronUp size={12} className="text-teal-500" />
      : <ChevronDown size={12} className="text-teal-500" />;
  };

  // ── Column definitions ─────────────────────────────────────────────────────
  const cols = [
    { label: "المريض والتفاصيل", key: "patientName" as SortKey,      align: "text-right" },
    ...(hideDoctorColumn ? [] : [{ label: "الطبيب المعالج",  key: "doctorName" as SortKey,       align: "text-right" }]),
    { label: "حصة الطبيب",      align: "text-center" },
    { label: "حصة العيادة",     align: "text-center" },
    { label: "حالة الدفع",       key: "paymentStatus" as SortKey,    align: "text-center" },
    { label: "إجراءات",          align: "text-center" },
  ];

  // ── Derived summary stats (paid only) ─────────────────────────────────────
  const paidRecs      = records.filter((r) => r.paymentStatus === "paid");
  const pendingRecs   = records.filter((r) => r.paymentStatus === "pending");
  const cancelledRecs = records.filter((r) => r.paymentStatus === "cancelled");
  const totalRevenue  = paidRecs.reduce((s, r) => s + r.consultationFee, 0);
  const totalDocShare = paidRecs.reduce((s, r) => s + r.doctorShare, 0);
  const totalCliShare = paidRecs.reduce((s, r) => s + r.clinicShare, 0);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) return <Skeleton />;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-(--semi-card-bg) flex items-center justify-center">
          <User size={28} className="text-(--text-secondary)" />
        </div>
        <div className="text-center">
          <p className="text-(--text-secondary) text-sm font-medium">
            لا توجد مواعيد في هذه الفترة
          </p>
          <p className="text-(--text-secondary) text-xs opacity-60 mt-1">
            تظهر البيانات عند وجود مواعيد مسجلة
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Summary pills ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 font-medium">
          <CheckCircle size={11} />
          مدفوع: {paidRecs.length} موعد &nbsp;·&nbsp; {formatCurrency(totalRevenue)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20 font-medium">
          <Clock size={11} />
          معلق: {pendingRecs.length} موعد
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full border border-rose-500/20 font-medium">
          <XCircle size={11} />
          ملغي: {cancelledRecs.length} موعد
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-(--semi-card-bg) text-(--text-secondary) px-3 py-1.5 rounded-full border border-(--card-border) font-medium">
          <AlertCircle size={11} />
          الإجمالي: {records.length} موعد
        </span>
      </div>

      {/* ── Mobile: card grid ─────────────────────────────────────────────── */}
      <div className="sm:hidden grid grid-cols-1 gap-3 mb-4">
        {sorted.map((rec, idx) => {
          const badge = STATUS_BADGE[rec.paymentStatus];
          const { Icon } = badge;
          const isCancelled = rec.paymentStatus === "cancelled";
          const isPaid      = rec.paymentStatus === "paid";
          const isProcessing = processingId === rec.bookingId;

          return (
            <div key={rec.bookingId} className={`rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 space-y-3 ${isCancelled ? "opacity-55" : ""}`} style={{ animation: "fadeUp 0.3s ease both", animationDelay: `${idx * 30}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-(--text-primary)">{rec.patientName}</p>
                  {!hideDoctorColumn && <p className="text-xs text-(--text-secondary) mt-0.5">{rec.doctorName} • {rec.specialist}</p>}
                </div>
                <span className={badge.wrapper}>
                  <Icon size={11} />
                  {badge.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <p className="text-(--text-secondary) mb-0.5">التاريخ</p>
                  <p className="font-medium text-(--text-primary)">{rec.bookingDate} {rec.bookingFrom !== "—" ? rec.bookingFrom : ""}</p>
                </div>
                <div>
                  <p className="text-(--text-secondary) mb-0.5">سعر الاستشارة</p>
                  <p className="font-medium text-(--text-primary)">{formatCurrency(rec.consultationFee)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-(--text-secondary)">نسبة الطبيب</p>
                    <button onClick={() => handleEditDoctor(rec)} className="text-(--text-secondary) hover:text-teal-500">
                      <Edit3 size={11} />
                    </button>
                  </div>
                  <p className="font-medium text-amber-500">{rec.doctorPercentage}% ({isPaid ? formatCurrency(rec.doctorShare) : "—"})</p>
                </div>
                <div>
                  <p className="text-(--text-secondary) mb-0.5">نسبة العيادة</p>
                  <p className="font-medium text-teal-500">{rec.clinicPercentage}% ({isPaid ? formatCurrency(rec.clinicShare) : "—"})</p>
                </div>
              </div>
              {!isCancelled && (
                <div className="pt-3 border-t border-(--card-border) flex justify-end">
                   <button onClick={() => handleEditDoctor(rec)} className="flex items-center gap-2 text-xs font-medium text-teal-500 bg-teal-500/10 px-4 py-2 rounded-xl hover:bg-teal-500 hover:text-white transition-all">
                     <Edit3 size={14} />
                     تعديل نسبة الطبيب
                   </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[1050px]" dir="rtl">
          <thead>
            <tr className="border-b border-(--card-border)">
              {cols.map((col, i) => (
                <th
                  key={`${col.label}-${i}`}
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
            {sorted.map((rec, idx) => {
              const badge = STATUS_BADGE[rec.paymentStatus];
              const { Icon } = badge;
              const isCancelled = rec.paymentStatus === "cancelled";
              const isPaid      = rec.paymentStatus === "paid";
              const isProcessing = processingId === rec.bookingId;

              return (
                <tr
                  key={rec.bookingId}
                  className={`group transition-colors duration-150 ${
                    isCancelled
                      ? "opacity-55 bg-rose-500/[0.02]"
                      : "hover:bg-(--semi-card-bg)"
                  }`}
                  style={{
                    animation: "fadeUp 0.3s ease both",
                    animationDelay: `${idx * 30}ms`,
                  }}
                >
                  {/* ── Patient & Details ── */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <User size={18} className="text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold text-sm ${isCancelled ? "line-through text-(--text-secondary)" : "text-(--text-primary)"}`}>
                          {rec.patientName}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-(--text-secondary) mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {rec.bookingDate} {rec.bookingFrom !== "—" ? `• ${rec.bookingFrom}` : ""}
                          </span>
                          <span className="opacity-50">|</span>
                          <span className={`font-semibold ${isPaid ? "text-emerald-500" : "text-(--text-secondary)"}`}>
                            {formatCurrency(rec.consultationFee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── Doctor ── */}
                  {!hideDoctorColumn && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                          <Stethoscope size={18} className="text-teal-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-(--text-primary) text-sm">
                            {rec.doctorName}
                          </span>
                          <span className="text-xs text-(--text-secondary) mt-1">
                            {rec.specialist}
                          </span>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* ── Doctor Share ── */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-(--semi-card-bg) overflow-hidden border border-(--card-border)">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${rec.doctorPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-amber-500">
                          {rec.doctorPercentage}%
                        </span>
                      </div>
                      {isPaid ? (
                        <span className="text-sm font-black text-(--text-primary)">
                          {formatCurrency(rec.doctorShare)}
                        </span>
                      ) : (
                        <span className="text-xs text-(--text-secondary) opacity-50">—</span>
                      )}
                    </div>
                  </td>

                  {/* ── Clinic Share ── */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-(--semi-card-bg) overflow-hidden border border-(--card-border)">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-500"
                            style={{ width: `${rec.clinicPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-teal-500">
                          {rec.clinicPercentage}%
                        </span>
                      </div>
                      {isPaid ? (
                        <span className="text-sm font-black text-(--text-primary)">
                          {formatCurrency(rec.clinicShare)}
                        </span>
                      ) : (
                        <span className="text-xs text-(--text-secondary) opacity-50">—</span>
                      )}
                    </div>
                  </td>

                  {/* ── Status ── */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`${badge.wrapper} px-3 py-1.5 shadow-sm border border-current/10`}>
                      <Icon size={13} />
                      {badge.label}
                    </span>
                  </td>

                  {/* ── Actions ── */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleEditDoctor(rec)}
                        className="p-2 rounded-xl bg-(--semi-card-bg) border border-(--card-border) text-(--text-secondary) hover:text-teal-500 hover:border-teal-500/30 hover:bg-teal-500/10 transition-all shadow-sm"
                        title="تعديل نسبة أرباح الطبيب"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* ── Totals footer — paid appointments only ── */}
          <tfoot>
            <tr className="border-t border-(--card-border) bg-(--card-bg) shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <td
                className="px-4 py-5 font-black text-(--text-primary) text-sm"
                colSpan={hideDoctorColumn ? 1 : 2}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  إجمالي الأرباح من ({paidRecs.length}) موعد مدفوع:
                  <span className="text-emerald-500 ml-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-5 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-1">إجمالي حصة الأطباء</span>
                  <span className="text-base font-black text-amber-500">
                    {formatCurrency(totalDocShare)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-5 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-1">إجمالي حصة العيادة</span>
                  <span className="text-base font-black text-teal-500">
                    {formatCurrency(totalCliShare)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-5 text-center" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
