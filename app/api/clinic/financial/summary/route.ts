import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import { bookingService } from "@/lib/api/bookings";
import { apiClient } from "@/lib/api/client";
import fs from "fs";
import path from "path";
import {
  computeSummary,
  computeMonthlyRevenue,
  computeDailyRevenue,
} from "@/app/clinicDash/financial/lib/calculations";
import type { RawBooking, RawStaffMember, ProfitSharingStore } from "@/app/clinicDash/financial/lib/types";

const DATA_FILE = path.join(process.cwd(), "data", "profit-sharing.json");

function readStore(): ProfitSharingStore {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ProfitSharingStore;
  } catch { return {}; }
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as Record<string, unknown>;
  for (const key of ["data", "staff", "bookings"]) {
    if (Array.isArray(p?.[key])) return p[key] as T[];
    const nested = (p?.[key] as Record<string, unknown>);
    if (Array.isArray(nested?.data)) return nested.data as T[];
  }
  return [];
}

export async function GET(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.token;

  try {
    const [bookingsRaw, staffRaw] = await Promise.all([
      bookingService.getClinicBookings(token),
      apiClient.get<unknown>("/api/staff/my-clinic", { token }),
    ]);

    const bookings = (Array.isArray(bookingsRaw) ? bookingsRaw : []) as RawBooking[];
    const staff = extractList<RawStaffMember>(staffRaw);
    const store = readStore();

    const summary = computeSummary(bookings, staff, store);
    const monthly = computeMonthlyRevenue(bookings, staff, 12);
    const daily = computeDailyRevenue(bookings, staff, 30);

    return NextResponse.json({
      success: true,
      data: { summary, monthly, daily },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[financial/summary]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
