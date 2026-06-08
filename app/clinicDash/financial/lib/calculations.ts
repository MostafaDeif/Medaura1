import type {
  RawBooking,
  RawStaffMember,
  DoctorFinancialRecord,
  FinancialSummary,
  DailyRevenue,
  MonthlyRevenue,
  FinancialTransaction,
  FinancialFilters,
  ProfitSharingStore,
} from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────────

export const CURRENCY = "EGP";
export const DEFAULT_DOCTOR_PCT = 70;

/** Format number as Arabic currency string */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " ج.م";
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + "م ج.م";
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1) + "ك ج.م";
  }
  return formatCurrency(amount);
}

/** Extract the numeric ID from a staff/booking record */
export function getDoctorId(member: RawStaffMember): number | null {
  const raw = member.id ?? member.staff_id ?? member.user_id;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Return today's date as "YYYY-MM-DD" */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Return current month as "YYYY-MM" */
export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Return current year as "YYYY" */
export function currentYearStr(): string {
  return String(new Date().getFullYear());
}

/** Get booking_date from a RawBooking */
function getBookingDate(b: RawBooking): string {
  return b.booking_date ?? b.created_at?.slice(0, 10) ?? "";
}

/** Check whether a booking counts as revenue-generating */
export function isCompleted(b: RawBooking): boolean {
  const s = (b.status ?? "").toLowerCase();
  // Accept "completed" or "confirmed" — adjust if backend uses different value
  return s === "completed" || s === "confirmed";
}

// ── Core Calculations ──────────────────────────────────────────────────────────

/**
 * Join bookings + staff into DoctorFinancialRecord[].
 * Applies filters if provided.
 */
export function computeDoctorRecords(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  filters?: FinancialFilters,
  period?: string // current period key for paid check e.g. "2025-06"
): DoctorFinancialRecord[] {
  // Build a lookup: doctor_id → staff member
  const staffMap = new Map<number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) staffMap.set(id, s);
  }

  // Apply date filters
  const filteredBookings = bookings.filter((b) => {
    if (!isCompleted(b)) return false;

    const date = getBookingDate(b);

    if (filters?.dateFrom && date < filters.dateFrom) return false;
    if (filters?.dateTo && date > filters.dateTo) return false;

    if (filters?.doctorId) {
      const bid = b.doctor_id ?? b.staff_id;
      if (bid !== filters.doctorId) return false;
    }

    return true;
  });

  // Aggregate per doctor
  const agg = new Map<number, { count: number; member: RawStaffMember }>();

  for (const b of filteredBookings) {
    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const member = staffMap.get(docId);
    if (!member) continue;

    if (filters?.specialist && member.specialist !== filters.specialist) continue;

    const existing = agg.get(docId);
    if (existing) {
      existing.count++;
    } else {
      agg.set(docId, { count: 1, member });
    }
  }

  // Build records
  const records: DoctorFinancialRecord[] = [];
  const now = period ?? currentMonthStr();

  for (const [docId, { count, member }] of agg) {
    const config = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const fee = member.consultation_price ?? 0;
    const total = fee * count;
    const docPct = config.doctorPercentage;
    const clinicPct = 100 - docPct;
    const docShare = (total * docPct) / 100;
    const clinicShare = (total * clinicPct) / 100;

    records.push({
      doctorId: docId,
      doctorName: member.full_name,
      specialist: member.specialist ?? "—",
      consultationFee: fee,
      completedAppointments: count,
      totalRevenue: total,
      doctorPercentage: docPct,
      clinicPercentage: clinicPct,
      doctorShare: docShare,
      clinicShare: clinicShare,
      paymentStatus: config.paid.includes(now) ? "paid" : "pending",
    });
  }

  // Sort by total revenue descending
  return records.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Compute the six financial summary KPIs.
 */
