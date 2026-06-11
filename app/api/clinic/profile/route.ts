import { NextRequest, NextResponse } from "next/server";
import { clinicService } from "@/lib/api/clinic";

// GET /api/clinic/profile?id=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("id");

    if (!clinicId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing clinic ID parameter",
        },
        { status: 400 }
      );
    }

    const numericId = clinicId;
    const response = await clinicService.getProfile(numericId);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error("Get clinic profile error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch clinic profile",
      },
      { status: error.status || 500 }
    );
  }
}
