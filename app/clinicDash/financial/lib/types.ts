// ── Financial Management Types ─────────────────────────────────────────────

export type PaymentStatus = "paid" | "pending" | "cancelled";

export interface DoctorFinancialRecord {
  /** Doctor's numeric ID (from staff record) */
  doctorId: string | number;
  doctorName: string;
  specialist: string;
  /** Consultation fee per appointment */
  consultationFee: number;
  /** Total PAID appointments only */
  completedAppointments: number;
  /** Total revenue from paid appointments */
  totalRevenue: number;
  /** Doctor's profit percentage (0–100) */
  doctorPercentage: number;
  /** Clinic's profit percentage = 100 - doctorPercentage */
  clinicPercentage: number;
  /** Doctor's monetary share */
  doctorShare: number;
  /** Clinic's monetary share */
  clinicShare: number;
  /** Doctor salary payment status for the current period */
  paymentStatus: PaymentStatus;
}

/** Per-appointment revenue record — drives the Doctor Earnings Table */
export interface AppointmentRecord {
  bookingId: string | number;
  doctorId: string | number;
  doctorName: string;
  specialist: string;
  /** Patient who booked the appointment */
  patientName: string;
  bookingDate: string;   // "YYYY-MM-DD"
  bookingFrom: string;   // "HH:MM" or "—"
  consultationFee: number;
  doctorPercentage: number;
  clinicPercentage: number;
  /** Non-zero only when paymentStatus === "paid" */
  doctorShare: number;
  /** Non-zero only when paymentStatus === "paid" */
  clinicShare: number;
  paymentStatus: PaymentStatus;
}

export interface FinancialSummary {
  todayRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  clinicProfit: number;
  doctorsTotalEarnings: number;
  pendingPayments: number;
}

export interface DailyRevenue {
  date: string;     // "YYYY-MM-DD"
  revenue: number;
}

export interface MonthlyRevenue {
  month: string;    // "YYYY-MM"
  label: string;    // "يناير 2025"
  revenue: number;
}

export interface FinancialTransaction {
  id: string;
  bookingId: string | number;
  doctorId: string | number;
  doctorName: string;
  bookingDate: string;
  totalAmount: number;
  doctorPercentage: number;
  clinicPercentage: number;
  doctorShare: number;
  clinicShare: number;
  status: "completed";
}

export interface FinancialFilters {
  dateFrom?: string;    // "YYYY-MM-DD"
  dateTo?: string;      // "YYYY-MM-DD"
  doctorId?: string | number;
  specialist?: string;
  period?: "today" | "week" | "month" | "year" | "custom";
}

export interface ProfitSharingConfig {
  doctorPercentage: number;
  paid: string[];
}

export type ProfitSharingStore = Record<string, ProfitSharingConfig>;

/**
 * Per-appointment payment tracking store.
 * Key = bookingId, Value = string or object with date
 */
export type AppointmentPaymentRecord = "paid" | "cancelled" | { status: "paid" | "cancelled"; date: string };
export type AppointmentPaymentStore = Record<string, AppointmentPaymentRecord>;

/** Raw booking from the backend */
export interface RawBooking {
  id: string | number;
  doctor_id?: string | number;
  staff_id?: string | number;
  patient_id?: string | number;
  /** Patient's full name — returned by the backend clinic-bookings endpoint */
  patient_name?: string;
  booking_date?: string;
  /** Appointment start time, e.g. "10:00" */
  booking_from?: string;
  booking_to?: string;
  status?: string;
  created_at?: string;
  consultation_price?: number;
}

/** Raw staff member from the backend */
export interface RawStaffMember {
  id?: number;
  staff_id?: number | string;
  user_id?: number | string;
  full_name: string;
  specialist?: string;
  consultation_price?: number;
  role_title?: string;
  verified?: boolean;
  is_verified?: boolean | number | string;
}
