"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DoctorCard from "@/components/home/doctorCard/doctorCard";
import { useEffect, useState, useRef } from "react";
import { t } from "@/i18n";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const BEST_DOCTORS_API_URL = "/api/doctors/best?limit=5";

type BestDoctorApiItem = {
  provider_type?: "doctor" | "staff" | string;
  target_id?: number;
  doctor_id?: number;
  staff_id?: number | null;
  clinic_id?: number | null;
  full_name?: string;
  specialist?: string;
  consultation_price?: number;
  photo?: string | null;
  total_patients?: number;
  average_rating?: number;
};

type BestDoctor = {
  id: string;
  clinicId?: string;
  providerType: "doctor" | "staff";
  name: string;
  specialty: string;
  rating: number;
  price: number;
  experience: number;
  imageSrc?: string;
};

function mapBestDoctor(doctor: BestDoctorApiItem): BestDoctor {
  const providerType = doctor.provider_type === "staff" ? "staff" : "doctor";
  const rawId = providerType === "staff"
    ? (doctor.staff_id ?? doctor.target_id)
    : (doctor.doctor_id ?? doctor.target_id);
  const id = rawId ? String(rawId) : "";
  const rating = Number(doctor.average_rating ?? 0);

  return {
    id,
    clinicId: doctor.clinic_id ? String(doctor.clinic_id) : undefined,
    providerType,
    name: doctor.full_name || "",
    specialty: doctor.specialist || "",
    rating: Number.isFinite(rating) ? rating : 0,
    price: Number(doctor.consultation_price ?? 0),
    experience: Number(doctor.total_patients ?? 0),
    imageSrc: doctor.photo?.trim() || undefined,
  };
}

function getBestDoctorProfileHref(doctor: BestDoctor) {
  if (doctor.providerType === "doctor") {
    return `/doctors/${doctor.id}`;
  }

  if (doctor.clinicId) {
    return `/clinics/${doctor.clinicId}/book/${doctor.id}?from=home`;
  }

  return "";
}

export default function BestDoctors() {
  const [locale, setLocale] = useState("ar");
  const [bestDoctorsData, setBestDoctorsData] = useState<BestDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function onLocale(event: Event) {
      setLocale((event as CustomEvent<string>).detail || "ar");
    }
    window.addEventListener("localeChange", onLocale as EventListener);
    return () =>
      window.removeEventListener("localeChange", onLocale as EventListener);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchBestDoctors() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(BEST_DOCTORS_API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch best doctors");
        }

        const data = (await response.json()) as {
          doctors?: BestDoctorApiItem[];
        };

        setBestDoctorsData(
          (data.doctors || []).slice(0, 5).map(mapBestDoctor)
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Best doctors fetch error:", error);
        setError("Failed to load best doctors");
      } finally {
        setLoading(false);
      }
    }

    fetchBestDoctors();

    return () => controller.abort();
  }, []);
  
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="rounded-[30px] border border-[#d8e3ff] bg-white px-4 py-10 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="mb-10 text-center"
      >
        <h2 className="text-2xl font-extrabold text-[#001a6e] sm:text-3xl">
          {t("bestDoctors.title", locale)}
        </h2>

        <p className="mt-2 text-sm text-[#6d7da7]">
          {t("bestDoctors.subtitle", locale)}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className={`mb-8 flex justify-between`}
      >
        <div className="flex items-center justify-between gap-4">
          <div ref={nextRef}  className="flex items-center gap-4 rounded-full border border-[#d1ddff] px-3 py-2 text-sm font-semibold text-[#001a6e] transition hover:bg-[#f4f7ff] cursor-pointer">
            <ChevronRight />
          </div>
          <div ref={prevRef}  className="flex items-center gap-4 rounded-full border border-[#d1ddff] px-3 py-2 text-sm font-semibold text-[#001a6e] transition hover:bg-[#f4f7ff] cursor-pointer">
            <ChevronLeft />
          </div>
        </div>
        <Link
          href="/specialties"
          className="inline-flex items-center gap-2 rounded-full border border-[#d1ddff] px-4 py-2 text-sm font-semibold text-[#001a6e] transition hover:bg-[#f4f7ff]"
        >
          {t("bestDoctors.viewAll", locale)}
          {locale === "en" ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </Link>
      </motion.div>

      <div className=" w-full overflow-hidden">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[420px] animate-pulse rounded-3xl border border-[#d9e3ff] bg-[#f5f8ff]"
            />
          ))}

        {!loading && error && (
          <p className="col-span-full text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <div className="w-full overflow-hidden">
          <Swiper
            spaceBetween={20}
            modules={[Navigation]}
            breakpoints={{
              0: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper) => {
              // @ts-ignore
              swiper.params.navigation.prevEl = prevRef.current;
              // @ts-ignore
              swiper.params.navigation.nextEl = nextRef.current;
            }}
          >
            {!loading &&
              !error &&
              bestDoctorsData.map((doc, i) => (
                <SwiperSlide
                  key={`${doc.providerType}-${doc.clinicId}-${doc.id}`}
                >
                  <motion.div
                    key={`${doc.providerType}-${doc.clinicId}-${doc.id}`}
                    initial={{ opacity: 0, y: 60 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.12,
                      ease: "easeOut",
                    }}
                  >
                    <DoctorCard
                      id={doc.id}
                      clinicId={doc.clinicId}
                      name={doc.name}
                      specialty={doc.specialty}
                      rating={doc.rating}
                      price={doc.price}
                      experience={doc.experience}
                      imageSrc={doc.imageSrc}
                      isFromHome={true}
                      profileHref={getBestDoctorProfileHref(doc)}
                    />
                  </motion.div>
                </SwiperSlide>
              ))}
          </Swiper>
        </div>
      </div>
    </motion.section>
  );
}
