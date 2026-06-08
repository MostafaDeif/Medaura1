"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useId, useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  change?: number; // e.g. +12 or -5 (percentage)
  delay?: number;  // animation stagger delay in ms
  /** Number of new live bookings — triggers a glowing ring + counter badge */
  liveCount?: number;
  /** Called when the user clicks the live-count badge to acknowledge */
  onLiveBadgeClick?: () => void;
}

const badgeClasses = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

function useAnimatedCounter(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (typeof target !== "number") return;
    const from = prevTarget.current;
    prevTarget.current = target;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

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
  change,
  delay = 0,
  liveCount,
  onLiveBadgeClick,
}: StatsCardProps) {
  const gradientId = useId();
  const numericValue = typeof value === "number" ? value : null;
  const animatedValue = useAnimatedCounter(numericValue ?? 0);

  const displayValue =
    numericValue !== null
      ? animatedValue.toLocaleString("en-US")
      : value;

  const changeColor =
    change === undefined
      ? ""
      : change > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : change < 0
      ? "text-rose-500 dark:text-rose-400"
      : "text-(--text-secondary)";

  const TrendIcon =
    change === undefined ? null : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

  return (
    <div
      className="group relative w-full rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
      style={{
        animationDelay: `${delay}ms`,
        animation: `fadeUp 0.5s ease both`,
      }}
    >
      {/* Live pulse ring — visible when new bookings arrive */}
      {liveCount != null && liveCount > 0 && (
        <span
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 0 2px ${chartColor}55, 0 0 18px 4px ${chartColor}33`,
            animation: "livePulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      {/* Subtle glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{
          background: `radial-gradient(120px circle at 20% 50%, ${chartColor}18, transparent 70%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-60"
        style={{ background: chartColor }}
      />

      {/* Content */}
      <div className="flex items-start justify-between gap-3 p-5 pt-6">
        {/* Left: icon + text */}
        <div className="flex flex-col gap-2 min-w-0">
          <div
            className={`${iconBg} w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0`}
          >
            {icon}
          </div>

          <div className="mt-1">
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
              {title}
            </p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-3xl font-bold text-(--text-primary) tracking-tight leading-none">
                {value === "—" ? "—" : displayValue}
              </h3>
              {TrendIcon && change !== undefined && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold mb-0.5 ${changeColor}`}>
                  <TrendIcon size={13} />
                  {Math.abs(change)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-(--text-secondary) mt-0.5">{subtitle}</p>
            )}
            {/* Live new-bookings badge */}
            {liveCount != null && liveCount > 0 && (
              <button
                onClick={onLiveBadgeClick}
                title="اضغط لإعادة الضبط"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer select-none"
                style={{
                  background: `${chartColor}22`,
                  color: chartColor,
                  border: `1px solid ${chartColor}44`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: chartColor, animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }}
                />
                +{liveCount} جديد الآن
              </button>
            )}
          </div>
        </div>

        {/* Right: badge */}
        {badge && (
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 mt-1 ${badgeClasses[badgeColor]}`}
          >
            {badge}
          </span>
        )}
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
                isAnimationActive
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
