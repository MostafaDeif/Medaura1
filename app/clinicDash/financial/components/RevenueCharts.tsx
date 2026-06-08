"use client";

import {
  AreaChart,
  Area,
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
import type { DailyRevenue, MonthlyRevenue, DoctorFinancialRecord } from "../lib/types";
import { formatCurrencyCompact, formatCurrency } from "../lib/calculations";

interface Props {
  daily: DailyRevenue[];
  monthly: MonthlyRevenue[];
  doctorRecords: DoctorFinancialRecord[];
  clinicProfit: number;
  doctorsTotalEarnings: number;
  loading: boolean;
}

// ── Tooltip Styles ─────────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: "var(--card-bg, #1a2340)",
  border: "1px solid var(--card-border, #2a3660)",
  borderRadius: "12px",
  padding: "10px 14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "13px",
};

const labelStyle = { color: "var(--text-secondary, #94a3b8)", marginBottom: 4 };

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="rounded-2xl bg-(--semi-card-bg) animate-pulse"
      style={{ height }}
    />
  );
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────
type TooltipPayloadItem = { value: number; name: string; percent: number; fill?: string; payload?: { fill?: string } };

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={labelStyle}>{label}</p>
      <p className="font-bold text-teal-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const color = d.fill ?? d.payload?.fill;
  return (
    <div style={tooltipStyle}>
      <p style={labelStyle}>{d.name}</p>
      <p className="font-bold" style={{ color }}>{formatCurrency(d.value)}</p>
      <p className="text-xs opacity-70">{((d.percent ?? 0) * 100).toFixed(1)}%</p>
    </div>
  );
}

// ── Daily Area Chart ───────────────────────────────────────────────────────────
function DailyChart({ data, loading }: { data: DailyRevenue[]; loading: boolean }) {
  const formatted = data.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    revenue: d.revenue,
  }));

  return (
    <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 space-y-4 shadow-[var(--shadow-soft)]">
      <div>
        <h3 className="text-sm font-bold text-(--text-primary)">إيرادات آخر 30 يوم</h3>
        <p className="text-xs text-(--text-secondary) mt-0.5">مجموع الإيرادات اليومية</p>
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyCompact(v)}
              tick={{ fontSize: 10, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#14b8a6"
              strokeWidth={2}
              fill="url(#tealGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────
function MonthlyChart({ data, loading }: { data: MonthlyRevenue[]; loading: boolean }) {
  const formatted = data.map((d) => ({
    label: d.label.split(" ")[0], // Arabic month only
    revenue: d.revenue,
  }));

  return (
    <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 space-y-4 shadow-[var(--shadow-soft)]">
      <div>
        <h3 className="text-sm font-bold text-(--text-primary)">الإيرادات الشهرية</h3>
        <p className="text-xs text-(--text-secondary) mt-0.5">آخر 12 شهر</p>
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyCompact(v)}
              tick={{ fontSize: 10, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar
              dataKey="revenue"
              fill="url(#blueGrad)"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Pie Chart ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#14b8a6", "#f59e0b"];

function PieShareChart({
  clinicProfit,
  doctorsTotalEarnings,
  loading,
}: {
  clinicProfit: number;
  doctorsTotalEarnings: number;
  loading: boolean;
}) {
  const total = clinicProfit + doctorsTotalEarnings;
  const pieData = [
    { name: "حصة العيادة", value: clinicProfit },
    { name: "حصة الأطباء", value: doctorsTotalEarnings },
  ];

  return (
    <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 space-y-4 shadow-[var(--shadow-soft)]">
      <div>
        <h3 className="text-sm font-bold text-(--text-primary)">توزيع الأرباح</h3>
        <p className="text-xs text-(--text-secondary) mt-0.5">العيادة مقابل الأطباء</p>
      </div>
      {loading ? (
        <ChartSkeleton height={240} />
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-(--text-secondary) text-sm">
          لا توجد بيانات حتى الآن
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: 12, color: "var(--text-secondary, #94a3b8)" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Top Doctors Horizontal Bar ────────────────────────────────────────────────
function TopDoctorsChart({
  records,
  loading,
}: {
  records: DoctorFinancialRecord[];
  loading: boolean;
}) {
  const top5 = records
    .slice()
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map((r) => ({
      name: r.doctorName.split(" ").slice(0, 2).join(" "),
      revenue: r.totalRevenue,
    }));

  return (
    <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 space-y-4 shadow-[var(--shadow-soft)]">
      <div>
        <h3 className="text-sm font-bold text-(--text-primary)">أعلى 5 أطباء إيراداً</h3>
        <p className="text-xs text-(--text-secondary) mt-0.5">بناءً على المواعيد المكتملة</p>
      </div>
      {loading ? (
        <ChartSkeleton height={240} />
      ) : top5.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-(--text-secondary) text-sm">
          لا توجد بيانات حتى الآن
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={top5}
            layout="vertical"
            margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrencyCompact(v)}
              tick={{ fontSize: 10, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--text-secondary, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar
              dataKey="revenue"
              fill="url(#amberGrad)"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function RevenueCharts({
  daily,
  monthly,
  doctorRecords,
  clinicProfit,
  doctorsTotalEarnings,
  loading,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DailyChart data={daily} loading={loading} />
      <MonthlyChart data={monthly} loading={loading} />
      <PieShareChart clinicProfit={clinicProfit} doctorsTotalEarnings={doctorsTotalEarnings} loading={loading} />
      <TopDoctorsChart records={doctorRecords} loading={loading} />
    </div>
  );
}
