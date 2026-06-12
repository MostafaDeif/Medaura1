import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";
import { apiClient } from "@/lib/api/client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as any).status === "number"
    ? (error as any).status
    : 500;
}

// POST /api/book/provider
// Used by doctors and staff to create bookings for patients
export async function POST(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patient_name, booking_date, booking_from } = body;

    if (!patient_name || !booking_date || !booking_from) {
      return NextResponse.json(
        {
          success: false,
          error: "اسم المريض وتاريخ الحجز ووقت البداية مطلوبة",
        },
        { status: 400 }
      );
    }

    let response: any;
    try {
      response = await apiClient.post("/api/book/provider", body, {
        token: auth.token,
      });
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 401) throw error;
      auth = await getServerAccessToken(request, { forceRefresh: true });
      if (!auth.token) throw error;
      response = await apiClient.post("/api/book/provider", body, {
        token: auth.token,
      });
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }, { status: 201 }),
      auth
    );
  } catch (error: unknown) {
    console.error("Provider booking error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "فشل إنشاء الحجز"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
