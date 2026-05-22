import { NextRequest, NextResponse } from "next/server";
import { clinicService } from "@/lib/api/clinic";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";

// GET /api/clinic/my-stats
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized – please log in" },
        { status: 401 }
      );
    }

    const data = await clinicService.getMyStats(auth.token);
    const res = NextResponse.json({ success: true, data });
    return applyAuthCookies(res, auth);
  } catch (error: any) {
    console.error("Get clinic my-stats error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch clinic statistics" },
      { status: error.status || 500 }
    );
  }
}
