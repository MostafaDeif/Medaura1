import { NextRequest, NextResponse } from "next/server";
import { ratingService } from "@/lib/api/ratings";
import type { RatingRequest } from "@/lib/types/api";
import { applyAuthCookies, getServerAccessToken } from "@/lib/api/server-auth";

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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// POST /api/ratings/staff?id=1
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let auth = await getServerAccessToken(request);
    let token = auth.token || authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing authorization token",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("id");

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing staff ID parameter",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as RatingRequest;

    if (!body.rating) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: rating",
        },
        { status: 400 },
      );
    }

    let response;
    try {
      response = await ratingService.rateStaff(
        parseInt(staffId),
        body,
        token,
      );
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;

      auth = await getServerAccessToken(request, { forceRefresh: true });
      token = auth.token || authHeader?.replace("Bearer ", "");

      if (!token) throw error;

      response = await ratingService.rateStaff(
        parseInt(staffId),
        body,
        token,
      );
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }, { status: 201 }),
      auth,
    );
  } catch (error: any) {
    console.error("Rate staff error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to rate staff"),
      },
      { status: getErrorStatus(error) },
    );
  }
}

// GET /api/ratings/staff?id=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("id");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing staff ID parameter",
        },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("authorization");
    let auth = await getServerAccessToken(request);
    let token = auth.token || authHeader?.replace("Bearer ", "");

    let response;

    try {
      response = await ratingService.getStaffRatings(
        parseInt(staffId),
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        token ?? undefined,
      );
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;

      auth = await getServerAccessToken(request, { forceRefresh: true });
      token = auth.token || authHeader?.replace("Bearer ", "");

      response = await ratingService.getStaffRatings(
        parseInt(staffId),
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        token ?? undefined,
      );
    }

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth,
    );
  } catch (error: any) {
    console.error("Get staff ratings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to fetch staff ratings"),
      },
      { status: getErrorStatus(error) },
    );
  }
}
