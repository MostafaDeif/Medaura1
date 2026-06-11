import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/api/notifications";
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

// POST /api/notifications/read?id=34
export async function POST(request: NextRequest) {
  try {
    let auth = await getServerAccessToken(request);

    if (!auth.token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing notification ID parameter",
        },
        { status: 400 }
      );
    }

    let response;
    try {
      response = await notificationService.markAsReadByQuery(
        notificationId,
        auth.token
      );
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;

      auth = await getServerAccessToken(request, { forceRefresh: true });
      if (!auth.token) throw error;
      response = await notificationService.markAsReadByQuery(
        notificationId,
        auth.token
      );
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: unknown) {
    console.error("Mark notification as read error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to mark notification as read"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
