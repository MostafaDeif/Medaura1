import type {
  RawBooking,
  RawStaffMember,
  DoctorFinancialRecord,
  AppointmentRecord,
  FinancialSummary,
  DailyRevenue,
  MonthlyRevenue,
  FinancialTransaction,
  FinancialFilters,
  ProfitSharingStore,
  AppointmentPaymentStore,
} from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────────

export const CURRENCY = "EGP";
export const DEFAULT_DOCTOR_PCT = 70;

/** Format number as English digits currency string */
export function formatCurrency(amount: number): string {
  return (
    "\u200E" +
    new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) +
    " EGP"
  );
}

export function formatCurrencyCompact(amount: number): string {
  return formatCurrency(amount);
}

/** Extract the numeric ID from a staff/booking record */
export function getDoctorId(member: RawStaffMember): string | number | null {
  const raw = member.id ?? member.staff_id ?? member.user_id;
  if (typeof raw === "string" || typeof raw === "number") return raw;
  return null;
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

/** Get booking_date from a RawBooking, falling back to created_at */
function getBookingDate(b: RawBooking): string {
  return b.booking_date ?? b.created_at?.slice(0, 10) ?? "";
}

/**
 * Returns true for any booking status that represents a completed/finished appointment.
 * Covers multiple possible backend values.
 */
export function isCompleted(b: RawBooking): boolean {
  const s = (b.status ?? "").toLowerCase().trim();
  return (
    s === "completed" ||
    s === "confirmed" ||
    s === "done"      ||
    s === "finished"  ||
    s === "attended"  ||
    s === "approved"
  );
}

/**
 * Resolve the patient payment status for a booking.
 *
 * Rules:
 *  - "paid"      → admin confirmed the patient paid
 *  - "cancelled" → booking was cancelled (no revenue)
 *  - "pending"   → appointment completed but payment not yet confirmed
 */
export function getApptPaymentStatus(
  bookingId: string | number,
  apptStore: AppointmentPaymentStore
): "paid" | "cancelled" | "pending" {
  const record = apptStore[String(bookingId)];
  if (!record) return "pending";
  if (typeof record === "string") return record as "paid" | "cancelled";
  return record.status;
}

export function getApptPaymentDate(
  bookingId: string | number,
  apptStore: AppointmentPaymentStore,
  fallbackDate: string
): string {
  const record = apptStore[String(bookingId)];
  if (!record || typeof record === "string") return fallbackDate;
  return record.date;
}

// ── Staff map builder ─────────────────────────────────────────────────────────

function buildStaffMap(staff: RawStaffMember[]): Map<string | number, RawStaffMember> {
  const map = new Map<string | number, RawStaffMember>();
  for (const s of staff) {
    const id = getDoctorId(s);
    if (id !== null) map.set(id, s);
  }
  return map;
}

// ── Core Calculations ──────────────────────────────────────────────────────────

/**
 * Compute the six financial summary KPIs.
 *
 * Revenue (today / monthly / yearly):
 *   Counts ALL completed, non-cancelled appointments.
 *
 * pendingPayments:
 *   Sum of consultation fees for appointments where the patient's payment
 *   has NOT yet been confirmed (status === "pending").
 *   → Decreases immediately when admin marks an appointment as "paid" or "cancelled".
 *
 * clinicProfit / doctorsTotalEarnings:
 *   Derived from ALL completed, non-cancelled appointments (yearly).
 */
export function computeSummary(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  apptStore: AppointmentPaymentStore = {}
): FinancialSummary {
  const today    = todayStr();
  const monthStr = currentMonthStr();
  const yearStr  = currentYearStr();

  const staffMap = buildStaffMap(staff);

  let todayRevenue         = 0;
  let monthlyRevenue       = 0;
  let yearlyRevenue        = 0;
  let clinicProfit         = 0;
  let doctorsTotalEarnings = 0;
  let pendingPayments      = 0;

  for (const b of bookings) {
    if (!isCompleted(b)) continue;

    const paymentStatus = getApptPaymentStatus(b.id, apptStore);
    // Cancelled bookings contribute nothing
    if (paymentStatus === "cancelled") continue;

    const docId  = b.doctor_id ?? b.staff_id;
    if (!docId) continue;

    const member = staffMap.get(docId);
    const fee    = member?.consultation_price ?? 0;
    if (fee === 0) continue;

    const date   = getBookingDate(b);
    const config = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const docPct    = config.doctorPercentage;
    const clinicPct = 100 - docPct;
    
    const paymentDate = getApptPaymentDate(b.id, apptStore, date);

    // ── Revenue KPIs ─────────────
    // All Revenue KPIs: Use paymentDate and ONLY include "paid"
    if (paymentStatus === "paid") {
      if (paymentDate === today)              todayRevenue    += fee;
      if (paymentDate.startsWith(monthStr))   monthlyRevenue  += fee;
      if (paymentDate.startsWith(yearStr)) {
        yearlyRevenue        += fee;
        clinicProfit         += (fee * clinicPct) / 100;
        doctorsTotalEarnings += (fee * docPct)    / 100;
      }
    }

    // ── Pending patient payments ───────────────────────────────────────────────
    // Only "pending" (not confirmed) appointments contribute to pendingPayments.
    if (paymentStatus === "pending") {
      pendingPayments += fee;
    }
  }

  return {
    todayRevenue,
    monthlyRevenue,
    yearlyRevenue,
    clinicProfit,
    doctorsTotalEarnings,
    pendingPayments,
  };
}

/**
 * Per-appointment records — drives the appointment-level payment table.
 * Shows ALL completed bookings (paid, pending, cancelled) within the filter range.
 */
export function computeAppointmentRecords(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  apptStore: AppointmentPaymentStore = {},
  filters?: FinancialFilters
): AppointmentRecord[] {
  const staffMap = buildStaffMap(staff);
  const records: AppointmentRecord[] = [];

  for (const b of bookings) {
    if (!isCompleted(b)) continue;

    const docId  = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const member = staffMap.get(docId);
    if (!member) continue;

    if (filters?.specialist && member.specialist !== filters.specialist) continue;
    if (filters?.doctorId   && String(docId) !== String(filters.doctorId)) continue;

    const date = getBookingDate(b);
    if (filters?.dateFrom && date < filters.dateFrom) continue;
    if (filters?.dateTo   && date > filters.dateTo)   continue;

    const paymentStatus = getApptPaymentStatus(b.id, apptStore);
    const fee           = member.consultation_price ?? 0;
    const config        = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const docPct        = config.doctorPercentage;
    const clinicPct     = 100 - docPct;

    // Shares are 0 for cancelled appointments
    const docShare    = paymentStatus !== "cancelled" ? (fee * docPct)    / 100 : 0;
    const clinicShare = paymentStatus !== "cancelled" ? (fee * clinicPct) / 100 : 0;

    records.push({
      bookingId:        b.id,
      doctorId:         docId,
      doctorName:       member.full_name,
      specialist:       member.specialist ?? "—",
      patientName:      b.patient_name ?? "—",
      bookingDate:      date,
      bookingFrom:      b.booking_from ?? "—",
      consultationFee:  fee,
      doctorPercentage: docPct,
      clinicPercentage: clinicPct,
      doctorShare:      docShare,   // ← fix: was `doctorShare` shorthand but variable is `docShare`
      clinicShare,
      paymentStatus,
    });
  }

  return records.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
}

/**
 * Join bookings + staff into DoctorFinancialRecord[] (doctor-level aggregates).
 * Only counts confirmed paid appointments.
 */
export function computeDoctorRecords(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  apptStore: AppointmentPaymentStore = {},
  filters?: FinancialFilters,
  period?: string
): DoctorFinancialRecord[] {
  const staffMap = buildStaffMap(staff);

  // Filter: only completed + paid patient appointments
  const relevant = bookings.filter((b) => {
    if (!isCompleted(b)) return false;
    if (getApptPaymentStatus(b.id, apptStore) !== "paid") return false;

    const date = getBookingDate(b);
    if (filters?.dateFrom && date < filters.dateFrom) return false;
    if (filters?.dateTo   && date > filters.dateTo)   return false;
    if (filters?.doctorId && String(b.doctor_id ?? b.staff_id) !== String(filters.doctorId)) return false;

    const member = staffMap.get(b.doctor_id ?? b.staff_id ?? "");
    if (filters?.specialist && member?.specialist !== filters.specialist) return false;

    return true;
  });

  // Aggregate per doctor
  const agg = new Map<string | number, { count: number; member: RawStaffMember }>();
  for (const b of relevant) {
    const docId  = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const member = staffMap.get(docId);
    if (!member) continue;
    const existing = agg.get(docId);
    if (existing) existing.count++;
    else agg.set(docId, { count: 1, member });
  }

  const now     = period ?? currentMonthStr();
  const records: DoctorFinancialRecord[] = [];

  for (const [docId, { count, member }] of agg) {
    const config    = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const fee       = member.consultation_price ?? 0;
    const total     = fee * count;
    const docPct    = config.doctorPercentage;
    const clinicPct = 100 - docPct;

    records.push({
      doctorId:               docId,
      doctorName:             member.full_name,
      specialist:             member.specialist ?? "—",
      consultationFee:        fee,
      completedAppointments:  count,
      totalRevenue:           total,
      doctorPercentage:       docPct,
      clinicPercentage:       clinicPct,
      doctorShare:            (total * docPct)    / 100,
      clinicShare:            (total * clinicPct) / 100,
      paymentStatus:          config.paid.includes(now) ? "paid" : "pending",
    });
  }

  return records.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Generate daily revenue data for the last N days.
 * Counts paid + pending (non-cancelled) appointments.
 */
export function computeDailyRevenue(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  apptStore: AppointmentPaymentStore = {},
  days = 30
): DailyRevenue[] {
  const staffMap  = buildStaffMap(staff);
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  const map = new Map<string, number>();
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const b of bookings) {
    if (!isCompleted(b)) continue;
    if (getApptPaymentStatus(b.id, apptStore) !== "paid") continue;
    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const fee  = staffMap.get(docId)?.consultation_price ?? 0;
    const paymentDate = getApptPaymentDate(b.id, apptStore, getBookingDate(b));
    if (map.has(paymentDate)) map.set(paymentDate, (map.get(paymentDate) ?? 0) + fee);
  }

  return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
}

/**
 * Generate monthly revenue for the last N months.
 * Counts paid + pending (non-cancelled) appointments.
 */
export function computeMonthlyRevenue(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  apptStore: AppointmentPaymentStore = {},
  months = 12
): MonthlyRevenue[] {
  const staffMap = buildStaffMap(staff);

  const ARABIC_MONTHS = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];

  const result: MonthlyRevenue[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, label: `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`, revenue: 0 });
  }

  const monthMap = new Map(result.map((r) => [r.month, r]));

  for (const b of bookings) {
    if (!isCompleted(b)) continue;
    if (getApptPaymentStatus(b.id, apptStore) !== "paid") continue;
    const docId = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const fee   = staffMap.get(docId)?.consultation_price ?? 0;
    const paymentDate = getApptPaymentDate(b.id, apptStore, getBookingDate(b));
    const month = paymentDate.slice(0, 7);
    const entry = monthMap.get(month);
    if (entry) entry.revenue += fee;
  }

  return result;
}

