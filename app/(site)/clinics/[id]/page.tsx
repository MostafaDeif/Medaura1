"use client";

import { useParams } from "next/navigation";
import { MapPin, Phone, Clock, Star, Search, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import DoctorCard from "@/components/home/doctorCard/doctorCard";
import { t } from "@/i18n";

const API_BASE_URL = "/api";
const RATINGS_PAGE_SIZE = 4;

type ClinicDoctor = {
  staff_id: string | number;
  full_name: string;
  role_title: string;
  specialist: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
  photo: string | null;
  can_be_booked: number;
  average_rating?: number;
  total_ratings?: number;
  years_of_experience?: number;
};

type GeoLocation = {
  latitude: number;
  longitude: number;
};

type ClinicProfileData = {
  clinic_id: string | number;
  name: string;
  location: string;
  phone: string;
  photo: string;
  total_ratings: number;
  average_rating: number;
  geo_location: GeoLocation | null;
};

type ApiRecord = Record<string, unknown>;

type RatingsSummary = {
  total_ratings: number;
  average_rating: number;
};

type RatingsPagination = {
  page: number;
  limit: number;
  total_pages: number;
};

type RatingItem = {
  rating_id: number;
  rating: number;
  comment: string;
  patient_name: string;
  patient_photo: string;
  created_at: string;
};

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function unwrapData(data: unknown): unknown {
  if (isRecord(data) && data.data !== undefined) return unwrapData(data.data);
  return data;
}

function toNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getSafeId(value: unknown, fallback: string | number): string | number {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function getPayloadMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  const message = payload.message ?? payload.error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function normalizeRatingItem(entry: unknown, index: number): RatingItem {
  if (!isRecord(entry)) {
    return {
      rating_id: index + 1,
      rating: 0,
      comment: "",
      patient_name: "",
      patient_photo: "",
      created_at: "",
    };
  }

  return {
    rating_id: toNumber(entry.rating_id ?? entry.id, index + 1),
    rating: toNumber(entry.rating, 0),
    comment: typeof entry.comment === "string" ? entry.comment : "",
    patient_name:
      typeof entry.patient_name === "string" ? entry.patient_name : "",
    patient_photo:
      typeof entry.patient_photo === "string" ? entry.patient_photo : "",
    created_at: typeof entry.created_at === "string" ? entry.created_at : "",
  };
}

function normalizeRatingsPayload(payload: unknown) {
  const source =
    isRecord(payload) && payload.data !== undefined ? payload.data : payload;
  if (!isRecord(source)) return null;

  const summarySource = isRecord(source.summary) ? source.summary : {};
  const paginationSource = isRecord(source.pagination)
    ? source.pagination
    : {};
  const ratingsSource = Array.isArray(source.ratings) ? source.ratings : [];

  const summary: RatingsSummary = {
    total_ratings: toNumber(
      summarySource.total_ratings ?? summarySource.count ?? source.results,
      0,
    ),
    average_rating: toNumber(
      summarySource.average_rating ?? summarySource.avg_rating,
      0,
    ),
  };

  const pagination: RatingsPagination = {
    page: toNumber(paginationSource.page, 1),
    limit: toNumber(paginationSource.limit, RATINGS_PAGE_SIZE),
    total_pages: toNumber(
      paginationSource.total_pages ?? paginationSource.pages,
      1,
    ),
  };

  const ratings = ratingsSource.map((entry, index) =>
    normalizeRatingItem(entry, index),
  );

  return { summary, pagination, ratings };
}

function normalizeClinic(
  value: unknown,
  fallbackId: string | number,
): ClinicProfileData | null {
  if (!isRecord(value)) return null;

  const clinicId = getSafeId(value.clinic_id ?? value.id, fallbackId);
  const name = typeof value.name === "string" ? value.name : "";
  const location = typeof value.location === "string" ? value.location : "";
  const phone = typeof value.phone === "string" ? value.phone : "";
  const photo =
    typeof value.photo === "string" && value.photo.trim()
      ? value.photo
      : "/images/clinic1.png";
  const totalRatings = toNumber(
    value.total_ratings ?? value.ratings_count,
    0,
  );
  const averageRating = toNumber(value.average_rating ?? value.rating, 0);
  const geoLocation =
    isRecord(value.geo_location) &&
      typeof value.geo_location.latitude === "number" &&
      typeof value.geo_location.longitude === "number"
      ? {
        latitude: value.geo_location.latitude,
        longitude: value.geo_location.longitude,
      }
      : null;

  return {
    clinic_id: clinicId,
    name,
    location,
    phone,
    photo,
    total_ratings: totalRatings,
    average_rating: averageRating,
    geo_location: geoLocation,
  };
}

function normalizeDoctors(value: unknown): ClinicDoctor[] {
  if (!Array.isArray(value)) return [];

  const doctors: ClinicDoctor[] = [];

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) continue;

    const averageRating = toNumber(entry.average_rating ?? entry.rating, 0);
    const totalRatings = toNumber(
      entry.total_ratings ?? entry.ratings_count,
      0,
    );
    const yearsOfExperience = toNumber(entry.years_of_experience, 0);

    doctors.push({
      staff_id: getSafeId(entry.staff_id ?? entry.id, index + 1),
      full_name:
        typeof entry.full_name === "string"
          ? entry.full_name
          : typeof entry.name === "string"
            ? entry.name
            : "",
      role_title: typeof entry.role_title === "string" ? entry.role_title : "",
      specialist: typeof entry.specialist === "string" ? entry.specialist : "",
      work_days: typeof entry.work_days === "string" ? entry.work_days : "",
      work_from: typeof entry.work_from === "string" ? entry.work_from : "",
      work_to: typeof entry.work_to === "string" ? entry.work_to : "",
      consultation_price: toNumber(entry.consultation_price, 0),
      photo: typeof entry.photo === "string" ? entry.photo : null,
      can_be_booked:
        typeof entry.can_be_booked === "number"
          ? entry.can_be_booked
          : entry.can_be_booked
            ? 1
            : 0,
      average_rating: averageRating,
      total_ratings: totalRatings,
      years_of_experience: yearsOfExperience,
    });
  }

  return doctors;
}

