"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import StaffTable from "@/app/clinicDash/features/staff/StaffTable";
import CreateStaffModal from "@/app/clinicDash/features/staff/CreateStaffModal";
import type { StaffMember } from "@/app/clinicDash/features/staff/StaffTable";
import {
  getStaffId,
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

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">موظفو العيادة</h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            إدارة جميع موظفي العيادة
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
            إضافة موظف
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] p-5">
        <StaffTable staff={staff} loading={loading} onVerify={handleVerify} />
      </div>

      <CreateStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
