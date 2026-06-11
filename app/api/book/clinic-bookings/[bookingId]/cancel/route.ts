import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/api/bookings";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    const bookingId = segments[segments.length - 2];

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing booking ID" },
        { status: 400 }
      );
    }

    const response = await bookingService.cancelClinicBooking(
      bookingId,
      token
    );

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Cancel clinic booking error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel clinic booking" },
      { status: error.status || 500 }
    );
  }
}