/**
 * Build FinancialTransaction[] — paid appointments only (for audit log).
 */
export function computeTransactions(
  bookings: RawBooking[],
  staff: RawStaffMember[],
  profitStore: ProfitSharingStore,
  apptStore: AppointmentPaymentStore = {},
  filters?: FinancialFilters
): FinancialTransaction[] {
  const staffMap = buildStaffMap(staff);
  const txns: FinancialTransaction[] = [];

  for (const b of bookings) {
    if (!isCompleted(b)) continue;
    if (getApptPaymentStatus(b.id, apptStore) !== "paid") continue;

    const docId  = b.doctor_id ?? b.staff_id;
    if (!docId) continue;
    const member = staffMap.get(docId);
    if (!member) continue;

    const date = getBookingDate(b);
    if (filters?.dateFrom && date < filters.dateFrom) continue;
    if (filters?.dateTo   && date > filters.dateTo)   continue;
    if (filters?.doctorId && String(docId) !== String(filters.doctorId)) continue;
    if (filters?.specialist && member.specialist !== filters.specialist) continue;

    const fee       = member.consultation_price ?? 0;
    const config    = profitStore[String(docId)] ?? { doctorPercentage: DEFAULT_DOCTOR_PCT, paid: [] };
    const docPct    = config.doctorPercentage;
    const clinicPct = 100 - docPct;

    txns.push({
      id:               `txn-${b.id}`,
      bookingId:        b.id,
      doctorId:         docId,
      doctorName:       member.full_name,
      bookingDate:      date,
      totalAmount:      fee,
      doctorPercentage: docPct,
      clinicPercentage: clinicPct,
      doctorShare:      (fee * docPct)    / 100,
      clinicShare:      (fee * clinicPct) / 100,
      status:           "completed",
    });
  }

  return txns.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
}

/** Export data to CSV string */
export function exportToCSV(records: DoctorFinancialRecord[], period: string): string {
  const headers = [
    "الطبيب", "التخصص", "سعر الاستشارة", "عدد المواعيد المدفوعة",
    "إجمالي الإيرادات", "نسبة الطبيب%", "نسبة العيادة%",
    "حصة الطبيب", "حصة العيادة", "حالة الدفع",
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

  return [
    `تقرير الإدارة المالية — ${period}`,
    "",
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");
}
