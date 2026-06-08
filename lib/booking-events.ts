/**
 * In-process event bus for broadcasting new-booking events to all SSE
 * subscribers (clinic dashboard connections).
 *
 * IMPORTANT: We attach the registry to `globalThis` so that it is truly
 * shared across all Next.js API route bundles running in the same Node.js
 * process.  Without this, each route module gets its own module-level
 * `subscribers` Set and the emit/subscribe calls never meet.
 */

export type BookingEvent = {
  clinic_id?: number | null;
  doctor_id?: number | null;
  patient_name?: string | null;
  booking_date?: string | null;
  booking_from?: string | null;
  timestamp: string;
};

type Subscriber = {
  clinic_id?: number;
  callback: (event: BookingEvent) => void;
};

// ── Global singleton ──────────────────────────────────────────────────────────
// Declare the symbol on globalThis so TypeScript is happy
declare global {
  // eslint-disable-next-line no-var
  var __bookingSubscribers: Set<Subscriber> | undefined;
}

// Reuse existing Set across hot-reloads and across different route bundles
if (!globalThis.__bookingSubscribers) {
  globalThis.__bookingSubscribers = new Set<Subscriber>();
}

const subscribers = globalThis.__bookingSubscribers;

// ── Public API ────────────────────────────────────────────────────────────────

export const bookingEventBus = {
  /**
   * Register a listener. Returns an unsubscribe function.
   */
  subscribe(callback: Subscriber["callback"], clinic_id?: number): () => void {
    const sub: Subscriber = { clinic_id, callback };
    subscribers.add(sub);
    console.log(`[BookingBus] subscriber added — total: ${subscribers.size}`);
    return () => {
      subscribers.delete(sub);
      console.log(`[BookingBus] subscriber removed — total: ${subscribers.size}`);
    };
  },

  /**
   * Emit a new-booking event to every matching subscriber.
   */
  emit(event: BookingEvent): void {
    console.log(`[BookingBus] emit → ${subscribers.size} subscriber(s)`, event);
    for (const sub of subscribers) {
      if (sub.clinic_id == null || sub.clinic_id === event.clinic_id) {
        try {
          sub.callback(event);
        } catch (err) {
          console.error("[BookingBus] subscriber callback threw:", err);
        }
      }
    }
  },

  /** Utility: how many active SSE connections are open */
  get size() {
    return subscribers.size;
  },
};
