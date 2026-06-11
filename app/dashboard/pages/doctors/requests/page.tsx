"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import "@/app/globals.css";

type RequestStatus = "pending" | "approved" | "rejected";
type FilterStatus = "all" | RequestStatus;

type AdminDoctor = {
  doctor_id: number | string;
  user_id?: number | string;
  email: string;
  full_name: string;
  specialist: string;
  is_verified: boolean;
  years_of_experience?: number | null;
  consultation_price?: number | null;
  work_from?: string | null;
  work_to?: string | null;
  work_days?: string | null;
  location?: string | null;
  photo?: string | null;
  licence?: string | null;
};

type DoctorsApiResponse = {
  success?: boolean;
  status?: string;
  data?: unknown;
  doctors?: unknown;
  error?: string;
  message?: string;
};

type DoctorRequest = {
  id: number;
  name: string;
  specialty: string;
  city: string;
  experience: number;
  email: string;
  phone: string;
  submittedAt: string;
  licenseNumber: string;
  clinic: string;
  status: RequestStatus;
  avatar: string;
  documents: {
    title: string;
    value: string;
    verified: boolean;
    url?: string;
  }[];
};

const DOCTOR_FALLBACK_IMAGE = "/images/blank-profile-picture.png";

const statusMeta = {
  pending: {
    label: "قيد المراجعة",
    badge: "bg-[#FEF9C2] text-[#A65F00] border-[#FFF085]",
  },
  approved: {
    label: "تم التوثيق",
    badge: "bg-[#DCFCE7] text-[#008236] border-[#B9F8CF]",
  },
  rejected: {
    label: "مرفوض",
    badge: "bg-[#FFE2E2] text-[#C10007] border-[#FFC9C9]",
  },
};

const filters: { key: FilterStatus; label: string }[] = [
  { key: "pending", label: "محتاج توثيق" },
  { key: "approved", label: "موثق" },
  { key: "all", label: "الكل" },
];

function normalizeDoctor(rawDoctor: unknown): AdminDoctor {
  const doctor = rawDoctor as Partial<AdminDoctor> & {
    id?: number | string;
    name?: string;
    specialty?: string;
    verified?: boolean;
  };

  return {
    doctor_id: doctor.doctor_id ?? doctor.id ?? "",
    user_id: doctor.user_id,
    email: doctor.email ?? "",
    full_name: doctor.full_name ?? doctor.name ?? "طبيب بدون اسم",
    specialist: doctor.specialist ?? doctor.specialty ?? "غير محدد",
    is_verified: Boolean(doctor.is_verified ?? doctor.verified),
    years_of_experience:
      doctor.years_of_experience === undefined
        ? null
        : doctor.years_of_experience,
    consultation_price:
      doctor.consultation_price === undefined
        ? null
        : doctor.consultation_price,
    work_from: doctor.work_from,
    work_to: doctor.work_to,
    work_days: doctor.work_days,
    location: doctor.location,
    photo: doctor.photo,
    licence: doctor.licence,
  };
}

function unwrapDoctors(payload: DoctorsApiResponse) {
  const doctors = payload.data ?? payload.doctors ?? [];

  if (!Array.isArray(doctors)) {
    return [];
  }

  return doctors.map(normalizeDoctor);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع";
}

function mapDoctorToRequest(
  doctor: AdminDoctor,
  localStatus?: RequestStatus,
): DoctorRequest {
  const status = localStatus ?? (doctor.is_verified ? "approved" : "pending");

  return {
    id: doctor.doctor_id,
    name: doctor.full_name,
    specialty: doctor.specialist,
    city: doctor.location || "غير محدد",
    experience: doctor.years_of_experience ?? 0,
    email: doctor.email,
    phone: "غير متاح",
    submittedAt:
      doctor.work_from && doctor.work_to
        ? `${doctor.work_from} - ${doctor.work_to}`
        : "غير محدد",
    licenseNumber: `DOC-${doctor.doctor_id}`,
    clinic: "غير محدد",
    status,
    avatar: doctor.photo?.trim() || DOCTOR_FALLBACK_IMAGE,
    documents: [
      {
        title: "بيانات الحساب",
        value: doctor.email || "لا يوجد بريد إلكتروني",
        verified: Boolean(doctor.email),
      },
      {
        title: "التخصص",
        value: doctor.specialist || "غير محدد",
        verified: Boolean(doctor.specialist),
      },
      {
        title: "حالة التوثيق",
        value: statusMeta[status].label,
        verified: status === "approved",
      },
      ...(doctor.licence
        ? [
            {
              title: "مستند الترخيص المهني",
              value: "مستند ترخيص الطبيب (صورة/PDF)",
              verified: true,
              url: doctor.licence,
            },
          ]
        : []),
    ],
  };
}

