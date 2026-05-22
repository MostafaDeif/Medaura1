"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ClinicMyStats } from "@/lib/types/api";

interface StatsSectionProps {
  stats: ClinicMyStats | null;
  loading: boolean;
}

const TEAL_PALETTE = ["#14b8a6", "#0d9488", "#0f766e", "#5eead4", "#99f6e4"];

const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: "#14b8a6",
  pending: "#f59e0b",
  cancelled: "#f87171",
};

// Arabic tooltip
const ArabicTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#121b33] border border-[#e6eaf0] dark:border-[#1f2a44] rounded-xl px-4 py-2.5 shadow-lg text-sm">
      {label && <p className="font-semibold text-[#0f1b3d] dark:text-[#e6edf7] mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value?.toLocaleString("ar-EG")}
        </p>
      ))}
    </div>
  );
};

export default function StatsSection({ stats, loading }: StatsSectionProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-(--semi-card-bg) animate-pulse" />
        ))}
      </div>
    );
  }

  // --- Monthly bookings bar chart ---
  const hasMonthlyData =
    stats?.monthly_bookings && stats.monthly_bookings.length > 0;

  const monthlyChartData = hasMonthlyData
    ? stats!.monthly_bookings!.map((item) => ({
        name: item.month,
        الحجوزات: item.count,
      }))
    : null;

  // --- Weekly bookings bar chart ---
  const hasWeeklyData =
    stats?.weekly_bookings && stats.weekly_bookings.length > 0;

  const weeklyChartData = hasWeeklyData
    ? stats!.weekly_bookings!.map((item) => ({
        name: item.day,
        الحجوزات: item.count,
      }))
    : null;

  // --- Staff by specialty pie chart ---
  const hasSpecialtyData =
    stats?.staff_by_specialty && stats.staff_by_specialty.length > 0;

  const specialtyPieData = hasSpecialtyData
    ? stats!.staff_by_specialty!.map((item) => ({
        name: item.specialty,
        value: item.count,
      }))
    : null;

  // --- Booking status donut (confirmed / pending / cancelled) ---
  const bookingStatusData = [
    {
      name: "مؤكدة",
      value: stats?.confirmed_bookings ?? 0,
      color: BOOKING_STATUS_COLORS.confirmed,
    },
    {
      name: "معلقة",
      value: stats?.pending_bookings ?? 0,
      color: BOOKING_STATUS_COLORS.pending,
    },
    {
      name: "ملغاة",
      value: stats?.cancelled_bookings ?? 0,
      color: BOOKING_STATUS_COLORS.cancelled,
    },
  ].filter((d) => d.value > 0);

  const hasBookingStatusData = bookingStatusData.length > 0;

  const noChartData =
    !monthlyChartData && !weeklyChartData && !specialtyPieData && !hasBookingStatusData;

  if (noChartData) return null;

  return (
    <div className="space-y-6">
      {/* Monthly or Weekly bookings bar chart */}
      {(monthlyChartData || weeklyChartData) && (
        <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] p-5">
          <h3 className="text-sm font-semibold text-(--text-primary) mb-4" dir="rtl">
            {monthlyChartData ? "الحجوزات الشهرية" : "الحجوزات الأسبوعية"}
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData ?? weeklyChartData!}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.15)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ArabicTooltip />} />
                <Bar
                  dataKey="الحجوزات"
                  fill="#14b8a6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Booking status donut */}
        {hasBookingStatusData && (
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] p-5">
            <h3 className="text-sm font-semibold text-(--text-primary) mb-4" dir="rtl">
              حالة الحجوزات
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ArabicTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-(--text-secondary)">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Staff by specialty donut */}
        {specialtyPieData && (
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] p-5">
            <h3 className="text-sm font-semibold text-(--text-primary) mb-4" dir="rtl">
              توزيع الموظفين حسب التخصص
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {specialtyPieData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={TEAL_PALETTE[index % TEAL_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ArabicTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-(--text-secondary)">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
