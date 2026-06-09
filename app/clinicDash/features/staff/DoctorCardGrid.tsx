"use client";

import { Users, Plus } from "lucide-react";
import type { StaffMember } from "./StaffTable";
import DoctorCard from "./DoctorCard";

/* ── Skeleton Card ──────────────────────────────────────────────────────────── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden"
      style={{
        animation: "fadeUp 0.4s ease both",
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Accent line skeleton */}
      <div className="h-[3px] bg-(--semi-card-bg)" />

      <div className="p-5 pt-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-start gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-(--semi-card-bg) animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-3/4 rounded-lg bg-(--semi-card-bg) animate-pulse" />
            <div className="h-3 w-1/2 rounded-lg bg-(--semi-card-bg) animate-pulse" />
          </div>
        </div>

        {/* Badges skeleton */}
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-(--semi-card-bg) animate-pulse" />
          <div className="h-6 w-14 rounded-full bg-(--semi-card-bg) animate-pulse" />
        </div>

        {/* Divider */}
        <div className="h-px bg-(--card-border)" />

        {/* Footer skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded-lg bg-(--semi-card-bg) animate-pulse" />
          <div className="h-3.5 w-20 rounded-lg bg-(--semi-card-bg) animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-5"
      style={{ animation: "fadeUp 0.5s ease both" }}
    >
      {/* Illustration */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-teal-500/10 flex items-center justify-center">
          <Users size={40} className="text-teal-500/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
          <span className="text-amber-500 text-lg font-bold">?</span>
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <h3 className="text-base font-bold text-(--text-primary)">
          لا يوجد أطباء
        </h3>
        <p className="text-sm text-(--text-secondary) max-w-xs">
          لم يتم العثور على أطباء مطابقين. يمكنك إضافة طبيب جديد أو تغيير
          معايير البحث.
        </p>
      </div>

      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Plus size={15} />
          إضافة طبيب
        </button>
      )}
    </div>
  );
}

/* ── Main Grid ──────────────────────────────────────────────────────────────── */
interface DoctorCardGridProps {
  doctors: StaffMember[];
  loading: boolean;
  onCardClick: (doctor: StaffMember) => void;
  onAdd?: () => void;
}

export default function DoctorCardGrid({
  doctors,
  loading,
  onCardClick,
  onAdd,
}: DoctorCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={`skeleton-${i}`} index={i} />
        ))}
      </div>
    );
  }

  if (doctors.length === 0) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {doctors.map((doctor, idx) => (
        <DoctorCard
          key={doctor.id ?? doctor.staff_id ?? `doc-${idx}`}
          doctor={doctor}
          index={idx}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
