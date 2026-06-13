import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import fs from "fs";
import path from "path";
import type { AppointmentPaymentStore } from "@/app/clinicDash/financial/lib/types";

const DATA_FILE = path.join(process.cwd(), "data", "appointment-payments.json");

function readStore(): AppointmentPaymentStore {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as AppointmentPaymentStore;
  } catch { return {}; }
}

function writeStore(data: AppointmentPaymentStore): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * GET /api/clinic/financial/appointment-payment
 * Returns the full appointment payment store.
 */
export async function GET(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: readStore() });
}

/**
 * PATCH /api/clinic/financial/appointment-payment
 * Body: { booking_id: string|number, status: "paid" | "cancelled" | "pending" }
 *
 * - "paid"      → patient confirmed payment
 * - "cancelled" → appointment cancelled (removed from revenue)
 * - "pending"   → reset to unconfirmed (removes from store)
 */
export async function PATCH(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    booking_id?: string | number;
    status?: "paid" | "cancelled" | "pending";
  };

  if (!body.booking_id || !body.status) {
    return NextResponse.json(
      { success: false, error: "booking_id and status are required" },
      { status: 400 }
    );
  }

  if (!["paid", "cancelled", "pending"].includes(body.status)) {
    return NextResponse.json(
      { success: false, error: "status must be 'paid', 'cancelled', or 'pending'" },
      { status: 400 }
    );
  }

  const store = readStore();
  const key   = String(body.booking_id);

  if (body.status === "pending") {
    // "pending" means "reset" → remove the key so absence = pending
    delete store[key];
  } else {
    store[key] = {
      status: body.status,
      date: new Date().toISOString().slice(0, 10),
    };
  }

  writeStore(store);
  return NextResponse.json({ success: true, data: { booking_id: key, status: body.status } });
}
