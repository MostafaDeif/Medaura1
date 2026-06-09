"use client";

import {
  BadgeCheck,
  Clock,
  CheckCircle,
  CircleOff,
  ChevronLeft,
  Stethoscope,
} from "lucide-react";
import type { StaffMember } from "./StaffTable";
import { getStaffId, getStaffVerified } from "./staffIdentity";

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface DoctorCardProps {
  doctor: StaffMember;
  index: number;
  onClick: (doctor: StaffMember) => void;
}

export default function DoctorCard({ doctor, index, onClick }: DoctorCardProps) {
  const staffId = getStaffId(doctor);
  const verified = getStaffVerified(doctor);
  const active = getActiveStatus(doctor);

  const accentColor = verified ? "#10b981" : "#f59e0b";

  return (
    <button
      type="button"
      onClick={() => onClick(doctor)}
      className="group relative w-full text-right rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      style={{
        animation: "fadeUp 0.4s ease both",
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Accent top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: accentColor }}
      />

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{
          background: `radial-gradient(120px circle at 80% 30%, ${accentColor}15, transparent 70%)`,
        }}
      />

      {/* Card Body */}
      <div className="p-5 pt-6 space-y-4">
        {/* Header: Avatar + Info */}
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-(--card-border) group-hover:border-teal-400/40 transition-colors duration-300">
            {doctor.photo ? (
              <img
                src={doctor.photo}
                alt={doctor.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                {getInitials(doctor.full_name)}
              </span>
            )}
          </div>

          {/* Name + Specialty */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-(--text-primary) text-sm truncate leading-snug">
              {doctor.full_name}
            </h3>
            {doctor.specialist && (
              <div className="flex items-center gap-1.5 mt-1">
                <Stethoscope
                  size={12}
                  className="text-(--text-secondary) shrink-0"
                />
                <span className="text-xs text-(--text-secondary) truncate">
                  {doctor.specialist}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {verified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <BadgeCheck size={11} />
              موثق
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock size={11} />
              معلق
            </span>
          )}

          {active !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                active
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {active ? <CheckCircle size={11} /> : <CircleOff size={11} />}
              {active ? "نشط" : "غير نشط"}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-(--card-border)" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-(--text-secondary)">
            <span className="font-medium">رقم الموظف:</span>{" "}
            <span className="font-bold text-(--text-primary) tabular-nums">
              #{staffId ?? "—"}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 group-hover:gap-2 transition-all duration-300">
            عرض التفاصيل
            <ChevronLeft
              size={13}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </button>
  );
}
