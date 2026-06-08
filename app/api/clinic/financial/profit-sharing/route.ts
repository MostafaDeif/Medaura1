import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/api/server-auth";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "profit-sharing.json");

type ProfitSharingRecord = {
  doctorPercentage: number;
  paid: string[]; // array of month keys like "2025-06"
};

type ProfitSharingStore = Record<string, ProfitSharingRecord>;

function readStore(): ProfitSharingStore {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ProfitSharingStore;
  } catch {
    return {};
  }
}

function writeStore(data: ProfitSharingStore): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getRecord(doctorId: number | string, store: ProfitSharingStore): ProfitSharingRecord {
  return store[String(doctorId)] ?? { doctorPercentage: 70, paid: [] };
}

// GET /api/clinic/financial/profit-sharing?doctor_ids=1,2,3
export async function GET(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const store = readStore();
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("doctor_ids");

  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim());
    const result: ProfitSharingStore = {};
    for (const id of ids) {
      result[id] = getRecord(id, store);
    }
    return NextResponse.json({ success: true, data: result });
  }

  return NextResponse.json({ success: true, data: store });
}

// PUT /api/clinic/financial/profit-sharing
// Body: { doctor_id: number, doctorPercentage: number }
export async function PUT(request: NextRequest) {
  const auth = await getServerAccessToken(request);
  if (!auth.token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { doctor_id?: number; doctorPercentage?: number };
  if (body.doctor_id === undefined || body.doctorPercentage === undefined) {
    return NextResponse.json({ success: false, error: "doctor_id and doctorPercentage required" }, { status: 400 });
  }

  const pct = Number(body.doctorPercentage);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    return NextResponse.json({ success: false, error: "doctorPercentage must be 0-100" }, { status: 400 });
  }

  const store = readStore();
  const existing = getRecord(body.doctor_id, store);
  store[String(body.doctor_id)] = { ...existing, doctorPercentage: pct };
  writeStore(store);

  return NextResponse.json({ success: true, data: store[String(body.doctor_id)] });
}
