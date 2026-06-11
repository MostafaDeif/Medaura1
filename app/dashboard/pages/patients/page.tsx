"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hash,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  XCircle,
  AlertCircle,
  Trash2,
  RotateCcw,
} from "lucide-react";

type AdminPatient = {
  patient_id: number | string;
  user_id?: number | string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  is_active?: boolean | null;
  photo?: string | null;
  total_bookings?: number | null;
  upcoming_bookings?: number | null;
};

type PatientsApiResponse = {
  success?: boolean;
  status?: string;
  data?: unknown;
  patients?: unknown;
  error?: string;
  message?: string;
};

const PAGE_SIZE = 8;
const FALLBACK_IMAGE = "/images/blank-profile-picture.png";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePatient(rawPatient: unknown): AdminPatient {
  const patient = rawPatient as Partial<AdminPatient> & {
    id?: number | string;
    name?: string | null;
    image?: string | null;
    img?: string | null;
    avatar?: string | null;
    active?: boolean | null;
  };

  return {
    patient_id: patient.patient_id ?? patient.id ?? 0,
    user_id: patient.user_id === undefined ? undefined : patient.user_id,
    email: patient.email ?? null,
    full_name: patient.full_name ?? patient.name ?? null,
    phone: patient.phone ?? null,
    gender: patient.gender ?? null,
    is_active: patient.is_active ?? patient.active ?? null,
    photo: patient.photo ?? patient.image ?? patient.img ?? patient.avatar ?? null,
    total_bookings: patient.total_bookings === undefined ? null : toNumber(patient.total_bookings),
    upcoming_bookings: patient.upcoming_bookings === undefined ? null : toNumber(patient.upcoming_bookings),
  };
}

function unwrapPatients(payload: PatientsApiResponse) {
  const patients = payload.data ?? payload.patients ?? [];
  if (!Array.isArray(patients)) return [];
  return patients.map(normalizePatient);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ أثناء تحميل بيانات المرضى.";
}

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "غير متاح";
  return value;
}

function getPatientName(patient: AdminPatient) {
  return patient.full_name?.trim() || `مريض #${patient.patient_id}`;
}

function getPatientKey(patient: AdminPatient, index: number) {
  return [patient.patient_id || "patient", patient.user_id || "user", index].join("-");
}