export function computeSummary(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore
): FinancialSummary {
  const today = todayStr();
  const monthStr = currentMonthStr();
  const yearStr = currentYearStr();

  const staffMap = new Map<number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) staffMap.set(id, s);
  }

  let todayRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;
  let clinicProfit = 0;
  let doctorsTotalEarnings = 0;
  let pendingPayments = 0;

  for (const b of bookings) {
    if (!isCompleted(b)) continue;

    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;

    const member = staffMap.get(docId);
    const fee = member?.consultation_price ?? 0;
    if (fee === 0) continue;

    const date = getBookingDate(b);
    const config = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const docPct = config.doctorPercentage;
    const clinicPct = 100 - docPct;
    const docShare = (fee * docPct) / 100;
    const clinicShare = (fee * clinicPct) / 100;
    const period = date.slice(0, 7); // YYYY-MM

    if (date === today) todayRevenue += fee;
    if (date.startsWith(monthStr)) monthlyRevenue += fee;
    if (date.startsWith(yearStr)) {
      yearlyRevenue += fee;
      clinicProfit += clinicShare;
      doctorsTotalEarnings += docShare;
      if (!config.paid.includes(period)) pendingPayments += docShare;
    }
  }

  return { todayRevenue, monthlyRevenue, yearlyRevenue, clinicProfit, doctorsTotalEarnings, pendingPayments };
}

/**
 * Generate daily revenue data for the last N days.
 */
export function computeDailyRevenue(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  days = 30
): DailyRevenue[] {
  const staffMap = new Map<number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) staffMap.set(id, s);
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  const map = new Map<string, number>();
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const b of bookings) {
    if (!isCompleted(b)) continue;
    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const fee = staffMap.get(docId)?.consultation_price ?? 0;
    const date = getBookingDate(b);
    if (map.has(date)) {
      map.set(date, (map.get(date) ?? 0) + fee);
    }
  }

  return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
}

/**
 * Generate monthly revenue for the last N months.
 */
export function computeMonthlyRevenue(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  months = 12
): MonthlyRevenue[] {
  const staffMap = new Map<number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) staffMap.set(id, s);
  }

  const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const result: MonthlyRevenue[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    result.push({ month: key, label, revenue: 0 });
  }

  const monthMap = new Map(result.map((r) => [r.month, r]));

  for (const b of bookings) {
    if (!isCompleted(b)) continue;
    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const fee = staffMap.get(docId)?.consultation_price ?? 0;
    const month = getBookingDate(b).slice(0, 7);
    const entry = monthMap.get(month);
    if (entry) entry.revenue += fee;
  }

  return result;
}

/**
 * Build FinancialTransaction[] from completed bookings.
 */
export function computeTransactions(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  filters?: FinancialFilters
): FinancialTransaction[] {
  const staffMap = new Map<number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) staffMap.set(id, s);
  }

  const txns: FinancialTransaction[] = [];

  for (const b of bookings) {
    if (!isCompleted(b)) continue;

    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;

    const member = staffMap.get(docId);
    if (!member) continue;

    const date = getBookingDate(b);
    if (filters?.dateFrom && date < filters.dateFrom) continue;
    if (filters?.dateTo && date > filters.dateTo) continue;
    if (filters?.doctorId && docId !== filters.doctorId) continue;
    if (filters?.specialist && member.specialist !== filters.specialist) continue;

    const fee = member.consultation_price ?? 0;
    const config = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const docPct = config.doctorPercentage;
    const clinicPct = 100 - docPct;

    txns.push({
      id: `txn-${b.id}`,
      bookingId: b.id,
      doctorId: docId,
      doctorName: member.full_name,
      bookingDate: date,
      totalAmount: fee,
      doctorPercentage: docPct,
      clinicPercentage: clinicPct,
      doctorShare: (fee * docPct) / 100,
      clinicShare: (fee * clinicPct) / 100,
      status: "completed",
    });
  }

  return txns.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
}

/** Export data to CSV string */
export function exportToCSV(records: DoctorFinancialRecord[], period: string): string {
  const headers = [
    "الطبيب", "التخصص", "سعر الاستشارة", "عدد المواعيد",
    "إجمالي الإيرادات", "نسبة الطبيب%", "نسبة العيادة%",
    "حصة الطبيب", "حصة العيادة", "حالة الدفع"
  ];

  const rows = records.map((r) => [
    r.doctorName,
    r.specialist,
    r.consultationFee,
    r.completedAppointments,
    r.totalRevenue,
    r.doctorPercentage,
    r.clinicPercentage,
    r.doctorShare.toFixed(2),
    r.clinicShare.toFixed(2),
    r.paymentStatus === "paid" ? "مدفوع" : "معلق",
  ]);

  const content = [
    `تقرير الإدارة المالية — ${period}`,
    "",
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  return content;
}
