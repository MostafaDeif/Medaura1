"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, X, Wifi, WifiOff } from "lucide-react";
import type { LiveBookingEvent } from "../../hooks/useBookingStream";

interface NewBookingToastProps {
  /** Latest booking event that just arrived */
  booking: LiveBookingEvent;
  /** Called when the toast is dismissed */
  onDismiss: () => void;
}

/**
 * Auto-dismissing toast that slides in from the bottom-right
 * when a new patient booking arrives.
 */
export function NewBookingToast({ booking, onDismiss }: NewBookingToastProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Mount → animate in
    const raf = requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 6 s
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 350); // wait for slide-out animation
    }, 6_000);

    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  const formattedTime = booking.timestamp
    ? new Date(booking.timestamp).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 left-6 z-[9999] max-w-xs w-full"
      style={{
        transform: visible ? "translateY(0)" : "translateY(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      }}
    >
      <div
        className="relative flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/90 via-slate-900/95 to-slate-900/90 backdrop-blur-md shadow-[0_8px_32px_rgba(20,184,166,0.25)] p-4 overflow-hidden"
        dir="rtl"
      >
        {/* Animated glow pulse */}
        <span className="absolute inset-0 rounded-2xl ring-1 ring-teal-500/20 animate-pulse pointer-events-none" />

        {/* Icon */}
        <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center">
          <CalendarCheck size={18} className="text-teal-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">
            حجز جديد! 🎉
          </p>
          <p className="text-xs text-teal-300 mt-0.5 leading-snug">
            {booking.patient_name
              ? `تم الحجز بواسطة ${booking.patient_name}`
              : "وصل حجز جديد للعيادة"}
            {booking.booking_date ? ` · ${booking.booking_date}` : ""}
            {booking.booking_from ? ` ${booking.booking_from}` : ""}
          </p>
          {formattedTime && (
            <p className="text-[11px] text-slate-400 mt-1">{formattedTime}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 350);
          }}
          className="shrink-0 mt-0.5 text-slate-400 hover:text-white transition-colors"
          aria-label="إغلاق الإشعار"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Connection status pill ────────────────────────────────────────────────────

interface ConnectionPillProps {
  connected: boolean;
}

/**
 * Tiny pill displayed in the page header to indicate SSE connection status.
 */
export function ConnectionPill({ connected }: ConnectionPillProps) {
  return (
    <span
      title={connected ? "متصل – يستقبل التحديثات الفورية" : "غير متصل"}
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all duration-500 ${
        connected
          ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
          : "border-slate-500/30 bg-slate-500/10 text-slate-400"
      }`}
    >
      {connected ? (
        <Wifi size={10} className="shrink-0" />
      ) : (
        <WifiOff size={10} className="shrink-0" />
      )}
      {connected ? "مباشر" : "منقطع"}
    </span>
  );
}
