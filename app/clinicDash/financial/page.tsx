"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, RefreshCw, Clock } from "lucide-react";
import FinancialOverviewCards from "./components/FinancialOverviewCards";
import DoctorEarningsTable from "./components/DoctorEarningsTable";
import ProfitSharingModal from "./components/ProfitSharingModal";
import RevenueCharts from "./components/RevenueCharts";
import FinancialFilters from "./components/FinancialFilters";
import ExportButtons from "./components/ExportButtons";
import PendingAppointmentsTable from "./components/PendingAppointmentsTable";
import type {
  FinancialSummary,
  DailyRevenue,
  MonthlyRevenue,
  DoctorFinancialRecord,
  AppointmentRecord,
  FinancialFilters as FiltersType,
} from "./lib/types";
import { currentMonthStr } from "./lib/calculations";

// ── Constants ─────────────────────────────────────────────────────────────────
const SUMMARY_CACHE_KEY  = "financial_summary_cache";
const SUMMARY_TS_KEY     = "financial_summary_ts";
const EGYPT_TZ           = "Africa/Cairo";
const DAILY_REFRESH_HOUR = 21; // 9 PM Cairo time
/** Poll every 5 minutes to detect if the 9 PM boundary has been crossed */
const CHECK_INTERVAL_MS  = 5 * 60 * 1_000;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SummaryData {
  summary: FinancialSummary;
  monthly: MonthlyRevenue[];
  daily: DailyRevenue[];
}

interface TransactionData {
  doctorRecords: DoctorFinancialRecord[];
  appointmentRecords: AppointmentRecord[];
  specialties: string[];
}

// ── Egypt 9 PM helpers ────────────────────────────────────────────────────────

/**
 * Returns the Egypt UTC offset in minutes (+120 or +180 depending on DST).
 * Handles the midnight wraparound correctly.
 */
function egyptOffsetMinutes(): number {
  const now = new Date();
  // Parse both Egypt and UTC times using a fixed reference point
  const toMinutes = (fmt: Intl.DateTimeFormat): number => {
    const parts = fmt.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    return h * 60 + m;
  };

  const egyptMin = toMinutes(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: EGYPT_TZ })
  );
  const utcMin = toMinutes(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "UTC" })
  );

  // Handle midnight wraparound: Egypt is always UTC+2 or UTC+3
  let diff = egyptMin - utcMin;
  if (diff < -720) diff += 1_440; // crossed midnight downward
  if (diff >  720) diff -= 1_440; // crossed midnight upward (shouldn't happen)
  return diff;
}

/**
 * Returns the Unix ms timestamp of the most recent 9 PM Egypt checkpoint.
 * - If Egypt current hour >= 21  → today's 9 PM
 * - Otherwise                     → yesterday's 9 PM
 */
function lastEgypt9PMTimestamp(): number {
  const now = new Date();

  // Current Egypt date/hour
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", hour12: false, timeZone: EGYPT_TZ,
  });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: EGYPT_TZ,
  });

  const egyptHour = parseInt(hourFmt.format(now), 10);
  const parts     = dateFmt.formatToParts(now);
  const year  = parseInt(parts.find((p) => p.type === "year")!.value,  10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1; // 0-based
  const day   = parseInt(parts.find((p) => p.type === "day")!.value,   10);

  // today's 9 PM Egypt in UTC
  const offset = egyptOffsetMinutes();
  const todayAt9PM = Date.UTC(year, month, day, DAILY_REFRESH_HOUR, 0, 0) - offset * 60_000;

  return egyptHour >= DAILY_REFRESH_HOUR
    ? todayAt9PM
    : todayAt9PM - 86_400_000; // yesterday's 9 PM
}

/** True when the cache was saved before the last 9 PM Egypt checkpoint */
function isCacheStale(cachedTs: number): boolean {
  return cachedTs < lastEgypt9PMTimestamp();
}

/** Minutes remaining until the NEXT 9 PM Egypt time */
function minutesUntilNextEgypt9PM(): number {
  const next9PM = lastEgypt9PMTimestamp() + 86_400_000;
  return Math.max(0, Math.round((next9PM - Date.now()) / 60_000));
}

