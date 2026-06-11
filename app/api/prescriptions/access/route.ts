import { NextRequest, NextResponse } from "next/server";
import { prescriptionService } from "@/lib/api/prescriptions";

// POST /api/prescriptions/access?booking_id=3
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

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing booking ID parameter",
        },
        { status: 400 }
      );
    }

    const response = await prescriptionService.requestAccess(
      bookingId,
      token
    );

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Request prescription access error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to request access",
      },
      { status: error.status || 500 }
    );
  }
}

// GET /api/prescriptions/access?booking_id=3
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
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing booking ID parameter",
        },
        { status: 400 }
      );
    }

    const response = await prescriptionService.getAccessInfo(
      bookingId,
      token
    );

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Get prescription access error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch access info",
      },
      { status: error.status || 500 }
    );
  }
}
