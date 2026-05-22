// Auth Types
export type UserType = "staff" | "doctor" | "patient" | "clinic" | "admin";

export interface PatientSignupProfile {
  full_name: string;
}

export interface DoctorSignupProfile {
  full_name: string;
  license_number: string;
  specialist: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
}

export interface ClinicSignupProfile {
  name: string;
  address: string;
  location: string;
  phone: string;
  geo_location: {
    latitude: number;
    longitude: number;
  };
}
export interface StaffSignupProfile {
  full_name: string;
  name: string;
  role_title: string;
  specialist: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  user_type: UserType;
  profile:
    | PatientSignupProfile
    | DoctorSignupProfile
    | StaffSignupProfile
    | ClinicSignupProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  email: string;
  user_type: string;
  token?: string;
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  profile?: Record<string, unknown>;
  photo?: string;
}

export interface LogoutRequest {
  token?: string;
}

export interface RefreshTokenRequest {
  email?: string;
  password?: string;
  refresh_token?: string;
  refreshToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword?: string;
  passwordConfirm?: string;
}

// User Types
export interface UserProfile {
  id: number;
  email: string;
  user_type: string;
  profile: Record<string, unknown>;
}

// Clinic Types
export interface ClinicRequest {
  name: string;
  address: string;
  location: string;
  phone: string;
  email: string;
  opening_hours: string;
}

export interface ClinicProfile {
  id: number;
  name: string;
  address: string;
  location: string;
  phone: string;
  email: string;
  opening_hours: string;
  verified: boolean;
}

export interface ClinicStats {
  id: number;
  name: string;
  total_doctors: number;
  total_staff: number;
  total_bookings: number;
  pending_staff: number;
}

export interface ClinicMyStats {
  clinic_name?: string;
  total_staff: number;
  pending_staff: number;
  total_bookings: number;
  total_doctors?: number;
  confirmed_bookings?: number;
  cancelled_bookings?: number;
  pending_bookings?: number;
  monthly_bookings?: { month: string; count: number }[];
  weekly_bookings?: { day: string; count: number }[];
  staff_by_specialty?: { specialty: string; count: number }[];
}

export interface ClinicBooking {
  id: number;
  doctor_id: number;
  patient_id: number;
  clinic_id: number;
  booking_date: string;
  booking_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

// Doctor Types
export interface DoctorProfile {
  id: number;
  full_name: string;
  specialist: string;
  license_number?: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
  rating?: number;
  verified?: boolean;
}

export interface DoctorQuery {
  specialist?: string;
  clinic_id?: number;
  limit?: number;
}

export interface DoctorDashboard {
  id: number;
  full_name: string;
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  rating: number;
}

// Staff Types
export interface StaffProfile {
  id: number;
  full_name: string;
  clinic_id: number;
  role_title: string;
  specialist?: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
  verified: boolean;
}

export interface StaffVerifyRequest {
  verified: boolean;
}

export interface StaffCreateRequest {
  email: string;
  password: string;
  full_name: string;
  role_title: string;
  specialist?: string;
  clinic_id?: number;
}

// Booking Types
export interface BookingRequest {
  staff_id?: number;
  doctor_id?: number;
  booking_date: string;
  booking_from: string;
}

export interface BookingResponse {
  id: number;
  doctor_id: number;
  patient_id: number;
  booking_date: string;
  booking_from: string;
  status: string;
  created_at: string;
}

export interface BookingSlot {
  from: string;
  to: string;
  available?: boolean;
}

export interface SlotsQuery {
  staff_id: number;
  booking_date: string;
}

// Rating Types
export interface RatingRequest {
  rating: number;
  comment?: string;
}

export interface RatingResponse {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Prescription Types
export interface PrescriptionAccessRequest {
  patient_id: number;
}

export interface PrescriptionAccess {
  id: number;
  booking_id: number;
  doctor_id: number;
  patient_id: number;
  access_granted: boolean;
}

export interface Prescription {
  id: number;
  booking_id: number;
  content: string;
  created_at: string;
}

// Admin Types
export interface AdminVerifyRequest {
  verified: boolean;
}

export interface AdminDoctorsList {
  id: number;
  full_name: string;
  email: string;
  specialist: string;
  verified: boolean;
}

export interface AdminClinicsList {
  id: number;
  name: string;
  location: string;
  verified: boolean;
}

export interface AdminStaffList {
  id: number;
  full_name: string;
  clinic_id: number;
  role_title: string;
  verified: boolean;
}

export interface AuditLog {
  id?: number;
  user_id?: number;
  action?: string;
  resource_type?: string;
  resource_id?: number;
  timestamp?: string;
  actor_role?: string;
  actor_user_id?: number | null;
  body?: Record<string, unknown> | null;
  duration_ms?: number | null;
  event_type?: string;
  ip?: string;
  level?: string;
  method?: string;
  path?: string;
  query?: Record<string, unknown> | null;
  status_code?: number | null;
  user_agent?: string;
  error_code?: string | null;
  error_message?: string | null;
  error_details?: unknown;
}

export interface AuditStats {
  total_logs?: number;
  total_info_logs?: number;
  total_error_logs?: number;
  total_success_logs?: number;
  total_failed_logs?: number;
}

export interface AdminCreateRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface PrescriptionCreateRequest {
  patient_age: number;
  diagnosis: string;
  medication_name: string;
  dose: string;
  duration: string;
  notes?: string;
}

export interface PrescriptionActionRequest {
  action: "accept" | "reject";
}

export interface UserUpdateRequest {
  full_name?: string;
  role?: string;
  consultation_price?: number;
  phone?: string;
  photo?: FormData;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}
