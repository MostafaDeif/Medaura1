import { NextRequest, NextResponse } from "next/server";
import { doctorService } from "@/lib/api/doctors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialist = searchParams.get("specialist");
    const clinicId = searchParams.get("clinic_id");
    const limit = searchParams.get("limit");

    const query = {
      specialist: specialist || undefined,
      clinic_id: clinicId ? clinicId : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    const response = await doctorService.list(query);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error("GET /api/doctors error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch doctors",
      },
      { status: error.status || 500 }
    );
  }
}
