import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/api/admin";
import { getServerAccessToken, applyAuthCookies } from "@/lib/api/server-auth";

type ClinicAction = "approve" | "reject" | "unverify";

function getClinicAction(action: string | null): ClinicAction | null {
  if (action === "approve" || action === "reject" || action === "unverify") {
    return action;
  }

  return null;
}

function getClinicId(request: NextRequest) {
  const id =
    request.nextUrl.searchParams.get("clinic_id") ??
    request.nextUrl.searchParams.get("id");
  const clinicId = Number(id);

  return Number.isInteger(clinicId) && clinicId > 0 ? clinicId : null;
}

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

// GET /api/admin/clinics
export async function GET(request: NextRequest) {
  const auth = await getServerAccessToken(request);

  if (!auth.token) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const response = await adminService.listClinics(auth.token);

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: unknown) {
    console.error("List clinics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to fetch clinics"),
      },
      { status: getErrorStatus(error) }
    );
  }
}

// PATCH /api/admin/clinics?clinic_id=1&action=approve
export async function PATCH(request: NextRequest) {
  const auth = await getServerAccessToken(request);

  if (!auth.token) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const clinicId = getClinicId(request);
  const action = getClinicAction(request.nextUrl.searchParams.get("action"));

  if (!clinicId) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing clinic ID" },
      { status: 400 }
    );
  }

  if (!action) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing clinic action" },
      { status: 400 }
    );
  }

  try {
    const response =
      action === "approve"
        ? await adminService.approveClinic(clinicId, auth.token)
        : action === "reject"
          ? await adminService.rejectClinic(clinicId, auth.token)
          : await adminService.unverifyClinic(clinicId, auth.token);

    return applyAuthCookies(
      NextResponse.json({ success: true, data: response }),
      auth
    );
  } catch (error: unknown) {
    console.error("Update clinic status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to update clinic status"),
      },
      { status: getErrorStatus(error) }
    );
  }
}
