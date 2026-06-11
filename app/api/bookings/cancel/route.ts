import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/lib/api/bookings";
import { applyAuthCookies, getServerAccessToken } from "@/lib/api/server-auth";

function getStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: number }).status)
    : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// POST /api/bookings/cancel?id=17
export async function POST(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);
    let token = auth.token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("id");

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing booking ID parameter",
        },
        { status: 400 }
      );
    }

    let response;
    try {
      response = await bookingService.cancelBooking(bookingId, token);
    } catch (error: unknown) {
      if (getStatus(error) !== 401) throw error;
      auth = await getServerAccessToken(request, { forceRefresh: true });
      token = auth.token;
      if (!token) throw error;
      response = await bookingService.cancelBooking(bookingId, token);
    }

    const nextResponse = NextResponse.json({ success: true, data: response });
    return applyAuthCookies(nextResponse, auth);
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to cancel booking"),
      },
      { status: getStatus(error) || 500 }
    );
  }
}
