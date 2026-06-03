"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Loader,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const GeoLocationPicker = dynamic(
  () => import("@/app/doctorDash/settings/GeoLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-(--card-border) bg-(--semi-card-bg) text-sm text-(--text-secondary)">
        جاري تحميل الخريطة...
      </div>
    ),
  },
);

type ClinicProfileData = {
  name?: string | null;
  address?: string | null;
  location?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  status?: string | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  photo?: string | null;
  image?: string | null;
  geo_location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  licence?: string | null;
};

type ClinicEditableProfile = {
  name: string;
  address: string;
  location: string;
  phone: string;
  opening_hours: string;
  geo_location: {
    latitude: number | "";
    longitude: number | "";
  };
  licence: string;
};

type MessageState = {
  type: "success" | "warning" | "error";
  text: string;
};

const DEFAULT_GEO_LOCATION = {
  latitude: 30.0444,
  longitude: 31.2357,
};

const STATUS_STYLES = {
  green: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  amber: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  red: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const MESSAGE_STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-700",
};

function toNumberOrEmpty(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : "";
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCoordinate(value: number | "") {
  return value === "" ? "" : Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractUpdatedProfile(
  payload: unknown,
): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.profile)) {
    return payload.profile;
  }

  const data = isRecord(payload.data) ? payload.data : null;

  if (data && isRecord(data.profile)) {
    return data.profile;
  }

  if (data && isRecord(data.user) && isRecord(data.user.profile)) {
    return data.user.profile;
  }

  return data || null;
}

function extractUpdatedPhoto(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  if (typeof payload.photo === "string") return payload.photo;

  const data = isRecord(payload.data) ? payload.data : null;
  if (data && typeof data.photo === "string") return data.photo;

  if (isRecord(payload.profile) && typeof payload.profile.photo === "string") {
    return payload.profile.photo;
  }

  if (
    data &&
    isRecord(data.profile) &&
    typeof data.profile.photo === "string"
  ) {
    return data.profile.photo;
  }

  return null;
}

function resolveProfilePhoto(
  profile: ClinicProfileData | undefined,
  userPhoto?: string,
) {
  if (typeof userPhoto === "string" && userPhoto.trim()) return userPhoto;
  if (typeof profile?.photo === "string" && profile.photo.trim())
    return profile.photo;
  if (typeof profile?.image === "string" && profile.image.trim())
    return profile.image;
  return "";
}

function buildInitialProfile(
  profile: ClinicProfileData | undefined,
): ClinicEditableProfile {
  return {
    name: toTrimmedString(profile?.name),
    address: toTrimmedString(profile?.address),
    location: toTrimmedString(profile?.location),
    phone: toTrimmedString(profile?.phone),
    opening_hours: toTrimmedString(profile?.opening_hours),
    geo_location: {
      latitude: toNumberOrEmpty(
        profile?.geo_location?.latitude ?? profile?.latitude,
      ),
      longitude: toNumberOrEmpty(
        profile?.geo_location?.longitude ?? profile?.longitude,
      ),
    },
    licence: toTrimmedString(profile?.licence),
  };
}

function getClinicStatus(profile?: ClinicProfileData) {
  const status = toTrimmedString(profile?.status).toLowerCase();
  const isVerified =
    profile?.verified === true || profile?.is_verified === true;

  if (isVerified || status === "active" || status === "approved") {
    return { label: "موثقة", tone: "green" as const };
  }

  if (status === "rejected") {
    return { label: "مرفوضة", tone: "red" as const };
  }

  if (status === "pending") {
    return { label: "قيد المراجعة", tone: "amber" as const };
  }

  return { label: "غير موثقة", tone: "amber" as const };
}

