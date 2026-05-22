import { NextRequest, NextResponse } from "next/server";
import { staffService } from "@/lib/api/staff";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";

// GET /api/staff/my-clinic
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized – please log in" },
        { status: 401 }
      );
    }

    const data = await staffService.getMyClinic(auth.token);
    const res = NextResponse.json({ success: true, data });
    return applyAuthCookies(res, auth);
  } catch (error: any) {
    console.error("Get staff clinic error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch clinic staff" },
      { status: error.status || 500 }
    );
  }
}