function formatGender(gender?: string | null) {
  if (!gender) return "غير محدد";
  if (gender.toLowerCase() === "male") return "ذكر";
  if (gender.toLowerCase() === "female") return "أنثى";
  return gender;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<Record<string | number, boolean>>({});

  const handleToggleActive = useCallback(
    async (patient: AdminPatient, activate: boolean) => {
      const uid = patient.user_id;
      if (!uid) return;
      setPendingAction((prev) => ({ ...prev, [uid]: true }));
      try {
        const url = activate
          ? `/api/admin/users/${uid}/undelete`
          : `/api/admin/users/${uid}/delete`;
        const method = activate ? "PATCH" : "DELETE";
        const res = await fetch(url, { method, credentials: "include" });
        if (!res.ok) throw new Error("فشل تنفيذ العملية");
        // Optimistic update
        setPatients((prev) =>
          prev.map((p) =>
            p.user_id === uid ? { ...p, is_active: activate } : p
          )
        );
      } catch {
        // silent — keep existing state
      } finally {
        setPendingAction((prev) => { const n = { ...prev }; delete n[uid]; return n; });
      }
    },
    []
  );

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/patients", { credentials: "include" });
      const payload = (await response.json()) as PatientsApiResponse;
      if (!response.ok || payload.success === false || payload.status === "fail") {
        throw new Error(payload.error || payload.message || "فشل تحميل بيانات المرضى.");
      }
      setPatients(unwrapPatients(payload));
    } catch (err) {
      setPatients([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchPatients(), 0);
    return () => window.clearTimeout(id);
  }, [fetchPatients]);

  const totals = useMemo(() => ({
    patients: patients.length,
    active: patients.filter((p) => p.is_active === true).length,
    bookings: patients.reduce((sum, p) => sum + (p.total_bookings ?? 0), 0),
    upcoming: patients.reduce((sum, p) => sum + (p.upcoming_bookings ?? 0), 0),
  }), [patients]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((p) =>
      [p.patient_id, p.user_id, p.full_name, p.email, p.phone, p.gender]
        .filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [patients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredPatients]);

  const pages = useMemo(() => {
    if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 2) return [1, 2, 3, "...", totalPages];
    if (currentPage >= totalPages - 1) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage, "...", totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen space-y-6 p-1" dir="rtl">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EBF2F9] px-3 py-1 text-xs font-semibold text-[#1F2B6C]">
            <Users size={14} />
            إدارة المرضى
          </p>
          <h1 className="text-3xl font-bold text-(--text-primary)">قائمة المرضى</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            عرض وإدارة جميع حسابات المرضى المسجلين في المنصة.
          </p>
        </div>

        <button
          onClick={() => void fetchPatients()}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-(--input-border) bg-(--card-bg) px-4 py-2.5 text-sm font-semibold text-(--text-primary) shadow-[var(--shadow-soft)] transition hover:bg-(--hover-bg) disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          تحديث البيانات
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={20} />}
          label="إجمالي المرضى"
          value={totals.patients}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="الحسابات النشطة"
          value={totals.active}
          color="green"
        />
        <StatCard
          icon={<CalendarClock size={20} />}
          label="إجمالي الحجوزات"
          value={totals.bookings}
          color="purple"
        />
        <StatCard
          icon={<CalendarClock size={20} />}
          label="الحجوزات القادمة"
          value={totals.upcoming}
          color="amber"
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchPatients()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Main Card ── */}
      <section className="overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)]">

        {/* Header + Search */}
        <div className="flex flex-col gap-4 border-b border-(--card-border) p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">دليل المرضى</h2>
            <p className="mt-0.5 text-sm text-(--text-secondary)">
              عرض {filteredPatients.length} من أصل {patients.length} مريض
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ابحث بالاسم، البريد، الهاتف أو الرقم..."
              className="w-full rounded-xl border border-(--input-border) bg-(--input2-bg) py-2.5 pl-4 pr-10 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-secondary) focus:border-[#1F2B6C] focus:bg-(--card-bg) text-right"
            />
          </div>
        </div>

        {/* ── Mobile Cards ── */}
        <div className="p-4 sm:hidden">
          {loading && <MobileSkeletons />}
          {!loading && paginatedPatients.map((p, i) => (
            <PatientCard
              key={getPatientKey(p, i)}
              patient={p}
              isPending={p.user_id ? !!pendingAction[p.user_id] : false}
              onToggle={(activate) => void handleToggleActive(p, activate)}
            />
          ))}
          {!loading && filteredPatients.length === 0 && <EmptyState />}
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[800px] text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-(--card-border) bg-(--hover-bg) text-right">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">المريض</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">التواصل</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">الجنس</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">الحجوزات</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">الحالة</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">الأرقام</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}><TableSkeletons /></td>
                </tr>
              )}

              {!loading && paginatedPatients.map((patient, index) => (
                <tr
                  key={getPatientKey(patient, index)}
                  className="group border-t border-(--card-border) transition hover:bg-(--hover-bg)"
                >
                  {/* Patient */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="text-right min-w-0">
                        <p className="font-semibold text-(--text-primary) truncate">
                          {getPatientName(patient)}
                        </p>
                        <p className="text-xs text-(--text-secondary) truncate mt-0.5">
                          {patient.email || "لا يوجد بريد"}
                        </p>
                      </div>
                      <div className="relative shrink-0">
                        <Image
                          src={patient.photo?.trim() || FALLBACK_IMAGE}
                          alt={getPatientName(patient)}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full border-2 border-(--card-border) bg-(--semi-card-bg) object-cover"
                        />
                        {patient.is_active === true && (
                          <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5 items-end">
                      <span className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
                        <span className="truncate max-w-[160px]">{formatValue(patient.email)}</span>
                        <Mail size={13} className="text-[#1F2B6C] shrink-0" />
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
                        <span>{formatValue(patient.phone)}</span>
                        <Phone size={13} className="text-[#1F2B6C] shrink-0" />
                      </span>
                    </div>
                  </td>

                  {/* Gender */}
                  <td className="px-5 py-4 text-right">
                    <span className="rounded-lg bg-(--semi-card-bg) border border-(--card-border) px-2.5 py-1 text-xs font-semibold text-(--text-primary)">
                      {formatGender(patient.gender)}
                    </span>
                  </td>

                  {/* Bookings */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-end text-xs text-(--text-secondary)">
                      <span>
                        الكل:{" "}
                        <strong className="text-[#1F2B6C] font-black text-base">
                          {patient.total_bookings ?? 0}
                        </strong>
                      </span>
                      <span>
                        القادمة:{" "}
                        <strong className="text-(--text-primary) font-bold">
                          {patient.upcoming_bookings ?? 0}
                        </strong>
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge active={patient.is_active} />
                  </td>

                  {/* IDs */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-end text-xs text-(--text-secondary)">
                      <span className="flex items-center gap-1">
                        <span>#{patient.patient_id || "-"}</span>
                        <Hash size={12} className="text-[#1F2B6C]" />
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{patient.user_id ?? "-"}</span>
                        <UserRound size={12} className="text-[#1F2B6C]" />
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    {patient.user_id && (
                      <ActionToggleBtn
                        isActive={patient.is_active === true}
                        isPending={!!pendingAction[patient.user_id]}
                        onToggle={(activate) => void handleToggleActive(patient, activate)}
                      />
                    )}
                  </td>
                </tr>
              ))}

              {!loading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7}><EmptyState /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && filteredPatients.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-(--card-border) p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-(--text-secondary)">
              صفحة <span className="font-bold text-(--text-primary)">{currentPage}</span> من{" "}
              <span className="font-bold text-(--text-primary)">{totalPages}</span>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <PaginationButton
                label="الصفحة السابقة"
                disabled={currentPage === 1}
                onClick={() => setPage((c) => Math.max(c - 1, 1))}
              >
                <ChevronRight size={18} />
              </PaginationButton>

              {pages.map((item, index) =>
                item === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-(--text-secondary)">
                    ···
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(Number(item))}
                    className={`h-9 min-w-9 rounded-xl px-3 text-sm font-bold transition cursor-pointer ${
                      item === currentPage
                        ? "bg-[#1F2B6C] text-white shadow-md"
                        : "border border-(--input-border) text-(--text-primary) hover:bg-(--hover-bg)"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <PaginationButton
                label="الصفحة التالية"
                disabled={currentPage === totalPages}
                onClick={() => setPage((c) => Math.min(c + 1, totalPages))}
              >
                <ChevronLeft size={18} />
              </PaginationButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

const STAT_COLORS = {
  blue:   { bg: "bg-[#EBF2F9]",   text: "text-[#1F2B6C]",  num: "text-[#1F2B6C]"  },
  green:  { bg: "bg-[#DCFCE7]",   text: "text-[#008236]",  num: "text-[#008236]"  },
  purple: { bg: "bg-[#EDE9FE]",   text: "text-[#6D28D9]",  num: "text-[#6D28D9]"  },
  amber:  { bg: "bg-[#FEF9C2]",   text: "text-[#A65F00]",  num: "text-[#A65F00]"  },
} as const;

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: keyof typeof STAT_COLORS;
}) {
  const c = STAT_COLORS[color];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
      {/* decorative corner blob */}
      <div className={`absolute -left-4 -top-4 h-20 w-20 rounded-full opacity-10 ${c.bg}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-(--text-primary)">{value}</p>
          <p className="mt-1 text-xs font-semibold text-(--text-secondary)">{label}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${c.bg} ${c.text}`}>{icon}</div>
      </div>
    </div>
  );
}

function PatientCard({
  patient,
  isPending,
  onToggle,
}: {
  patient: AdminPatient;
  isPending: boolean;
  onToggle: (activate: boolean) => void;
}) {
  return (
    <article className="mb-3 rounded-2xl border border-(--card-border) bg-(--semi-card-bg) p-4 transition hover:border-[#1F2B6C]/30 hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <StatusBadge active={patient.is_active} />
        <div className="flex items-center gap-3 justify-end min-w-0">
          <div className="min-w-0 text-right">
            <p className="font-bold text-(--text-primary) truncate">{getPatientName(patient)}</p>
            <p className="text-xs text-(--text-secondary) truncate mt-0.5">{patient.email || "لا يوجد بريد"}</p>
          </div>
          <div className="relative shrink-0">
            <Image
              src={patient.photo?.trim() || FALLBACK_IMAGE}
              alt={getPatientName(patient)}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border-2 border-(--card-border) object-cover"
            />
            {patient.is_active === true && (
              <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <InfoChip icon={<Phone size={12} />} text={formatValue(patient.phone)} />
        <InfoChip icon={<UserRound size={12} />} text={formatGender(patient.gender)} />
        <InfoChip icon={<Hash size={12} />} text={`م.${patient.patient_id || "-"}`} />
        <InfoChip icon={<Mail size={12} />} text={`م.${patient.user_id ?? "-"}`} />
      </div>

      {/* Booking row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MiniMetric label="إجمالي الحجوزات" value={patient.total_bookings ?? 0} />
        <MiniMetric label="الحجوزات القادمة" value={patient.upcoming_bookings ?? 0} />
      </div>

      {/* Action */}
      {patient.user_id && (
        <div className="flex justify-end">
          <ActionToggleBtn
            isActive={patient.is_active === true}
            isPending={isPending}
            onToggle={onToggle}
          />
        </div>
      )}
    </article>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <span className="flex items-center justify-end gap-1.5 rounded-lg border border-(--card-border) bg-(--card-bg) px-2.5 py-1.5 text-(--text-secondary)">
      <span className="truncate">{text}</span>
      <span className="shrink-0 text-[#1F2B6C]">{icon}</span>
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-right">
      <p className="text-[10px] font-semibold text-(--text-secondary)">{label}</p>
      <p className="mt-1 text-xl font-black text-(--text-primary)">{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active?: boolean | null }) {
  if (active === false)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#FFC9C9] bg-[#FFE2E2] px-3 py-1 text-xs font-bold text-[#C10007]">
        <XCircle size={13} />
        غير نشط
      </span>
    );

  if (active === true)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#B9F8CF] bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#008236]">
        <CheckCircle2 size={13} />
        نشط
      </span>
    );

  return (
    <span className="inline-flex items-center rounded-full border border-(--card-border) bg-(--card-bg) px-3 py-1 text-xs font-bold text-(--text-secondary)">
      غير معروف
    </span>
  );
}

function PaginationButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--input-border) text-(--text-primary) transition hover:bg-(--hover-bg) disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}

function MobileSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-(--card-border) p-4 space-y-3">
          <div className="flex items-center justify-end gap-3">
            <div className="space-y-1.5 text-right flex-1">
              <div className="h-4 w-2/3 rounded-full bg-gray-200 ml-auto" />
              <div className="h-3 w-1/2 rounded-full bg-gray-200 ml-auto" />
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-8 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeletons() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 border-t border-(--card-border) px-5 py-4">
          <div className="h-11 w-11 rounded-full bg-gray-200 shrink-0 ml-auto" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-1/3 rounded-full bg-gray-200 ml-auto" />
            <div className="h-3 w-1/4 rounded-full bg-gray-100 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users size={48} className="mb-3 text-(--text-secondary) opacity-30" />
      <p className="text-base font-bold text-(--text-primary)">لا يوجد مرضى مطابقون</p>
      <p className="mt-1 text-xs text-(--text-secondary)">تأكد من كتابة الاسم أو تغيير مصطلح البحث.</p>
    </div>
  );
}

function ActionToggleBtn({
  isActive,
  isPending,
  onToggle,
}: {
  isActive: boolean;
  isPending: boolean;
  onToggle: (activate: boolean) => void;
}) {
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-(--card-border) px-3 py-1.5 text-xs font-semibold text-(--text-secondary)">
        <Loader2 size={13} className="animate-spin" />
        جاري...
      </span>
    );
  }

  if (isActive) {
    return (
      <button
        onClick={() => onToggle(false)}
        title="تعطيل الحساب"
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
      >
        <Trash2 size={13} />
        تعطيل
      </button>
    );
  }

  return (
    <button
      onClick={() => onToggle(true)}
      title="إعادة تفعيل الحساب"
      className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 transition cursor-pointer"
    >
      <RotateCcw size={13} />
      تفعيل
    </button>
  );
}
