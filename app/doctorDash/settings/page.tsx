"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Star,
  User,
  Clock,
  Stethoscope,
  Calendar,
  DollarSign,
  ChevronLeft,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EditProfileForm, { DoctorEditableProfile } from "./EditProfileForm";

const GeoLocationMap = dynamic(() => import("./GeoLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="doctor-map-loading">
      <div className="doctor-map-loading-inner">
        <div className="doctor-map-pulse" />
        <span>جاري تحميل الخريطة...</span>
      </div>
    </div>
  ),
});

type DoctorProfileData = {
  photo?: string | null;
  full_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  bio?: string | null;
  location?: string | null;
  specialist?: string | null;
  work_days?: string | null;
  work_from?: string | null;
  work_to?: string | null;
  consultation_price?: number | string | null;
  years_of_experience?: number | string | null;
  total_ratings?: number | string | null;
  average_rating?: number | string | null;
  is_verified?: boolean | null;
  geo_location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  licence?: string | null;
};

const DAY_LABELS: Record<string, string> = {
  sun: "الأحد",
  mon: "الاثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
  sat: "السبت",
};

const DEFAULT_GEO_LOCATION = {
  latitude: 30.0444,
  longitude: 31.2357,
};

function valueOrDash(value: unknown) {
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function toNumberOrEmpty(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : "";
}

function formatWorkDays(workDays?: string | null) {
  if (!workDays) return "—";
  return workDays
    .split(",")
    .map((day) => DAY_LABELS[day.trim()] || day.trim())
    .filter(Boolean)
    .join(" · ");
}

function formatTimeToAmPm(value?: string | null) {
  if (!value) return "—";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour) || !minuteText) return value;
  const period = hour >= 12 ? "م" : "ص";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${minuteText.padStart(2, "0")} ${period}`;
}

function buildInitialData(profile: DoctorProfileData): DoctorEditableProfile {
  return {
    photo: profile.photo || null,
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    gender: profile.gender || "",
    years_of_experience: toNumberOrEmpty(profile.years_of_experience),
    bio: profile.bio || "",
    work_days: profile.work_days || "",
    work_from: profile.work_from || "",
    work_to: profile.work_to || "",
    consultation_price: toNumberOrEmpty(profile.consultation_price),
    location: profile.location || "",
    geo_location: {
      latitude: toNumberOrEmpty(profile.geo_location?.latitude),
      longitude: toNumberOrEmpty(profile.geo_location?.longitude),
    },
    specialist: profile.specialist || "",
  };
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "gold" | "green" | "blue";
}) {
  const accentClasses = {
    gold: "ds-stat-gold",
    green: "ds-stat-green",
    blue: "ds-stat-blue",
  };
  return (
    <div className={`ds-stat-card ${accentClasses[accent]}`}>
      <div className="ds-stat-icon">{icon}</div>
      <div className="ds-stat-value">{value}</div>
      <div className="ds-stat-label">{label}</div>
    </div>
  );
}

// ─── Info Row ───────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="ds-info-row">
      <div className="ds-info-content">
        <div className="ds-info-value">{value}</div>
        <span className="ds-info-label">{label}</span>
      </div>
      <div className="ds-info-icon">{icon}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DoctorSettingsPage() {
  const { user, loading, updateUser } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profileOverride, setProfileOverride] =
    useState<DoctorProfileData | null>(null);

  const userPhoto =
    user && "photo" in user && typeof user.photo === "string"
      ? user.photo
      : null;

  const profileData: DoctorProfileData = {
    ...((user?.profile as DoctorProfileData | undefined) || {}),
    photo: userPhoto,
    ...(profileOverride || {}),
  };

  const mapLatitude = toNumberOrEmpty(profileData.geo_location?.latitude);
  const mapLongitude = toNumberOrEmpty(profileData.geo_location?.longitude);
  const resolvedLatitude =
    mapLatitude === "" ? DEFAULT_GEO_LOCATION.latitude : mapLatitude;
  const resolvedLongitude =
    mapLongitude === "" ? DEFAULT_GEO_LOCATION.longitude : mapLongitude;

  const initials = useMemo(() => {
    const name = profileData.full_name?.trim();
    if (!name) return "";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
  }, [profileData.full_name]);

  const handleEditSuccess = (updatedProfile: Record<string, unknown>) => {
    const profileUpdate = updatedProfile as DoctorProfileData;
    setProfileOverride((prev) => ({
      ...(prev || profileData),
      ...profileUpdate,
    }));
    if (updateUser && user) {
      const mergedProfile = {
        ...((user.profile as DoctorProfileData) || {}),
        ...profileUpdate,
      };
      updateUser({
        ...user,
        profile: mergedProfile,
        ...(typeof profileUpdate.photo === "string"
          ? { photo: profileUpdate.photo }
          : {}),
      });
    }
  };

  if (loading) {
    return (
      <div className="ds-loading">
        <div className="ds-loading-spinner" />
        <p>جاري تحميل بياناتك...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ── Google Fonts ── */
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700&display=swap');

        /* ── Design Tokens ── */
        :root {
          --ds-teal:        #0d9488;
          --ds-teal-light:  #14b8a6;
          --ds-teal-glow:   rgba(13,148,136,0.09);
          --ds-teal-border: rgba(13,148,136,0.2);
          --ds-gold:        #f59e0b;
          --ds-gold-soft:   rgba(245,158,11,0.08);
          --ds-gold-border: rgba(245,158,11,0.18);
          --ds-green:       #10b981;
          --ds-green-soft:  rgba(16,185,129,0.08);
          --ds-green-border:rgba(16,185,129,0.18);
          --ds-blue:        #3b82f6;
          --ds-blue-soft:   rgba(59,130,246,0.08);
          --ds-blue-border: rgba(59,130,246,0.18);
          --ds-bg:          #f5f7fa;
          --ds-card:        #ffffff;
          --ds-border:      #e8edf3;
          --ds-border-hover:#d0dae8;
          --ds-text-primary:   #0f172a;
          --ds-text-secondary: #475569;
          --ds-text-muted:     #94a3b8;
          --ds-radius:    18px;
          --ds-radius-sm: 10px;
          --ds-shadow:    0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06);
          --ds-shadow-md: 0 2px 8px rgba(0,0,0,0.07), 0 8px 32px rgba(0,0,0,0.07);
        }

        /* ── Loading State ── */
        .ds-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
          color: var(--ds-text-secondary);
          font-family: 'Cairo', sans-serif;
          background: var(--ds-bg);
        }
        .ds-loading-spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--ds-border);
          border-top-color: var(--ds-teal);
          border-radius: 50%;
          animation: ds-spin 0.8s linear infinite;
        }
        @keyframes ds-spin { to { transform: rotate(360deg); } }

        /* ── Page Wrapper ── */
        .ds-page {
          min-height: 100vh;
          background: var(--ds-bg);
          font-family: 'Cairo', sans-serif;
          padding: 32px 24px 60px;
          direction: rtl;
          position: relative;
          overflow-x: hidden;
        }
        .ds-page::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 260px;
          background: linear-gradient(160deg, #e0f2f1 0%, #f0fdf8 50%, #f5f7fa 100%);
          pointer-events: none;
          z-index: 0;
        }
        .ds-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ── Card base ── */
        .ds-card {
          background: var(--ds-card);
          border: 1px solid var(--ds-border);
          border-radius: var(--ds-radius);
          box-shadow: var(--ds-shadow);
          transition: box-shadow 0.25s ease;
        }

        /* ── Hero Card ── */
        .ds-hero {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .ds-hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .ds-hero-identity {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* Avatar */
        .ds-avatar-ring {
          position: relative;
          flex-shrink: 0;
        }
        .ds-avatar-ring::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, var(--ds-teal), #67e8f9, var(--ds-teal));
          animation: ds-spin 6s linear infinite;
          z-index: 0;
        }
        .ds-avatar-ring::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          background: #fff;
          z-index: 1;
        }
        .ds-avatar {
          position: relative;
          z-index: 2;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e0f2f1, #ccfbf1);
          font-size: 36px;
          font-weight: 700;
          color: var(--ds-teal);
          letter-spacing: 2px;
          overflow: hidden;
          font-family: 'Tajawal', sans-serif;
        }
        .ds-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        /* Verified badge */
        .ds-verified-badge {
          position: absolute;
          bottom: 4px;
          left: 4px;
          z-index: 3;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--ds-teal);
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }

        .ds-doc-name {
          font-size: 26px;
          font-weight: 700;
          color: var(--ds-text-primary);
          line-height: 1.2;
          margin: 0;
          font-family: 'Tajawal', sans-serif;
        }
        .ds-doc-specialty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 13px;
          color: var(--ds-teal);
          background: var(--ds-teal-glow);
          border: 1px solid var(--ds-teal-border);
          border-radius: 20px;
          padding: 4px 12px;
          font-weight: 600;
        }

        /* Edit button */
        .ds-edit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid var(--ds-border);
          background: #fff;
          color: var(--ds-text-secondary);
          font-size: 14px;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .ds-edit-btn:hover {
          background: var(--ds-teal-glow);
          border-color: var(--ds-teal-border);
          color: var(--ds-teal);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(13,148,136,0.14);
        }

        /* ── Divider ── */
        .ds-divider {
          height: 1px;
          background: var(--ds-border);
        }

        /* ── Stats Row ── */
        .ds-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ds-stat-card {
          border-radius: 14px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ds-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        .ds-stat-gold {
          background: var(--ds-gold-soft);
          border-color: var(--ds-gold-border);
        }
        .ds-stat-green {
          background: var(--ds-green-soft);
          border-color: var(--ds-green-border);
        }
        .ds-stat-blue {
          background: var(--ds-blue-soft);
          border-color: var(--ds-blue-border);
        }
        .ds-stat-icon { opacity: 0.9; }
        .ds-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--ds-text-primary);
          font-family: 'Tajawal', sans-serif;
        }
        .ds-stat-label {
          font-size: 12px;
          color: var(--ds-text-secondary);
          font-weight: 500;
        }

        /* ── Bottom Grid ── */
        .ds-bottom-grid {
          display: grid;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .ds-bottom-grid {
            grid-template-columns: 1fr 340px;
          }
        }

        /* ── Section header ── */
        .ds-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .ds-section-icon {
          width: 36px; height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ds-teal-glow);
          border: 1px solid var(--ds-teal-border);
          flex-shrink: 0;
        }
        .ds-section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--ds-text-primary);
          font-family: 'Tajawal', sans-serif;
          margin: 0;
        }
        .ds-section-line {
          flex: 1;
          height: 1px;
          background: var(--ds-border);
        }

        /* ── Work Card ── */
        .ds-work-card {
          padding: 28px;
        }
        .ds-work-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }
        .ds-work-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #f8fafc;
          border: 1px solid var(--ds-border);
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 14px;
          color: var(--ds-text-secondary);
        }
        .ds-work-chip strong {
          color: var(--ds-text-primary);
          font-weight: 600;
        }
        .ds-work-chip svg {
          opacity: 0.5;
          flex-shrink: 0;
        }

        .ds-map-wrapper {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--ds-border);
          height: 240px;
        }

        /* Map loading */
        .doctor-map-loading {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
        .doctor-map-loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--ds-text-muted);
          font-size: 13px;
          font-family: 'Cairo', sans-serif;
        }
        .doctor-map-pulse {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--ds-teal-glow);
          border: 2px solid var(--ds-teal);
          animation: ds-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ds-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
        }

        .ds-bio {
          margin-top: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid var(--ds-border);
          font-size: 14px;
          line-height: 1.9;
          color: var(--ds-text-secondary);
          font-family: 'Tajawal', sans-serif;
        }

        /* ── Info Card ── */
        .ds-info-card {
          padding: 28px;
        }
        .ds-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          margin-bottom: 6px;
        }
        .ds-info-row:last-child { margin-bottom: 0; }
        .ds-info-row:hover {
          background: #f8fafc;
          border-color: var(--ds-border);
        }
        .ds-info-icon {
          width: 38px; height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ds-teal-glow);
          border: 1px solid var(--ds-teal-border);
          flex-shrink: 0;
          color: var(--ds-teal);
        }
        .ds-info-content {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          min-width: 0;
        }
        .ds-info-label {
          font-size: 11px;
          color: var(--ds-text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .ds-info-value {
          font-size: 14px;
          color: var(--ds-text-primary);
          font-weight: 600;
          word-break: break-all;
          text-align: right;
          font-family: 'Tajawal', sans-serif;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .ds-page { padding: 16px 12px 48px; }
          .ds-hero { padding: 20px; }
          .ds-avatar { width: 88px; height: 88px; font-size: 26px; }
          .ds-doc-name { font-size: 20px; }
          .ds-stats-row { grid-template-columns: 1fr; gap: 10px; }
          .ds-work-card, .ds-info-card { padding: 20px; }
        }
        @media (max-width: 480px) {
          .ds-hero-top { flex-direction: column; align-items: flex-start; }
          .ds-work-meta { flex-direction: column; }
        }

        /* ── Entrance animations ── */
        @keyframes ds-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ds-inner > * {
          animation: ds-fade-up 0.5s ease forwards;
          opacity: 0;
        }
        .ds-inner > *:nth-child(1) { animation-delay: 0.05s; }
        .ds-inner > *:nth-child(2) { animation-delay: 0.15s; }
      `}</style>

      <div className="ds-page">
        {isEditOpen && (
          <EditProfileForm
            onClose={() => setIsEditOpen(false)}
            initialData={buildInitialData(profileData)}
            onSuccess={handleEditSuccess}
          />
        )}

        <div className="ds-inner">
          {/* ── HERO CARD ── */}
          <div className="ds-card ds-hero">
            <div className="ds-hero-top">
              <div className="ds-hero-identity">
                <div className="ds-avatar-ring">
                  <div className="ds-avatar">
                    {profileData.photo ? (
                      <img
                        src={profileData.photo}
                        alt={profileData.full_name || "Doctor"}
                      />
                    ) : (
                      initials || <User size={36} />
                    )}
                  </div>
                  {profileData.is_verified && (
                    <div className="ds-verified-badge">
                      <BadgeCheck size={14} color="#0d9488" />
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="ds-doc-name">
                    {valueOrDash(profileData.full_name)}
                  </h2>
                  {profileData.specialist && (
                    <div className="ds-doc-specialty">
                      <Stethoscope size={13} />
                      {profileData.specialist}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="ds-edit-btn"
              >
                <Pencil size={14} />
                تعديل الملف الشخصي
              </button>
            </div>

            <div className="ds-divider" />

            <div className="ds-stats-row">
              <StatCard
                accent="gold"
                icon={<Star size={22} fill="#f59e0b" color="#f59e0b" />}
                value={
                  profileData.average_rating
                    ? `${valueOrDash(profileData.average_rating)} / 5`
                    : "—"
                }
                label={`${valueOrDash(profileData.total_ratings)} تقييم`}
              />
              <StatCard
                accent="green"
                icon={<User size={22} color="#10b981" />}
                value={valueOrDash(profileData.years_of_experience)}
                label="سنوات الخبرة"
              />
              <StatCard
                accent="blue"
                icon={
                  <BadgeCheck
                    size={22}
                    color={profileData.is_verified ? "#3b82f6" : "#4a6080"}
                  />
                }
                value={profileData.is_verified ? "موثق" : "غير موثق"}
                label="حالة التوثيق"
              />
            </div>
          </div>

          {/* ── BOTTOM GRID ── */}
          <div className="ds-bottom-grid">
            {/* Work Hours Card */}
            <div className="ds-card ds-work-card">
              <div className="ds-section-header">
                <div className="ds-section-icon">
                  <Clock size={16} color="#0d9488" />
                </div>
                <h3 className="ds-section-title">ساعات العمل والموقع</h3>
                <div className="ds-section-line" />
              </div>

              <div className="ds-work-meta">
                <div className="ds-work-chip">
                  <Calendar size={15} />
                  <strong>{formatWorkDays(profileData.work_days)}</strong>
                </div>
                <div className="ds-work-chip">
                  <Clock size={15} />
                  <strong>
                    {formatTimeToAmPm(profileData.work_from)} &nbsp;–&nbsp;{" "}
                    {formatTimeToAmPm(profileData.work_to)}
                  </strong>
                </div>
                {profileData.consultation_price && (
                  <div className="ds-work-chip">
                    <DollarSign size={15} />
                    سعر الكشف:&nbsp;
                    <strong>{valueOrDash(profileData.consultation_price)}</strong>
                  </div>
                )}
              </div>

              <div className="ds-map-wrapper">
                <GeoLocationMap
                  latitude={resolvedLatitude}
                  longitude={resolvedLongitude}
                  onChange={() => {}}
                />
              </div>

              {profileData.bio && (
                <div className="ds-bio">{valueOrDash(profileData.bio)}</div>
              )}
            </div>

            {/* Personal Info Card */}
            <div className="ds-card ds-info-card">
              <div className="ds-section-header">
                <div className="ds-section-icon">
                  <User size={16} color="#0d9488" />
                </div>
                <h3 className="ds-section-title">المعلومات الشخصية</h3>
              </div>

              <InfoRow
                icon={<Mail size={16} />}
                label="البريد الإلكتروني"
                value={valueOrDash(user?.email)}
              />
              <InfoRow
                icon={<Phone size={16} />}
                label="رقم الهاتف"
                value={valueOrDash(profileData.phone)}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label="العنوان"
                value={valueOrDash(profileData.location)}
              />
              <InfoRow
                icon={<User size={16} />}
                label="الجنس"
                value={valueOrDash(profileData.gender)}
              />
              <InfoRow
                icon={<FileText size={16} />}
                label="مستند الترخيص المهني"
                value={
                  profileData.licence ? (
                    <a
                      href={profileData.licence}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-800 underline font-semibold transition-colors"
                    >
                      عرض مستند الترخيص
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}