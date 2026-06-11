import { apiClient } from "./client";
import type { StaffProfile, StaffCreateRequest } from "@/lib/types/api";

export const staffService = {
  async getProfile(staffId: string | number) {
    return apiClient.get<StaffProfile>(`/api/staff/${staffId}/profile`);
  },

  async updateProfile(staffId: string | number, data: Partial<StaffProfile>, token: string) {
    return apiClient.put<StaffProfile>(
      `/api/staff/${staffId}`,
      data,
      { token }
    );
  },

  async getMyClinic(token: string) {
    return apiClient.get(`/api/staff/my-clinic`, { token });
  },

  async verify(staffId: string | number, token: string) {
    return apiClient.patch<unknown>(
      `/api/staff/${staffId}/verify`,
      undefined,
      { token }
    );
  },

  async unverify(staffId: string | number, token: string) {
    return apiClient.patch<unknown>(
      `/api/staff/${staffId}/unverify`,
      undefined,
      { token }
    );
  },

  async deleteStaff(staffId: string | number, token: string) {
    return apiClient.delete<unknown>(
      `/api/staff/${staffId}/delete`,
      { token }
    );
  },

  async getPendingStaff(token: string) {
    return apiClient.get<StaffProfile[]>("/api/staff/pending", { token });
  },

  async createStaff(data: StaffCreateRequest, token: string) {
    return apiClient.post<StaffProfile>("/api/staff/create", data, { token });
  },
};
