import { apiClient } from "./client";
import type {
  AdminDoctorsList,
  AdminClinicsList,
  AdminStaffList,
  AuditLog,
  AuditStats,
  AdminCreateRequest,
  ApiResponse,
} from "@/lib/types/api";

type PatchCandidate = {
  endpoint: string;
  body?: unknown;
};

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

async function patchFirstAvailable<T>(
  candidates: PatchCandidate[],
  token: string,
) {
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await apiClient.patch<T>(candidate.endpoint, candidate.body, {
        token,
      });
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      if (status !== 404 && status !== 405) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

export const adminService = {
  async listDoctors(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AdminDoctorsList[]>
      | AdminDoctorsList[]
      | {
          status?: string;
          doctors?: AdminDoctorsList[];
          data?: AdminDoctorsList[];
        }
    >("/api/admin/doctors", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("doctors" in res && Array.isArray(res.doctors)) {
      return res.doctors;
    }

    return [];
  },

  async verifyDoctor(doctorId: string | number, token: string) {
    return apiClient.patch(
      `/api/admin/${doctorId}/verify`,
      undefined,
      { token }
    );
  },

  async unverifyDoctor(doctorId: string | number, token: string) {
    return apiClient.patch(
      `/api/admin/${doctorId}/unverify`,
      undefined,
      { token }
    );
  },

  async listClinics(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AdminClinicsList[]>
      | AdminClinicsList[]
      | {
          status?: string;
          clinics?: AdminClinicsList[];
          data?: AdminClinicsList[];
        }
    >("/api/admin/clinics", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("clinics" in res && Array.isArray(res.clinics)) {
      return res.clinics;
    }

    return [];
  },

  async listApprovedClinics(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AdminClinicsList[]>
      | AdminClinicsList[]
      | {
          status?: string;
          clinics?: AdminClinicsList[];
          data?: AdminClinicsList[];
        }
    >("/api/admin/approved-clinics", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("clinics" in res && Array.isArray(res.clinics)) {
      return res.clinics;
    }

    return [];
  },

  async listPendingClinics(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AdminClinicsList[]>
      | AdminClinicsList[]
      | {
          status?: string;
          clinics?: AdminClinicsList[];
          data?: AdminClinicsList[];
        }
    >("/api/admin/pending-clinics", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("clinics" in res && Array.isArray(res.clinics)) {
      return res.clinics;
    }

    return [];
  },

  async approveClinic(clinicId: string | number, token: string) {
    return patchFirstAvailable<unknown>(
      [
        { endpoint: `/api/admin/clinics/${clinicId}/approve` },
        { endpoint: `/api/admin/clinics/${clinicId}/verify` },
        {
          endpoint: `/api/admin/clinics/${clinicId}`,
          body: { verified: true, status: "approved" },
        },
      ],
      token,
    );
  },

  async rejectClinic(clinicId: string | number, token: string) {
    return patchFirstAvailable<unknown>(
      [
        { endpoint: `/api/admin/clinics/${clinicId}/reject` },
        { endpoint: `/api/admin/clinics/${clinicId}/unverify` },
        {
          endpoint: `/api/admin/clinics/${clinicId}`,
          body: { verified: false, status: "rejected" },
        },
      ],
      token,
    );
  },

  async unverifyClinic(clinicId: string | number, token: string) {
    return patchFirstAvailable<unknown>(
      [
        { endpoint: `/api/admin/clinics/${clinicId}/unverify` },
        {
          endpoint: `/api/admin/clinics/${clinicId}`,
          body: { verified: false, status: "pending" },
        },
      ],
      token,
    );
  },

  async listStaff(token: string) {
    const res = await apiClient.get<
      | AdminStaffList[]
      | {
          status?: string;
          staff?: AdminStaffList[];
          data?: AdminStaffList[];
        }
    >("/api/admin/staff", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("staff" in res && Array.isArray(res.staff)) {
      return res.staff;
    }

    return [];
  },

  async listPatients(token: string) {
    const res = await apiClient.get<
      | unknown[]
      | {
          status?: string;
          patients?: unknown[];
          data?: unknown[];
        }
    >("/api/admin/patients", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("patients" in res && Array.isArray(res.patients)) {
      return res.patients;
    }

    return [];
  },

  async listAllBookings(token: string) {
    const res = await apiClient.get<
      | ApiResponse<unknown[]>
      | unknown[]
      | {
          status?: string;
          bookings?: unknown[];
          data?: unknown[];
        }
    >("/api/admin/bookings", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("bookings" in res && Array.isArray(res.bookings)) {
      return res.bookings;
    }

    return [];
  },

  async getDashboardStats(token: string) {
    const res = await apiClient.get<ApiResponse<unknown>>("/api/admin/admin-stats", { token });
    return res.data;
  },

  async listAuditLogs(
    token: string,
    filters?: {
      actor_role?: string;
      method?: string;
      location_contains?: string;
      limit?: number;
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.actor_role) params.set("actor_role", filters.actor_role);
    if (filters?.method) params.set("method", filters.method);
    if (filters?.location_contains) params.set("location_contains", filters.location_contains);
    if (filters?.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    const endpoint = qs ? `/api/admin/audit-logs?${qs}` : "/api/admin/audit-logs";

    const res = await apiClient.get<
      | ApiResponse<AuditLog[]>
      | AuditLog[]
      | {
          status?: string;
          logs?: AuditLog[];
          data?: AuditLog[];
        }
    >(endpoint, { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("logs" in res && Array.isArray(res.logs)) {
      return res.logs;
    }

    if (res.data && typeof res.data === "object" && "logs" in res.data && Array.isArray((res.data as Record<string, unknown>).logs)) {
      return (res.data as Record<string, unknown>).logs as AuditLog[];
    }

    return [];
  },

  async clearAuditLogs(token: string) {
    return apiClient.delete<unknown>("/api/admin/audit-logs", { token });
  },

  async getAuditStats(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AuditStats>
      | AuditStats
      | {
          status?: string;
          stats?: AuditStats;
          data?: AuditStats;
        }
    >("/api/admin/audit-stats", { token });

    if ("data" in res && res.data) {
      return res.data;
    }

    if ("stats" in res && res.stats) {
      return res.stats;
    }

    return res as AuditStats;
  },

  async createAdmin(data: AdminCreateRequest, token: string) {
    return apiClient.post<unknown>("/api/admin/create-admin", data, { token });
  },

  async listAdmins(token: string) {
    const res = await apiClient.get<
      | unknown[]
      | {
          status?: string;
          admins?: unknown[];
          data?: unknown[];
        }
    >("/api/admin/admins", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("admins" in res && Array.isArray(res.admins)) {
      return res.admins;
    }

    return [];
  },

  async deleteUser(userId: string | number | string, token: string) {
    return apiClient.delete<unknown>(
      `/api/admin/users/${userId}`,
      { token }
    );
  },

  async undeleteUser(userId: string | number, token: string) {
    return apiClient.patch<unknown>(
      `/api/admin/users/${userId}/undelete`,
      undefined,
      { token }
    );
  },
};
