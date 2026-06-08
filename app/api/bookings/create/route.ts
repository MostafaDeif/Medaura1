import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/api/bookings";
import type { BookingRequest } from "@/lib/types/api";
import { bookingEventBus } from "@/lib/booking-events";

function getStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: number }).status)
    : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// POST /api/bookings/create
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing authorization token",
        },
        { status: 401 }
      );
    }

    const rawBody = await request.json();
    const body = {
      ...rawBody,
      staff_id: rawBody.staff_id || rawBody.doctor_id,
      booking_from: rawBody.booking_from || rawBody.booking_time,
    } as BookingRequest;

    if (!body.staff_id || !body.booking_date || !body.booking_from) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: staff_id, booking_date, booking_from",
        },
        { status: 400 }
      );
    }

    const response = await bookingService.create(body, token);

    // Broadcast the new booking to all connected clinic dashboard subscribers
    bookingEventBus.emit({
      clinic_id: (response as any)?.clinic_id ?? null,
      doctor_id: body.staff_id ?? body.doctor_id ?? null,
      patient_name: (response as any)?.patient_name ?? null,
      booking_date: body.booking_date ?? null,
      booking_from: body.booking_from ?? null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to create booking"),
      },
      { status: getStatus(error) || 500 }
    );
  }
}
