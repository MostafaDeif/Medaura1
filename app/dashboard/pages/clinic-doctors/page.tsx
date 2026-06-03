"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Hospital,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BadgeCheck,
  Stethoscope,
  UserRound,
  Trash2,
  RotateCcw,
  Loader2,
  Phone,
} from "lucide-react";
import Image from "next/image";

const DOCTOR_FALLBACK_IMAGE = "/images/blank-profile-picture.png";

type ClinicStaff = {
  staff_id: number;
  user_id: number;
  email: string;
  full_name: string;
  role_title: string;
  specialist?: string;
  work_days?: string;
  work_from?: string;
  work_to?: string;
  consultation_price?: number;
  is_verified: boolean;
  is_active: boolean;
  photo?: string | null;
  clinic_id: number;
  clinic_name: string;
  clinic_status?: string;
  clinic_location?: string;
  phone?: string | null;
};

const DAY_TRANSLATIONS: Record<string, string> = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الإثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
};

function formatWorkDays(daysString?: string): string {
  if (!daysString) return "غير محدد";
  return daysString
    .split(",")
    .map((day) => DAY_TRANSLATIONS[day.trim().toLowerCase()] || day)
    .join("، ");
}

function getWhatsAppUrl(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "#";
  if (cleaned.startsWith("+20")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("20")) {
    // already prefix
  } else {
    if (cleaned.startsWith("0")) {
      cleaned = "20" + cleaned.substring(1);
    } else {
      cleaned = "20" + cleaned;
    }
  }
  return `https://wa.me/${cleaned}`;
}

