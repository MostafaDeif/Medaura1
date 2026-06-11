"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import PendingRequests from "@/app/clinicDash/features/staff/PendingRequests";
import type { PendingStaffMember } from "@/app/clinicDash/features/staff/PendingRequests";
import {
  getStaffId,
  getStaffVerified,
  isDoctorStaffRecord,
  normalizeStaffRecord,
} from "@/app/clinicDash/features/staff/staffIdentity";

function extractStaffList(raw: unknown) {
  if (Array.isArray(raw)) return raw as PendingStaffMember[];
  if (!raw || typeof raw !== "object") return [];

  const record = raw as { staff?: unknown; data?: unknown };
  if (Array.isArray(record.staff)) return record.staff as PendingStaffMember[];
  if (Array.isArray(record.data)) return record.data as PendingStaffMember[];

  return [];
}

async function fetchPending(): Promise<PendingStaffMember[]> {
  try {
    const res = await fetch("/api/staff/pending", { credentials: "include" });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!json.success) return [];
    return extractStaffList(json.data)
      .map(normalizeStaffRecord)
      .filter((member) => isDoctorStaffRecord(member) && !getStaffVerified(member));
  } catch {
    return [];
  }
}

async function verifyStaff(id: number): Promise<void> {
  if (!id) {
    throw new Error("Invalid staff ID");
  }

  const res = await fetch(`/api/staff/${id}/verify`, {
    method: "PATCH",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "فشل التوثيق");
}

export default function PendingPage() {
  const [pending, setPending] = useState<PendingStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setPending(await fetchPending());
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

    setVerifyingId(staffId);
    try {
      await verifyStaff(staffId);
      setPending((prev) => prev.filter((m) => getStaffId(m) !== staffId));
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Failed to verify staff");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">طلبات الأطباء المعلقة</h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            مراجعة وتوثيق حسابات أطباء العيادة
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) bg-(--card-bg) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {!loading && pending.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">{pending.length}</span>
          <span>طلب يحتاج إلى مراجعتك</span>
        </div>
      )}

      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] p-5">
        <PendingRequests
          pending={pending}
          loading={loading}
          onVerify={handleVerify}
          verifyingId={verifyingId}
        />
      </div>
    </div>
  );
}
