import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

type TokenPayload = {
  token: string | null;
  refreshToken?: string;
  setCookies: string[];
};

type AuthData = {
  data?: AuthData;
  access?: string;
  access_token?: string;
  accessToken?: string;
  token?: string;
  refresh_token?: string;
  refreshToken?: string;
};

function unwrapAuthData(data: AuthData): AuthData {
  if (data?.data && typeof data.data === "object") {
    return unwrapAuthData(data.data);
  }

  return data;
}

function getAccessToken(data: AuthData) {
  const authData = unwrapAuthData(data);
  return (
    authData.access_token ||
    authData.accessToken ||
    authData.access ||
    authData.token ||
    null
  );
}

function getRefreshToken(data: AuthData) {
  const authData = unwrapAuthData(data);
  return authData.refresh_token || authData.refreshToken;
}

export async function getServerAccessToken(
  request: NextRequest,
  options: { forceRefresh?: boolean } = {}
): Promise<TokenPayload> {
  const authHeader = request.headers.get("authorization");
  const cookieToken =
    request.cookies.get("jwt")?.value ||
    request.cookies.get("access_token")?.value ||
    request.cookies.get("access")?.value ||
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("token")?.value;
  const accessToken = cookieToken || authHeader?.replace("Bearer ", "");

  if (accessToken && !options.forceRefresh) {
    return { token: accessToken, setCookies: [] };
  }

  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return { token: null, setCookies: [] };
  }

  const backendResponse = await apiClient.getRawResponse(
    "/api/auth/refresh",
    "POST",
    { refresh_token: refreshToken }
  );
  const responseData = await backendResponse.json();

  if (!backendResponse.ok) {
    return { token: null, setCookies: [] };
  }

  const setCookies = backendResponse.headers.getSetCookie?.() || [];

  return {
    token: getAccessToken(responseData),
    refreshToken: getRefreshToken(responseData),
    setCookies,
  };
}

export function applyAuthCookies(
  response: NextResponse,
  auth: TokenPayload
) {
  for (const cookie of auth.setCookies) {
    response.headers.append("set-cookie", cookie);
  }

  if (auth.token) {
    response.cookies.set("jwt", auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
  }

  if (auth.refreshToken) {
    response.cookies.set("refresh_token", auth.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  return response;
}
