import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/api/bookings";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");

    const response = await bookingService.getClinicBookings(
      token,
      clinicId ? clinicId : undefined
    );
    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Get clinic bookings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch clinic bookings" },
      { status: error.status || 500 }
    );
  }
}
