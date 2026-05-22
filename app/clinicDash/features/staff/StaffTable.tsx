"use client";

import { useState } from "react";
import { CheckCircle, Clock, User, Briefcase, Stethoscope, BadgeCheck } from "lucide-react";
import { getStaffId, getStaffRowKey, getStaffVerified } from "./staffIdentity";

export interface StaffMember {
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
  work_days?: string;
  work_from?: string;
  work_to?: string;
  consultation_price?: number;
  verified?: boolean;
}

interface StaffTableProps {
  staff: StaffMember[];
  loading: boolean;
  onVerify: (id: number) => Promise<void>;
}

export default function StaffTable({ staff, loading, onVerify }: StaffTableProps) {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const handleVerify = async (id: number) => {
    setVerifyingId(id);
    try {
      await onVerify(id);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`skeleton-row-${i}`}
            className="h-16 rounded-xl bg-(--semi-card-bg) animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-16 h-16 rounded-full bg-(--semi-card-bg) flex items-center justify-center">
          <User size={28} className="text-(--text-secondary)" />
        </div>
        <p className="text-(--text-secondary) text-sm">لا يوجد موظفون في العيادة بعد</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-(--card-border)">
            {["الاسم", "الدور الوظيفي", "التخصص", "أيام العمل", "الحالة", "إجراء"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-right text-xs font-semibold text-(--text-secondary) uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--card-border)">
          {staff.map((member, idx) => {
            const staffId = getStaffId(member);
            const verified = getStaffVerified(member);

            return (
              <tr
                key={getStaffRowKey(member, idx, "staff-row")}
                className="group hover:bg-(--semi-card-bg) transition-colors duration-150"
              >
              {/* Name */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <User size={15} className="text-teal-600" />
                  </div>
                  <span className="font-medium text-(--text-primary)">
                    {member.full_name}
                  </span>
                </div>
              </td>

              {/* Role */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-(--text-secondary)">
                  <Briefcase size={13} />
                  <span>{member.role_title || "—"}</span>
                </div>
              </td>

              {/* Specialist */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-(--text-secondary)">
                  <Stethoscope size={13} />
                  <span>{member.specialist || "—"}</span>
                </div>
              </td>

              {/* Work days */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                {member.work_days ? (
                  <div className="flex items-center gap-1.5 text-(--text-secondary)">
                    <Clock size={13} />
                    <span>{member.work_days}</span>
                  </div>
                ) : (
                  <span className="text-(--text-secondary)">—</span>
                )}
              </td>

              {/* Status */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                {verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle size={12} />
                    موثق
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Clock size={12} />
                    في الانتظار
                  </span>
                )}
              </td>

              {/* Action */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                {!verified ? (
                  <button
                    onClick={() => {
                      if (staffId !== null) void handleVerify(staffId);
                    }}
                    disabled={staffId === null || verifyingId === staffId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-px"
                  >
                    {verifyingId === staffId ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <BadgeCheck size={13} />
                        توثيق
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-(--text-secondary) px-3 py-1.5">موثق بالفعل</span>
                )}
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
