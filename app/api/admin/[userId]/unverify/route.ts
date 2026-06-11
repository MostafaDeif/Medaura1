import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/api/admin";
import { applyAuthCookies, getServerAccessToken } from "@/lib/api/server-auth";

export async function PATCH(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  const token = auth.token;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing authorization token" },
      { status: 401 }
    );
  }

  try {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    const userId = segments[segments.length - 2];

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing user ID" },
        { status: 400 }
      );
    }

    const response = await adminService.unverifyDoctor(userId, token);
    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: any) {
    console.error("Unverify admin doctor error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to unverify doctor" },
      { status: error.status || 500 }
    );
  }
}
