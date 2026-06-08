import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "profit-sharing.json");

type ProfitSharingRecord = {
  doctorPercentage: number;
  paid: string[];
};
type ProfitSharingStore = Record<string, ProfitSharingRecord>;

function readStore(): ProfitSharingStore {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ProfitSharingStore;
  } catch { return {}; }
}
function writeStore(data: ProfitSharingStore) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// PATCH /api/clinic/financial/mark-paid
// Body: { doctor_id: number, period: string ("2025-06"), paid: boolean }
export async function PATCH(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { doctor_id?: number; period?: string; paid?: boolean };
  if (!body.doctor_id || !body.period) {
    return NextResponse.json({ success: false, error: "doctor_id and period required" }, { status: 400 });
  }

  const store = readStore();
  const existing = store[String(body.doctor_id)] ?? { doctorPercentage: 70, paid: [] };
  const paidSet = new Set(existing.paid);

  if (body.paid) {
    paidSet.add(body.period);
  } else {
    paidSet.delete(body.period);
  }

  store[String(body.doctor_id)] = { ...existing, paid: Array.from(paidSet) };
  writeStore(store);

  return NextResponse.json({ success: true, data: store[String(body.doctor_id)] });
}
