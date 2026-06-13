"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CheckSquare, RefreshCw, Clock } from "lucide-react";
import PendingAppointmentsTable from "../components/PendingAppointmentsTable";
import FinancialFilters from "../components/FinancialFilters";
import type { AppointmentRecord, FinancialFilters as FiltersType, DoctorFinancialRecord } from "../lib/types";

// Helper to format last updated time
function formatLastUpdated(ts: number): string {
  const diff  = Date.now() - ts;
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  if (hours === 0 && mins < 2) return "الآن";
  if (hours === 0) return `منذ ${mins} دقيقة`;
  if (hours < 24)  return `منذ ${hours} ساعة`;
  return "منذ أكثر من يوم";
}

export default function PendingPaymentsPage() {
  const [allApptData, setAllApptData] = useState<AppointmentRecord[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<{ id: string | number; name: string }[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersType>({ period: "month" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTs, setLastUpdatedTs] = useState<number | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error"; visible: boolean }>({ msg: "", type: "success", visible: false });

  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast({ msg: "", type: "success", visible: false }), 3000);
  };

  const fetchAllAppointments = useCallback(async (f: FiltersType = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.period && f.period !== "custom") {
        const today = new Date();
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        let dateFrom, dateTo;
        switch (f.period) {
          case "today": dateFrom = fmt(today); dateTo = fmt(today); break;
          case "week": {
            const s = new Date(today); s.setDate(today.getDate() - 6);
            dateFrom = fmt(s); dateTo = fmt(today); break;
          }
          case "month": {
            const s = new Date(today.getFullYear(), today.getMonth(), 1);
            dateFrom = fmt(s); dateTo = fmt(today); break;
          }
          case "year": {
            const s = new Date(today.getFullYear(), 0, 1);
            dateFrom = fmt(s); dateTo = fmt(today); break;
          }
        }
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo)   params.set("date_to",   dateTo);
      } else {
        if (f.dateFrom) params.set("date_from", f.dateFrom);
        if (f.dateTo)   params.set("date_to",   f.dateTo);
      }
      if (f.doctorId)   params.set("doctor_id",  String(f.doctorId));
      if (f.specialist) params.set("specialist",  f.specialist);

      const res  = await fetch(`/api/clinic/financial/transactions?${params}`);
      const json = await res.json() as { success: boolean; data: { appointmentRecords: AppointmentRecord[]; doctorRecords: DoctorFinancialRecord[]; specialties: string[] }; error?: string };
      if (json.success) {
        setAllApptData(json.data.appointmentRecords ?? []);
        setDoctorOptions(json.data.doctorRecords?.map((r) => ({ id: r.doctorId, name: r.doctorName })) ?? []);
        setSpecialties(json.data.specialties ?? []);
        setLastUpdatedTs(Date.now());
      } else {
        setError(json.error ?? "خطأ في تحميل البيانات");
      }
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchAllAppointments(filters);
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [filters, fetchAllAppointments]);

  // Handle the 15-second countdown timer UI
  useEffect(() => {
    if (refreshCountdown === null || refreshCountdown <= 0) return;
    const timer = setTimeout(() => {
      setRefreshCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [refreshCountdown]);

  const handleAppointmentPayment = async (
    bookingId: string | number,
    status: "paid" | "cancelled" | "pending"
  ) => {
    try {
      // Optimistic update locally
      setAllApptData(prev => prev.map(appt => 
        String(appt.bookingId) === String(bookingId) 
          ? { ...appt, paymentStatus: status } 
          : appt
      ));

      // Persist to server
      const res = await fetch("/api/clinic/financial/appointment-payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, status }),
      });
      
      if (!res.ok) throw new Error("Failed to update status");

      if (status === "paid") showToast("تم تأكيد الدفع بنجاح");
      else if (status === "cancelled") showToast("تم الإلغاء بنجاح", "error");
      else if (status === "pending") showToast("تم التراجع بنجاح");

      // Set refresh countdown to fetch fresh data
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      setRefreshCountdown(15);
      refreshTimeoutRef.current = setTimeout(() => {
        setRefreshCountdown(null);
        void fetchAllAppointments();
      }, 15000);

    } catch (err) {
      showToast("حدث خطأ أثناء حفظ التغييرات", "error");
      void fetchAllAppointments(); // Revert on failure
    }
  };

  const filteredApptData = useMemo(() => {
    if (!searchQuery) return allApptData;
    return allApptData.filter(
      (rec) =>
        rec.patientName.toLowerCase().includes(searchQuery) ||
        rec.doctorName.toLowerCase().includes(searchQuery)
    );
  }, [allApptData, searchQuery]);

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* ── Toast Notification ── */}
      {toast.visible && (
        <div className={`fixed bottom-4 left-4 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2 transform transition-all translate-y-0 opacity-100 ${
          toast.type === "success" 
            ? "bg-emerald-500/90 text-white border-emerald-400" 
            : "bg-rose-500/90 text-white border-rose-400"
        }`}>
          <CheckSquare size={16} />
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <CheckSquare size={16} className="text-amber-400" />
            </span>
            <h1 className="text-xl font-bold text-(--text-primary)">تأكيد مدفوعات المرضى</h1>
          </div>
          <p className="text-sm text-(--text-secondary) pr-10">
            يرجى تأكيد دفع كل موعد — المبالغ غير المؤكدة تضاف لـ "المدفوعات المعلقة"
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {refreshCountdown !== null ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <RefreshCw size={11} className="animate-spin" />
              تحديث البيانات خلال {refreshCountdown}ث
            </span>
          ) : lastUpdatedTs ? (
            <span className="flex items-center gap-1.5 text-xs text-teal-500 bg-teal-500/8 px-3 py-1.5 rounded-xl border border-teal-500/20">
              <Clock size={11} />
              اخر تحديث {formatLastUpdated(lastUpdatedTs)}
            </span>
          ) : null}

          <button
            onClick={() => fetchAllAppointments()}
            disabled={loading}
            className="p-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:text-amber-400 hover:border-amber-500/40 transition-all shadow-[var(--shadow-soft)] disabled:opacity-50"
            title="تحديث فوري"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-xs underline hover:no-underline">
            إغلاق
          </button>
        </div>
      )}

      <FinancialFilters
        specialists={specialties}
        doctorOptions={doctorOptions}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters({ period: "month" })}
      />

      {/* ── Pending Patient Payments Table ── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
        <div className="flex justify-end mb-4 gap-2 text-xs">
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

        <PendingAppointmentsTable
          records={filteredApptData}
          loading={loading}
          onMarkPayment={handleAppointmentPayment}
        />
      </div>
    </div>
  );
}
