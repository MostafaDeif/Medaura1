"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  BadgeCheck,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import DoctorCardGrid from "@/app/clinicDash/features/staff/DoctorCardGrid";
import DoctorDrawer from "@/app/clinicDash/features/staff/DoctorDrawer";
import CreateStaffModal from "@/app/clinicDash/features/staff/CreateStaffModal";
import type { StaffMember } from "@/app/clinicDash/features/staff/StaffTable";
import {
  getStaffId,
  getStaffVerified,
  isDoctorStaffRecord,
  normalizeStaffRecord,
} from "@/app/clinicDash/features/staff/staffIdentity";

/* ── Data helpers ───────────────────────────────────────────────────────────── */
function extractStaffList(raw: unknown) {
  if (Array.isArray(raw)) return raw as StaffMember[];
  if (!raw || typeof raw !== "object") return [];

  const record = raw as { staff?: unknown; data?: unknown };
  if (Array.isArray(record.staff)) return record.staff as StaffMember[];
  if (Array.isArray(record.data)) return record.data as StaffMember[];

  return [];
}

async function fetchMyStaff(): Promise<StaffMember[]> {
  try {
    const res = await fetch("/api/staff/my-clinic", { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json.success) return [];
    return extractStaffList(json.data).map(normalizeStaffRecord);
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
  if (!res.ok || !json.success) throw new Error(json.error || "فشل التوثيق");
}

async function unverifyStaff(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid staff ID");
  }

  const res = await fetch(`/api/staff/${id}/unverify`, {
    method: "PATCH",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json.error || "فشل إلغاء التوثيق");
}

function toBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(n)) return true;
    if (["false", "0", "no", "inactive"].includes(n)) return false;
  }
  return null;
}

function getActiveStatus(m: StaffMember) {
  return toBooleanFlag(m.is_active ?? m.isActive ?? m.active);
}

/* ── Filter types ───────────────────────────────────────────────────────────── */
type VerificationFilter = "all" | "verified" | "pending";
type StatusFilter = "all" | "active" | "inactive";

