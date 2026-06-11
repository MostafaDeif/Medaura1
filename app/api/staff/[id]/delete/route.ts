import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";
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

// DELETE /api/staff/[id]/delete
export async function DELETE(
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

    // Try candidate endpoints — backend exposes delete via admin users route
    const candidates = [
      `/api/admin/users/${staffId}/delete`,
      `/api/staff/${staffId}/delete`,
      `/api/admin/staff/${staffId}/delete`,
      `/api/admin/${staffId}/delete`,
    ];

    let lastError: unknown;
    for (const endpoint of candidates) {
      try {
        const data = await apiClient.delete<unknown>(endpoint, {
          token: auth.token,
        });
        const res = NextResponse.json({ success: true, data });
        return applyAuthCookies(res, auth);
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status: number }).status
            : 500;
        if (status !== 404 && status !== 405) throw err;
        lastError = err;
      }
    }

    throw lastError;
  } catch (error: unknown) {
    console.error("Delete staff error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to delete staff"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
