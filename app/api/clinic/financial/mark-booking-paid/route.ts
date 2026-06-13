import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import fs from "fs";
import path from "path";
import type { AppointmentPaymentStore } from "@/app/clinicDash/financial/lib/types";

const APPT_DATA_FILE = path.join(process.cwd(), "data", "appointment-payments.json");

function readStore(): AppointmentPaymentStore {
  try {
    if (!fs.existsSync(APPT_DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(APPT_DATA_FILE, "utf-8")) as AppointmentPaymentStore;
  } catch {
    return {};
  }
}

function writeStore(data: AppointmentPaymentStore) {
  const dir = path.dirname(APPT_DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(APPT_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * PATCH /api/clinic/financial/mark-booking-paid
 *
 * Marks a single appointment as paid or cancelled.
 * Body: { booking_id: string | number, status: "paid" | "cancelled" | "pending" }
 *
 * - "paid"      → store booking_id = "paid" (counts toward revenue)
 * - "cancelled" → store booking_id = "cancelled" (excluded from revenue)
 * - "pending"   → remove from store (reverts to default pending/auto-cancel logic)
 */
export async function PATCH(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { booking_id?: string | number; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.booking_id || !body.status) {
    return NextResponse.json(
      { success: false, error: "booking_id and status are required" },
      { status: 400 }
    );
  }

  const validStatuses = ["paid", "cancelled", "pending"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { success: false, error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const store = readStore();
  const key = String(body.booking_id);

  if (body.status === "pending") {
    // Revert to default — remove explicit record so auto-logic applies
    delete store[key];
  } else {
    store[key] = {
      status: body.status as "paid" | "cancelled",
      date: new Date().toISOString().slice(0, 10),
    };
  }

  writeStore(store);

  return NextResponse.json({
    success: true,
    data: { booking_id: body.booking_id, status: body.status },
  });
}
