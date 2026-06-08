"use client";

import { TrendingUp, TrendingDown, ArrowUpRight, AlertCircle } from "lucide-react";
import { formatCurrencyCompact, formatCurrency } from "../lib/calculations";
import type { FinancialSummary } from "../lib/types";

interface Props {
  summary: FinancialSummary | null;
  loading: boolean;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BentoSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "5fr 4fr 3fr" }}>
        <div className="rounded-3xl bg-(--semi-card-bg) animate-pulse" style={{ minHeight: 240 }} />
        <div className="rounded-3xl bg-(--semi-card-bg) animate-pulse" style={{ minHeight: 240 }} />
        <div className="rounded-3xl bg-(--semi-card-bg) animate-pulse" style={{ minHeight: 240 }} />
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl bg-(--semi-card-bg) animate-pulse" style={{ minHeight: 140 }} />
        ))}
      </div>
    </div>
  );
}

// ── Decorative spark bars ────────────────────────────────────────────────────
function SparkBars({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <svg width={values.length * 10} height="28" viewBox={`0 0 ${values.length * 10} 28`} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * 26);
        return (
          <rect
            key={i}
            x={i * 10}
            y={28 - h}
            width={7}
            height={h}
            rx={3}
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

// ── Donut ring ────────────────────────────────────────────────────────────────
function DonutRing({ pct, color, size = 68, stroke = 6 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

// ── Glow orb ─────────────────────────────────────────────────────────────────
function GlowOrb({ color, bottom = -40, left = -30 }: { color: string; bottom?: number; left?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full"
      style={{ width: 160, height: 160, background: color, opacity: 0.14, filter: "blur(52px)", bottom, left }}
    />
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FinancialOverviewCards({ summary, loading }: Props) {
  if (loading || !summary) return <BentoSkeleton />;

  const total = summary.yearlyRevenue;
  const safe = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const monthlyPct = safe(summary.monthlyRevenue);
  const todayPct   = safe(summary.todayRevenue);
  const clinicPct  = safe(summary.clinicProfit);
  const doctorPct  = safe(summary.doctorsTotalEarnings);
  const hasPending = summary.pendingPayments > 0;

  // Decorative spark data (proportional to yearly)
  const sparkValues = [40, 55, 30, 70, 60, 85, 90, 75, 95, 100].map((v) =>
    Math.round((v / 100) * (total || 1))
  );

  return (
    <div className="flex flex-col gap-3" dir="rtl">

      {/* ══════════════════════════════════════════════════
          ROW 1  — 3 cards: Hero (5fr) | Month (4fr) | Today (3fr)
      ══════════════════════════════════════════════════ */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "5fr 4fr 3fr" }}
      >
        {/* ── HERO: إجمالي السنة ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default"
          style={{
            background: "linear-gradient(135deg, #0f2e6e 0%, #1a4fa8 52%, #2563eb 100%)",
            boxShadow: "0 12px 48px rgba(31,111,235,0.38)",
            minHeight: 240,
            animation: "fadeUp 0.5s ease both",
          }}
        >
          <GlowOrb color="#60a5fa" bottom={-30} left={-20} />
          {/* Grid pattern overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              opacity: 0.05,
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 28px,#fff 28px,#fff 29px)," +
                "repeating-linear-gradient(90deg,transparent,transparent 28px,#fff 28px,#fff 29px)",
            }}
          />
          {/* Live badge */}
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/15 text-white/90 backdrop-blur-sm border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              السنة الحالية
            </span>
          </div>
          {/* Main content */}
          <div className="relative z-10 flex flex-col h-full p-6 gap-4 justify-between" style={{ minHeight: 240 }}>
            <div className="mt-6">
              <p className="text-white/55 text-[11px] font-semibold tracking-widest uppercase mb-2">
                إجمالي الإيرادات
              </p>
              <p className="text-4xl lg:text-5xl font-black text-white leading-none tracking-tight">
                {formatCurrencyCompact(summary.yearlyRevenue)}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {formatCurrency(summary.yearlyRevenue)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Sparkline */}
              <div className="flex items-end gap-2">
                <SparkBars color="#93c5fd" values={sparkValues} />
                <span className="text-white/40 text-[10px] pb-0.5">تطور الإيرادات</span>
              </div>
              {/* Glass sub-stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2.5">
                  <p className="text-white/50 text-[10px] mb-0.5">هذا الشهر</p>
                  <p className="text-white font-bold text-sm leading-none">{formatCurrencyCompact(summary.monthlyRevenue)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2.5">
                  <p className="text-white/50 text-[10px] mb-0.5">اليوم</p>
                  <p className="text-white font-bold text-sm leading-none">{formatCurrencyCompact(summary.todayRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-300" />
        </div>

        {/* ── CARD 2: إيرادات الشهر ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default"
          style={{
            background: "linear-gradient(135deg, #052e16 0%, #064e3b 55%, #065f46 100%)",
            boxShadow: "0 12px 40px rgba(16,185,129,0.28)",
            minHeight: 240,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "80ms",
          }}
        >
          <GlowOrb color="#34d399" bottom={-20} left={-10} />
          <div className="relative z-10 flex flex-col justify-between h-full p-6" style={{ minHeight: 240 }}>
            {/* Top */}
            <div>
              <p className="text-white/55 text-[11px] font-semibold tracking-widest uppercase mb-4">
                إيرادات الشهر
              </p>
              <p className="text-3xl lg:text-4xl font-black text-white leading-none">
                {formatCurrencyCompact(summary.monthlyRevenue)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <TrendingUp size={12} className="text-emerald-300" />
                <span className="text-emerald-300 text-[11px] font-semibold">{monthlyPct}% من السنوي</span>
              </div>
            </div>
            {/* Donut + label */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-white/40 text-[10px] mb-1">نسبة الإنجاز السنوي</p>
                <div className="h-1.5 w-28 rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                    style={{ width: `${monthlyPct}%` }}
                  />
                </div>
              </div>
              <div className="relative shrink-0">
                <DonutRing pct={monthlyPct} color="#34d399" size={70} stroke={6} />
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                  {monthlyPct}%
                </span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-300" />
        </div>

        {/* ── CARD 3: إيرادات اليوم ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)",
            boxShadow: "0 12px 40px rgba(99,102,241,0.3)",
            minHeight: 240,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "140ms",
          }}
        >
          <GlowOrb color="#a5b4fc" bottom={-20} left={-10} />
          <div className="relative z-10 flex flex-col justify-between h-full p-5" style={{ minHeight: 240 }}>
            {/* Icon */}
            <div className="flex items-start justify-between">
              <p className="text-white/55 text-[11px] font-semibold tracking-widest uppercase">اليوم</p>
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <ArrowUpRight size={15} className="text-white" />
              </div>
            </div>
            {/* Value */}
            <div>
              <p className="text-3xl font-black text-white leading-none">
                {formatCurrencyCompact(summary.todayRevenue)}
              </p>
              <p className="text-white/40 text-[10px] mt-1">
                {formatCurrency(summary.todayRevenue)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {todayPct >= 5
                  ? <TrendingUp size={11} className="text-violet-300" />
                  : <TrendingDown size={11} className="text-violet-400" />
                }
                <span className="text-violet-200/80 text-[10px]">{todayPct}% من السنوي</span>
              </div>
            </div>
            {/* Mini donut */}
            <div className="flex justify-center">
              <div className="relative">
                <DonutRing pct={todayPct} color="#a5b4fc" size={60} stroke={5} />
                <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-bold">
                  {todayPct}%
                </span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-300" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 2  — 3 equal cards: Clinic | Doctors | Pending
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">

        {/* ── CARD 4: ربح العيادة ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default border border-(--card-border)"
          style={{
            background: "var(--card-bg)",
            boxShadow: "var(--shadow-soft)",
            minHeight: 148,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "180ms",
          }}
        >
          {/* Right accent strip */}
          <div className="absolute inset-y-0 right-0 w-1 rounded-r-3xl bg-gradient-to-b from-teal-400 to-teal-600" />
          <div className="relative z-10 flex flex-col justify-between h-full p-5 pr-6" style={{ minHeight: 148 }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-(--text-secondary)">ربح العيادة</p>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xl" style={{ background: "rgba(20,184,166,0.1)" }}>
                🏥
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-teal-500 leading-none">
                {formatCurrencyCompact(summary.clinicProfit)}
              </p>
              <ProgressBar pct={clinicPct} color="#14b8a6" />
              <p className="text-[10px] text-(--text-secondary)">{clinicPct}% من الإجمالي</p>
            </div>
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" style={{ background: "var(--hover-bg)" }} />
        </div>

        {/* ── CARD 5: أرباح الأطباء ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default border border-(--card-border)"
          style={{
            background: "var(--card-bg)",
            boxShadow: "var(--shadow-soft)",
            minHeight: 148,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "220ms",
          }}
        >
          <div className="absolute inset-y-0 right-0 w-1 rounded-r-3xl bg-gradient-to-b from-amber-400 to-amber-600" />
          <div className="relative z-10 flex flex-col justify-between h-full p-5 pr-6" style={{ minHeight: 148 }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-(--text-secondary)">أرباح الأطباء</p>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xl" style={{ background: "rgba(245,158,11,0.1)" }}>
                👨‍⚕️
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-amber-500 leading-none">
                {formatCurrencyCompact(summary.doctorsTotalEarnings)}
              </p>
              <ProgressBar pct={doctorPct} color="#f59e0b" />
              <p className="text-[10px] text-(--text-secondary)">{doctorPct}% من الإجمالي</p>
            </div>
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" style={{ background: "var(--hover-bg)" }} />
        </div>

        {/* ── CARD 6: مدفوعات معلقة ── */}
        <div
          className="relative rounded-3xl overflow-hidden group cursor-default"
          style={{
            background: hasPending
              ? "linear-gradient(135deg, #3f0015 0%, #7f1d1d 55%, #991b1b 100%)"
              : "var(--card-bg)",
            boxShadow: hasPending ? "0 10px 36px rgba(239,68,68,0.28)" : "var(--shadow-soft)",
            border: hasPending ? "none" : "1px solid var(--card-border)",
            minHeight: 148,
            animation: "fadeUp 0.5s ease both",
            animationDelay: "260ms",
          }}
        >
          {hasPending && <GlowOrb color="#fca5a5" bottom={-20} left={-10} />}

          {/* Alert pill */}
          {hasPending && (
            <div className="absolute top-3.5 left-4 z-10 flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-0.5">
              <AlertCircle size={10} className="text-rose-200 animate-pulse" />
              <span className="text-[9px] text-rose-200 font-bold">يحتاج دفع</span>
            </div>
          )}

          <div className="relative z-10 flex flex-col justify-between h-full p-5" style={{ minHeight: 148 }}>
            <div className="flex items-start justify-between">
              <p
                className="text-xs font-semibold"
                style={{ color: hasPending ? "rgba(255,255,255,0.55)" : "var(--text-secondary)" }}
              >
                مدفوعات معلقة
              </p>
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: hasPending ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.08)" }}
              >
                ⏳
              </div>
            </div>
            <div className="space-y-1.5">
              <p
                className="text-2xl font-black leading-none"
                style={{ color: hasPending ? "#fff" : "#ef4444" }}
              >
                {formatCurrencyCompact(summary.pendingPayments)}
              </p>
              <p
                className="text-[10px] leading-snug"
                style={{ color: hasPending ? "rgba(255,255,255,0.45)" : "var(--text-secondary)" }}
              >
                {hasPending
                  ? "يتطلب إجراء — راجع جدول الأطباء"
                  : "✓ لا توجد مدفوعات معلقة"}
              </p>
            </div>
          </div>
          {!hasPending && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" style={{ background: "var(--hover-bg)" }} />
          )}
          {hasPending && (
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-300 rounded-3xl" />
          )}
        </div>

      </div>
    </div>
  );
}
