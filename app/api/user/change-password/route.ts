import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";
import { apiClient } from "@/lib/api/client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as any).status === "number"
    ? (error as any).status
    : 500;
}

// PATCH /api/user/change-password
export async function PATCH(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { current_password, new_password, confirm_password } = body;

    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { success: false, error: "جميع حقول كلمة المرور مطلوبة" },
        { status: 400 }
      );
    }

    let response: any;
    try {
      response = await apiClient.patch("/api/user/change-password", body, {
        token: auth.token,
      });
    } catch (error: unknown) {
      if (getErrorStatus(error) !== 401) throw error;
      auth = await getServerAccessToken(request, { forceRefresh: true });
      if (!auth.token) throw error;
      response = await apiClient.patch("/api/user/change-password", body, {
        token: auth.token,
      });
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: unknown) {
    console.error("Change password error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "فشل تغيير كلمة المرور"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