function getClinicHours(doctors: ClinicDoctor[]) {
  const withHours = doctors.find(
    (doctor) => doctor.work_from && doctor.work_to,
  );
  if (!withHours) return "";
  return `${withHours.work_from} - ${withHours.work_to}`;
}

function getSafeRating(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating : 0;
}

function RatingStars({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`${className} ${index < roundedRating
              ? "fill-[#f7b731] text-[#f7b731]"
              : "text-[#d7deef]"
            }`}
        />
      ))}
    </div>
  );
}

export default function ClinicDetailsPage() {
  const params = useParams();
  const clinicId = params.id;

  const [visibleDoctors, setVisibleDoctors] = useState(3);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locale, setLocale] = useState(() =>
    typeof window === "undefined"
      ? "en"
      : localStorage.getItem("locale") || "en",
  );
  const [clinicProfile, setClinicProfile] = useState<ClinicProfileData | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [clinicRatings, setClinicRatings] = useState<RatingItem[]>([]);
  const [clinicRatingsSummary, setClinicRatingsSummary] =
    useState<RatingsSummary | null>(null);
  const [clinicRatingsPage, setClinicRatingsPage] = useState(1);
  const [clinicRatingsTotalPages, setClinicRatingsTotalPages] = useState(1);
  const [clinicRatingsLoading, setClinicRatingsLoading] = useState(false);
  const [clinicRatingsError, setClinicRatingsError] = useState("");
  const [clinicRatingValue, setClinicRatingValue] = useState(0);
  const [clinicRatingComment, setClinicRatingComment] = useState("");
  const [clinicRatingSubmitting, setClinicRatingSubmitting] = useState(false);
  const [clinicRatingSubmitError, setClinicRatingSubmitError] = useState("");
  const [clinicRatingSubmitSuccess, setClinicRatingSubmitSuccess] =
    useState("");
  const [clinicRatingsRefreshKey, setClinicRatingsRefreshKey] = useState(0);

  useEffect(() => {
    const handleLocaleChange: EventListener = (event) => {
      setLocale((event as CustomEvent<string>).detail);
    };
    window.addEventListener("localeChange", handleLocaleChange);
    return () => window.removeEventListener("localeChange", handleLocaleChange);
  }, []);

  useEffect(() => {
    setClinicRatingsPage(1);
  }, [clinicId]);

  useEffect(() => {
    async function loadClinicProfile() {
      if (!clinicId) {
        setClinicProfile(null);
        setDoctors([]);
        setProfileError("Clinic not found");
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/clinic/profile?id=${clinicId}`,
        );
        const data = await response.json();

        if (!response.ok) {
          const message =
            data.error || data.message || "Failed to load clinic profile";
          throw new Error(message);
        }

        const unwrapped = unwrapData(data);
        const clinicSource = isRecord(unwrapped)
          ? (unwrapped.clinic ?? unwrapped.profile ?? unwrapped)
          : unwrapped;
        const doctorsSource = isRecord(unwrapped)
          ? (unwrapped.doctors ?? unwrapped.staff ?? [])
          : [];

        setClinicProfile(normalizeClinic(clinicSource, clinicId as string));
        setDoctors(normalizeDoctors(doctorsSource));
      } catch (error: unknown) {
        console.error("Clinic profile fetch error:", error);
        setProfileError(error instanceof Error ? error.message : "Failed to load clinic profile");
        setClinicProfile(null);
        setDoctors([]);
      } finally {
        setProfileLoading(false);
      }
    }

    loadClinicProfile();
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;

    async function loadClinicRatings() {
      setClinicRatingsLoading(true);
      setClinicRatingsError("");

      try {
        const params = new URLSearchParams({
          id: String(clinicId),
          page: String(clinicRatingsPage),
          limit: String(RATINGS_PAGE_SIZE),
        });

        const response = await fetch(
          `/api/ratings/clinic?${params.toString()}`,
          { credentials: "include" },
        );
        const payload = await response.json();

        if (
          !response.ok ||
          (isRecord(payload) &&
            typeof payload.status === "string" &&
            payload.status !== "success") ||
          (isRecord(payload) && payload.success === false)
        ) {
          throw new Error(
            getPayloadMessage(payload, "Failed to load clinic ratings"),
          );
        }

        const normalized = normalizeRatingsPayload(payload);
        if (!active || !normalized) return;

        setClinicRatings(normalized.ratings);
        setClinicRatingsSummary(normalized.summary);
        setClinicRatingsTotalPages(normalized.pagination.total_pages || 1);
      } catch (error: unknown) {
        if (!active) return;
        setClinicRatingsError(
          getErrorMessage(error, "Failed to load clinic ratings"),
        );
      } finally {
        if (active) setClinicRatingsLoading(false);
      }
    }

    loadClinicRatings();

    return () => {
      active = false;
    };
  }, [clinicId, clinicRatingsPage, clinicRatingsRefreshKey]);

  const clinic = clinicProfile;
  const clinicSpecialties = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.specialist)
        .filter((specialty) => specialty),
    ),
  );
  const clinicHours = getClinicHours(doctors);
  const baseRatingValue = getSafeRating(clinic?.average_rating);
  const baseRatingCount = clinic?.total_ratings ?? 0;
  const summaryRatingCount = clinicRatingsSummary?.total_ratings ?? 0;
  const summaryRatingValue = getSafeRating(
    clinicRatingsSummary?.average_rating,
  );
  const hasSummary = clinicRatingsSummary !== null;
  const ratingValue = hasSummary ? summaryRatingValue : baseRatingValue;
  const ratingCount = hasSummary ? summaryRatingCount : baseRatingCount;
  const mapSrc = clinic?.geo_location
    ? `https://maps.google.com/maps?q=${clinic.geo_location.latitude},${clinic.geo_location.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
      clinic?.location || "Cairo",
    )}&z=12&output=embed`;

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpecialty =
      selectedSpecialty === "" || doc.specialist?.includes(selectedSpecialty);
    const matchesGender = true;
    const matchesSearch =
      searchQuery === "" ||
      doc.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesGender && matchesSearch;
  });

  const handleClinicRatingSubmit = async () => {
    if (!clinicId || clinicRatingSubmitting) return;

    setClinicRatingSubmitError("");
    setClinicRatingSubmitSuccess("");

    if (clinicRatingValue < 1 || clinicRatingValue > 5) {
      setClinicRatingSubmitError(
        locale === "en"
          ? "برجاء اختيار تقييم من ١ إلى ٥."
          : "Please select a rating from 1 to 5.",
      );
      return;
    }

    setClinicRatingSubmitting(true);

    try {
      const response = await fetch(`/api/ratings/clinic?id=${clinicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating: clinicRatingValue,
          comment: clinicRatingComment.trim() || undefined,
        }),
      });

      const payload = await response.json();

      if (
        !response.ok ||
        (isRecord(payload) &&
          typeof payload.status === "string" &&
          payload.status !== "success") ||
        (isRecord(payload) && payload.success === false)
      ) {
        throw new Error(
          getPayloadMessage(payload, "Failed to submit clinic rating"),
        );
      }

      setClinicRatingSubmitSuccess(
        locale === "en"
          ? "تم إرسال التقييم بنجاح."
          : "Rating submitted successfully.",
      );
      setClinicRatingComment("");
      setClinicRatingValue(0);
      setClinicRatingsPage(1);
      setClinicRatingsRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      setClinicRatingSubmitError(
        getErrorMessage(
          error,
          locale === "en"
            ? "تعذر إرسال التقييم."
            : "Failed to submit rating.",
        ),
      );
    } finally {
      setClinicRatingSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto pt-32 pb-12 px-4">
          <div className="flex justify-center items-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001A6E]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (profileError || !clinic) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto pt-32 pb-12 px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg text-center">
            <p>{profileError || "Clinic not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-16 overflow-hidden rounded-[32px] border border-[#dce5f6] bg-white shadow-[0_24px_70px_rgba(20,45,100,0.10)]">
          <div
            className={`grid gap-0 lg:grid-cols-[1.05fr_0.95fr] ${locale === "en" ? "lg:[direction:rtl]" : ""
              }`}
          >
            <div className="relative min-h-[340px] overflow-hidden bg-[#eaf0fb] lg:min-h-[520px]">
              <Image
                src={clinic.photo}
                alt={clinic.name}
                width={900}
                height={640}
                className="h-full min-h-[340px] w-full object-cover lg:min-h-[520px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#06123d]/80 to-transparent p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-[#001A6E] shadow-lg">
                  <Star className="h-4 w-4 fill-[#f7b731] text-[#f7b731]" />
                  <span>{ratingValue.toFixed(1)}</span>
                  <span className="text-[#7a88aa]">({ratingCount})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#6d7da7]">
                {t("clinics.aboutClinic", locale)}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight text-[#001A6E] sm:text-4xl">
                {clinic.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff7e3] px-4 py-2 text-sm font-bold text-[#7a4f00]">
                  <RatingStars rating={ratingValue} />
                  <span>{ratingValue.toFixed(1)}</span>
                </div>
                <span className="text-sm font-semibold text-[#7a88aa]">
                  {t("clinics.fromVisitors", locale).replace(
                    "{count}",
                    String(ratingCount),
                  )}
                </span>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-[#40527f] sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4">
                  <MapPin className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                  <span>{clinic.location}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4">
                  <Phone className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                  <span dir="ltr">{clinic.phone}</span>
                </div>
                {clinicHours ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4 sm:col-span-2">
                    <Clock className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                    <span>{clinicHours}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-8">
                <h2 className="mb-4 text-lg font-extrabold text-[#001A6E]">
                  {t("clinics.medicalSpecialties", locale)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {clinicSpecialties.map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[#d8e3ff] bg-white px-4 py-2 text-xs font-bold text-[#1c3faa]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 rounded-[28px] border border-[#dce5f6] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6d7da7]">
                {t("clinics.medicalSpecialties", locale)}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#001A6E]">
                {t("clinics.doctors", locale)}
              </h2>
            </div>
            <div className="rounded-2xl bg-[#f4f7ff] px-4 py-3 text-sm font-bold text-[#001A6E]">
              {filteredDoctors.length} {t("clinics.doctors", locale)}
            </div>
          </div>

          <div className="mb-10 flex flex-wrap gap-4 rounded-3xl bg-[#f6f8fc] p-4">
            <div className="relative min-w-50">
              <select
                className={`w-full appearance-none rounded-2xl border border-[#dce5f6] bg-white py-3 text-sm font-semibold text-[#40527f] focus:border-[#001A6E] focus:outline-none ${locale === "en" ? "px-6" : "px-10"}`}
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">{t("clinics.selectSpecialty", locale)}</option>
                {clinicSpecialties.map((spec, i) => (
                  <option key={i} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute ${locale === "en" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-400`}
              />
            </div>

            <div className="relative min-w-37.5">
              <select
                className={`w-full appearance-none rounded-2xl border border-[#dce5f6] bg-white py-3 text-sm font-semibold text-[#40527f] focus:border-[#001A6E] focus:outline-none ${locale === "en" ? "px-6" : "px-10"}`}
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
              >
                <option value="">{t("clinics.gender", locale)}</option>
                <option value="male">{t("clinics.male", locale)}</option>
                <option value="female">{t("clinics.female", locale)}</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute ${locale === "en" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-400`}
              />
            </div>

            <div className="relative min-w-[220px] flex-1">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("clinics.search", locale)}
                className="h-full min-h-12 w-full rounded-2xl border border-[#dce5f6] bg-white px-5 text-sm font-semibold text-[#40527f] outline-none placeholder:text-[#94a0bd] focus:border-[#001A6E]"
              />
            </div>

            <button className="flex items-center gap-2 rounded-2xl bg-[#001A6E] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[#162f80]">
              <Search className="w-4 h-4" />
              {t("clinics.search", locale)}
            </button>
          </div>

          {profileLoading ? (
            <p className="text-center text-[#001A6E]">جاري تحميل الدكاترة...</p>
          ) : profileError ? (
            <p className="text-center text-red-600">{profileError}</p>
          ) : filteredDoctors.length === 0 ? (
            <p className="text-center text-[#001A6E]">
              لا يوجد دكاترة متاحين في هذه العيادة حالياً
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDoctors.slice(0, visibleDoctors).map((doc) => {
                  const doctorRating = getSafeRating(doc.average_rating ?? 0);

                  return (
                    <DoctorCard
                      key={doc.staff_id}
                      id={doc.staff_id}
                      clinicId={clinic.clinic_id}
                      name={doc.full_name}
                      specialty={doc.specialist || ""}
                      rating={Number(doctorRating.toFixed(1))}
                      price={doc.consultation_price}
                      experience={doc.years_of_experience ?? 0}
                      imageSrc={doc.photo || ""}
                    />
                  );
                })}
              </div>

              {visibleDoctors < filteredDoctors.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setVisibleDoctors((prev) => prev + 3)}
                    className="flex items-center gap-2 text-[#001A6E] font-bold hover:opacity-80"
                  >
                    {t("clinics.moreDoctors", locale)}
                    <ChevronDown className="w-5 h-5 animate-bounce" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-2xl font-extrabold text-[#001A6E]">
            {t("clinics.clinicLocation", locale)}
          </h2>
          <div className="relative h-96 overflow-hidden rounded-[28px] border border-[#dce5f6] bg-white shadow-sm">
            <iframe
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dce5f6] bg-white p-6 text-center shadow-sm sm:p-10">
          <h2 className="mb-8 text-2xl font-extrabold text-[#001A6E]">
            {t("clinics.patientReviews", locale)}
          </h2>

          <div className="mx-auto max-w-sm rounded-3xl bg-[#f6f8fc] p-8">
            <div className="mb-4 flex justify-center">
              <RatingStars rating={ratingValue} className="h-7 w-7" />
            </div>
            <p className="text-4xl font-extrabold text-[#001A6E]">
              {ratingValue.toFixed(1)}
            </p>
            <p className="mt-2 text-base font-bold text-gray-800">
              {t("clinics.overallRating", locale)}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {t("clinics.fromVisitors", locale).replace(
                "{count}",
                String(ratingCount),
              )}
            </p>
          </div>

          <div className="mt-10">
            {clinicRatingsLoading ? (
              <p className="text-center text-[#001A6E]">
                {locale === "en" ? "جاري تحميل التقييمات..." : "Loading ratings..."}
              </p>
            ) : clinicRatingsError ? (
              <p className="text-center text-red-600">{clinicRatingsError}</p>
            ) : clinicRatings.length === 0 ? (
              <p className="text-center text-gray-400">
                {locale === "en"
                  ? "لا توجد تقييمات بعد."
                  : "No reviews yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {clinicRatings.map((review) => (
                  <div
                    key={review.rating_id}
                    className="bg-linear-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-left"
                  >
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(review.rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200"
                            }`}
                        />
                      ))}
                    </div>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[#eaf0fb]">
                        {review.patient_photo ? (
                          <img
                            src={review.patient_photo}
                            alt={review.patient_name || "Patient"}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <p className="text-xs font-semibold text-gray-500">
                        {review.patient_name ||
                          (locale === "en" ? "مريض" : "Patient")}
                      </p>
                    </div>
                    {review.comment ? (
                      <p className="text-gray-600 text-sm leading-relaxed">
                        &quot;{review.comment}&quot;
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        {locale === "en" ? "بدون تعليق" : "No comment"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {clinicRatingsTotalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setClinicRatingsPage((prev) => Math.max(1, prev - 1))
                }
                disabled={clinicRatingsPage <= 1}
                className="rounded-full border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-[#001A6E] disabled:opacity-50"
              >
                {locale === "en" ? "السابق" : "Previous"}
              </button>
              <span className="text-sm text-gray-500">
                {locale === "en"
                  ? `صفحة ${clinicRatingsPage} من ${clinicRatingsTotalPages}`
                  : `Page ${clinicRatingsPage} of ${clinicRatingsTotalPages}`}
              </span>
              <button
                onClick={() =>
                  setClinicRatingsPage((prev) =>
                    Math.min(clinicRatingsTotalPages, prev + 1),
                  )
                }
                disabled={clinicRatingsPage >= clinicRatingsTotalPages}
                className="rounded-full border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-[#001A6E] disabled:opacity-50"
              >
                {locale === "en" ? "التالي" : "Next"}
              </button>
            </div>
          )}

          <div className="mt-10 border-t border-[#e6ecf6] pt-8">
            <h3 className="text-lg font-bold text-[#001A6E] mb-4">
              {locale === "en" ? "قيّم هذه العيادة" : "Rate this clinic"}
            </h3>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setClinicRatingValue(value)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${value <= clinicRatingValue
                          ? "text-[#f7b731] fill-[#f7b731]"
                          : "text-[#d7deef]"
                        }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={clinicRatingComment}
                onChange={(event) => setClinicRatingComment(event.target.value)}
                placeholder={
                  locale === "en"
                    ? "اكتب تعليقك هنا"
                    : "Write your comment (optional)"
                }
                rows={3}
                className="w-full rounded-2xl border border-[#dce5f6] px-4 py-3 text-sm text-gray-600 outline-none focus:border-[#001A6E]"
              />
              {clinicRatingSubmitError ? (
                <p className="text-sm text-red-600">
                  {clinicRatingSubmitError}
                </p>
              ) : null}
              {clinicRatingSubmitSuccess ? (
                <p className="text-sm text-green-600">
                  {clinicRatingSubmitSuccess}
                </p>
              ) : null}
              <button
                onClick={handleClinicRatingSubmit}
                disabled={clinicRatingSubmitting}
                className="rounded-2xl bg-[#001A6E] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition-colors hover:bg-[#162f80] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {clinicRatingSubmitting
                  ? locale === "en"
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : locale === "en"
                    ? "إرسال التقييم"
                    : "Submit rating"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
