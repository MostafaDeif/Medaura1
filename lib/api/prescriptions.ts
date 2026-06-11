import { apiClient } from "./client";
import type {
  PrescriptionAccess,
  Prescription,
  PrescriptionCreateRequest,
  PrescriptionActionRequest,
} from "@/lib/types/api";

export const prescriptionService = {
  async requestAccess(bookingId: string | number, token: string) {
    return apiClient.post<PrescriptionAccess>(
      `/api/prescriptions/bookings/${bookingId}/request-access`,
      undefined,
      { token }
    );
  },

  async respondAccess(
    bookingId: string | number,
    data: PrescriptionActionRequest,
    token: string
  ) {
    return apiClient.patch<PrescriptionAccess>(
      `/api/prescriptions/bookings/${bookingId}/access`,
      data,
      { token }
    );
  },

  async createPrescription(
    bookingId: string | number,
    data: PrescriptionCreateRequest,
    token: string
  ) {
    return apiClient.post<Prescription>(
      `/api/prescriptions/bookings/${bookingId}`,
      data,
      { token }
    );
  },

  async getAccessInfo(bookingId: string | number, token: string) {
    return apiClient.get<PrescriptionAccess>(
      `/api/prescriptions/bookings/${bookingId}/access`,
      { token }
    );
  },

  async getPrescription(bookingId: string | number, token: string) {
    return apiClient.get<Prescription>(
      `/api/prescriptions/bookings/${bookingId}`,
      { token }
    );
  },

  async getMyPrescriptions(token: string) {
    return apiClient.get<Prescription[]>("/api/prescriptions/my-prescriptions", {
      token,
    });
  },

  async getPrescriptionById(prescriptionId: string | number, token: string) {
    return apiClient.get<Prescription>(`/api/prescriptions/${prescriptionId}`, {
      token,
    });
  },
};