export default function ClinicDoctorsPage() {
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialistFilter, setSpecialistFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState<Record<number, boolean>>({});

  const handleToggleActive = async (userId: number, activate: boolean) => {
    if (!userId) return;
    setPendingAction((prev) => ({ ...prev, [userId]: true }));
    try {
      const url = activate
        ? `/api/admin/users/${userId}/undelete`
        : `/api/admin/users/${userId}/delete`;
      const method = activate ? "PATCH" : "DELETE";
      const res = await fetch(url, { method, credentials: "include" });
      if (!res.ok) throw new Error("فشل تنفيذ العملية");
      setStaff((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, is_active: activate } : s
        )
      );
    } catch {
      // silent — keep existing state
    } finally {
      setPendingAction((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/staff", {
        credentials: "include",
      });
      const result = await response.json();

      const isSuccess = result.success === true || result.status === "success";
      const staffList = result.data || result.staff || [];

      if (isSuccess) {
        const normalized = staffList.map((s: any) => ({
          ...s,
          role_title: s.role_title || "doctor",
          phone: s.phone ?? s.profile?.phone ?? null,
        }));
        setStaff(normalized);
      } else {
        throw new Error(result.error || result.message || "فشل تحميل البيانات");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل أطباء العيادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filter for only doctors
  const doctors = useMemo(() => {
    return staff.filter(
      (member) => member.role_title?.toLowerCase() === "doctor"
    );
  }, [staff]);

  // Extract all unique specialties
  const specialties = useMemo(() => {
    const list = new Set<string>();
    doctors.forEach((doc) => {
      if (doc.specialist?.trim()) {
        list.add(doc.specialist.trim());
      }
    });
    return ["all", ...Array.from(list)];
  }, [doctors]);

  // Filter and Search doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSearch =
        doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialty =
        specialistFilter === "all" || doc.specialist === specialistFilter;

      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchQuery, specialistFilter]);

  return (
    <div className="space-y-6 p-1 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EBF2F9] px-3 py-1 text-xs font-semibold text-[#1F2B6C]">
            <Stethoscope size={14} />
            إدارة الكوادر الطبية
          </p>
          <h1 className="text-3xl font-bold text-(--text-primary)">
            دكاترة العيادات
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            عرض وإدارة جميع أطباء العيادات المسجلين في المنصة ومواعيد عملهم.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchStaff}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2.5 text-sm font-semibold text-(--text-primary) shadow-[var(--shadow-soft)] hover:bg-(--hover-bg) transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث البيانات
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 md:flex-row md:items-center md:justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStaff}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-red-700 border border-red-200 hover:bg-red-100 transition cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] text-right">
            <p className="text-xs font-semibold text-(--text-secondary)">إجمالي الأطباء</p>
            <p className="mt-2 text-3xl font-black text-[#1F2B6C]">{doctors.length}</p>
          </div>
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] text-right">
            <p className="text-xs font-semibold text-(--text-secondary)">الأطباء الموثقين</p>
            <p className="mt-2 text-3xl font-black text-green-600">
              {doctors.filter((d) => d.is_verified).length}
            </p>
          </div>
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] text-right">
            <p className="text-xs font-semibold text-(--text-secondary)">الأطباء النشطين</p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {doctors.filter((d) => d.is_active).length}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search
            size={18}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-secondary)"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الطبيب، البريد، أو اسم العيادة..."
            className="w-full rounded-xl border border-(--input-border) bg-(--input2-bg) py-3 pl-4 pr-11 text-sm outline-none transition focus:border-[#1F2B6C] text-right"
          />
        </div>

        {/* Specialty Filter Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-(--text-secondary) shrink-0">التخصص:</span>
          <select
            value={specialistFilter}
            onChange={(e) => setSpecialistFilter(e.target.value)}
            className="rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2.5 text-sm font-semibold text-(--text-primary) outline-none transition focus:border-[#1F2B6C]"
          >
            <option value="all">جميع التخصصات</option>
            {specialties
              .filter((s) => s !== "all")
              .map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Loading Skeleton Grid */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-(--card-border) bg-(--card-bg) p-6 space-y-4"
            >
              <div className="flex items-center gap-4 justify-end">
                <div className="space-y-2 text-right flex-1">
                  <div className="h-4 w-3/4 rounded bg-gray-200 ml-auto" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 ml-auto" />
                </div>
                <div className="h-14 w-14 rounded-full bg-gray-200" />
              </div>
              <div className="h-px bg-gray-100" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-5/6 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      {!loading && !error && (
        <>
          {filteredDoctors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-(--card-border) py-16 text-center text-(--text-secondary)">
              <UserRound size={48} className="mx-auto mb-3 opacity-30 text-[#1F2B6C]" />
              <p className="text-lg font-bold">لا يوجد أطباء عيادات مطابِقين</p>
              <p className="text-xs mt-1">تأكد من كتابة الاسم بشكل صحيح أو تغيير عوامل التصفية.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDoctors.map((doc) => (
                <article
                  key={doc.staff_id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Decorative Accent Bar */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#1F2B6C] to-[#005fb8]" />

                  <div className="p-5 flex flex-col flex-1 gap-4">
                    {/* Header Info */}
                    <div className="flex items-start gap-4 justify-between">
                      {/* Status Badges */}
                      <div className="flex flex-col gap-1.5 items-start">
                        {doc.is_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-150 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            <BadgeCheck size={12} />
                            موثق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-150 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <AlertCircle size={12} />
                            غير موثق
                          </span>
                        )}
                        {doc.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-150 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-150 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                            موقف
                          </span>
                        )}
                      </div>

                      {/* Doctor Profile Name & Image */}
                      <div className="flex items-center gap-3 justify-end text-right min-w-0">
                        <div className="min-w-0 flex flex-col items-end">
                          <h3 className="font-bold text-base text-(--text-primary) group-hover:text-[#1F2B6C] transition truncate">
                            {doc.full_name}
                          </h3>
                          <p className="text-xs text-(--text-secondary) mt-0.5 font-medium truncate">
                            {doc.email}
                          </p>
                          {doc.phone && (
                            <a
                              href={getWhatsAppUrl(doc.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-700 transition mt-1 bg-green-50/50 hover:bg-green-50 px-2 py-0.5 rounded-lg border border-green-150/60"
                              dir="ltr"
                            >
                              <Phone size={10} className="shrink-0" />
                              <span>{doc.phone}</span>
                            </a>
                          )}
                        </div>

                        <div className="relative shrink-0 h-12 w-12 rounded-full overflow-hidden border border-(--card-border) bg-blue-50">
                          <img
                            src={doc.photo || DOCTOR_FALLBACK_IMAGE}
                            alt={doc.full_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-(--card-border)" />

                    {/* Specialist Info */}
                    <div className="flex items-center gap-2 justify-end text-sm">
                      <span className="font-bold text-[#1F2B6C] bg-blue-50 px-3 py-1 rounded-lg">
                        {doc.specialist || "ممارس عام"}
                      </span>
                      <Stethoscope size={16} className="text-[#1F2B6C]" />
                    </div>

                    {/* Clinic details */}
                    <div className="rounded-xl bg-(--semi-card-bg) border border-(--card-border) p-3 space-y-2 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs text-(--text-primary) font-semibold">
                        <span>{doc.clinic_name}</span>
                        <Hospital size={14} className="text-[#1F2B6C] shrink-0" />
                      </div>
                      {doc.clinic_location && (
                        <div className="flex items-center justify-end gap-2 text-xs text-(--text-secondary)">
                          <span>{doc.clinic_location}</span>
                          <MapPin size={13} className="text-[#1F2B6C] shrink-0" />
                        </div>
                      )}
                    </div>

                    {/* Pricing & Timing */}
                    <div className="mt-auto space-y-2.5 text-xs text-(--text-secondary)">
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-(--text-primary) text-sm">
                          {doc.consultation_price || "0"}{" "}
                          <span className="text-xs font-semibold text-(--text-secondary)">ج.م</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span>سعر الكشف</span>
                          <DollarSign size={14} className="text-[#1F2B6C]" />
                        </div>
                      </div>

                      {/* Work Days */}
                      <div className="flex flex-col gap-1 items-end border-t border-(--card-border) pt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-(--text-primary)">أيام العمل:</span>
                          <Calendar size={14} className="text-[#1F2B6C]" />
                        </div>
                        <p className="text-[11px] leading-relaxed text-right font-medium mt-0.5">
                          {formatWorkDays(doc.work_days)}
                        </p>
                      </div>

                      {/* Work Hours */}
                      <div className="flex items-center justify-between border-t border-(--card-border) pt-2">
                        <span className="font-bold text-(--text-primary) dir-ltr">
                          {doc.work_from || "00:00"} – {doc.work_to || "00:00"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span>مواعيد الكشف</span>
                          <Clock size={14} className="text-[#1F2B6C]" />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="border-t border-(--card-border) pt-3 flex items-center justify-between gap-2 mt-2">
                        <span className="text-[11px] font-bold text-(--text-secondary)">حالة الحساب:</span>
                        {pendingAction[doc.user_id] ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-(--card-border) px-3 py-1.5 text-xs font-semibold text-(--text-secondary)">
                            <Loader2 size={13} className="animate-spin" />
                            جاري...
                          </span>
                        ) : doc.is_active ? (
                          <button
                            onClick={() => void handleToggleActive(doc.user_id, false)}
                            title="تعطيل حساب الطبيب"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                            تعطيل الحساب
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleToggleActive(doc.user_id, true)}
                            title="إعادة تفعيل حساب الطبيب"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 transition cursor-pointer"
                          >
                            <RotateCcw size={13} />
                            تفعيل الحساب
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
