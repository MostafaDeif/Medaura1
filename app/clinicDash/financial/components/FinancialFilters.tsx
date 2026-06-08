"use client";

import { useState } from "react";
import { Calendar, User, Stethoscope, RefreshCw } from "lucide-react";
import type { FinancialFilters } from "../lib/types";

interface Props {
  specialists: string[];
  doctorOptions: { id: number; name: string }[];
  filters: FinancialFilters;
  onFiltersChange: (filters: FinancialFilters) => void;
  onReset: () => void;
}

const periodOptions: { label: string; value: FinancialFilters["period"] }[] = [
  { label: "اليوم", value: "today" },
  { label: "الأسبوع", value: "week" },
  { label: "الشهر", value: "month" },
  { label: "السنة", value: "year" },
  { label: "مخصص", value: "custom" },
];

export default function FinancialFilters({
  specialists,
  doctorOptions,
  filters,
  onFiltersChange,
  onReset,
}: Props) {
  const [showCustom, setShowCustom] = useState(filters.period === "custom");

  const handlePeriodChange = (period: FinancialFilters["period"]) => {
    const isCustom = period === "custom";
    setShowCustom(isCustom);
    if (!isCustom) {
      // Clear custom dates when switching to preset
      onFiltersChange({ ...filters, period, dateFrom: undefined, dateTo: undefined });
    } else {
      onFiltersChange({ ...filters, period });
    }
  };

  const hasActiveFilters =
    filters.period !== "month" ||
    filters.doctorId !== undefined ||
    filters.specialist !== undefined;

  return (
    <div
      className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 space-y-4 shadow-[var(--shadow-soft)]"
      dir="rtl"
    >
      {/* Row 1: Period tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-(--text-secondary) flex items-center gap-1.5 shrink-0">
          <Calendar size={13} />
          الفترة الزمنية
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                filters.period === opt.value
                  ? "bg-teal-500 text-white shadow-sm shadow-teal-500/30"
                  : "bg-(--semi-card-bg) text-(--text-secondary) hover:bg-(--hover-bg) hover:text-(--text-primary)"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <RefreshCw size={12} />
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Custom date range */}
      {showCustom && (
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-(--text-secondary) shrink-0">من</label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })
              }
              className="px-3 py-1.5 rounded-xl border border-(--card-border) bg-(--input-bg) text-(--text-primary) text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-(--text-secondary) shrink-0">إلى</label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateTo: e.target.value || undefined })
              }
              className="px-3 py-1.5 rounded-xl border border-(--card-border) bg-(--input-bg) text-(--text-primary) text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>
      )}

      {/* Row 2: Doctor + Specialty selects */}
      {(doctorOptions.length > 0 || specialists.length > 0) && (
        <div className="flex gap-3 flex-wrap">
          {/* Doctor select */}
          {doctorOptions.length > 0 && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <User size={13} className="text-(--text-secondary) shrink-0" />
              <select
                value={filters.doctorId ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    doctorId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="flex-1 px-3 py-1.5 rounded-xl border border-(--card-border) bg-(--input-bg) text-(--text-primary) text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                <option value="">كل الأطباء</option>
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Specialty select */}
          {specialists.length > 0 && (
            <div className="flex items-center gap-2 min-w-[180px]">
              <Stethoscope size={13} className="text-(--text-secondary) shrink-0" />
              <select
                value={filters.specialist ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    specialist: e.target.value || undefined,
                  })
                }
                className="flex-1 px-3 py-1.5 rounded-xl border border-(--card-border) bg-(--input-bg) text-(--text-primary) text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              >
                <option value="">كل التخصصات</option>
                {specialists.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
