"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { motion, Variants } from "framer-motion";
import { useLocale } from "@/lib/hooks";
import { TypeAnimation } from "react-type-animation";

const API_URL = "/api/user/stats";

type StatsData = {
  totalDoctors: number;
  totalPatients: number;
  totalClinics: number;
  totalMedicalUsers: number;
};

async function getAdminStats() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }

  return response.json();
}

const stats = (locale: string, statsData: StatsData) => [
  {
    value: `+${statsData.totalPatients}`,
    label: t("hero.stats.happyPatients", locale),
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: `+${statsData.totalDoctors}`,
    label: t("hero.stats.licensedDoctors", locale),
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    value: "24/7",
    label: t("hero.stats.alwaysAvailable", locale),
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

// framer-motion variants for robust animation state management
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

const descVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

const imageVariants: Variants = {
  hidden: { opacity: 0, x: 80, scale: 1.05 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.9, ease: "easeOut" },
  },
};

export default function Hero() {
  const locale = useLocale();
  const [statsData, setStatsData] = useState<StatsData>({
    totalDoctors: 0,
    totalPatients: 0,
    totalClinics: 0,
    totalMedicalUsers: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getAdminStats();

        setStatsData(data.data);
      } catch (error) {
        console.log("Stats fetch error:", error);
      }
    }

    loadStats();
  }, []);

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="relative overflow-hidden rounded-4xl bg-[#f4f7ff] px-4 pb-8 pt-20 sm:px-8 sm:pt-24"
    >
      {/* Animated Background Glow */}
      <motion.div
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute -top-40 left-1/2 w-125 h-125 -translate-x-1/2 rounded-full bg-[#1c3faa]/10 blur-3xl"
      />

      <div className="absolute inset-0 z-0">
        <Image
          src="/images/landingbackground.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-20"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* LEFT */}
          <div className="space-y-6 text-[#0f1a4f]">
            <motion.p
              variants={itemVariants}
              className="inline-flex items-center rounded-full border border-[#c8d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#2a4fcf]"
            >
              {t("hero.trusted", locale)}
            </motion.p>

            <motion.div
              variants={descVariants}
              className="max-w-xl min-h-[40px] text-base font-bold leading-7 text-[#0f1a4f] sm:text-lg"
            >
              <TypeAnimation
                key={locale} // Re-mount when locale changes
                sequence={[t("hero.aiDescription", locale), 1000]}
                wrapper="span"
                speed={50}
                repeat={0}
              />
            </motion.div>

            <motion.h1
              variants={titleVariants}
              className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
            >
              {t("hero.title", locale)}
              <span className="block text-[#1c4fe0]">
                {t("hero.subtitle", locale)}
              </span>
            </motion.h1>

            <motion.p
              variants={descVariants}
              className="max-w-xl text-sm leading-7 text-[#4a5b88] sm:text-base"
            >
              {t("hero.description", locale)}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/doctors"
                className="rounded-full bg-[#1c3faa] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#162f80]"
              >
                {t("hero.bookNow", locale)}
              </Link>

              <Link
                href="/specialties"
                className="rounded-full border border-[#1c3faa] bg-white px-6 py-3 text-sm font-bold text-[#1c3faa] transition hover:bg-[#edf2ff]"
              >
                {t("hero.exploreSpecialties", locale)}
              </Link>
            </motion.div>
          </div>

          {/* IMAGE */}
          <motion.div
            variants={imageVariants}
            className="mx-auto w-full max-w-md"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_20px_45px_rgba(28,63,170,0.2)] backdrop-blur"
            >
              <div className="relative overflow-hidden rounded-3xl">
                <Image
                  src="/images/landing.png"
                  alt="Doctor"
                  width={640}
                  height={780}
                  className="h-105 w-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* STATS */}
        <motion.div
          variants={containerVariants}
          className="mt-8 grid gap-4 rounded-3xl border border-[#d6e0ff] bg-white/95 p-4 sm:grid-cols-3 sm:p-5"
        >
          {stats(locale, statsData).map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 rounded-2xl bg-[#f7f9ff] px-4 py-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecff] text-[#1f44bf]">
                {stat.icon}
              </span>
              <div>
                <p className="text-lg font-bold text-[#0f1a4f]">{stat.value}</p>
                <p className="text-xs text-[#5c6f9f]">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
