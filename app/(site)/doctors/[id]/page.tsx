"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, Star, MessageSquare, Phone } from "lucide-react";
import DatePicker from "@/components/booking/DatePicker";
import TimePicker from "@/components/booking/TimePicker";
import ValidationModal from "@/components/booking/ValidationModal";
import { t } from "@/i18n";
import Swal from "sweetalert2";

const DOCTOR_FALLBACK_IMAGE = "/images/blank-profile-picture.png";
const API_BASE_URL = "/api";
const RATINGS_PAGE_SIZE = 4;

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

function parseWorkDays(workDaysString?: string): string[] | undefined {
  if (!workDaysString) return undefined;
  return workDaysString
    .split(/[,/|]/)
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);
}

type DoctorProfileData = {
  id?: number;
  doctor_id?: number;
  full_name?: string;
  specialist?: string;
  work_days?: string;
  work_from?: string;
  work_to?: string;
  consultation_price?: number;
  photo?: string | null;
  image?: string | null;
  location?: string;
  clinic_id?: number;
  average_rating?: number;
  rating?: number;
  total_ratings?: number;
  bio?: string;
  can_be_booked?: number | boolean;
  geo_location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  phone?: string | null;
  email?: string | null;
};

type BookingSlot = {
  from: string;
  to: string;
  available: boolean;
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

function normalizeDoctor(data: unknown): DoctorProfileData | null {
  const unwrapped = unwrapData(data);
  if (!isRecord(unwrapped)) return null;
  const doc = (unwrapped.doctor || unwrapped.profile || unwrapped) as any;
  return {
    ...doc,
    phone: doc.phone ?? doc.profile?.phone ?? null,
  };
}

function normalizeSlots(data: unknown): BookingSlot[] {
  const unwrapped = unwrapData(data);
  const slots = Array.isArray(unwrapped)
    ? unwrapped
    : isRecord(unwrapped) && Array.isArray(unwrapped.slots)
      ? unwrapped.slots
      : [];

  return slots
    .map((slot): BookingSlot => {
      const record = isRecord(slot) ? slot : {};
      const from = String(record.from || record.time || record.booking_from || "");
      return {
        from,
        to: String(record.to || ""),
        available: Boolean(record.available ?? record.is_available ?? true),
      };
    })
    .filter((slot: BookingSlot) => slot.from);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
    rating_id: entry.rating_id ?? entry.id ?? index + 1,
    rating: Number(entry.rating ?? 0),
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
    total_ratings: Number(
      summarySource.total_ratings ?? summarySource.count ?? source.results ?? 0,
    ),
    average_rating: Number(
      summarySource.average_rating ?? summarySource.avg_rating ?? 0,
    ),
  };

  const pagination: RatingsPagination = {
    page: Number(paginationSource.page ?? 1),
    limit: Number(paginationSource.limit ?? RATINGS_PAGE_SIZE),
    total_pages: Number(
      paginationSource.total_pages ?? paginationSource.pages ?? 1,
    ),
  };

  const ratings = ratingsSource.map((entry, index) =>
    normalizeRatingItem(entry, index),
  );

  return { summary, pagination, ratings };
}

function formatDisplayDate(date: string, locale: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

const DAY_INDEX_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  fri: 5,
  sat: 6,
};

