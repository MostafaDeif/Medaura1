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

    const response = await adminService.verifyDoctor(userId, token);
    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify doctor";
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    const data =
      typeof error === "object" &&
      error !== null &&
      "data" in error
        ? (error as { data?: { message?: string } }).data
        : undefined;
    const serverMessage = data?.message || message;

    if (status === 400 && /already verified/i.test(serverMessage)) {
      return applyAuthCookies(
        NextResponse.json({ success: true, data: { alreadyVerified: true } }),
        auth
      );
    }

    console.error("Verify admin doctor error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
