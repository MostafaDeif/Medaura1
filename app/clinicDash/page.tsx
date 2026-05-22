"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  CalendarCheck,
  Stethoscope,
  Plus,
  RefreshCw,
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
      .filter((member) => !getStaffVerified(member));
  } catch {
    return [];
  }
}

async function verifyStaff(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid staff ID");
  }

  const res = await fetch(`/api/staff/${id}/verify`, {
    method: "PATCH",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "فشل توثيق الموظف");
  }
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
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData, refreshKey]);

  // ── Verify handler ──────────────────────────────────────────────────────────
  const handleVerify = async (id: number) => {
    const staffId = getStaffId({ id });

    if (staffId === null) {
      console.error("Verify error:", "Invalid staff ID");
      return;
    }

    setVerifyingId(staffId);
    try {
      await verifyStaff(staffId);
      // Optimistic update
      setStaff((prev) =>
        prev.map((m) =>
          getStaffId(m) === staffId
            ? { ...m, id: staffId, verified: true, is_verified: true }
            : m
        )
      );
      setPending((prev) => prev.filter((m) => getStaffId(m) !== staffId));
    } catch (err: unknown) {
      console.error(
        "Verify error:",
        err instanceof Error ? err.message : "Failed to verify staff"
      );
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Derived stats for cards ─────────────────────────────────────────────────
  const cardStats = {
    totalStaff: stats?.total_staff ?? staff.length,
    pendingStaff: pending.length,
    totalBookings: stats?.total_bookings ?? 0,
    totalDoctors: stats?.total_doctors ?? 0,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">
            {stats?.clinic_name ? `مرحباً، ${stats.clinic_name}` : "لوحة تحكم العيادة"}
          </h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            إدارة موظفي العيادة وإحصاءاتها
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            <RefreshCw size={14} className={statsLoading ? "animate-spin" : ""} />
            تحديث
          </button>
          <button
            id="open-create-staff-modal"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition shadow-sm hover:shadow-md hover:-translate-y-px"
          >
            <Plus size={15} />
            إضافة موظف
          </button>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard
          title="إجمالي الموظفين"
          value={statsLoading ? "—" : cardStats.totalStaff}
          icon={<Users size={18} strokeWidth={2} className="text-white" />}
          iconBg="bg-teal-500"
          chartColor="#14b8a6"
          badge={cardStats.totalStaff > 0 ? `${cardStats.totalStaff} موظف` : undefined}
          badgeColor="teal"
          data={
            stats?.monthly_bookings
              ? stats.monthly_bookings.map((m) => ({ value: m.count }))
              : undefined
          }
        />

        <StatsCard
          title="الطلبات المعلقة"
          value={statsLoading ? "—" : cardStats.pendingStaff}
          subtitle="بانتظار التوثيق"
          icon={<Clock size={18} strokeWidth={2} className="text-white" />}
          iconBg="bg-amber-500"
          chartColor="#f59e0b"
          badge={cardStats.pendingStaff > 0 ? "يحتاج مراجعة" : "لا يوجد"}
          badgeColor={cardStats.pendingStaff > 0 ? "amber" : "green"}
        />

        <StatsCard
          title="إجمالي الحجوزات"
          value={statsLoading ? "—" : cardStats.totalBookings}
          icon={<CalendarCheck size={18} strokeWidth={2} className="text-white" />}
          iconBg="bg-[#1f6feb]"
          chartColor="#1f6feb"
          data={
            stats?.weekly_bookings
              ? stats.weekly_bookings.map((w) => ({ value: w.count }))
              : undefined
          }
        />

        {cardStats.totalDoctors > 0 && (
          <StatsCard
            title="الأطباء"
            value={statsLoading ? "—" : cardStats.totalDoctors}
            icon={<Stethoscope size={18} strokeWidth={2} className="text-white" />}
            iconBg="bg-[#6A1B9A]"
            chartColor="#6A1B9A"
          />
        )}
      </div>

      {/* ── Charts (real API data) ────────────────────────────────────────────── */}
      <StatsSection stats={stats} loading={statsLoading} />

      {/* ── Staff section ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden">
        {/* Tab header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-(--card-border)">
          <div className="flex gap-1 bg-(--semi-card-bg) rounded-xl p-1">
            <button
              id="tab-all-staff"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "all"
                  ? "bg-(--card-bg) text-(--text-primary) shadow-sm"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              جميع الموظفين
              {staff.length > 0 && (
                <span className="mr-2 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full px-1.5 py-0.5">
                  {staff.length}
                </span>
              )}
            </button>
            <button
              id="tab-pending-staff"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "pending"
                  ? "bg-(--card-bg) text-(--text-primary) shadow-sm"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              الطلبات المعلقة
              {pending.length > 0 && (
                <span className="mr-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 text-sm font-semibold hover:bg-teal-500/20 transition"
          >
            <Plus size={14} />
            إضافة
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "all" ? (
            <StaffTable
              staff={staff}
              loading={staffLoading}
              onVerify={handleVerify}
            />
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