function formatDayToken(token: string, locale: string) {
  const trimmed = token.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/\.$/, "");
  const index = DAY_INDEX_MAP[normalized];

  if (index !== undefined) {
    const base = new Date("2024-01-07T00:00:00");
    base.setDate(base.getDate() + index);

    return new Intl.DateTimeFormat(locale === "en" ? "ar-EG" : "en-US", {
      weekday: "long",
    }).format(base);
  }

  if (trimmed.length < 2) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatWorkingDays(value: string, locale: string) {
  if (!value) return "";

  const parts = value
    .split(/[,/|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.includes("-")) {
        const [start, end] = part.split("-");
        return `${formatDayToken(start, locale)} - ${formatDayToken(end, locale)}`.trim();
      }
      return formatDayToken(part, locale);
    })
    .filter(Boolean);

  return parts.join(", ");
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

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [locale, setLocale] = useState("en");
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [doctorRatings, setDoctorRatings] = useState<RatingItem[]>([]);
  const [doctorRatingsSummary, setDoctorRatingsSummary] =
    useState<RatingsSummary | null>(null);
  const [doctorRatingsPage, setDoctorRatingsPage] = useState(1);
  const [doctorRatingsTotalPages, setDoctorRatingsTotalPages] = useState(1);
  const [doctorRatingsLoading, setDoctorRatingsLoading] = useState(false);
  const [doctorRatingsError, setDoctorRatingsError] = useState("");
  const [doctorRatingValue, setDoctorRatingValue] = useState(0);
  const [doctorRatingComment, setDoctorRatingComment] = useState("");
  const [doctorRatingSubmitting, setDoctorRatingSubmitting] = useState(false);
  const [doctorRatingSubmitError, setDoctorRatingSubmitError] = useState("");
  const [doctorRatingSubmitSuccess, setDoctorRatingSubmitSuccess] = useState("");
  const [doctorRatingsRefreshKey, setDoctorRatingsRefreshKey] = useState(0);
  const [validationModalData, setValidationModalData] = useState<{
    type: "success" | "warning";
    title: string;
    message: string;
  } | null>(null);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored) setLocale(stored);

    const handleLocaleChange: EventListener = (event) => {
      setLocale((event as CustomEvent<string>).detail);
    };
    window.addEventListener("localeChange", handleLocaleChange);
    return () => window.removeEventListener("localeChange", handleLocaleChange);
  }, []);

  useEffect(() => {
    setDoctorRatingsPage(1);
  }, [doctorId]);

  useEffect(() => {
    async function loadProfile() {
      if (!doctorId) {
        setProfileError(t("clinics.notFound", locale));
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/doctors/profile?id=${doctorId}`,
          {
            credentials: "include",
          }
        );
        const payload = await response.json();

        if (!response.ok || payload.success === false) {
          throw new Error(
            payload.error || payload.message || "Failed to load doctor profile"
          );
        }

        setDoctor(normalizeDoctor(payload));
      } catch (error: unknown) {
        console.error("Doctor profile fetch error:", error);
        setProfileError(
          getErrorMessage(error, "Failed to load doctor profile.")
        );
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [doctorId, locale]);

  useEffect(() => {
    async function loadSlots() {
      if (!doctorId || !selectedDate) {
        setSlots([]);
        return;
      }

      setSlotsLoading(true);
      setSlotsError("");

      try {
        const params = new URLSearchParams({
          doctor_id: String(doctorId),
          booking_date: selectedDate,
        });
        const response = await fetch(`/api/book/slots?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok || payload.success === false) {
          throw new Error(
            payload.error || payload.message || "Failed to load available slots"
          );
        }

        const fetchedSlots = normalizeSlots(payload);
        setSlots(fetchedSlots);
        if (fetchedSlots.length > 0 && fetchedSlots.every(slot => !slot.available)) {
          setFullyBookedDates((prev) => [...new Set([...prev, selectedDate])]);
          setSelectedTime("");
          Swal.fire({
            icon: "warning",
            title: locale === "en" ? "اليوم محجوز بالكامل" : "Fully Booked Day",
            text: locale === "en" 
              ? "عذراً، جميع المواعيد في هذا اليوم محجوزة بالكامل. يرجى اختيار يوم آخر."
              : "Sorry, all booking times on this day are fully booked. Please choose another date.",
            confirmButtonText: locale === "en" ? "موافق" : "OK",
          });
        }
      } catch (error: unknown) {
        console.error("Booking slots fetch error:", error);
        setSlots([]);
        setSlotsError(
          getErrorMessage(error, "Failed to load available times.")
        );
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [doctorId, selectedDate]);

  useEffect(() => {
    if (!doctorId) return;
    let active = true;

    async function loadDoctorRatings() {
      setDoctorRatingsLoading(true);
      setDoctorRatingsError("");

      try {
        const params = new URLSearchParams({
          id: String(doctorId),
          page: String(doctorRatingsPage),
          limit: String(RATINGS_PAGE_SIZE),
        });
        const response = await fetch(
          `/api/ratings/doctor?${params.toString()}`,
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
            getPayloadMessage(payload, "Failed to load doctor ratings"),
          );
        }

        const normalized = normalizeRatingsPayload(payload);
        if (!active || !normalized) return;

        setDoctorRatings(normalized.ratings);
        setDoctorRatingsSummary(normalized.summary);
        setDoctorRatingsTotalPages(normalized.pagination.total_pages || 1);
      } catch (error: unknown) {
        if (!active) return;
        setDoctorRatingsError(
          getErrorMessage(error, "Failed to load doctor ratings"),
        );
      } finally {
        if (active) setDoctorRatingsLoading(false);
      }
    }

    loadDoctorRatings();

    return () => {
      active = false;
    };
  }, [doctorId, doctorRatingsPage, doctorRatingsRefreshKey]);

  const doctorName = doctor?.full_name || "";
  const doctorSpecialist = doctor?.specialist || "";
  const baseRatingValue = Number(doctor?.average_rating ?? doctor?.rating ?? 0);
  const baseRating = Number.isFinite(baseRatingValue) ? baseRatingValue : 0;
  const baseRatingCount = Number(doctor?.total_ratings ?? 0);
  const summaryRatingCount = doctorRatingsSummary?.total_ratings ?? 0;
  const summaryRatingValue = Number(doctorRatingsSummary?.average_rating ?? 0);
  const summaryRating = Number.isFinite(summaryRatingValue)
    ? summaryRatingValue
    : 0;
  const hasSummary = doctorRatingsSummary !== null;
  const rating = hasSummary ? summaryRating : baseRating;
  const ratingCount = hasSummary ? summaryRatingCount : baseRatingCount;
  const canBeBooked =
    doctor?.can_be_booked !== false && doctor?.can_be_booked !== 0;
  const doctorImage =
    doctor?.photo?.trim() ||
    doctor?.image?.trim() ||
    DOCTOR_FALLBACK_IMAGE;
  const formattedWorkingDays = useMemo(
    () => formatWorkingDays(doctor?.work_days || "", locale),
    [doctor?.work_days, locale]
  );
  const displayedDate = useMemo(
    () => formatDisplayDate(selectedDate, locale),
    [locale, selectedDate]
  );

  const mapLatitude = doctor?.geo_location?.latitude;
  const mapLongitude = doctor?.geo_location?.longitude;
  const mapSrc = mapLatitude && mapLongitude
    ? `https://maps.google.com/maps?q=${mapLatitude},${mapLongitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
      doctor?.location || "Cairo",
    )}&z=12&output=embed`;

  const openTimePicker = () => {
    if (!selectedDate) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateOnly.title", locale),
        message: t("booking.validation.selectDateOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    setShowTimePicker(true);
  };

  const handleDoctorRatingSubmit = async () => {
    if (!doctorId || doctorRatingSubmitting) return;

    setDoctorRatingSubmitError("");
    setDoctorRatingSubmitSuccess("");

    if (doctorRatingValue < 1 || doctorRatingValue > 5) {
      setDoctorRatingSubmitError(
        locale === "en"
          ? "برجاء اختيار تقييم من ١ إلى ٥."
          : "Please select a rating from 1 to 5.",
      );
      return;
    }

    setDoctorRatingSubmitting(true);

    try {
      const response = await fetch(`/api/ratings/doctor?id=${doctorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating: doctorRatingValue,
          comment: doctorRatingComment.trim() || undefined,
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
          getPayloadMessage(payload, "Failed to submit doctor rating"),
        );
      }

      setDoctorRatingSubmitSuccess(
        locale === "en"
          ? "تم إرسال التقييم بنجاح."
          : "Rating submitted successfully.",
      );
      setDoctorRatingComment("");
      setDoctorRatingValue(0);
      setDoctorRatingsPage(1);
      setDoctorRatingsRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      setDoctorRatingSubmitError(
        getErrorMessage(
          error,
          locale === "en"
            ? "تعذر إرسال التقييم."
            : "Failed to submit rating.",
        ),
      );
    } finally {
      setDoctorRatingSubmitting(false);
    }
  };

  const handleBookingClick = async () => {
    if (!canBeBooked) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.alreadyBooked.title", locale),
        message: "This doctor is not available for booking right now.",
      });
      setShowValidationModal(true);
      return;
    }

    if (!selectedDate && !selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateTime.title", locale),
        message: t("booking.validation.selectDateTime.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    if (selectedDate && !selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectTimeOnly.title", locale),
        message: t("booking.validation.selectTimeOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    if (!selectedDate && selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateOnly.title", locale),
        message: t("booking.validation.selectDateOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    setIsBooking(true);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          booking_date: selectedDate,
          booking_from: selectedTime,
        }),
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.error || payload.message || "Failed to create booking"
        );
      }

      setValidationModalData({
        type: "success",
        title: t("booking.validation.success.title", locale),
        message: t("booking.validation.success.message", locale)
          .replace("{doctorName}", doctorName)
          .replace("{date}", displayedDate || selectedDate)
          .replace("{time}", selectedTime),
      });
      setShowValidationModal(true);
      setSlots((current) =>
        current.map((slot) =>
          slot.from === selectedTime ? { ...slot, available: false } : slot
        )
      );
    } catch (error: unknown) {
      setValidationModalData({
        type: "warning",
        title: "Could not complete booking",
        message: getErrorMessage(
          error,
          "Something went wrong while creating the booking."
        ),
      });
      setShowValidationModal(true);
    } finally {
      setIsBooking(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-semibold text-[#001A6E]">Loading profile...</p>
      </div>
    );
  }

  if (profileError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-semibold text-red-600">
          {profileError || t("clinics.notFound", locale)}
        </p>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-white pb-16 pt-28">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#001A6E] font-bold mb-8 hover:opacity-80 transition-opacity"
        >
          <ArrowRight className="w-5 h-5" />
          {t("booking.back", locale)}
        </button>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-10">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="w-40 h-40 relative rounded-3xl overflow-hidden shadow-md shrink-0 bg-gray-50">
                <Image
                  src={doctorImage}
                  alt={doctorName}
                  width={320}
                  height={320}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-0 top-0 flex h-6 items-center gap-1 bg-[#001a8d] px-2 text-xs font-bold text-white">
                  {rating.toFixed(1)}
                  <span className="text-[10px] text-[#ffd84d]">★</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#001A6E]">
                    {doctorName}
                  </h1>
                  {formattedWorkingDays && (
                    <span className="text-xs font-semibold text-[#001A6E] bg-blue-50 px-3 py-1 rounded-full">
                      {formattedWorkingDays}
                    </span>
                  )}
                </div>

                <p className="text-gray-500 font-medium">
                  {doctorSpecialist}
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(rating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {rating.toFixed(1)}
                  </span>
                  {ratingCount > 0 && (
                    <span className="text-xs text-gray-400">
                      ({ratingCount})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 mb-1">
                      {t("booking.sessionFee", locale)}
                    </p>
                    <p className="font-bold text-[#001A6E]">
                      {doctor.consultation_price ?? "-"} EGP
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 mb-1">
                      {t("booking.city", locale)}
                    </p>
                    <p className="font-bold text-[#001A6E]">
                      {doctor.location || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-xl font-bold text-[#001A6E] mb-4">
                {t("booking.aboutDoctor", locale)}
              </h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                {doctor.bio || "No bio available."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#001A6E] mb-4">
                {t("clinics.clinicLocation", locale)}
              </h2>
              <div className="relative h-72 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xs">
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
            </section>
          </section>

          <aside className="lg:sticky lg:top-32">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#001A6E] mb-6">
                {t("booking.bookNow", locale)}
              </h2>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center gap-2 text-sm text-gray-500 border border-gray-100 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-[#001A6E]" />
                  {displayedDate || t("booking.datePlaceholder", locale)}
                </button>
                <button
                  onClick={openTimePicker}
                  className="flex items-center gap-2 text-sm text-gray-500 border border-gray-100 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Clock className="w-4 h-4 text-[#001A6E]" />
                  {selectedTime || t("booking.timePlaceholder", locale)}
                </button>
              </div>

              <button
                onClick={handleBookingClick}
                disabled={isBooking || !canBeBooked}
                className="mt-6 w-full bg-[#001A6E] text-white py-4 rounded-2xl font-bold hover:bg-[#001250] transition-colors shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isBooking ? "Booking..." : t("booking.bookNow", locale)}
              </button>

              {doctor?.phone && (
                <a
                  href={getWhatsAppUrl(doctor.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>{locale === "en" ? "ارسال رساله" : "Send Message"}</span>
                </a>
              )}

              {(doctor.work_from || doctor.work_to) && (
                <p className="mt-4 text-xs text-gray-400">
                  {t("booking.workingHours", locale)} {doctor.work_from || ""}
                  {doctor.work_from && doctor.work_to ? " - " : ""}
                  {doctor.work_to || ""}
                </p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-12 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#001A6E] mb-4">
              {t("booking.patientReviews", locale)}
            </h2>
            <div className="flex flex-col items-center">
              <div className="mb-3">
                <RatingStars rating={rating} className="h-7 w-7" />
              </div>
              <p className="text-4xl font-extrabold text-[#001A6E]">
                {rating.toFixed(1)}
              </p>
              <p className="font-bold text-lg text-gray-800">
                {t("booking.overallRating", locale)}
              </p>
              <p className="text-gray-400 text-sm">
                {ratingCount > 0
                  ? t("clinics.fromVisitors", locale).replace(
                    "{count}",
                    String(ratingCount),
                  )
                  : t("booking.fromVisitors", locale)}
              </p>
            </div>
          </div>

          <div>
            {doctorRatingsLoading ? (
              <p className="text-center text-[#001A6E]">
                {locale === "en" ? "جاري تحميل التقييمات..." : "Loading ratings..."}
              </p>
            ) : doctorRatingsError ? (
              <p className="text-center text-red-600">{doctorRatingsError}</p>
            ) : doctorRatings.length === 0 ? (
              <p className="text-center text-gray-400">
                {locale === "en"
                  ? "لا توجد تقييمات بعد."
                  : "No reviews yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {doctorRatings.map((review) => (
                  <div
                    key={review.rating_id}
                    className="bg-linear-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow text-right"
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
                    <div className="mb-3 flex items-center justify-end gap-3">
                      <p className="text-xs font-semibold text-gray-500">
                        {review.patient_name ||
                          (locale === "en" ? "مريض" : "Patient")}
                      </p>
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[#eaf0fb]">
                        {review.patient_photo ? (
                          <img
                            src={review.patient_photo}
                            alt={review.patient_name || "Patient"}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
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

          {doctorRatingsTotalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setDoctorRatingsPage((prev) => Math.max(1, prev - 1))
                }
                disabled={doctorRatingsPage <= 1}
                className="rounded-full border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-[#001A6E] disabled:opacity-50"
              >
                {locale === "en" ? "السابق" : "Previous"}
              </button>
              <span className="text-sm text-gray-500">
                {locale === "en"
                  ? `صفحة ${doctorRatingsPage} من ${doctorRatingsTotalPages}`
                  : `Page ${doctorRatingsPage} of ${doctorRatingsTotalPages}`}
              </span>
              <button
                onClick={() =>
                  setDoctorRatingsPage((prev) =>
                    Math.min(doctorRatingsTotalPages, prev + 1),
                  )
                }
                disabled={doctorRatingsPage >= doctorRatingsTotalPages}
                className="rounded-full border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-[#001A6E] disabled:opacity-50"
              >
                {locale === "en" ? "التالي" : "Next"}
              </button>
            </div>
          )}

          <div className="mt-10 border-t border-[#e6ecf6] pt-8 text-center">
            <h3 className="text-lg font-bold text-[#001A6E] mb-4">
              {locale === "en" ? "قيّم هذا الطبيب" : "Rate this doctor"}
            </h3>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDoctorRatingValue(value)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${value <= doctorRatingValue
                          ? "text-[#f7b731] fill-[#f7b731]"
                          : "text-[#d7deef]"
                        }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={doctorRatingComment}
                onChange={(event) => setDoctorRatingComment(event.target.value)}
                placeholder={
                  locale === "en"
                    ? "اكتب تعليقك هنا (اختياري)"
                    : "Write your comment (optional)"
                }
                rows={3}
                className="w-full rounded-2xl border border-[#dce5f6] px-4 py-3 text-sm text-gray-600 outline-none focus:border-[#001A6E]"
              />
              {doctorRatingSubmitError ? (
                <p className="text-sm text-red-600">
                  {doctorRatingSubmitError}
                </p>
              ) : null}
              {doctorRatingSubmitSuccess ? (
                <p className="text-sm text-green-600">
                  {doctorRatingSubmitSuccess}
                </p>
              ) : null}
              <button
                onClick={handleDoctorRatingSubmit}
                disabled={doctorRatingSubmitting}
                className="rounded-2xl bg-[#001A6E] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition-colors hover:bg-[#162f80] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {doctorRatingSubmitting
                  ? locale === "en"
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : locale === "en"
                    ? "إرسال التقييم"
                    : "Submit rating"}
              </button>
            </div>
          </div>
        </section>

        {showDatePicker && (
          <DatePicker
            selectedDate={selectedDate}
            allowedDays={parseWorkDays(doctor?.work_days)}
            disabledDates={fullyBookedDates}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime("");
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        {showTimePicker && (
          <TimePicker
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            onSelect={(time) => {
              setSelectedTime(time);
              setShowTimePicker(false);
            }}
            onClose={() => setShowTimePicker(false)}
          />
        )}

        {showValidationModal && validationModalData && (
          <ValidationModal
            type={validationModalData.type}
            title={validationModalData.title}
            message={validationModalData.message}
            onClose={() => setShowValidationModal(false)}
          />
        )}
      </div>
    </main>
  );
}
