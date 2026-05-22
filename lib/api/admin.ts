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

  async verifyDoctor(doctorId: number, token: string) {
    return apiClient.patch(
      `/api/admin/${doctorId}/verify`,
      undefined,
      { token }
    );
  },

  async unverifyDoctor(doctorId: number, token: string) {
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

  async approveClinic(clinicId: number, token: string) {
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

  async rejectClinic(clinicId: number, token: string) {
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

  async unverifyClinic(clinicId: number, token: string) {
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
    const res = await apiClient.get<ApiResponse<AdminStaffList[]>>("/api/admin/staff", { token });
    return res.data || [];
  },

  async listPatients(token: string) {
    const res = await apiClient.get<ApiResponse<unknown[]>>("/api/admin/patients", { token });
    return res.data || [];
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

  async listAuditLogs(token: string) {
    const res = await apiClient.get<
      | ApiResponse<AuditLog[]>
      | AuditLog[]
      | {
          status?: string;
          logs?: AuditLog[];
          data?: AuditLog[];
        }
    >("/api/admin/audit-logs", { token });

    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res.data)) {
      return res.data;
    }

    if ("logs" in res && Array.isArray(res.logs)) {
      return res.logs;
    }

    return [];
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
};
