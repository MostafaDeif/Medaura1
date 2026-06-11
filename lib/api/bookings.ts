import { apiClient } from "./client";
import type {
  BookingRequest,
  BookingResponse,
  BookingSlot,
  SlotsQuery,
} from "@/lib/types/api";

function extractBookingList(payload: unknown): BookingResponse[] {
  const responseData = (payload as { data?: unknown } | undefined)?.data;
  const nestedData = (responseData as { data?: unknown } | undefined)?.data;
  const bookingCandidates = [
    payload,
    responseData,
    nestedData,
    (payload as { bookings?: unknown } | undefined)?.bookings,
    (responseData as { bookings?: unknown } | undefined)?.bookings,
    (nestedData as { bookings?: unknown } | undefined)?.bookings,
  ];

  for (const candidate of bookingCandidates) {
    if (Array.isArray(candidate)) {
      return candidate as BookingResponse[];
    }
  }

  return [];
}

export const bookingService = {
  async create(data: BookingRequest, token: string) {
    return apiClient.post<BookingResponse>("/api/book", data, { token });
  },

  async getMyBookings(token: string) {
    const response = await apiClient.get<unknown>("/api/book/my-bookings", {
      token,
    });
    return extractBookingList(response);
  },

  async getClinicBookings(token: string, clinicId?: number) {
    const endpoint = clinicId
      ? `/api/book/clinic-bookings?clinic_id=${clinicId}`
      : "/api/book/clinic-bookings";

    const response = await apiClient.get<unknown>(endpoint, { token });
    return extractBookingList(response);
  },

  async getAvailableSlots(query: SlotsQuery) {
    const params = new URLSearchParams({
      staff_id: query.staff_id.toString(),
      booking_date: query.booking_date,
    });

    return apiClient.get<BookingSlot[]>(
      `/api/book/slots?${params.toString()}`
    );
  },

  async cancelBooking(bookingId: string | number, token: string) {
    return apiClient.patch(`/api/book/${bookingId}/cancel`, undefined, {
      token,
    });
  },

  async cancelClinicBooking(bookingId: string | number, token: string) {
    return apiClient.patch(
      `/api/book/clinic-bookings/${bookingId}/cancel`,
      undefined,
      { token }
    );
  },
};