export default function SettingsPage() {
  const { user, loading, updateUser } = useAuth();
  const profile = user?.profile as ClinicProfileData | undefined;

  const [formData, setFormData] = useState<ClinicEditableProfile>(() =>
    buildInitialProfile(profile),
  );
  const [initialSnapshot, setInitialSnapshot] =
    useState<ClinicEditableProfile | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licenceFileName, setLicenceFileName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const initializedRef = useRef<number | null>(null);
  const initialPhotoRef = useRef("");

  useEffect(() => {
    if (!user) return;
    if (initializedRef.current === user.id) return;

    const snapshot = buildInitialProfile(profile);
    setFormData(snapshot);
    setInitialSnapshot(snapshot);

    const initialPhoto = resolveProfilePhoto(
      profile,
      typeof user.photo === "string" ? user.photo : undefined,
    );
    setPhotoPreview(initialPhoto);
    initialPhotoRef.current = initialPhoto;
    setPhotoFile(null);

    initializedRef.current = user.id;
  }, [user, profile]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const normalizedCurrent = useMemo(
    () => ({
      name: toTrimmedString(formData.name),
      address: toTrimmedString(formData.address),
      location: toTrimmedString(formData.location),
      phone: toTrimmedString(formData.phone),
      opening_hours: toTrimmedString(formData.opening_hours),
      latitude: normalizeCoordinate(formData.geo_location.latitude),
      longitude: normalizeCoordinate(formData.geo_location.longitude),
    }),
    [formData],
  );

  const normalizedInitial = useMemo(
    () =>
      initialSnapshot
        ? {
            name: toTrimmedString(initialSnapshot.name),
            address: toTrimmedString(initialSnapshot.address),
            location: toTrimmedString(initialSnapshot.location),
            phone: toTrimmedString(initialSnapshot.phone),
            opening_hours: toTrimmedString(initialSnapshot.opening_hours),
            latitude: normalizeCoordinate(
              initialSnapshot.geo_location.latitude,
            ),
            longitude: normalizeCoordinate(
              initialSnapshot.geo_location.longitude,
            ),
          }
        : normalizedCurrent,
    [initialSnapshot, normalizedCurrent],
  );

  const nameChanged = normalizedCurrent.name !== normalizedInitial.name;
  const addressChanged =
    normalizedCurrent.address !== normalizedInitial.address;
  const locationChanged =
    normalizedCurrent.location !== normalizedInitial.location;
  const phoneChanged = normalizedCurrent.phone !== normalizedInitial.phone;
  const hoursChanged =
    normalizedCurrent.opening_hours !== normalizedInitial.opening_hours;
  const latitudeChanged =
    normalizedCurrent.latitude !== normalizedInitial.latitude;
  const longitudeChanged =
    normalizedCurrent.longitude !== normalizedInitial.longitude;

  const licenceChanged = Boolean(licenceFile);
  const hasChanges =
    nameChanged ||
    addressChanged ||
    locationChanged ||
    phoneChanged ||
    hoursChanged ||
    latitudeChanged ||
    longitudeChanged ||
    licenceChanged ||
    Boolean(photoFile);

  const requiresReverify = hasChanges;

  const mapLatitude =
    formData.geo_location.latitude === ""
      ? DEFAULT_GEO_LOCATION.latitude
      : formData.geo_location.latitude;
  const mapLongitude =
    formData.geo_location.longitude === ""
      ? DEFAULT_GEO_LOCATION.longitude
      : formData.geo_location.longitude;

  const statusInfo = getClinicStatus(profile);
  const statusStyles = STATUS_STYLES[statusInfo.tone];

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleLicenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLicenceFile(file);
    setLicenceFileName(file.name);
  };

  const handleReset = () => {
    if (!initialSnapshot) return;
    setFormData(initialSnapshot);
    setPhotoFile(null);
    setPhotoPreview(initialPhotoRef.current);
    setLicenceFile(null);
    setLicenceFileName("");
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        opening_hours: formData.opening_hours.trim(),
        latitude:
          formData.geo_location.latitude === ""
            ? ""
            : String(formData.geo_location.latitude),
        longitude:
          formData.geo_location.longitude === ""
            ? ""
            : String(formData.geo_location.longitude),
      };

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        body.append(key, value);
      });

      if (photoFile) {
        body.append("photo", photoFile);
      }

      if (licenceFile) {
        body.append("licence", licenceFile);
      }

      const response = await fetch("/api/user/me", {
        method: "PATCH",
        credentials: "include",
        body,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error || result?.message || "فشل تحديث بيانات العيادة",
        );
      }

      const updatedProfile = extractUpdatedProfile(result);
      const updatedPhoto = extractUpdatedPhoto(result);

      const mergedProfile: ClinicProfileData = {
        ...((user?.profile as ClinicProfileData) || {}),
        ...(updatedProfile || {}),
        name: payload.name,
        address: payload.address,
        location: payload.location,
        phone: payload.phone,
        opening_hours: payload.opening_hours,
        licence: (updatedProfile?.licence as string | undefined) || (user?.profile as ClinicProfileData)?.licence || null,
        geo_location: {
          latitude:
            formData.geo_location.latitude === ""
              ? null
              : formData.geo_location.latitude,
          longitude:
            formData.geo_location.longitude === ""
              ? null
              : formData.geo_location.longitude,
        },
      };

      if (requiresReverify) {
        mergedProfile.status = "pending";
        mergedProfile.verified = false;
        mergedProfile.is_verified = false;
      }

      const nextSnapshot = buildInitialProfile(mergedProfile);
      setFormData(nextSnapshot);
      setInitialSnapshot(nextSnapshot);
      setPhotoFile(null);
      setLicenceFile(null);
      setLicenceFileName("");

      const resolvedPhoto =
        updatedPhoto || (photoFile ? photoPreview : initialPhotoRef.current);

      if (resolvedPhoto) {
        setPhotoPreview(resolvedPhoto);
        initialPhotoRef.current = resolvedPhoto;
      }

      if (updateUser && user) {
        updateUser({
          ...user,
          profile: mergedProfile,
          ...(resolvedPhoto ? { photo: resolvedPhoto } : {}),
        });
      }

      setMessage({
        type: requiresReverify ? "warning" : "success",
        text: requiresReverify
          ? "تم حفظ التغييرات. ستعود حالة العيادة إلى غير موثقة لحين المراجعة."
          : "تم تحديث بيانات العيادة بنجاح.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !initialSnapshot) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-(--text-secondary)">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--card-border) border-t-teal-500" />
          جاري تحميل الإعدادات...
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      dir="rtl"
      style={{ fontFamily: '"Tajawal", "Cairo", sans-serif' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');`}</style>

      <div className="flex flex-wrap items-center justify-between gap-4 animate-[fadeUp_.4s_ease]">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">
            إعدادات العيادة
          </h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">
            حدّث بيانات عيادتك ليبقى ملفك متوافقاً مع متطلبات التوثيق.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles.badge}`}
        >
          <ShieldCheck size={14} />
          <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
          حالة التوثيق: {statusInfo.label}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-[var(--shadow-soft)] animate-[fadeUp_.45s_ease]">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            تعديل بيانات العيادة الأساسية يعيد الحالة إلى غير موثقة تلقائياً حتى
            تتم المراجعة.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm flex items-start gap-2 ${MESSAGE_STYLES[message.type]}`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="mt-0.5" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <section className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] space-y-5 animate-[fadeUp_.5s_ease]">
          <div>
            <h2 className="text-base font-semibold text-(--text-primary)">
              البيانات الأساسية
            </h2>
            <p className="text-xs text-(--text-secondary) mt-1">
              تأكد من صحة الاسم والعنوان لتسهيل العثور على العيادة.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                اسم العيادة
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                رقم الهاتف
              </span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                العنوان
              </span>
              <input
                type="text"
                value={formData.address}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                المدينة / المنطقة
              </span>
              <input
                type="text"
                value={formData.location}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                ساعات العمل
              </span>
              <input
                type="text"
                value={formData.opening_hours}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    opening_hours: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                placeholder="10:00 - 18:00"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                البريد الإلكتروني
              </span>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-(--input-border) bg-(--semi-card-bg) px-4 py-2 text-(--text-secondary)"
              />
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-(--card-border) p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
              <MapPin size={16} className="text-teal-500" />
              موقع العيادة على الخريطة
            </div>

            <div className="overflow-hidden rounded-2xl border border-(--card-border)">
              <GeoLocationPicker
                latitude={Number(mapLatitude)}
                longitude={Number(mapLongitude)}
                onChange={(latitude, longitude) =>
                  setFormData((prev) => ({
                    ...prev,
                    geo_location: {
                      latitude: Number(latitude.toFixed(6)),
                      longitude: Number(longitude.toFixed(6)),
                    },
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-(--text-secondary)">
                  خط العرض
                </span>
                <input
                  type="number"
                  value={formData.geo_location.latitude}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      geo_location: {
                        ...prev.geo_location,
                        latitude:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  step="0.000001"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-(--text-secondary)">
                  خط الطول
                </span>
                <input
                  type="number"
                  value={formData.geo_location.longitude}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      geo_location: {
                        ...prev.geo_location,
                        longitude:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  step="0.000001"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)] space-y-6 animate-[fadeUp_.6s_ease]">
          <div>
            <h2 className="text-base font-semibold text-(--text-primary)">
              صورة العيادة
            </h2>
            <p className="text-xs text-(--text-secondary) mt-1">
              أضف صورة واضحة تُظهر هوية العيادة.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-36 w-36 overflow-hidden rounded-3xl border border-(--card-border) bg-(--semi-card-bg) shadow-inner">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={formData.name || "Clinic"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Camera size={32} className="text-(--text-secondary)" />
                </div>
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600">
              <Camera size={16} />
              تغيير الصورة
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            <span className="text-xs text-(--text-secondary)">
              JPG أو PNG بحجم مناسب.
            </span>
          </div>

          <div className="space-y-3 pt-4 border-t border-(--card-border)">
            <h3 className="text-sm font-semibold text-(--text-primary)">
              مستند الترخيص المهني
            </h3>
            <p className="text-xs text-(--text-secondary)">
              يرجى رفع ترخيص العيادة الطبي كملف PDF أو صورة. هذا الحقل اختياري ويمكنك تحديثه لاحقاً.
            </p>
            {formData.licence && (
              <div className="text-xs">
                <a
                  href={formData.licence}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-semibold underline"
                >
                  <FileText size={14} />
                  عرض مستند الترخيص الحالي
                </a>
              </div>
            )}
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-(--card-border) bg-(--semi-card-bg) px-4 py-3 text-sm text-(--text-primary) transition hover:border-teal-400 hover:bg-teal-50/40">
              <FileText size={16} className="text-teal-500 shrink-0" />
              <span className="truncate max-w-xs text-xs">
                {licenceFileName || "اختر ملف PDF أو صورة"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleLicenceChange}
                className="hidden"
              />
            </label>
            {licenceFileName && (
              <button
                type="button"
                onClick={() => { setLicenceFile(null); setLicenceFileName(""); }}
                className="text-xs text-red-500 hover:underline block"
              >
                إلغاء الملف المختار
              </button>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={!hasChanges || saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
            >
              {saving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save size={18} />
                  حفظ التغييرات
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || !hasChanges}
              className="w-full rounded-xl border border-(--card-border) px-4 py-2.5 text-sm font-semibold text-(--text-secondary) transition hover:bg-(--hover-bg) disabled:cursor-not-allowed"
            >
              إعادة تعيين التغييرات
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
