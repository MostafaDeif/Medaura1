"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PieChart, RefreshCw, Stethoscope, Info } from "lucide-react";
import DoctorEarningsTable from "../components/DoctorEarningsTable";
import ProfitSharingModal from "../components/ProfitSharingModal";
import FinancialFilters from "../components/FinancialFilters";
import ExportButtons from "../components/ExportButtons";
import { currentMonthStr } from "../lib/calculations";
import type {
  DoctorFinancialRecord,
  AppointmentRecord,
  FinancialFilters as FiltersType,
} from "../lib/types";

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

export default function EarningsDistributionPage() {
  const [txData, setTxData] = useState<TransactionData | null>(null);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();
  
  const [filters, setFilters] = useState<FiltersType>({ period: "month" });
  const [editRecord, setEditRecord] = useState<DoctorFinancialRecord | null>(null);

  const activePeriod = (() => {
    if (filters.period === "today" || filters.period === "week") return currentMonthStr();
    if (filters.period === "year") return String(new Date().getFullYear());
    if (filters.period === "custom" && filters.dateFrom) return filters.dateFrom.slice(0, 7);
    return currentMonthStr();
  })();

  const fetchTransactions = useCallback(async (f: FiltersType) => {
    setTxLoading(true);
    setError(null);
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
      params.set("period", activePeriod);

      const res = await fetch(`/api/clinic/financial/transactions?${params}`);
      const json = await res.json() as { success: boolean; data: TransactionData; error?: string };
      if (json.success) setTxData(json.data);
      else setError(json.error ?? "خطأ في تحميل البيانات");
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setTxLoading(false);
    }
  }, [activePeriod]);

  useEffect(() => {
    void fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  const handleSavePercentage = async (doctorId: string | number, percentage: number) => {
    await fetch("/api/clinic/financial/profit-sharing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, doctorPercentage: percentage }),
    });
    void fetchTransactions(filters);
  };

  const handleAppointmentPayment = async (
    bookingId: string | number,
    status: "paid" | "cancelled" | "pending"
  ) => {
    await fetch("/api/clinic/financial/appointment-payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });
    void fetchTransactions(filters);
  };

  const handleReset = () => setFilters({ period: "month" });

  const doctorOptions = txData?.doctorRecords.map((r) => ({ id: r.doctorId, name: r.doctorName })) ?? [];
  const specialists   = txData?.specialties ?? [];

  const groupedRecords = useMemo(() => {
    if (!txData?.appointmentRecords) return [];
    const groups = new Map<string, AppointmentRecord[]>();
    for (const rec of txData.appointmentRecords) {
      if (searchQuery) {
        const matchPatient = rec.patientName.toLowerCase().includes(searchQuery);
        const matchDoctor = rec.doctorName.toLowerCase().includes(searchQuery);
        if (!matchPatient && !matchDoctor) continue;
      }

      const docId = String(rec.doctorId);
      if (!groups.has(docId)) groups.set(docId, []);
      groups.get(docId)!.push(rec);
    }
    return Array.from(groups.values());
  }, [txData?.appointmentRecords, searchQuery]);

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <PieChart size={16} className="text-purple-400" />
            </span>
            <h1 className="text-xl font-bold text-(--text-primary)">توزيع أرباح الأطباء</h1>
          </div>
          <p className="text-sm text-(--text-secondary) pr-10">
            تتبع حصص الأرباح لكل طبيب وتعديل نسب المشاركة وإدارة الدفعات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons records={txData?.doctorRecords ?? []} period={activePeriod} />
          <button
            onClick={() => fetchTransactions(filters)}
            disabled={txLoading}
            className="p-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:text-purple-400 hover:border-purple-500/40 transition-all shadow-[var(--shadow-soft)] disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={txLoading ? "animate-spin" : ""} />
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

      {/* ── Filters ── */}
      <FinancialFilters
        specialists={specialists}
        doctorOptions={doctorOptions}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
      />

      {/* ── Info Note ── */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400 leading-relaxed">
          ملاحظة هامة: لا يتم احتساب الإيرادات أو حصص الأرباح في الإجماليات السفلية إلا للمواعيد التي اكتملت وتم دفع قيمتها بنجاح.
        </p>
      </div>

      {/* ── Doctor Earnings Sections ── */}
      {txLoading ? (
        <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
          <DoctorEarningsTable
            records={[]}
            doctorRecords={[]}
            loading={true}
            period={activePeriod}
            hideDoctorColumn
            onEditPercentage={setEditRecord}
            onMarkPaid={handleAppointmentPayment}
          />
        </div>
      ) : groupedRecords.length === 0 ? (
        <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
          <DoctorEarningsTable
            records={[]}
            doctorRecords={txData?.doctorRecords ?? []}
            loading={false}
            period={activePeriod}
            hideDoctorColumn
            onEditPercentage={setEditRecord}
            onMarkPaid={handleAppointmentPayment}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedRecords.map((doctorAppts) => {
            const doctorId = String(doctorAppts[0].doctorId);
            const docRecord = txData?.doctorRecords.find((d) => String(d.doctorId) === doctorId);
            const docName = docRecord?.doctorName ?? doctorAppts[0].doctorName;
            const docSpecialty = docRecord?.specialty ?? doctorAppts[0].specialist;

            return (
              <div key={doctorId} className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <Stethoscope size={18} className="text-teal-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-(--text-primary)">{docName}</h2>
                      <p className="text-xs text-(--text-secondary) mt-0.5">
                        {docSpecialty} • {doctorAppts.length} موعد
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-(--text-secondary) bg-(--semi-card-bg) px-3 py-1 rounded-full border border-(--card-border)">
                    الفترة: {activePeriod}
                  </span>
                </div>

                <DoctorEarningsTable
                  records={doctorAppts}
                  doctorRecords={txData?.doctorRecords ?? []}
                  loading={false}
                  period={activePeriod}
                  hideDoctorColumn
                  onEditPercentage={setEditRecord}
                  onMarkPaid={handleAppointmentPayment}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Profit Sharing Modal ── */}
      <ProfitSharingModal
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSave={handleSavePercentage}
      />
    </div>
  );
}
