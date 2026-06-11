import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/api/admin";
import { applyAuthCookies, getServerAccessToken } from "@/lib/api/server-auth";

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

function isUnauthorized(error: unknown) {
  return getErrorStatus(error) === 401;
}

export async function GET(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Forward supported filter params to the backend
    const sp = request.nextUrl.searchParams;
    const filters = {
      actor_role: sp.get("actor_role") || undefined,
      method: sp.get("method") || undefined,
      location_contains: sp.get("location_contains") || undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    };

    let logs;
    try {
      logs = await adminService.listAuditLogs(auth.token, filters);
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;

      auth = await getServerAccessToken(request, { forceRefresh: true });
      if (!auth.token) throw error;
      logs = await adminService.listAuditLogs(auth.token, filters);
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: logs }),
      auth
    );
  } catch (error: unknown) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to fetch audit logs"),
      },
      { status: getErrorStatus(error) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    try {
      await adminService.clearAuditLogs(auth.token);
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;

      auth = await getServerAccessToken(request, { forceRefresh: true });
      if (!auth.token) throw error;
      await adminService.clearAuditLogs(auth.token);
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, message: "Audit logs cleared successfully" }),
      auth
    );
  } catch (error: unknown) {
    console.error("Clear audit logs error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to clear audit logs"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