// ── localStorage cache helpers ────────────────────────────────────────────────
function readCachedSummary(): { data: SummaryData; ts: number } | null {
  try {
    const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
    const ts  = parseInt(localStorage.getItem(SUMMARY_TS_KEY) ?? "0", 10);
    if (!raw || !ts) return null;
    return { data: JSON.parse(raw) as SummaryData, ts };
  } catch {
    return null;
  }
}

function writeCachedSummary(data: SummaryData): void {
  try {
    localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(SUMMARY_TS_KEY, String(Date.now()));
  } catch { /* quota exceeded — ignore */ }
}

// ── Display helpers ───────────────────────────────────────────────────────────
function formatLastUpdated(ts: number): string {
  const diff  = Date.now() - ts;
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  if (hours === 0 && mins < 2) return "الآن";
  if (hours === 0) return `منذ ${mins} دقيقة`;
  if (hours < 24)  return `منذ ${hours} ساعة`;
  return "منذ أكثر من يوم";
}

function formatNextRefresh(): string {
  const mins = minutesUntilNextEgypt9PM();
  if (mins <= 0) return "قريباً";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `بعد ${m} دقيقة`;
  return `بعد ${h}س ${m}د`;
}

// ── Date-range builder (for transaction filters) ───────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FinancialPage() {
  // ── State ────────────────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [txData, setTxData]           = useState<TransactionData | null>(null);
  const [allApptData, setAllApptData] = useState<AppointmentRecord[]>([]);  // unfiltered, for payment confirmation
  const [summaryLoading, setSummaryLoading]   = useState(true);
  const [txLoading, setTxLoading]             = useState(true);
  const [allApptLoading, setAllApptLoading]   = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [lastUpdatedTs, setLastUpdatedTs]     = useState<number | null>(null);
  const [tickCount, setTickCount]             = useState(0);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);

  const [filters, setFilters]       = useState<FiltersType>({ period: "month" });
  const [editRecord, setEditRecord] = useState<DoctorFinancialRecord | null>(null);

  const checkRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── activePeriod: key used for paid-status lookup (e.g. "2025-06") ────────
  const activePeriod = (() => {
    if (filters.period === "today" || filters.period === "week") return currentMonthStr();
    if (filters.period === "year") return String(new Date().getFullYear());
    if (filters.period === "custom" && filters.dateFrom) return filters.dateFrom.slice(0, 7);
    return currentMonthStr();
  })();

  // ────────────────────────────────────────────────────────────────────────────
  // REQUIREMENT 1: Revenue KPIs (today/month/year) are cached and only refresh
  //               automatically once per day at 9 PM Egypt time.
  //               Manual ↺ refresh always bypasses the cache.
  // ────────────────────────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCachedSummary();
      if (cached && !isCacheStale(cached.ts)) {
        // Cache is still valid for today's 9 PM window — use it
        setSummaryData(cached.data);
        setLastUpdatedTs(cached.ts);
        setSummaryLoading(false);
        return;
      }
    }

    setSummaryLoading(true);
    try {
      const res  = await fetch("/api/clinic/financial/summary");
      const json = await res.json() as { success: boolean; data: SummaryData; error?: string };
      if (json.success) {
        setSummaryData(json.data);
        writeCachedSummary(json.data);
        setLastUpdatedTs(Date.now());
      } else {
        setError(json.error ?? "خطأ في تحميل الملخص");
      }
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // REQUIREMENT 2: Doctor/clinic profit numbers update immediately when the
  //               admin confirms a payment (no waiting for 9 PM).
  //
  // fetchTransactions is NOT cached — always live.
  // Called on filter change, on payment confirmation, and on percentage change.
  // ────────────────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async (f: FiltersType) => {
    setTxLoading(true);
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

      const res  = await fetch(`/api/clinic/financial/transactions?${params}`);
      const json = await res.json() as { success: boolean; data: TransactionData; error?: string };
      if (json.success) setTxData(json.data);
      else setError(json.error ?? "خطأ في تحميل البيانات");
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    } finally {
      setTxLoading(false);
    }
  }, [activePeriod]);

  /**
   * Fetches ALL appointment records with NO date filter.
   * Used exclusively by the "تأكيد مدفوعات المرضى" section so pending
   * appointments from any period are always visible regardless of the
   * current date filter selected by the user.
   */
  const fetchAllAppointments = useCallback(async () => {
    setAllApptLoading(true);
    try {
      const res  = await fetch("/api/clinic/financial/transactions"); // no date params
      const json = await res.json() as { success: boolean; data: TransactionData; error?: string };
      if (json.success) setAllApptData(json.data.appointmentRecords ?? []);
    } catch {
      // silently ignore — main error banner covers API failures
    } finally {
      setAllApptLoading(false);
    }
  }, []);

  // ── Mount: load summary + set up 9 PM auto-refresh loop ──────────────────
  useEffect(() => {
    void fetchSummary(false);
    void fetchAllAppointments(); // load unfiltered appointments for confirmation table

    checkRef.current = setInterval(() => {
      const cached = readCachedSummary();
      if (!cached || isCacheStale(cached.ts)) {
        void fetchSummary(true);
      }
    }, CHECK_INTERVAL_MS);

    tickRef.current = setInterval(() => setTickCount((n) => n + 1), 60_000);

    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
      if (tickRef.current)  clearInterval(tickRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [fetchSummary, fetchAllAppointments]);

  // Refetch transactions whenever filters or activePeriod changes
  useEffect(() => {
    void fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  // Handle the 15-second countdown timer UI
  useEffect(() => {
    if (refreshCountdown === null || refreshCountdown <= 0) return;
    const timer = setTimeout(() => {
      setRefreshCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [refreshCountdown]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Change a doctor's profit-sharing percentage.
   * Affects how profit is split → force-refresh summary to recompute
   * clinicProfit & doctorsTotalEarnings from scratch.
   */
  const handleSavePercentage = async (doctorId: string | number, percentage: number) => {
    await fetch("/api/clinic/financial/profit-sharing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, doctorPercentage: percentage }),
    });
    // Percentage change affects profit split → force-refresh summary
    void fetchSummary(true);
    void fetchTransactions(filters);
  };

  /**
   * Per-appointment patient payment confirmation.
   * "paid" or "cancelled" → removes the fee from pendingPayments INSTANTLY.
   * "pending" (reset) → adds the fee back to pendingPayments INSTANTLY.
   * Revenue KPIs stay on the 9 PM schedule.
   */
  const handleAppointmentPayment = async (
    bookingId: string | number,
    status: "paid" | "cancelled" | "pending"
  ) => {
    // Look up from UNFILTERED allApptData so any period's appointment can be confirmed
    const appt       = allApptData.find((r) => String(r.bookingId) === String(bookingId));
    const fee        = appt?.consultationFee ?? 0;
    const prevStatus = appt?.paymentStatus   ?? "pending";

    // ── Compute delta ─────────────────────────────────────────────────────────
    let delta = 0;
    if (prevStatus === "pending" && status !== "pending") delta = -fee;
    if (prevStatus !== "pending" && status === "pending") delta = +fee;

    // ── Optimistic update + sync localStorage cache ───────────────────────────
    if (fee > 0 && delta !== 0) {
      setSummaryData((prev) => {
        if (!prev) return prev;
        const newPending = Math.max(0, prev.summary.pendingPayments + delta);
        const updated = {
          ...prev,
          summary: { ...prev.summary, pendingPayments: newPending },
        };
        writeCachedSummary(updated); // ★ keep cache in sync so reload shows correct value
        return updated;
      });
    }

    // ── Persist to server ─────────────────────────────────────────────────────
    await fetch("/api/clinic/financial/appointment-payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status }),
    });

    // ── Refresh both data sources ─────────────────────────────────────────────
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    setRefreshCountdown(15);
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshCountdown(null);
      void fetchAllAppointments(); // refresh unfiltered confirmation table
      void fetchTransactions(filters); // refresh filtered doctor earnings table
      void fetchSummary(true); // update main revenue summaries as well
    }, 15000);
  };

  /**
   * Doctor monthly salary payment (separate concept from patient payment).
   * Only updates the salary status badge in the doctor earnings table.
   */
  const handleMarkPaid = async (doctorId: string | number, p: string, paid: boolean) => {
    await fetch("/api/clinic/financial/mark-paid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, period: p, paid }),
    });
    void fetchTransactions(filters);
  };

  const handleReset = () => setFilters({ period: "month" });

  /** Manual ↺ button — bypasses both schedules */
  const handleRefresh = () => {
    void fetchSummary(true);
    void fetchTransactions(filters);
    void fetchAllAppointments();
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const doctorOptions = txData?.doctorRecords.map((r) => ({ id: r.doctorId, name: r.doctorName })) ?? [];
  const specialists   = txData?.specialties ?? [];

  /**
   * These three KPIs are computed LIVE from allApptData so they update
   * immediately when admin confirms or cancels any appointment payment —
   * no waiting for the 9 PM cache cycle.
   *
   * Revenue KPIs (today/month/year) still come from the 9 PM cache.
   */
  const currentYear = String(new Date().getFullYear());

  const paidThisYear = allApptLoading
    ? null
    : allApptData.filter(
        (r) => r.paymentStatus === "paid" && r.bookingDate.startsWith(currentYear)
      );

  const livePendingPayments = allApptLoading
    ? (summaryData?.summary.pendingPayments ?? 0)
    : allApptData
        .filter((r) => r.paymentStatus === "pending")
        .reduce((sum, r) => sum + r.consultationFee, 0);

  const liveClinicProfit = paidThisYear
    ? paidThisYear.reduce((sum, r) => sum + r.clinicShare, 0)
    : (summaryData?.summary.clinicProfit ?? 0);

  const liveDoctorsTotalEarnings = paidThisYear
    ? paidThisYear.reduce((sum, r) => sum + r.doctorShare, 0)
    : (summaryData?.summary.doctorsTotalEarnings ?? 0);

  const displaySummary = summaryData?.summary
    ? {
        ...summaryData.summary,
        pendingPayments:      livePendingPayments,
        clinicProfit:         liveClinicProfit,
        doctorsTotalEarnings: liveDoctorsTotalEarnings,
      }
    : null;

  // tickCount used only to trigger re-render for time displays
  void tickCount;


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
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons records={txData?.doctorRecords ?? []} period={activePeriod} />

          {/* Schedule info pills */}
          <div className="hidden sm:flex items-center gap-2">
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
          </div>

          <button
            onClick={handleRefresh}
            disabled={summaryLoading || txLoading}
            className="p-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:text-teal-400 hover:border-teal-500/40 transition-all shadow-[var(--shadow-soft)] disabled:opacity-50"
            title="تحديث فوري (يتجاوز الجدولة)"
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
          <button onClick={() => setError(null)} className="mr-auto text-xs underline hover:no-underline">
            إغلاق
          </button>
        </div>
      )}

      {/* ── Overview Cards (revenue cached at 9 PM, pendingPayments live) ── */}
      <FinancialOverviewCards summary={displaySummary} loading={summaryLoading || allApptLoading} />

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

      {/* ── Pending Patient Payments ── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-(--text-primary)">تأكيد مدفوعات المرضى</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">
              يرجى تأكيد دفع كل موعد — المبالغ غير المؤكدة تُضاف لـ "المدفوعات المعلقة"
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
          records={allApptData}
          loading={allApptLoading}
          onMarkPayment={handleAppointmentPayment}
        />
      </div>

      {/* ── Doctor Earnings Table (salary payment tracking) ── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-(--text-primary)">توزيع أرباح الأطباء</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">
              {txData?.doctorRecords.length ?? 0} طبيب — حصص الأرباح وحالة صرف الرواتب
            </p>
          </div>
          <span className="text-xs text-(--text-secondary) bg-(--semi-card-bg) px-3 py-1 rounded-full border border-(--card-border)">
            الفترة: {activePeriod}
          </span>
        </div>

        <DoctorEarningsTable
          records={txData?.appointmentRecords ?? []}
          doctorRecords={txData?.doctorRecords ?? []}
          loading={txLoading}
          period={activePeriod}
          onEditPercentage={setEditRecord}
          onMarkPaid={handleAppointmentPayment}
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
