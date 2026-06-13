"use client";

import { CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";
import { formatCurrency } from "../lib/calculations";
import type { AppointmentRecord } from "../lib/types";

interface Props {
  records: AppointmentRecord[];
  loading: boolean;
  onMarkPayment: (bookingId: string | number, status: "paid" | "cancelled" | "pending") => void;
}

const STATUS_CONFIG = {
  paid: {
    label: "مدفوع",
    icon: <CheckCircle size={12} />,
    className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  cancelled: {
    label: "ملغي",
    icon: <XCircle size={12} />,
    className: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  pending: {
    label: "في الانتظار",
    icon: <Clock size={12} />,
    className: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
};

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 rounded-xl bg-(--semi-card-bg) animate-pulse" />
      ))}
    </div>
  );
}

function checkIsPast(bookingDate: string, bookingFrom: string) {
  if (!bookingDate || bookingDate === "—") return false;
  const now = new Date();
  
  let dtStr = `${bookingDate}T23:59:59`; // default end of day
  
  if (bookingFrom && bookingFrom !== "—") {
    // extract HH:MM if possible
    const match = bookingFrom.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (bookingFrom.toLowerCase().includes("pm") && h < 12) h += 12;
      if (bookingFrom.toLowerCase().includes("am") && h === 12) h = 0;
      dtStr = `${bookingDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    }
  }
  
  const d = new Date(dtStr);
  return !isNaN(d.getTime()) && now > d;
}

export default function PendingAppointmentsTable({ records, loading, onMarkPayment }: Props) {
  if (loading) return <Skeleton />;

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-(--text-secondary)">
        <CheckCircle size={32} className="text-emerald-400 opacity-60" />
        <p className="text-sm font-medium">لا توجد مواعيد مكتملة في هذه الفترة</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: card grid ─────────────────────────────────────────────── */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {records.map((r) => {
          const st = STATUS_CONFIG[r.paymentStatus];
          return (
            <div key={String(r.bookingId)} className={`rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 space-y-3 ${r.paymentStatus === "cancelled" ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-(--text-primary)">{r.patientName}</p>
                  <p className="text-xs text-(--text-secondary) mt-0.5">{r.doctorName} • {r.specialist}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.className}`}>
                  {st.icon}
                  {st.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-(--text-secondary) mb-0.5">التاريخ</p>
                  <p className="font-medium text-(--text-primary)">{r.bookingDate} {r.bookingFrom !== "—" ? r.bookingFrom : ""}</p>
                </div>
                <div>
                  <p className="text-(--text-secondary) mb-0.5">رسوم الكشف</p>
                  <p className="font-medium text-(--text-primary)">{formatCurrency(r.consultationFee)}</p>
                </div>
                <div>
                  <p className="text-(--text-secondary) mb-0.5">حصة الطبيب</p>
                  <p className="font-medium text-amber-500">{r.paymentStatus !== "cancelled" ? formatCurrency(r.doctorShare) : "—"}</p>
                </div>
                <div>
                  <p className="text-(--text-secondary) mb-0.5">حصة العيادة</p>
                  <p className="font-medium text-teal-500">{r.paymentStatus !== "cancelled" ? formatCurrency(r.clinicShare) : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-(--card-border)">
                {r.paymentStatus !== "paid" && r.paymentStatus !== "cancelled" && (
                  <>
                    <button
                      onClick={() => onMarkPayment(r.bookingId, "paid")}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                    >
                      <CheckCircle size={13} />
                      تأكيد
                    </button>
                    <button
                      onClick={() => onMarkPayment(r.bookingId, "cancelled")}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                    >
                      <XCircle size={13} />
                      إلغاء
                    </button>
                  </>
                )}
                {(r.paymentStatus === "paid" || r.paymentStatus === "cancelled") && !checkIsPast(r.bookingDate, r.bookingFrom) && (
                  <button
                    onClick={() => onMarkPayment(r.bookingId, "pending")}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-(--text-secondary) bg-(--semi-card-bg) hover:bg-(--hover-bg) border border-(--card-border) transition-colors"
                  >
                    <RotateCcw size={13} />
                    إعادة
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-(--card-border) text-(--text-secondary) text-xs">
            <th className="text-right py-3 px-3 font-semibold">المريض</th>
            <th className="text-right py-3 px-3 font-semibold">الطبيب</th>
            <th className="text-right py-3 px-3 font-semibold">التاريخ</th>
            <th className="text-right py-3 px-3 font-semibold">رسوم الكشف</th>
            <th className="text-right py-3 px-3 font-semibold">حصة الطبيب</th>
            <th className="text-right py-3 px-3 font-semibold">حصة العيادة</th>
            <th className="text-right py-3 px-3 font-semibold">حالة الدفع</th>
            <th className="text-right py-3 px-3 font-semibold">إجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--card-border)">
          {records.map((r) => {
            const st = STATUS_CONFIG[r.paymentStatus];
            return (
              <tr
                key={String(r.bookingId)}
                className={`transition-colors hover:bg-(--hover-bg) ${
                  r.paymentStatus === "cancelled" ? "opacity-50" : ""
                }`}
              >
                {/* Patient */}
                <td className="py-3 px-3 text-(--text-primary) font-medium">
                  {r.patientName}
                </td>
                {/* Doctor */}
                <td className="py-3 px-3 text-(--text-secondary)">
                  <div>{r.doctorName}</div>
                  <div className="text-[10px] text-(--text-secondary) opacity-60">{r.specialist}</div>
                </td>
                {/* Date */}
                <td className="py-3 px-3 text-(--text-secondary) tabular-nums text-xs">
                  {r.bookingDate}
                  {r.bookingFrom !== "—" && (
                    <span className="block text-[10px] opacity-60">{r.bookingFrom}</span>
                  )}
                </td>
                {/* Fee */}
                <td className="py-3 px-3 text-(--text-primary) font-semibold tabular-nums">
                  {formatCurrency(r.consultationFee)}
                </td>
                {/* Doctor share */}
                <td className="py-3 px-3 text-amber-500 tabular-nums text-xs">
                  {r.paymentStatus !== "cancelled" ? formatCurrency(r.doctorShare) : "—"}
                </td>
                {/* Clinic share */}
                <td className="py-3 px-3 text-teal-500 tabular-nums text-xs">
                  {r.paymentStatus !== "cancelled" ? formatCurrency(r.clinicShare) : "—"}
                </td>
                {/* Status badge */}
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.className}`}
                  >
                    {st.icon}
                    {st.label}
                  </span>
                </td>
                {/* Actions */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    {r.paymentStatus !== "paid" && r.paymentStatus !== "cancelled" && (
                      <>
                        {/* Confirm payment */}
                        <button
                          onClick={() => onMarkPayment(r.bookingId, "paid")}
                          title="تأكيد دفع المريض"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                        >
                          <CheckCircle size={11} />
                          تأكيد
                        </button>
                        {/* Cancel */}
                        <button
                          onClick={() => onMarkPayment(r.bookingId, "cancelled")}
                          title="إلغاء الموعد"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                        >
                          <XCircle size={11} />
                          إلغاء
                        </button>
                      </>
                    )}
                    {(r.paymentStatus === "paid" || r.paymentStatus === "cancelled") && !checkIsPast(r.bookingDate, r.bookingFrom) && (
                      /* Reset to pending */
                      <button
                        onClick={() => onMarkPayment(r.bookingId, "pending")}
                        title="إعادة تعيين"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-(--text-secondary) bg-(--semi-card-bg) hover:bg-(--hover-bg) border border-(--card-border) transition-colors"
                      >
                        <RotateCcw size={11} />
                        إعادة
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
