import { NextRequest, NextResponse } from "next/server";
import { staffService } from "@/lib/api/staff";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : 500;
}

// PATCH /api/staff/[id]/unverify
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized – please log in" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const staffId = id;

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "Invalid staff ID" },
        { status: 400 }
      );
    }

    const data = await staffService.unverify(staffId, auth.token);
    const res = NextResponse.json({ success: true, data });
    return applyAuthCookies(res, auth);
  } catch (error: unknown) {
    console.error("Unverify staff error:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Failed to unverify staff") },
      { status: getErrorStatus(error) }
    );
  }
}
