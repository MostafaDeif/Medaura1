"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BadgeCheck, Clock, Plus, RefreshCw, Search, Stethoscope, Users } from "lucide-react";
import StaffTable from "@/app/clinicDash/features/staff/StaffTable";
import CreateStaffModal from "@/app/clinicDash/features/staff/CreateStaffModal";
import type { StaffMember } from "@/app/clinicDash/features/staff/StaffTable";
import {
  getStaffId,
  getStaffVerified,
  isDoctorStaffRecord,
  normalizeStaffRecord,
} from "@/app/clinicDash/features/staff/staffIdentity";

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
  if (!res.ok || !json.success) throw new Error(json.error || "فشل إلغاء التوثيق");
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

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

  const handleVerify = async (id: number) => {
    const staffId = getStaffId({ id });

    if (staffId === null) {
      console.error("Invalid staff ID");
      return;
    }

    await verifyStaff(staffId);
    setStaff((prev) =>
      prev.map((m) =>
        getStaffId(m) === staffId
          ? { ...m, id: staffId, verified: true, is_verified: true }
          : m
      )
    );
  };

  const handleUnverify = async (id: number) => {
    const staffId = getStaffId({ id });

    if (staffId === null) {
      console.error("Invalid staff ID");
      return;
    }

    await unverifyStaff(staffId);
    setStaff((prev) =>
      prev.map((m) =>
        getStaffId(m) === staffId
          ? { ...m, id: staffId, verified: false, is_verified: false }
          : m
      )
    );
  };

  const handleDelete = async (id: number) => {
    const staffId = getStaffId({ id });
    if (staffId === null) return;
    console.warn("Delete staff is not supported on the backend for clinic owners", staffId);
    alert("حذف الموظفين غير مدعوم حالياً.");
  };

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
      const matchesSearch =
        !term ||
        [doctor.full_name, doctor.email, doctor.specialist]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesSpecialty =
        specialtyFilter === "all" || doctor.specialist === specialtyFilter;

      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, search, specialtyFilter]);

  const verifiedDoctors = doctors.filter((doctor) => getStaffVerified(doctor)).length;
  const pendingDoctors = doctors.length - verifiedDoctors;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">أطباء العيادة</h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            بيانات حسابات الأطباء داخل العيادة
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Users size={18} />}
          label="إجمالي الأطباء"
          value={loading ? "—" : doctors.length}
          tone="teal"
        />
        <SummaryCard
          icon={<BadgeCheck size={18} />}
          label="الأطباء الموثقون"
          value={loading ? "—" : verifiedDoctors}
          tone="emerald"
        />
        <SummaryCard
          icon={<Clock size={18} />}
          label="بانتظار التوثيق"
          value={loading ? "—" : pendingDoctors}
          tone="amber"
        />
      </div>

      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-(--card-border) p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-(--text-primary)">دليل الأطباء</h2>
            <p className="mt-0.5 text-sm text-(--text-secondary)">
              عرض {loading ? "—" : filteredDoctors.length} من أصل {loading ? "—" : doctors.length} طبيب
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو البريد أو التخصص"
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-10 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-secondary) focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div className="relative w-full sm:w-56">
              <Stethoscope
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
              />
              <select
                value={specialtyFilter}
                onChange={(event) => setSpecialtyFilter(event.target.value)}
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) py-2.5 pl-4 pr-9 text-sm text-(--text-primary) outline-none transition focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="all">كل التخصصات</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-5">
          <StaffTable
            staff={filteredDoctors}
            loading={loading}
            onVerify={handleVerify}
            onUnverify={handleUnverify}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <CreateStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "teal" | "emerald" | "amber";
}) {
  const tones = {
    teal: "bg-teal-500/10 text-teal-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  } as const;

  return (
    <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-(--text-primary)">{value}</p>
          <p className="mt-1 text-xs font-semibold text-(--text-secondary)">{label}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}
