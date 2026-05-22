import { apiClient } from "./client";
import type {
  ClinicRequest,
  ClinicProfile,
  ClinicStats,
  ClinicMyStats,
  ClinicBooking,
  BookingRequest,
  BookingResponse,
  StaffProfile,
} from "@/lib/types/api";

export const clinicService = {
  async create(data: ClinicRequest, token: string) {
    return apiClient.post<ClinicProfile>("/clinic/create", data, { token });
  },

  async getProfile(clinicId: number) {
    return apiClient.get<ClinicProfile>(`/api/clinic/${clinicId}/profile`);
  },

  async updateProfile(clinicId: number, data: Partial<ClinicRequest>, token: string) {
    return apiClient.put<ClinicProfile>(
      `/clinic/${clinicId}`,
      data,
      { token }
    );
  },

  async getStats(token: string) {
    return apiClient.get<ClinicStats>("/clinic/stats", { token });
  },

  async getMyStats(token: string) {
    return apiClient.get<ClinicMyStats>("/api/clinic/my-stats", { token });
  },

  async getStaff(token: string) {
    return apiClient.get<StaffProfile[]>("/clinic/staff", { token });
  },

  async getBookings(token: string, clinicId?: number) {
    const endpoint = clinicId
      ? `/clinic/bookings?clinic_id=${clinicId}`
      : "/clinic/bookings";

    return apiClient.get<ClinicBooking[]>(endpoint, { token });
  },

  async createBooking(data: BookingRequest, token: string) {
    return apiClient.post<BookingResponse>("/clinic/bookings", data, {
      token,
    });
  },
};
