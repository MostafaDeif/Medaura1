import { NextRequest, NextResponse } from "next/server";
import { staffService } from "@/lib/api/staff";

export async function GET(request: NextRequest) {
  try {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    const staffId = segments[segments.length - 2];

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "Missing staff ID" },
        { status: 400 }
      );
    }

    const response = await staffService.getProfile(staffId);
    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Get staff profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch staff profile" },
      { status: error.status || 500 }
    );
  }
}
