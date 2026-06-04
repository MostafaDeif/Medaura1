"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle,
  CircleOff,
  Clock,
  User,
  ShieldOff,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  getStaffId,
  getStaffRowKey,
  getStaffVerified,
} from "./staffIdentity";

export interface StaffMember {
  id?: number;
  staff_id?: number | string;
  staffId?: number | string;
  user_id?: number | string;
  userId?: number | string;
  is_verified?: boolean | number | string;
  isVerified?: boolean | number | string;
  is_active?: boolean | number | string;
  isActive?: boolean | number | string;
  active?: boolean | number | string;
  email?: string;
  full_name: string;
  role_title: string;
  specialist?: string;
  work_days?: string;
  work_from?: string;
  work_to?: string;
  consultation_price?: number;
  verified?: boolean;
  photo?: string | null;
}

interface StaffTableProps {
  staff: StaffMember[];
  loading: boolean;
  onVerify: (id: number) => Promise<void>;
  onUnverify: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function toBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive"].includes(normalized)) return false;
  }
  return null;
}

function getActiveStatus(member: StaffMember) {
  return toBooleanFlag(member.is_active ?? member.isActive ?? member.active);
}

// ── Confirm Dialog (unverify only) ────────────────────────────────────────────
function ConfirmDialog({
  open,
  doctorName,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  doctorName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-2xl p-6 space-y-5"
        style={{ animation: "scaleIn 0.2s ease both" }}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-(--hover-bg) text-(--text-secondary) transition"
        >
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle size={26} className="text-amber-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-(--text-primary) text-base">
              إلغاء التوثيق
            </h3>
            <p className="text-sm text-(--text-secondary) mt-1">
              هل تريد إلغاء توثيق &quot;{doctorName}&quot;؟ سيعود إلى وضع الانتظار.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-(--card-border) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                جاري...
              </>
            ) : (
              <>
                <ShieldOff size={13} />
                إلغاء التوثيق
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile staff card ─────────────────────────────────────────────────────────
function StaffCard({
  member,
  idx,
  verifyingId,
  onVerify,
  onUnverifyClick,
}: {
  member: StaffMember;
  idx: number;
  verifyingId: number | null;
  onVerify: (id: number) => void;
  onUnverifyClick: (member: StaffMember) => void;
}) {
  const staffId = getStaffId(member);
  const verified = getStaffVerified(member);
  const active = getActiveStatus(member);

  return (
    <div
      className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 space-y-3 hover:shadow-[var(--shadow-soft)] transition-all duration-200"
      style={{
        animation: "fadeUp 0.35s ease both",
        animationDelay: `${idx * 60}ms`,
      }}
    >
      {/* Top row: avatar + name + status badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 overflow-hidden">
            {member.photo ? (
              <img src={member.photo} alt={member.full_name} className="h-full w-full object-cover" />
            ) : (
              <User size={16} className="text-teal-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-(--text-primary) text-sm truncate">{member.full_name}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle size={10} /> موثق
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock size={10} /> معلق
            </span>
          )}
          {active !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                active
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {active ? <CheckCircle size={10} /> : <CircleOff size={10} />}
              {active ? "نشط" : "غير نشط"}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      {!verified ? (
        <button
          onClick={() => { if (staffId !== null) onVerify(staffId); }}
          disabled={staffId === null || verifyingId === staffId}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
          {verifyingId === staffId ? (
            <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />جاري التوثيق...</>
          ) : (
            <><BadgeCheck size={13} />توثيق الطبيب</>
          )}
        </button>
      ) : (
        <button
          onClick={() => onUnverifyClick(member)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all duration-200"
        >
          <ShieldOff size={13} />
          إلغاء التوثيق
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StaffTable({ staff, loading, onVerify, onUnverify, onDelete }: StaffTableProps) {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [confirmMember, setConfirmMember] = useState<StaffMember | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Keep onDelete in props signature for compatibility but don't render the button
  void onDelete;

  const handleVerify = async (id: number) => {
    setVerifyingId(id);
    try { await onVerify(id); } finally { setVerifyingId(null); }
  };

  const handleConfirmUnverify = async () => {
    if (!confirmMember) return;
    const staffId = getStaffId(confirmMember);
    if (staffId === null) return;
    setConfirmLoading(true);
    try {
      await onUnverify(staffId);
      setConfirmMember(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="sm:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-card-${i}`} className="h-28 rounded-2xl bg-(--semi-card-bg) animate-pulse" />
          ))}
        </div>
        <div className="hidden sm:block space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-row-${i}`} className="h-14 rounded-xl bg-(--semi-card-bg) animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-(--semi-card-bg) flex items-center justify-center">
          <User size={28} className="text-(--text-secondary)" />
        </div>
        <div className="text-center">
          <p className="text-(--text-secondary) text-sm font-medium">لا يوجد أطباء في العيادة بعد</p>
          <p className="text-(--text-secondary) text-xs opacity-60 mt-1">أضف طبيباً للبدء في إدارة العيادة</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confirm unverify dialog */}
      <ConfirmDialog
        open={confirmMember !== null}
        doctorName={confirmMember?.full_name ?? ""}
        onConfirm={handleConfirmUnverify}
        onCancel={() => setConfirmMember(null)}
        loading={confirmLoading}
      />

      {/* ── Mobile: card grid ─────────────────────────────────────────────── */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {staff.map((member, idx) => (
          <StaffCard
            key={getStaffRowKey(member, idx, "staff-card")}
            member={member}
            idx={idx}
            verifyingId={verifyingId}
            onVerify={handleVerify}
            onUnverifyClick={setConfirmMember}
          />
        ))}
      </div>

      {/* ── Desktop: table ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-(--card-border)">
              {["الطبيب", "التوثيق", "الحساب", "إجراء"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-right text-xs font-semibold text-(--text-secondary) uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--card-border)">
            {staff.map((member, idx) => {
              const staffId = getStaffId(member);
              const verified = getStaffVerified(member);
              const active = getActiveStatus(member);

              return (
                <tr
                  key={getStaffRowKey(member, idx, "staff-row")}
                  className="group hover:bg-(--semi-card-bg) transition-colors duration-150"
                  style={{ animation: "fadeUp 0.3s ease both", animationDelay: `${idx * 50}ms` }}
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                        {member.photo ? (
                          <img src={member.photo} alt={member.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <User size={15} className="text-teal-600" />
                        )}
                      </div>
                      <span className="font-medium text-(--text-primary)">{member.full_name}</span>
                    </div>
                  </td>

                  {/* Verification */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {verified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle size={12} /> موثق
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock size={12} /> في الانتظار
                      </span>
                    )}
                  </td>

                  {/* Account */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {active === null ? (
                      <span className="text-(--text-secondary)">—</span>
                    ) : active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        <CheckCircle size={12} /> نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CircleOff size={12} /> غير نشط
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {!verified ? (
                      <button
                        onClick={() => { if (staffId !== null) void handleVerify(staffId); }}
                        disabled={staffId === null || verifyingId === staffId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px"
                      >
                        {verifyingId === staffId ? (
                          <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />جاري...</>
                        ) : (
                          <><BadgeCheck size={13} />توثيق</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmMember(member)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all duration-200"
                      >
                        <ShieldOff size={13} />
                        إلغاء التوثيق
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
