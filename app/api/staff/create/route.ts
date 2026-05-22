import { NextRequest, NextResponse } from "next/server";
import { staffService } from "@/lib/api/staff";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";

// POST /api/staff/create
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized – please log in" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.email || !body.password || !body.full_name || !body.role_title) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: email, password, full_name, role_title",
        },
        { status: 400 }
      );
    }

    const data = await staffService.createStaff(body, auth.token);
    const res = NextResponse.json({ success: true, data }, { status: 201 });
    return applyAuthCookies(res, auth);
  } catch (error: any) {
    console.error("Create staff error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create staff" },
      { status: error.status || 500 }
    );
  }
}
