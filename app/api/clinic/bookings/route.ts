import { NextRequest, NextResponse } from "next/server";
import { clinicService } from "@/lib/api/clinic";
import { bookingEventBus } from "@/lib/booking-events";

// GET /api/clinic/bookings?clinic_id=1
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");

    const response = await clinicService.getBookings(
      token,
      clinicId ? parseInt(clinicId) : undefined
    );

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Get clinic bookings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch clinic bookings",
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/clinic/bookings
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

    const body = await request.json();

    if (!body.doctor_id || !body.booking_date || !body.booking_from) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required booking fields: doctor_id, booking_date, booking_from",
        },
        { status: 400 }
      );
    }

    const response = await clinicService.createBooking(body, token);

    // Broadcast the new booking to all connected clinic dashboard SSE subscribers
    bookingEventBus.emit({
      clinic_id: (response as any)?.clinic_id ?? null,
      doctor_id: body.doctor_id ?? null,
      patient_name: (response as any)?.patient_name ?? null,
      booking_date: body.booking_date ?? null,
      booking_from: body.booking_from ?? null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: response }, { status: 201 });
  } catch (error: any) {
    console.error("Create clinic booking error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create clinic booking",
      },
      { status: error.status || 500 }
    );
  }
}
