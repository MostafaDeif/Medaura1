"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Clock,
  CalendarCheck,
  Stethoscope,
  Plus,
  RefreshCw,
  Activity,
  Search,
} from "lucide-react";
import StatsCard from "./components/ui/StatsCard";
import StaffTable from "./features/staff/StaffTable";
import PendingRequests from "./features/staff/PendingRequests";
import CreateStaffModal from "./features/staff/CreateStaffModal";
import StatsSection from "./features/stats/StatsSection";
import type { ClinicMyStats } from "@/lib/types/api";
import type { StaffMember } from "./features/staff/StaffTable";
import type { PendingStaffMember } from "./features/staff/PendingRequests";
import {
  getStaffId,
  getStaffVerified,
  isDoctorStaffRecord,
  normalizeStaffRecord,
} from "./features/staff/staffIdentity";

// ── Data-fetching helpers ─────────────────────────────────────────────────────

async function fetchMyStats(): Promise<ClinicMyStats | null> {
  try {
    const res = await fetch("/api/clinic/my-stats", { credentials: "include" });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}


function extractStaffList<T extends object>(raw: unknown) {
  if (Array.isArray(raw)) return raw as T[];
  if (!raw || typeof raw !== "object") return [];

  const record = raw as { staff?: unknown; data?: unknown };
  if (Array.isArray(record.staff)) return record.staff as T[];
  if (Array.isArray(record.data)) return record.data as T[];

  return [];
}

async function fetchMyStaff(): Promise<StaffMember[]> {
  try {
    const res = await fetch("/api/staff/my-clinic", { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json.success) return [];
    return extractStaffList<StaffMember>(json.data).map(normalizeStaffRecord);
  } catch {
    return [];
  }
}

async function fetchPendingStaff(): Promise<PendingStaffMember[]> {
  try {
    const res = await fetch("/api/staff/pending", { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json.success) return [];
    return extractStaffList<PendingStaffMember>(json.data)
      .map(normalizeStaffRecord)
      .filter((member) => isDoctorStaffRecord(member) && !getStaffVerified(member));
  } catch {
    return [];
  }
}

async function verifyStaff(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid staff ID");
  const res = await fetch(`/api/staff/${id}/verify`, { method: "PATCH", credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "فشل توثيق الطبيب");
}

async function unverifyStaff(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid staff ID");
  const res = await fetch(`/api/staff/${id}/unverify`, { method: "PATCH", credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "فشل إلغاء توثيق الطبيب");
}

async function deleteStaffById(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid staff ID");
  const res = await fetch(`/api/staff/${id}/delete`, { method: "DELETE", credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "فشل حذف الطبيب");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRefreshTime(date: Date) {
  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClinicDashPage() {
  const [stats, setStats] = useState<ClinicMyStats | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pending, setPending] = useState<PendingStaffMember[]>([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setStatsLoading(true);
    setStaffLoading(true);
    setPendingLoading(true);

    const [s, st, p] = await Promise.all([
      fetchMyStats(),
      fetchMyStaff(),
      fetchPendingStaff(),
    ]);

    setStats(s);
    setStaff(st);
    setPending(p);

    setStatsLoading(false);
    setStaffLoading(false);
    setPendingLoading(false);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData, refreshKey]);

  const handleRefresh = () => {
    setIsSpinning(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsSpinning(false), 800);
  };

  // ── Verify handler ──────────────────────────────────────────────────────────
  const handleVerify = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;
    setVerifyingId(staffId);
    try {
      await verifyStaff(staffId);
      setStaff((prev) =>
        prev.map((m) =>
          getStaffId(m) === staffId
            ? { ...m, id: staffId, verified: true, is_verified: true }
            : m
        )
      );
      setPending((prev) => prev.filter((m) => getStaffId(m) !== staffId));
    } catch (err: unknown) {
      console.error("Verify error:", err instanceof Error ? err.message : err);
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Unverify handler ────────────────────────────────────────────────────────
  const handleUnverify = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;
    try {
      await unverifyStaff(staffId);
      setStaff((prev) =>
        prev.map((m) =>
          getStaffId(m) === staffId
            ? { ...m, verified: false, is_verified: false }
            : m
        )
      );
    } catch (err: unknown) {
      console.error("Unverify error:", err instanceof Error ? err.message : err);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;
    try {
      await deleteStaffById(staffId);
      setStaff((prev) => prev.filter((m) => getStaffId(m) !== staffId));
      setPending((prev) => prev.filter((m) => getStaffId(m) !== staffId));
    } catch (err: unknown) {
      console.error("Delete error:", err instanceof Error ? err.message : err);
    }
  };

  // ── Search filter ───────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").toLowerCase().trim();

  const filteredStaff = staff
    .filter((member) => isDoctorStaffRecord(member))
    .filter((member) =>
      !searchQuery || member.full_name.toLowerCase().includes(searchQuery)
    );

  // ── Derived stats for cards ─────────────────────────────────────────────────
  const doctorsCount =
    stats?.total_doctors ??
    staff.filter((member) => isDoctorStaffRecord(member)).length;
  const pendingCount = pending.length;
  const bookingsCount = stats?.total_bookings ?? 0;
  const totalStaffCount = stats?.total_staff ?? staff.length;

  // Booking acceptance rate
  const confirmedRate =
    bookingsCount > 0 && stats?.confirmed_bookings
      ? Math.round((stats.confirmed_bookings / bookingsCount) * 100)
      : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        style={{ animation: "fadeUp 0.4s ease both" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">
              لوحة التحكم
            </p>
          </div>
          <h1 className="text-2xl font-bold text-(--text-primary) mt-1">
            {stats?.clinic_name
              ? `مرحباً، ${stats.clinic_name} 👋`
              : "لوحة تحكم العيادة"}
          </h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            إدارة أطباء العيادة وإحصاءاتها بصورة شاملة
          </p>
          {lastRefreshed && (
            <p className="text-[11px] text-(--text-secondary) mt-1 opacity-60 flex items-center gap-1">
              <Activity size={10} />
              آخر تحديث: {formatRefreshTime(lastRefreshed)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={statsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isSpinning || statsLoading ? "animate-spin" : ""}
            />
            تحديث
          </button>
          <button
            id="open-create-staff-modal"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition shadow-sm hover:shadow-md hover:-translate-y-px"
          >
            <Plus size={15} />
            إضافة طبيب
          </button>
        </div>
      </div>

      {/* ── Stats cards — always 4 cards in 2×2 on mobile, 4×1 on xl ─────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي الأطباء"
          value={statsLoading ? "—" : doctorsCount}
          icon={<Users size={18} strokeWidth={2} className="text-white" />}
          iconBg="bg-teal-500"
          chartColor="#14b8a6"
          badge={doctorsCount > 0 ? `${doctorsCount} طبيب` : undefined}
          badgeColor="teal"
          data={
            stats?.monthly_bookings
              ? stats.monthly_bookings.map((m) => ({ value: m.count }))
              : undefined
          }
          delay={0}
        />

        <StatsCard
          title="إجمالي الحجوزات"
          value={statsLoading ? "—" : bookingsCount}
          icon={
            <CalendarCheck size={18} strokeWidth={2} className="text-white" />
          }
          iconBg="bg-[#1f6feb]"
          chartColor="#1f6feb"
          data={
            stats?.weekly_bookings
              ? stats.weekly_bookings.map((w) => ({ value: w.count }))
              : undefined
          }
          badge={
            confirmedRate !== null
              ? `${confirmedRate}% مؤكدة`
              : undefined
          }
          badgeColor={
            confirmedRate !== null && confirmedRate >= 70 ? "green" : "amber"
          }
          delay={80}
        />

        <StatsCard
          title="طلبات معلقة"
          value={statsLoading ? "—" : pendingCount}
          subtitle="بانتظار التوثيق"
          icon={<Clock size={18} strokeWidth={2} className="text-white" />}
          iconBg="bg-amber-500"
          chartColor="#f59e0b"
          badge={pendingCount > 0 ? "يحتاج مراجعة" : "لا يوجد"}
          badgeColor={pendingCount > 0 ? "amber" : "green"}
          delay={160}
        />

        <StatsCard
          title="إجمالي الحسابات"
          value={statsLoading ? "—" : totalStaffCount}
          icon={
            <Stethoscope size={18} strokeWidth={2} className="text-white" />
          }
          iconBg="bg-[#6A1B9A]"
          chartColor="#9333ea"
          delay={240}
        />
      </div>

      {/* ── Charts section ────────────────────────────────────────────────────── */}
      <StatsSection stats={stats} loading={statsLoading} />

      {/* ── Staff section ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden"
        style={{ animation: "fadeUp 0.6s ease both", animationDelay: "200ms" }}
      >
        {/* Tab header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-(--card-border)">
          <div className="flex gap-1 bg-(--semi-card-bg) rounded-xl p-1 self-start sm:self-auto">
            <button
              id="tab-all-staff"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "all"
                  ? "bg-(--card-bg) text-(--text-primary) shadow-sm"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              جميع الأطباء
              {staff.filter((member) => isDoctorStaffRecord(member)).length > 0 && (
                <span className="mr-2 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full px-1.5 py-0.5">
                  {staff.filter((member) => isDoctorStaffRecord(member)).length}
                </span>
              )}
            </button>
            <button
              id="tab-pending-staff"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === "pending"
                  ? "bg-(--card-bg) text-(--text-primary) shadow-sm"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              طلبات معلقة
              {pending.length > 0 && (
                <span className="mr-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
              {/* Notification dot */}
              {pending.length > 0 && activeTab !== "pending" && (
                <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-sm font-semibold hover:bg-teal-500/20 transition"
          >
            <Plus size={14} />
            إضافة طبيب
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "all" ? (
            searchQuery && filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-full bg-(--semi-card-bg) flex items-center justify-center">
                  <Search size={24} className="text-(--text-secondary)" />
                </div>
                <p className="text-(--text-secondary) text-sm font-medium">
                  لا توجد نتائج لـ &quot;{searchParams.get("q")}&quot;
                </p>
                <p className="text-(--text-secondary) text-xs opacity-60">
                  جرّب اسماً مختلفاً
                </p>
              </div>
            ) : (
              <StaffTable
                staff={filteredStaff}
                loading={staffLoading}
                onVerify={handleVerify}
                onUnverify={handleUnverify}
                onDelete={handleDelete}
              />
            )
          ) : (
            <PendingRequests
              pending={pending}
              loading={pendingLoading}
              onVerify={handleVerify}
              verifyingId={verifyingId}
            />
          )}
        </div>
      </div>

      {/* ── Create staff modal ────────────────────────────────────────────────── */}
      <CreateStaffModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
