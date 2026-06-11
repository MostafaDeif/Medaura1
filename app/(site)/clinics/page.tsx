"use client";
import { useEffect, useState } from "react";
import ClinicCard from "@/components/clinics/ClinicCard";
import { ChevronDown } from "lucide-react";
import { t } from "@/i18n";

type GeoLocation = {
  latitude: number;
  longitude: number;
};

type ApiClinic = {
  clinic_id?: number;
  id?: number;
  name?: string;
  location?: string;
  phone?: string;
  photo?: string | null;
  doctors_count?: number | null;
  total_ratings?: number | null;
  average_rating?: number | null;
  geo_location?: GeoLocation | null;
};

type ClinicCardData = {
  clinic_id: number;
  name: string;
  location: string;
  phone: string;
  photo: string;
  doctors_count: number;
  total_ratings: number;
  average_rating: number;
  geo_location: GeoLocation | null;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function extractClinics(payload: unknown): ApiClinic[] {
  if (Array.isArray(payload)) return payload as ApiClinic[];
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.clinics)) return payload.clinics as ApiClinic[];

  const data = payload.data;
  if (Array.isArray(data)) return data as ApiClinic[];
  if (isRecord(data) && Array.isArray(data.clinics)) {
    return data.clinics as ApiClinic[];
  }

  return [];
}

function toNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeClinic(clinic: ApiClinic, index: number): ClinicCardData | null {
  const clinicId = clinic.clinic_id ?? clinic.id ?? index + 1;
  const name = typeof clinic.name === "string" ? clinic.name : "";
  const location = typeof clinic.location === "string" ? clinic.location : "";
  const phone = typeof clinic.phone === "string" ? clinic.phone : "";
  const photo =
    typeof clinic.photo === "string" && clinic.photo.trim()
      ? clinic.photo
      : "/images/clinic1.png";

  return {
    clinic_id: clinicId,
    name,
    location,
    phone,
    photo,
    doctors_count: toNumber(clinic.doctors_count, 0),
    total_ratings: toNumber(clinic.total_ratings, 0),
    average_rating: toNumber(clinic.average_rating, 0),
    geo_location: clinic.geo_location ?? null,
  };
}

export default function Page() {
  const [clinics, setClinics] = useState<ClinicCardData[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [locale, setLocale] = useState("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored) setLocale(stored);

    const handleLocaleChange = (e: any) => setLocale(e.detail);
    window.addEventListener("localeChange", handleLocaleChange);
    return () => window.removeEventListener("localeChange", handleLocaleChange);
  }, []);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try the correct endpoint patterns
        const endpoints = [
          "/api/clinics",
          "/api/clinic/list",
          "/api/clinic",
        ];

        let data: unknown = null;
        let lastError = "";

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint);
            if (response.ok) {
              data = await response.json();
              break;
            }
          } catch {
            lastError = `Cannot connect to ${endpoint}`;
          }
        }

        if (!data) {
          throw new Error(lastError || "فشل في جلب العيادات");
        }

        const list = extractClinics(data);
        const normalized = list
          .map((clinic, index) => normalizeClinic(clinic, index))
          .filter((clinic): clinic is ClinicCardData => Boolean(clinic));

        setClinics(normalized);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "حدث خطأ في تحميل العيادات";
        setError(errorMessage);
        console.error("Error fetching clinics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  const loadMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  return (
    <div className="bg-white pt-24 pb-12">
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#001A6E]">
              {t("clinics.title", locale)}
            </h1>
            <p className="text-gray-400 text-lg md:text-xl">
              {t("clinics.subtitle", locale)}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center min-h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001A6E]"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg text-center">
              <p>{error}</p>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && (
            <>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {clinics.slice(0, visibleCount).map((clinic) => (
                  <ClinicCard key={clinic.clinic_id} clinic={clinic} />
                ))}
              </div>

              {/* Load More */}
              {visibleCount < clinics.length && (
                <div className="flex justify-center mt-16">
                  <button
                    onClick={loadMore}
                    className="flex flex-col items-center gap-2 text-[#001A6E] font-bold hover:opacity-80 transition-opacity"
                  >
                    <span>{t("clinics.loadMore", locale)}</span>
                    <ChevronDown className="w-6 h-6 animate-bounce" />
                  </button>
                </div>
              )}

              {/* Empty State */}
              {clinics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No clinics found</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
