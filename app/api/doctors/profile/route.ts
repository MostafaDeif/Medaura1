import { NextRequest, NextResponse } from "next/server";
import { doctorService } from "@/lib/api/doctors";

// GET /api/doctors/profile?id=2
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("id");

    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing doctor ID parameter",
        },
        { status: 400 }
      );
    }

    const numericId = doctorId;
    const response = await doctorService.getProfile(numericId);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error("Get doctor profile error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch doctor profile",
      },
      { status: error.status || 500 }
    );
  }
}
