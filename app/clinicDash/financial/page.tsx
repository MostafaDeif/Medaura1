"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import FinancialOverviewCards from "./components/FinancialOverviewCards";
import DoctorEarningsTable from "./components/DoctorEarningsTable";
import ProfitSharingModal from "./components/ProfitSharingModal";
import RevenueCharts from "./components/RevenueCharts";
import FinancialFilters from "./components/FinancialFilters";
import ExportButtons from "./components/ExportButtons";
import type {
  FinancialSummary,
  DailyRevenue,
  MonthlyRevenue,
  DoctorFinancialRecord,
  FinancialFilters as FiltersType,
} from "./lib/types";
import { currentMonthStr } from "./lib/calculations";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SummaryData {
  summary: FinancialSummary;
  monthly: MonthlyRevenue[];
  daily: DailyRevenue[];
}

interface TransactionData {
  doctorRecords: DoctorFinancialRecord[];
  specialties: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildDateRange(period: FiltersType["period"]): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (period) {
    case "today":
      return { dateFrom: fmt(today), dateTo: fmt(today) };
    case "week": {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { dateFrom: fmt(start), dateTo: fmt(today) };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: fmt(start), dateTo: fmt(today) };
    }
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: fmt(start), dateTo: fmt(today) };
    }
    default:
      return {};
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FinancialPage() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [txData, setTxData] = useState<TransactionData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersType>({ period: "month" });
  const [editRecord, setEditRecord] = useState<DoctorFinancialRecord | null>(null);

  const period = currentMonthStr();

  // ── Fetch Summary (charts + KPI cards) ────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/clinic/financial/summary");
      const json = await res.json();
      if (json.success) setSummaryData(json.data);
      else setError(json.error ?? "خطأ في تحميل الملخص");
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // ── Fetch Transactions / Doctor Records (filtered) ────────────────────────
  const fetchTransactions = useCallback(async (f: FiltersType) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.period && f.period !== "custom") {
        const range = buildDateRange(f.period);
        if (range.dateFrom) params.set("date_from", range.dateFrom);
        if (range.dateTo) params.set("date_to", range.dateTo);
      } else {
        if (f.dateFrom) params.set("date_from", f.dateFrom);
        if (f.dateTo) params.set("date_to", f.dateTo);
      }
      if (f.doctorId) params.set("doctor_id", String(f.doctorId));
      if (f.specialist) params.set("specialist", f.specialist);

      const res = await fetch(`/api/clinic/financial/transactions?${params}`);
      const json = await res.json();
      if (json.success) setTxData(json.data);
      else setError(json.error ?? "خطأ في تحميل البيانات");
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setTxLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Refetch transactions whenever filters change
  useEffect(() => {
    fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSavePercentage = async (doctorId: number, percentage: number) => {
    await fetch("/api/clinic/financial/profit-sharing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, doctorPercentage: percentage }),
    });
    // Refresh both
    fetchSummary();
    fetchTransactions(filters);
  };

  const handleMarkPaid = async (doctorId: number, p: string, paid: boolean) => {
    await fetch("/api/clinic/financial/mark-paid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, period: p, paid }),
    });
    fetchSummary();
    fetchTransactions(filters);
  };

  const handleReset = () => setFilters({ period: "month" });

  const handleRefresh = () => {
    fetchSummary();
    fetchTransactions(filters);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const doctorOptions =
    txData?.doctorRecords.map((r) => ({ id: r.doctorId, name: r.doctorName })) ?? [];

  const specialists = txData?.specialties ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
              <TrendingUp size={16} className="text-teal-400" />
            </span>
            <h1 className="text-xl font-bold text-(--text-primary)">الإدارة المالية</h1>
          </div>
          <p className="text-sm text-(--text-secondary) pr-10">
            إيرادات وتوزيع الأرباح بين العيادة والأطباء
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ExportButtons records={txData?.doctorRecords ?? []} period={period} />
          <button
            onClick={handleRefresh}
            disabled={summaryLoading || txLoading}
            className="p-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:text-teal-400 hover:border-teal-500/40 transition-all shadow-[var(--shadow-soft)] disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={summaryLoading || txLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="mr-auto text-xs underline hover:no-underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ── Overview Cards ── */}
      <FinancialOverviewCards summary={summaryData?.summary ?? null} loading={summaryLoading} />

      {/* ── Charts ── */}
      <RevenueCharts
        daily={summaryData?.daily ?? []}
        monthly={summaryData?.monthly ?? []}
        doctorRecords={txData?.doctorRecords ?? []}
        clinicProfit={summaryData?.summary.clinicProfit ?? 0}
        doctorsTotalEarnings={summaryData?.summary.doctorsTotalEarnings ?? 0}
        loading={summaryLoading}
      />

      {/* ── Filters ── */}
      <FinancialFilters
        specialists={specialists}
        doctorOptions={doctorOptions}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
      />

      {/* ── Doctor Earnings Table ── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-(--text-primary)">إيرادات الأطباء</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">
              {txData?.doctorRecords.length ?? 0} طبيب — قابل للتعديل والفرز
            </p>
          </div>
          <span className="text-xs text-(--text-secondary) bg-(--semi-card-bg) px-3 py-1 rounded-full border border-(--card-border)">
            الفترة: {period}
          </span>
        </div>

        <DoctorEarningsTable
          records={txData?.doctorRecords ?? []}
          loading={txLoading}
          period={period}
          onEditPercentage={setEditRecord}
          onMarkPaid={handleMarkPaid}
        />
      </div>

      {/* ── Profit Sharing Modal ── */}
      <ProfitSharingModal
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSave={handleSavePercentage}
      />
    </div>
  );
}
