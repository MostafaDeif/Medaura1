import { NextRequest, NextResponse } from "next/server";
import { prescriptionService } from "@/lib/api/prescriptions";

export async function GET(request: NextRequest) {
  try {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    const id = segments[segments.length - 1];

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing prescription ID" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const response = await prescriptionService.getPrescriptionById(
      id,
      token
    );

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Get prescription error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescription" },
      { status: error.status || 500 }
    );
  }
}
