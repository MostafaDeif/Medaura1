// ── Financial Management Types ─────────────────────────────────────────────

export type PaymentStatus = "paid" | "pending";

export interface DoctorFinancialRecord {
  /** Doctor's numeric ID (from staff record) */
  doctorId: number;
  doctorName: string;
  specialist: string;
  /** Consultation fee per appointment */
  consultationFee: number;
  /** Total completed appointments */
  completedAppointments: number;
  /** Total revenue from completed appointments */
  totalRevenue: number;
  /** Doctor's profit percentage (0–100) */
  doctorPercentage: number;
  /** Clinic's profit percentage = 100 - doctorPercentage */
  clinicPercentage: number;
  /** Doctor's monetary share */
  doctorShare: number;
  /** Clinic's monetary share */
  clinicShare: number;
  /** Payment status for the current period */
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
  bookingId: number;
  doctorId: number;
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
  doctorId?: number;
  specialist?: string;
  period?: "today" | "week" | "month" | "year" | "custom";
}

export interface ProfitSharingConfig {
  doctorPercentage: number;
  paid: string[];
}

export type ProfitSharingStore = Record<string, ProfitSharingConfig>;

/** Raw booking from the backend */
export interface RawBooking {
  id: number;
  doctor_id?: number;
  staff_id?: number;
  patient_id?: number;
  booking_date?: string;
  booking_from?: string;
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
