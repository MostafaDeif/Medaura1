import { apiClient } from "./client";
import type {
  DoctorProfile,
  DoctorQuery,
  DoctorDashboard,
} from "@/lib/types/api";

export const doctorService = {
  async list(query?: DoctorQuery) {
    let endpoint = "/api/doctors";
    const params = new URLSearchParams();

    if (query?.specialist) {
      params.append("specialist", query.specialist);
    }
    if (query?.clinic_id) {
      params.append("clinic_id", query.clinic_id.toString());
    }
    if (query?.limit) {
      params.append("limit", query.limit.toString());
    }

    if (params.toString()) {
      endpoint += "?" + params.toString();
    }

    return apiClient.get<DoctorProfile[]>(endpoint);
  },

  async getProfile(doctorId: string | number) {
    return apiClient.get<DoctorProfile>(`/api/doctors/${doctorId}/profile`);
  },

  async getBest() {
    return apiClient.get<DoctorProfile[]>("/api/doctors/best");
  },

  async getDashboard(token: string) {
    return apiClient.get<DoctorDashboard>("/api/doctors/dashboard", {
      token,
    });
  },

  async updateProfile(
    doctorId: string | number,
    data: Partial<DoctorProfile>,
    token: string
  ) {
    return apiClient.put<DoctorProfile>(
      `/api/doctors/${doctorId}`,
      data,
      { token }
    );
  },
};
