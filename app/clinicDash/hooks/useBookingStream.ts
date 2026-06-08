"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type LiveBookingEvent = {
  clinic_id?: number | null;
  doctor_id?: number | null;
  patient_name?: string | null;
  booking_date?: string | null;
  booking_from?: string | null;
  timestamp: string;
};

export type UseBookingStreamResult = {
  /** Number of new bookings received since the last reset */
  newBookingsCount: number;
  /** The most recently received booking event */
  lastBooking: LiveBookingEvent | null;
  /** Whether the SSE connection is open */
  connected: boolean;
  /** Reset the new-bookings counter */
  resetCount: () => void;
  /**
   * Authoritative total_bookings from the backend (sent via stats_sync events).
   * null means not yet received.
   */
  syncedTotalBookings: number | null;
};

/**
 * Subscribes to /api/clinic/bookings-stream (SSE) and tracks:
 *  - new live booking events  (new_booking)
 *  - authoritative count syncs (stats_sync)
 */
export function useBookingStream(clinicId?: number): UseBookingStreamResult {
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [lastBooking, setLastBooking] = useState<LiveBookingEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [syncedTotalBookings, setSyncedTotalBookings] = useState<number | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1_000);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = clinicId
      ? `/api/clinic/bookings-stream?clinic_id=${clinicId}`
      : "/api/clinic/bookings-stream";

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    // Connection established
    es.addEventListener("connected", () => {
      setConnected(true);
      retryDelay.current = 1_000;
      console.log("[useBookingStream] connected");
    });

    // Live booking push event
    es.addEventListener("new_booking", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveBookingEvent;
        console.log("[useBookingStream] new_booking received", data);
        setLastBooking(data);
        setNewBookingsCount((n) => n + 1);
        // Also increment synced total so the card value updates immediately
        setSyncedTotalBookings((prev) => (prev !== null ? prev + 1 : null));
      } catch {
        // Malformed event — ignore
      }
    });

    // Periodic authoritative count from the backend
    es.addEventListener("stats_sync", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { total_bookings?: number };
        if (typeof data.total_bookings === "number") {
          console.log("[useBookingStream] stats_sync", data.total_bookings);
          setSyncedTotalBookings(data.total_bookings);
        }
      } catch {
        // Malformed event — ignore
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;

      // Exponential back-off reconnection
      const delay = Math.min(retryDelay.current, 30_000);
      retryDelay.current = delay * 2;
      console.log(`[useBookingStream] connection lost — retrying in ${delay}ms`);
      retryRef.current = setTimeout(connect, delay);
    };
  }, [clinicId]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  const resetCount = useCallback(() => {
    setNewBookingsCount(0);
  }, []);

  return { newBookingsCount, lastBooking, connected, resetCount, syncedTotalBookings };
}
