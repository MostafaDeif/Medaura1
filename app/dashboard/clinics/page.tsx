"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Star,
  Users,
  CalendarDays,
  BadgeCheck,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
} from "lucide-react";

interface Clinic {
  clinic_id: number;
  name: string;
  location: string;
  email: string;
  owner_email?: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  total_staff: number;
  total_ratings: number;
  average_rating: number;
  created_at?: string;
  license?: string;
  licence?: string;
}

type FilterType = "all" | "pending" | "approved" | "rejected";

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

export default function ClinicRequests() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({
    msg: "",
    visible: false,
  });

  useEffect(() => {
    let active = true;

    async function loadClinics() {
      try {
        const res = await fetch("/api/admin/clinics", { credentials: "include" });
        const data = await res.json();
        if (active) setClinics(data.clinics || data.data || []);
      } catch {
        if (active) setClinics([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadClinics();

    return () => {
      active = false;
    };
  }, []);

  async function handleStatus(
    clinicId: number,
    newStatus: "approved" | "rejected" | "pending",
  ) {
    try {
      const action =
        newStatus === "approved"
          ? "approve"
          : newStatus === "pending"
            ? "unverify"
            : "reject";
      const endpoint = `/api/admin/clinics?clinic_id=${clinicId}&action=${action}`;

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
        prev.map((c) =>
          c.clinic_id === clinicId ? { ...c, status: newStatus } : c,
        ),
      );
      setSelected((prev) =>
        prev?.clinic_id === clinicId ? { ...prev, status: newStatus } : prev,
      );

      const messages = {
        approved: "تم توثيق العيادة بنجاح ✓",
        rejected: "تم رفض الطلب",
        pending: "تم إعادة الطلب للمراجعة",
      };
      showToast(messages[newStatus]);
    } catch {
      showToast("حدث خطأ، حاول مرة أخرى");
    }
  }

  function showToast(msg: string) {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: "", visible: false }), 3000);
  }

  const counts = useMemo(
    () => ({
      all: clinics.length,
      pending: clinics.filter((c) => c.status === "pending").length,
      approved: clinics.filter((c) => c.status === "approved").length,
      rejected: clinics.filter((c) => c.status === "rejected").length,
    }),
    [clinics],
  );

  const filtered = useMemo(
    () =>
      clinics.filter((c) => {
        const matchFilter = filter === "all" || c.status === filter;
        const matchSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.location.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
      }),
    [clinics, filter, search],
  );

  const statusConfig = {
    pending: {
      label: "محتاج توثيق",
      cls: "bg-amber-50 text-amber-800 border border-amber-200",
    },
    approved: {
      label: "موثق",
      cls: "bg-green-50 text-green-800 border border-green-200",
    },
    rejected: {
      label: "مرفوض",
      cls: "bg-red-50 text-red-800 border border-red-200",
    },
  };

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "محتاج توثيق" },
    { key: "approved", label: "موثق" },
    { key: "rejected", label: "مرفوض" },
  ];

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-80 flex-shrink-0 bg-white border-l border-gray-100 flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
            <BadgeCheck size={13} />
            مراجعة التوثيق
          </p>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            طلبات توثيق العيادات
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            راجع بيانات العيادة والمستندات ثم وثق الحساب أو ارفض الطلب.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 border-b border-gray-100">
          {[
            { label: "الكل", val: counts.all },
            { label: "قيد المراجعة", val: counts.pending },
            { label: "موثق", val: counts.approved },
            { label: "مرفوض", val: counts.rejected },
          ].map((s, i) => (
            <div
              key={i}
              className="py-3 text-center border-l border-gray-100 last:border-l-0"
            >
              <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Clinic list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-sm text-gray-400">
              جاري التحميل...
            </div>
          )}
          {clinics.map((c) => (
            <div
              key={c.clinic_id}
              onClick={() => setSelected(c)}
              className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 cursor-pointer transition-colors
                ${
                  selected?.clinic_id === c.clinic_id
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {c.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{c.location}</p>
              </div>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${statusConfig[c.status].cls}`}
              >
                {statusConfig[c.status].label}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex flex-wrap gap-1.5 flex-1 w-full md:w-auto justify-end md:justify-start">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                  filter === t.key
                    ? "bg-[#1A3A9C] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t.label} ({counts[t.key]})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full md:w-56">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم أو موقع العيادة..."
              className="bg-transparent text-sm outline-none w-full text-right placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Clinic rows */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-sm text-gray-400">
                لا توجد نتائج
              </div>
            )}
            {filtered.map((c) => (
              <div
                key={c.clinic_id}
                onClick={() => {
                  setSelected(c);
                  setShowMobileDetails(true);
                }}
                className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all
                  ${
                    selected?.clinic_id === c.clinic_id
                      ? "border-[#1A3A9C] border-[1.5px]"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-[#1A3A9C]" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-base font-semibold text-gray-900">
                      {c.name}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5 justify-start">
                      <MapPin size={12} />
                      {c.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-start w-full sm:w-auto border-t border-b border-gray-100 py-2 sm:py-0 sm:border-0">
                  <StatCell label="الموظفين" value={c.total_staff} />
                  <StatCell label="التقييم" value={c.average_rating} />
                  <StatCell label="الحجوزات" value={c.total_ratings} />
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-start w-full sm:w-auto">
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusConfig[c.status].cls}`}
                  >
                    {statusConfig[c.status].label}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">
                    #{c.clinic_id}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto p-5">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-300">
                <Building2 size={52} />
                <p className="text-sm">اختر عيادة لعرض تفاصيلها</p>
              </div>
            ) : (
              <ClinicDetail
                clinic={selected}
                statusConfig={statusConfig}
                onStatus={handleStatus}
              />
            )}
          </aside>
        </div>
      </main>

      {/* Mobile Details Modal */}
      {showMobileDetails && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:hidden" dir="rtl">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-(--card-border) bg-(--card-bg) p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowMobileDetails(false)}
              className="absolute top-4 left-4 p-2 rounded-xl text-(--text-secondary) hover:bg-(--hover-bg) transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content (reusing ClinicDetail) */}
            <div className="mt-4 text-right">
              <ClinicDetail
                clinic={selected}
                statusConfig={statusConfig}
                onStatus={handleStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg z-50 animate-fade-in">
          <Check size={15} className="text-green-400" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function ClinicDetail({
  clinic,
  statusConfig,
  onStatus,
}: {
  clinic: Clinic;
  statusConfig: Record<string, { label: string; cls: string }>;
  onStatus: (
    id: number,
    status: "approved" | "rejected" | "pending",
  ) => Promise<void>;
}) {
  const isPending = clinic.status === "pending";
  const isApproved = clinic.status === "approved";

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <Building2 size={40} className="text-[#1A3A9C]" />
        </div>
        <p className="text-lg font-semibold text-gray-900">{clinic.name}</p>
        <p className="text-sm text-gray-400 flex items-center gap-1">
          <MapPin size={13} />
          {clinic.location}
        </p>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${statusConfig[clinic.status].cls}`}
        >
          {statusConfig[clinic.status].label}
        </span>
      </div>

      {/* Info section */}
      <Section title="بيانات العيادة">
        <InfoRow
          icon={<BadgeCheck size={14} />}
          label="رقم العيادة"
          value={`#${clinic.clinic_id}`}
        />
        <InfoRow
          icon={<Mail size={14} />}
          label="البريد"
          value={clinic.owner_email || clinic.email}
          small
        />
        <InfoRow
          icon={<Phone size={14} />}
          label="الهاتف"
          value={clinic.phone}
        />
        <InfoRow
          icon={<FileText size={14} />}
          label="الترخيص"
          value={clinic.license || "—"}
        />
        <InfoRow
          icon={<CalendarDays size={14} />}
          label="تاريخ الطلب"
          value={clinic.created_at?.split("T")[0] || "—"}
        />
      </Section>

      {/* Stats section */}
      <Section title="الإحصائيات">
        <InfoRow
          icon={<Users size={14} />}
          label="الموظفين"
          value={String(clinic.total_staff)}
        />
        <InfoRow
          icon={<Star size={14} />}
          label="متوسط التقييم"
          value={String(clinic.average_rating)}
        />
        <InfoRow
          icon={<CalendarDays size={14} />}
          label="الحجوزات"
          value={String(clinic.total_ratings)}
        />
      </Section>

      {/* Documents */}
      <Section title="المستندات">
        <DocRow
          label="بيانات الحساب"
          sub={clinic.owner_email || clinic.email}
        />
        <DocRow label="الموقع" sub={clinic.location} />
        {clinic.licence ? (
          <DocRow
            label="مستند الترخيص المهني"
            sub="مستند ترخيص العيادة (صورة/PDF)"
            url={clinic.licence}
          />
        ) : (
          <DocRow label="مستند الترخيص" sub={clinic.license || "—"} />
        )}
      </Section>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {isPending && (
          <>
            <button
              onClick={() => onStatus(clinic.clinic_id, "approved")}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A3A9C] hover:bg-[#122C88] text-white rounded-xl text-sm font-medium transition-colors"
            >
              <CheckCircle2 size={16} />
              توثيق العيادة
            </button>
            <button
              onClick={() => onStatus(clinic.clinic_id, "rejected")}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-medium transition-colors"
            >
              <XCircle size={16} />
              رفض الطلب
            </button>
          </>
        )}
        {isApproved && (
          <button
            onClick={() => onStatus(clinic.clinic_id, "rejected")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-medium transition-colors"
          >
            <XCircle size={16} />
            إلغاء التوثيق
          </button>
        )}
        {clinic.status === "rejected" && (
          <button
            onClick={() => onStatus(clinic.clinic_id, "pending")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} />
            إعادة المراجعة
          </button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-50 last:border-b-0 gap-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        {label}
      </div>
      <span
        className={`font-medium text-gray-900 text-left ${small ? "text-[11px]" : "text-xs"}`}
      >
        {value}
      </span>
    </div>
  );
}

function DocRow({ label, sub, url }: { label: string; sub: string; url?: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-50 last:border-b-0 gap-2">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Check size={11} className="text-green-700" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-900">{label}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors flex-shrink-0"
        >
          عرض
        </a>
      )}
    </div>
  );
}
