"use client";

import { BadgeCheck, Clock, Stethoscope, User, Briefcase } from "lucide-react";
import { getStaffId, getStaffRowKey, getStaffVerified } from "./staffIdentity";

export interface PendingStaffMember {
  id?: number;
  staff_id?: number | string;
  staffId?: number | string;
  user_id?: number | string;
  userId?: number | string;
  is_verified?: boolean | number | string;
  isVerified?: boolean | number | string;
  full_name: string;
  role_title: string;
  specialist?: string;
  clinic_id?: number;
  verified?: boolean;
}

interface PendingRequestsProps {
  pending: PendingStaffMember[];
  loading: boolean;
  onVerify: (id: number) => Promise<void>;
  verifyingId: number | null;
}

export default function PendingRequests({
  pending,
  loading,
  onVerify,
  verifyingId,
}: PendingRequestsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`skeleton-pending-${i}`} className="h-20 rounded-2xl bg-(--semi-card-bg) animate-pulse" />
        ))}
      </div>
    );
  }

  const visiblePending = pending.filter((member) => !getStaffVerified(member));

  if (visiblePending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
          <BadgeCheck size={24} className="text-emerald-600" />
        </div>
        <p className="text-(--text-secondary) text-sm font-medium">لا توجد طلبات معلقة</p>
        <p className="text-(--text-secondary) text-xs opacity-70">جميع الموظفين موثقون</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {visiblePending.map((member, idx) => {
        const staffId = getStaffId(member);

        return (
          <div
            key={getStaffRowKey(member, idx, "pending-staff")}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 hover:shadow-md transition-all duration-200 group"
          >
          {/* Avatar + Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <User size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-(--text-primary) text-sm truncate">
                {member.full_name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {member.role_title && (
                  <span className="flex items-center gap-1 text-xs text-(--text-secondary)">
                    <Briefcase size={11} />
                    {member.role_title}
                  </span>
                )}
                {member.specialist && (
                  <span className="flex items-center gap-1 text-xs text-(--text-secondary)">
                    <Stethoscope size={11} />
                    {member.specialist}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status + Action */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Clock size={12} />
              في الانتظار
            </span>
            <button
              onClick={() => {
                if (staffId !== null) void onVerify(staffId);
              }}
              disabled={staffId === null || verifyingId === staffId}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px"
            >
              {verifyingId === staffId ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  جاري...
                </>
              ) : (
                <>
                  <BadgeCheck size={13} />
                  قبول
                </>
              )}
            </button>
          </div>
          </div>
        );
      })}
    </div>
  );
}
