import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";
import type { DoctorSignupProfile, SignupRequest, StaffSignupProfile } from "@/lib/types/api";

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupRequest;

    // Validate required fields
    if (!body.email || !body.password || !body.user_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: email, password, user_type",
        },
        { status: 400 }
      );
    }

    if (body.user_type === "doctor") {
      const profile = body.profile as Partial<DoctorSignupProfile> | undefined;

      if (
        !profile?.full_name ||
        !profile.specialist ||
        !profile.work_days ||
        !profile.work_from ||
        !profile.work_to ||
        profile.consultation_price === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing required doctor profile fields: full_name, specialist, work_days, work_from, work_to, consultation_price",
          },
          { status: 400 }
        );
      }
    }

    if (body.user_type === "staff") {
      const profile = body.profile as Partial<StaffSignupProfile> | undefined;

      if (
        !profile?.full_name ||
        !profile?.name ||
        !profile?.role_title ||
        !profile?.specialist ||
        !profile?.work_days ||
        !profile?.work_from ||
        !profile?.work_to ||
        profile.consultation_price === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing required staff profile fields: full_name, name, role_title, specialist, work_days, work_from, work_to, consultation_price",
          },
          { status: 400 }
        );
      }
    }

    // Get raw response to capture Set-Cookie headers from backend
    const backendResponse = await apiClient.getRawResponse(
      "/api/auth/signup",
      "POST",
      body
    );

    // Parse response data
    const responseData = await backendResponse.json();

    // Handle errors
    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: responseData.message || responseData.error || "Signup failed",
        },
        { status: backendResponse.status }
      );
    }

    const res = NextResponse.json(
      { success: true, data: responseData },
      { status: 201 }
    );

    // Extract Set-Cookie headers from backend response and forward them
    const setCookieHeader = backendResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookies = backendResponse.headers.getSetCookie?.() || [];
      cookies.forEach((cookie) => {
        res.headers.append("set-cookie", cookie);
      });
    }

    // Also set cookies from response data as fallback
    if (responseData.access_token || responseData.token) {
      const token = responseData.access_token || responseData.token;
      if (token) {
        res.cookies.set("jwt", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });
      }
    }

    if (responseData.refresh_token || responseData.refreshToken) {
      const refreshToken = responseData.refresh_token || responseData.refreshToken;
      if (refreshToken) {
        res.cookies.set("refresh_token", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: "/",
        });
      }
    }

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Signup failed";
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    console.error("Signup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
