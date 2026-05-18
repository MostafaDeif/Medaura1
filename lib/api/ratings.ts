import { apiClient } from "./client";
import type { RatingRequest, RatingResponse } from "@/lib/types/api";

type RatingsQuery = {
  page?: number;
  limit?: number;
};

function buildRatingsQuery(params?: RatingsQuery) {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const ratingService = {
  async rateDoctor(doctorId: number, data: RatingRequest, token: string) {
    return apiClient.post<RatingResponse>(
      `/api/ratings/doctor/${doctorId}`,
      data,
      { token },
    );
  },

  async getDoctorRatings(
    doctorId: number,
    params?: RatingsQuery,
    token?: string,
  ) {
    const query = buildRatingsQuery(params);
    return apiClient.get(`/api/ratings/doctor/${doctorId}${query}`, {
      token,
    });
  },

  async rateClinic(clinicId: number, data: RatingRequest, token: string) {
    return apiClient.post<RatingResponse>(
      `/api/ratings/clinic/${clinicId}`,
      data,
      { token },
    );
  },

  async getClinicRatings(
    clinicId: number,
    params?: RatingsQuery,
    token?: string,
  ) {
    const query = buildRatingsQuery(params);
    return apiClient.get(`/api/ratings/clinic/${clinicId}${query}`, {
      token,
    });
  },

  async rateStaff(staffId: number, data: RatingRequest, token: string) {
    return apiClient.post<RatingResponse>(
      `/api/ratings/staff/${staffId}`,
      data,
      { token },
    );
  },

  async getStaffRatings(
    staffId: number,
    params?: RatingsQuery,
    token?: string,
  ) {
    const query = buildRatingsQuery(params);
    return apiClient.get(`/api/ratings/staff/${staffId}${query}`, {
      token,
    });
  },
};
