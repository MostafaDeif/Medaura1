"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckSquare } from "lucide-react";
import FinancialFilters from "../components/FinancialFilters";
import PendingAppointmentsTable from "../components/PendingAppointmentsTable";
import type { AppointmentRecord, FinancialFilters as FiltersType, DoctorFinancialRecord } from "../lib/types";

interface TransactionData {
  doctorRecords: DoctorFinancialRecord[];
  appointmentRecords: AppointmentRecord[];
  specialties: string[];
}

function buildDateRange(period: FiltersType["period"]): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (period) {
    case "today":  return { dateFrom: fmt(today), dateTo: fmt(today) };
    case "week": {
      const s = new Date(today); s.setDate(today.getDate() - 6);
      return { dateFrom: fmt(s), dateTo: fmt(today) };
    }
    case "month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: fmt(s), dateTo: fmt(today) };
    }
    case "year": {
      const s = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: fmt(s), dateTo: fmt(today) };
    }
    default: return {};
  }
}

export default function ConfirmPaymentsPage() {
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersType>({ period: "month" });

  const fetchData = useCallback(async (f: FiltersType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.period && f.period !== "custom") {
        const range = buildDateRange(f.period);
        if (range.dateFrom) params.set("date_from", range.dateFrom);
        if (range.dateTo)   params.set("date_to",   range.dateTo);
      } else {
        if (f.dateFrom) params.set("date_from", f.dateFrom);
        if (f.dateTo)   params.set("date_to",   f.dateTo);
      }
      if (f.doctorId)   params.set("doctor_id",  String(f.doctorId));
      if (f.specialist) params.set("specialist",  f.specialist);

      // Add a large default period just in case the backend requires it, 
      // but usually the date range is enough for filtering appointments.
      params.set("period", "2025-01"); 

      const res = await fetch(`/api/clinic/financial/transactions?${params}`);
      const json = await res.json() as { success: boolean; data: TransactionData; error?: string };
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error ?? "خطأ في تحميل البيانات");
      }
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(filters);
  }, [filters, fetchData]);


  const handleAppointmentPayment = async (
    bookingId: string | number,
    status: "paid" | "cancelled" | "pending"
  ) => {
    // Optimistic update locally
    setData((prev) => {
      if (!prev) return prev;
      const newAppts = prev.appointmentRecords.map(r => 
        String(r.bookingId) === String(bookingId) ? { ...r, paymentStatus: status } : r
      );
      return { ...prev, appointmentRecords: newAppts };
    });

    await fetch("/api/clinic/financial/appointment-payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });

    void fetchData(filters);
  };

  const handleReset = () => setFilters({ period: "month" });

  const doctorOptions = data?.doctorRecords.map((r) => ({ id: r.doctorId, name: r.doctorName })) ?? [];
  const specialists = data?.specialties ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
              <CheckSquare size={16} className="text-teal-400" />
            </span>
            <h1 className="text-xl font-bold text-(--text-primary)">تأكيد المدفوعات</h1>
          </div>
          <p className="text-sm text-(--text-secondary) pr-10">
            تأكيد مدفوعات المرضى والمراجعة المالية للمواعيد
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-xs underline hover:no-underline">إغلاق</button>
        </div>
      )}

      {/* Filters */}
      <FinancialFilters
        specialists={specialists}
        doctorOptions={doctorOptions}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
      />

      {/* Pending Patient Payments Table */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-(--text-primary)">تأكيد مدفوعات المرضى</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">
              يرجى تأكيد دفع كل موعد — المبالغ غير المؤكدة تُضاف لـ "المدفوعات المعلقة" في الملخص
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              في الانتظار
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              مدفوع
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              ملغي
            </span>
          </div>
        </div>

        <PendingAppointmentsTable
          records={data?.appointmentRecords ?? []}
          loading={loading}
          onMarkPayment={handleAppointmentPayment}
        />
      </div>
    </div>
  );
}