/* ── Page Component ─────────────────────────────────────────────────────────── */
export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Drawer
  const [selectedDoctor, setSelectedDoctor] = useState<StaffMember | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStaff(await fetchMyStaff());
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load, refreshKey]);

  /* ── Actions ──────────────────────────────────────────────────────────────── */
  const handleVerify = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;

    await verifyStaff(staffId);
    setStaff((prev) =>
      prev.map((m) =>
        getStaffId(m) === staffId
          ? { ...m, id: staffId, verified: true, is_verified: true }
          : m
      )
    );
    // Update selected doctor if it's the same
    setSelectedDoctor((prev) =>
      prev && getStaffId(prev) === staffId
        ? { ...prev, id: staffId, verified: true, is_verified: true }
        : prev
    );
  };

  const handleUnverify = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;

    await unverifyStaff(staffId);
    setStaff((prev) =>
      prev.map((m) =>
        getStaffId(m) === staffId
          ? { ...m, id: staffId, verified: false, is_verified: false }
          : m
      )
    );
    setSelectedDoctor((prev) =>
      prev && getStaffId(prev) === staffId
        ? { ...prev, id: staffId, verified: false, is_verified: false }
        : prev
    );
  };

  const handleDelete = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;
    console.warn(
      "Delete staff is not supported on the backend for clinic owners",
      staffId
    );
    alert("حذف الموظفين غير مدعوم حالياً.");
  };

  const openDrawer = (doctor: StaffMember) => {
    setSelectedDoctor(doctor);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    // Delay clearing the doctor to allow close animation
    setTimeout(() => setSelectedDoctor(null), 300);
  };

  /* ── Computed ──────────────────────────────────────────────────────────────── */
  const doctors = useMemo(
    () => staff.filter((member) => isDoctorStaffRecord(member)),
    [staff]
  );

  const specialties = useMemo(() => {
    const unique = new Set<string>();
    doctors.forEach((doctor) => {
      const specialty = doctor.specialist?.trim();
      if (specialty) unique.add(specialty);
    });
    return Array.from(unique);
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      // Search
      const matchesSearch =
        !term ||
        [
          doctor.full_name,
          doctor.email,
          doctor.specialist,
          String(getStaffId(doctor) ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      // Specialty
      const matchesSpecialty =
        specialtyFilter === "all" || doctor.specialist === specialtyFilter;

      // Verification
      const verified = getStaffVerified(doctor);
      const matchesVerification =
        verificationFilter === "all" ||
        (verificationFilter === "verified" ? verified : !verified);

      // Account status
      const active = getActiveStatus(doctor);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? active === true : active === false);

      return (
        matchesSearch && matchesSpecialty && matchesVerification && matchesStatus
      );
    });
  }, [doctors, search, specialtyFilter, verificationFilter, statusFilter]);

  const verifiedDoctors = doctors.filter((d) => getStaffVerified(d)).length;
  const pendingDoctors = doctors.length - verifiedDoctors;
  const activeDoctors = doctors.filter(
    (d) => getActiveStatus(d) === true
  ).length;

  const hasActiveFilters =
    search.trim() !== "" ||
    specialtyFilter !== "all" ||
    verificationFilter !== "all" ||
    statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setSpecialtyFilter("all");
    setVerificationFilter("all");
    setStatusFilter("all");
  };

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">
            أطباء العيادة
          </h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            بيانات حسابات الأطباء داخل العيادة
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            تحديث
          </button>
          <button
            id="staff-page-add-btn"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition shadow-sm"
          >
            <Plus size={15} />
            إضافة طبيب
          </button>
        </div>
      </div>

      {/* ── Statistics Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Users size={20} />}
          label="إجمالي الأطباء"
          value={loading ? "—" : doctors.length}
          tone="teal"
          accentColor="#14b8a6"
        />
        <SummaryCard
          icon={<BadgeCheck size={20} />}
          label="الأطباء الموثقون"
          value={loading ? "—" : verifiedDoctors}
          tone="emerald"
          accentColor="#10b981"
        />
        <SummaryCard
          icon={<Clock size={20} />}
          label="بانتظار التوثيق"
          value={loading ? "—" : pendingDoctors}
          tone="amber"
          accentColor="#f59e0b"
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="الأطباء النشطون"
          value={loading ? "—" : activeDoctors}
          tone="sky"
          accentColor="#0ea5e9"
        />
      </div>

      {/* ── Search & Filters Section ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-(--card-border) p-5">
          {/* Title row */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-(--text-primary)">
                دليل الأطباء
              </h2>
              <p className="mt-0.5 text-sm text-(--text-secondary)">
                عرض {loading ? "—" : filteredDoctors.length} من أصل{" "}
                {loading ? "—" : doctors.length} طبيب
              </p>
            </div>

            {/* Reset filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition self-start"
              >
                <RotateCcw size={12} />
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو البريد أو رقم الموظف"
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-10 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-secondary) focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Specialty Filter */}
            <div className="relative">
              <Stethoscope
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none"
              />
              <select
                value={specialtyFilter}
                onChange={(event) => setSpecialtyFilter(event.target.value)}
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-9 text-sm text-(--text-primary) outline-none transition focus:ring-2 focus:ring-teal-500/30 appearance-none"
              >
                <option value="all">كل التخصصات</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Filter */}
            <div className="relative">
              <BadgeCheck
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none"
              />
              <select
                value={verificationFilter}
                onChange={(e) =>
                  setVerificationFilter(
                    e.target.value as VerificationFilter
                  )
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-9 text-sm text-(--text-primary) outline-none transition focus:ring-2 focus:ring-teal-500/30 appearance-none"
              >
                <option value="all">حالة التوثيق</option>
                <option value="verified">موثق</option>
                <option value="pending">معلق</option>
              </select>
            </div>

            {/* Account Status Filter */}
            <div className="relative">
              <Filter
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-9 text-sm text-(--text-primary) outline-none transition focus:ring-2 focus:ring-teal-500/30 appearance-none"
              >
                <option value="all">حالة الحساب</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Card Grid ─────────────────────────────────────────────────────── */}
        <div className="p-5">
          <DoctorCardGrid
            doctors={filteredDoctors}
            loading={loading}
            onCardClick={openDrawer}
            onAdd={() => setModalOpen(true)}
          />
        </div>
      </div>

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      <DoctorDrawer
        doctor={selectedDoctor}
        open={drawerOpen}
        onClose={closeDrawer}
        onVerify={handleVerify}
        onUnverify={handleUnverify}
        onDelete={handleDelete}
      />

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      <CreateStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

/* ── Summary Card ───────────────────────────────────────────────────────────── */
function SummaryCard({
  icon,
  label,
  value,
  tone,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "teal" | "emerald" | "amber" | "sky";
  accentColor: string;
}) {
  const tones = {
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  } as const;

  return (
    <div
      className="group relative rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
      style={{
        animation: "fadeUp 0.5s ease both",
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-60"
        style={{ background: accentColor }}
      />

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{
          background: `radial-gradient(120px circle at 20% 50%, ${accentColor}18, transparent 70%)`,
        }}
      />

      <div className="flex items-center justify-between gap-3 relative">
        <div>
          <p className="text-2xl font-black text-(--text-primary)">{value}</p>
          <p className="mt-1 text-xs font-semibold text-(--text-secondary)">
            {label}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}
