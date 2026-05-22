"use client";

import { Hospital, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Clinic {
  id?: number;
  clinic_id?: number;
  name?: string;
  location?: string;
  phone?: string;
  email?: string;
  status?: string;
  verified?: boolean;
  is_verified?: boolean | number | string;
  isVerified?: boolean | number | string;
  verified_status?: boolean | number | string;
  verify_status?: boolean | number | string;
}

function getClinicId(clinic: Clinic) {
  return clinic.clinic_id || clinic.id || 0;
}

function getClinicStatus(clinic: Clinic) {
  const record = clinic as Record<string, unknown>;
  const raw =
    clinic.status ??
    record.status ??
    record.approval_status ??
    record.verification_status ??
    record.state;

  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

function getClinicVerified(clinic: Clinic) {
  const record = clinic as Record<string, unknown>;
  const status = getClinicStatus(clinic);

  if (["approved", "verified", "active"].includes(status)) {
    return true;
  }
  if (["pending", "rejected", "inactive", "disabled"].includes(status)) {
    return false;
  }

  const raw =
    clinic.verified ??
    clinic.is_verified ??
    clinic.isVerified ??
    record.verify_status ??
    record.verified_status;

  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  return false;
}

function normalizeClinic(clinic: Clinic): Clinic {
  return {
    ...clinic,
    id: getClinicId(clinic),
    verified: getClinicVerified(clinic),
  };
}

function normalizeClinics(list: Clinic[]) {
  return list.map(normalizeClinic);
}

function extractClinics(payload: unknown): Clinic[] {
  if (Array.isArray(payload)) return payload as Clinic[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as {
    data?: unknown;
    clinics?: unknown;
  };
  const data = record.data as { clinics?: unknown } | undefined;

  if (Array.isArray(record.data)) return record.data as Clinic[];
  if (Array.isArray(record.clinics)) return record.clinics as Clinic[];
  if (Array.isArray(data?.clinics)) return data.clinics as Clinic[];

  return [];
}

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function readApiResult(response: Response): Promise<ApiResult> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return (await response.json()) as ApiResult;
  } catch {
    return {};
  }
}

export default function ClinicsList({
  clinics: clinicsProp,
}: {
  clinics?: Clinic[];
}) {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>(() =>
    normalizeClinics(clinicsProp || []),
  );
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(!clinicsProp?.length);

  useEffect(() => {
    if (clinicsProp) {
      queueMicrotask(() => setClinics(normalizeClinics(clinicsProp)));
    }
  }, [clinicsProp]);

  useEffect(() => {
    let active = true;

    async function loadAllClinics() {
      try {
        const [allRes] = await Promise.all([
          fetch("/api/admin/clinics", { credentials: "include" }),
        ]);

        const allPayload = await allRes.json();

        if (!allRes.ok || !allPayload.success) {
          return;
        }

        const allClinics = extractClinics(allPayload);

        const withStatus = allClinics.map((clinic) => {
          const status = clinic.status;

          return { ...clinic, status };
        });

        if (active) {
          setClinics(normalizeClinics(withStatus));
        }
      } catch (error) {
        console.error("Failed to load clinics:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAllClinics();

    return () => {
      active = false;
    };
  }, []);

  const handleApprove = async (clinic: Clinic, approve: boolean) => {
    const id = getClinicId(clinic);

    if (!id) {
      console.error("Missing clinic id");
      return;
    }

    setLoadingId(id);

    try {
      const action = approve ? "approve" : "reject";
      const endpoint = `/api/admin/clinics?clinic_id=${id}&action=${action}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
      });

      const result = await readApiResult(response);

      if (!response.ok || result.success === false) {
        throw new Error(
          result.error || result.message || "Failed to update clinic status",
        );
      }

      setClinics((prev) =>
        prev.map((item) =>
          getClinicId(item) === id
            ? {
                ...item,
                verified: approve,
                status: approve ? "approved" : "rejected",
              }
            : item,
        ),
      );

      window.dispatchEvent(new Event("admin:clinics-updated"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className=" bg-(--card-bg) border border-(--card-border) h-auto rounded-xl shadow-sm">
      {/* header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-(--card-border) mb-6 p-6">
        <button
          onClick={() => router.push("/dashboard/clinics")}
          className="w-full sm:w-auto border-2 border-(--card-border) px-3 py-2 rounded-[5px] text-sm text-(--text-primary) font-normal cursor-pointer hover:text-white hover:bg-[#1F2B6C] transition-colors duration-500"
        >
          عرض الكل
        </button>

        <h1 className="text-2xl font-bold text-(--text-primary)">العيادات</h1>
      </div>

      {/* clinics */}
      <div className="space-y-4 sm:space-y-2.5 px-4 sm:px-6 py-2 pb-6">
        {loading && clinics.length === 0 && (
          <div className="py-8 text-center text-(--text-secondary)">
            جاري تحميل العيادات...
          </div>
        )}

        {!loading && clinics.length === 0 && (
          <div className="py-8 text-center text-(--text-secondary)">
            لا يوجد عيادات
          </div>
        )}

        {clinics.slice(0, 7).map((clinic, index) => {
          const verified = Boolean(clinic.verified);

          const badgeLabel = verified ? "مفعل" : "غير مفعل";

          return (
            <div
              key={`${getClinicId(clinic)}-${index}`}
              className="
flex
items-center
justify-between
p-3 sm:p-4
bg-(--semi-card-bg)
rounded-lg
hover:bg-(--hover-bg)
transition-colors
"
            >
              <div
                className="
flex
items-center
gap-3
flex-1
min-w-0
"
              >
                <div
                  className="
w-10 h-10
sm:w-12 sm:h-12
rounded-full
bg-blue-100
dark:bg-blue-900
flex
justify-center
items-center
"
                >
                  <Hospital
                    size={20}
                    className="
text-blue-600
"
                  />
                </div>

                <div>
                  <p
                    className="
font-semibold
text-(--text-primary)
"
                  >
                    {clinic.name}
                  </p>

                  <p
                    className="
text-sm
text-(--text-secondary)
"
                  >
                    {clinic.location}
                  </p>
                </div>
              </div>

              <div
                className="
flex
items-center
gap-2
"
              >
                <span
                  className={`
px-3 py-1
rounded-full
text-xs

${verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
`}
                >
                  {badgeLabel}
                </span>

                {/* approve button */}

                {!verified && (
                  <button
                    onClick={() => handleApprove(clinic, true)}
                    disabled={loadingId === getClinicId(clinic)}
                    className="
p-1.5
rounded-lg
bg-green-50
text-green-600
"
                  >
                    <Check size={16} />
                  </button>
                )}

                {/* reject button */}

                {verified && (
                  <button
                    onClick={() => handleApprove(clinic, false)}
                    disabled={loadingId === getClinicId(clinic)}
                    className="
p-1.5
rounded-lg
bg-red-50
text-red-600
"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