export default function DoctorRequestsPage() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [localStatuses, setLocalStatuses] = useState<
    Record<number, RequestStatus>
  >({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 4;

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/doctors", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as DoctorsApiResponse;

      if (
        !response.ok ||
        payload.success === false ||
        payload.status === "fail"
      ) {
        throw new Error(
          payload.error || payload.message || "فشل تحميل بيانات الأطباء",
        );
      }

      setDoctors(unwrapDoctors(payload));
    } catch (err) {
      setDoctors([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  const requests = useMemo(
    () =>
      doctors.map((doctor) =>
        mapDoctorToRequest(doctor, localStatuses[doctor.doctor_id]),
      ),
    [doctors, localStatuses],
  );

  const totals = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((request) => request.status === "pending")
        .length,
      approved: requests.filter((request) => request.status === "approved")
        .length,
      rejected: requests.filter((request) => request.status === "rejected")
        .length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter = filter === "all" || request.status === filter;
      const matchesSearch =
        !normalizedSearch ||
        request.name.toLowerCase().includes(normalizedSearch) ||
        request.specialty.toLowerCase().includes(normalizedSearch) ||
        request.licenseNumber.toLowerCase().includes(normalizedSearch) ||
        request.email.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, requests, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const selectedRequest =
    requests.find((request) => request.id === selectedId) ||
    filteredRequests[0];

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page]);

  const updateStatus = async (id: number, status: RequestStatus) => {
    setSelectedId(id);

    if (status === "approved") {
      setVerifyingId(id);
      setError(null);

      const previousDoctors = doctors;
      setDoctors((current) =>
        current.map((doctor) =>
          doctor.doctor_id === id ? { ...doctor, is_verified: true } : doctor,
        ),
      );

      try {
        const response = await fetch(`/api/admin/${id}/verify`, {
          method: "PATCH",
          credentials: "include",
        });
        const payload = (await response.json()) as DoctorsApiResponse;

        if (
          !response.ok ||
          payload.success === false ||
          payload.status === "fail"
        ) {
          throw new Error(
            payload.error || payload.message || "فشل توثيق الطبيب",
          );
        }
      } catch (err) {
        setDoctors(previousDoctors);
        setError(getErrorMessage(err));
        setVerifyingId(null);
        return;
      } finally {
        setVerifyingId(null);
      }
    } else if (status === "pending") {
      setVerifyingId(id);
      setError(null);

      const previousDoctors = doctors;
      setDoctors((current) =>
        current.map((doctor) =>
          doctor.doctor_id === id ? { ...doctor, is_verified: false } : doctor,
        ),
      );

      try {
        const response = await fetch(`/api/admin/${id}/unverify`, {
          method: "PATCH",
          credentials: "include",
        });
        const payload = (await response.json()) as DoctorsApiResponse;

        if (
          !response.ok ||
          payload.success === false ||
          payload.status === "fail"
        ) {
          throw new Error(
            payload.error || payload.message || "فشل إلغاء توثيق الطبيب",
          );
        }
      } catch (err) {
        setDoctors(previousDoctors);
        setError(getErrorMessage(err));
        setVerifyingId(null);
        return;
      } finally {
        setVerifyingId(null);
      }
    }

    setLocalStatuses((current) => ({
      ...current,
      [id]: status,
    }));

    // عرض SweetAlert
    Swal.fire({
      title: status === "approved" ? "تم التوثيق" : "تم إلغاء التوثيق",
      icon: status === "approved" ? "success" : "info",
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-popup",
      },
    });

    // الانتقال إلى الطبيب التالي
    const currentIndex = paginatedRequests.findIndex((req) => req.id === id);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % paginatedRequests.length;
      setSelectedId(paginatedRequests[nextIndex].id);
    }
  };

  const changeFilter = (nextFilter: FilterStatus) => {
    setFilter(nextFilter);
    setPage(1);
  };

  return (
    <div className="min-h-screen space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EBF2F9] px-3 py-1 text-sm font-medium text-[#1F2B6C]">
            <ShieldAlert size={16} />
            مراجعة التوثيق
          </p>
          <h1 className="text-3xl font-bold text-(--text-primary)">
            طلبات توثيق الأطباء
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            راجع بيانات الطبيب والمستندات ثم وثق الحساب.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="الكل" value={totals.all} />
          <StatCard label="قيد المراجعة" value={totals.pending} />
          <StatCard label="موثق" value={totals.approved} />
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#FFC9C9] bg-[#FFE2E2] p-4 text-sm text-[#C10007] sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            onClick={() => void fetchDoctors()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 font-semibold transition hover:bg-red-50"
          >
            <RefreshCw size={16} />
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-(--card-border) bg-(--card-bg)">
          <div className="flex flex-col gap-4 border-b border-(--card-border) p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={17}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث بالاسم أو التخصص أو رقم الترخيص"
                className="w-full rounded-lg border border-(--input-border) bg-(--input2-bg) py-2 pl-3 pr-9 text-sm outline-none transition focus:border-[#1F2B6C]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.key}
                  onClick={() => changeFilter(item.key)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    filter === item.key
                      ? "border-[#1F2B6C] bg-[#1F2B6C] text-white"
                      : "border-(--card-border) text-(--text-secondary) hover:bg-(--hover-bg)"
                  }`}
                >
                  {item.label} ({totals[item.key]})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-5">
            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-(--card-border) py-12 text-(--text-secondary)">
                <Loader2 size={20} className="animate-spin" />
                جاري تحميل الأطباء...
              </div>
            )}

            {!loading &&
              paginatedRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  className={`w-full rounded-xl border p-4 text-right transition ${
                    selectedRequest?.id === request.id
                      ? "border-[#1F2B6C] bg-[#EBF2F9]"
                      : "border-(--card-border) bg-(--semi-card-bg) hover:bg-(--hover-bg)"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={request.avatar}
                        alt={request.name}
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-(--text-primary)">
                          {request.name}
                        </h2>
                        <p className="truncate text-sm text-(--text-secondary)">
                          {request.specialty}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} />
                      <span className="rounded-full border border-(--card-border) px-3 py-1 text-xs text-(--text-secondary)">
                        #{request.id}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-(--text-secondary) sm:grid-cols-3">
                    <Info icon={<MapPin size={16} />} text={request.city} />
                    <Info
                      icon={<GraduationCap size={16} />}
                      text={`${request.experience} سنوات خبرة`}
                    />
                    <Info
                      icon={<CalendarDays size={16} />}
                      text={request.submittedAt}
                    />
                  </div>
                </button>
              ))}

            {!loading && filteredRequests.length === 0 && (
              <div className="rounded-xl border border-dashed border-(--card-border) py-12 text-center text-(--text-secondary)">
                لا توجد طلبات مطابقة للبحث الحالي
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-(--card-border) p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
                className="rounded-md border border-(--input-border) p-2 transition hover:bg-(--semi-card-bg) disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-sm text-(--text-secondary)">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
                disabled={page === totalPages}
                className="rounded-md border border-(--input-border) p-2 transition hover:bg-(--semi-card-bg) disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <p className="text-sm text-(--text-secondary)">
              عرض {paginatedRequests.length} من {filteredRequests.length} طلب
            </p>
          </div>
        </section>

        <aside className="h-max rounded-xl border border-(--card-border) bg-(--card-bg) p-5">
          {selectedRequest ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedRequest.avatar}
                    alt={selectedRequest.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-(--text-primary)">
                      {selectedRequest.name}
                    </h2>
                    <p className="text-sm text-(--text-secondary)">
                      {selectedRequest.specialty}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="grid gap-3 rounded-xl bg-(--semi-card-bg) p-4 text-sm text-(--text-secondary)">
                <Info
                  icon={<Stethoscope size={16} />}
                  text={selectedRequest.clinic}
                />
                <Info icon={<Mail size={16} />} text={selectedRequest.email} />
                <Info icon={<Phone size={16} />} text={selectedRequest.phone} />
                <Info
                  icon={<FileCheck2 size={16} />}
                  text={`ترخيص رقم ${selectedRequest.licenseNumber}`}
                />
              </div>

              <div>
                <h3 className="mb-3 text-base font-bold text-(--text-primary)">
                  المستندات
                </h3>
                <div className="space-y-2">
                  {selectedRequest.documents.map((document) => (
                    <div
                      key={document.title}
                      className="flex items-center justify-between rounded-lg border border-(--card-border) p-3"
                    >
                      <div>
                        <p className="font-medium text-(--text-primary)">
                          {document.title}
                        </p>
                        <p className="text-xs text-(--text-secondary)">
                          {document.value}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {document.url && (
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            عرض المستند
                          </a>
                        )}
                        {document.verified ? (
                          <BadgeCheck size={20} className="text-[#008236]" />
                        ) : (
                          <ShieldAlert size={20} className="text-[#C10007]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {selectedRequest.status === "approved" ? (
                  <button
                    onClick={() =>
                      void updateStatus(selectedRequest.id, "pending")
                    }
                    disabled={verifyingId === selectedRequest.id}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingId === selectedRequest.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <XCircle size={18} />
                    )}
                    إلغاء التوثيق
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      void updateStatus(selectedRequest.id, "approved")
                    }
                    disabled={verifyingId === selectedRequest.id}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00A63E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#008236] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingId === selectedRequest.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    توثيق الطبيب
                  </button>
                )}
              </div>

              {selectedRequest.status === "approved" && (
                <div className="flex items-center gap-2 rounded-lg bg-[#DCFCE7] p-3 text-sm text-[#008236]">
                  <CheckCircle2 size={18} />
                  تم توثيق الطبيب بنجاح.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-(--card-border) py-12 text-center text-sm text-(--text-secondary)">
              اختر طبيبا من القائمة لعرض التفاصيل
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-3 text-right">
      <p className="text-xs text-(--text-secondary)">{label}</p>
      <p className="mt-1 text-2xl font-bold text-(--text-primary)">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[status].badge}`}
    >
      {statusMeta[status].label}
    </span>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[#1F2B6C]">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}
