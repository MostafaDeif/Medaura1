"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useId } from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  chartColor: string;
  data?: { value: number }[];
  badge?: string;
  badgeColor?: "green" | "red" | "amber" | "teal";
}

const badgeClasses = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-700",
  teal: "bg-teal-100 text-teal-700",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  chartColor,
  data,
  badge,
  badgeColor = "teal",
}: StatsCardProps) {
  const gradientId = useId();

  return (
    <div className="group w-full rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Content */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start p-4 sm:p-5">
        {/* Badge */}
        {badge && (
          <div className="sm:order-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badgeClasses[badgeColor]}`}
            >
              {badge}
            </span>
          </div>
        )}

        <div className="flex flex-row-reverse sm:flex-row gap-3 items-center">
          <div
            className={`${iconBg} w-10 h-10 p-2 rounded-2xl flex items-center justify-center shadow-sm shrink-0`}
          >
            {icon}
          </div>

          <div className="text-right">
            <p
              className="text-xs sm:text-sm font-semibold"
              style={{ color: chartColor }}
            >
              {title}
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-(--text-primary) tracking-tight mt-0.5">
              {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
            </h3>
            {subtitle && (
              <p className="text-xs text-(--text-secondary) mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mini area chart */}
      {data && data.length > 0 && (
        <div className="h-16 w-full px-3 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
