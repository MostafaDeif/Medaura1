import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import { bookingEventBus } from "@/lib/booking-events";
import { bookingService } from "@/lib/api/bookings";

/**
 * GET /api/clinic/bookings-stream
 *
 * Server-Sent Events endpoint for the Clinic Dashboard.
 *
 * Events sent:
 *   connected   – initial handshake
 *   stats_sync  – { total_bookings: number } fetched from GET /api/book/clinic-bookings
 *                 sent immediately on connect, then every 10 s
 *   new_booking – pushed whenever a patient books (via bookingEventBus)
 *   ping        – comment-only keep-alive every 25 s
 */
export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized – please log in" },
      { status: 401 }
    );
  }
  const token = auth.token;

  const { searchParams } = new URL(request.url);
  const clinicIdParam = searchParams.get("clinic_id");
  const clinicId = clinicIdParam ? clinicIdParam : undefined;

  // ── Fetch authoritative booking count from the real endpoint ─────────────────
  const fetchTotalBookings = async (): Promise<number> => {
    try {
      const bookings = await bookingService.getClinicBookings(token, clinicId);
      return Array.isArray(bookings) ? bookings.length : 0;
    } catch (err) {
      console.error("[SSE] fetchTotalBookings error:", err);
      return -1; // -1 = error, don't overwrite client value
    }
  };

  // ── SSE stream ───────────────────────────────────────────────────────────────
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        } catch {
          closed = true;
        }
      };

      // 1. Initial handshake
      send("connected", { message: "متصل" });

      // 2. Immediate stats sync on connect
      const initial = await fetchTotalBookings();
      if (initial >= 0) {
        send("stats_sync", { total_bookings: initial });
        console.log(`[SSE] initial stats_sync → ${initial} bookings`);
      }

      // 3. Subscribe to live push events (best-effort)
      unsubscribe = bookingEventBus.subscribe(async (bookingEvent) => {
        send("new_booking", bookingEvent);
        // Re-fetch the real count and push it right after the push event
        const count = await fetchTotalBookings();
        if (count >= 0) {
          send("stats_sync", { total_bookings: count });
          console.log(`[SSE] post-event stats_sync → ${count} bookings`);
        }
      }, clinicId);

      // 4. Periodic sync every 10 s (guarantees freshness without relying on events)
      const syncInterval = setInterval(async () => {
        const count = await fetchTotalBookings();
        if (count >= 0) {
          send("stats_sync", { total_bookings: count });
        }
      }, 10_000);

      // 5. Keep-alive ping every 25 s
      const pingInterval = setInterval(() => {
        if (closed) {
          clearInterval(pingInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
          clearInterval(pingInterval);
        }
      }, 25_000);

      // 6. Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(syncInterval);
        clearInterval(pingInterval);
        unsubscribe?.();
        unsubscribe = null;
        try { controller.close(); } catch { /* already closed */ }
        console.log("[SSE] client disconnected");
      });
    },

    cancel() {
      unsubscribe?.();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
