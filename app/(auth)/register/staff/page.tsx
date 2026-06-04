"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathByUserType } from "@/lib/utils/redirect";
import {
  getApiErrorMessage,
  getDuplicateEmailValidationMessage,
  isDuplicateEmailError,
} from "@/lib/utils/api-errors";
import type { ClinicProfile, StaffSignupProfile } from "@/lib/types/api";
import { EyeIcon } from "../utils";

const SPECIALTIES = [
  "مخ واعصاب",
  "عظام",
  "الأورام",
  "طب الأذن والأنف والحنجرة",
  "طب العيون",
  "قلب و اوعية دموية",
  "صدر و جهاز تنفسي",
  "كلى",
  "اسنان",
  "اطفال و حديثي الولادة",
  "جلدية",
  "نسا و توليد",
];

const WORK_DAYS = [
  { id: "sat", label: "السبت" },
  { id: "sun", label: "الأحد" },
  { id: "mon", label: "الإثنين" },
  { id: "tue", label: "الثلاثاء" },
  { id: "wed", label: "الأربعاء" },
  { id: "thu", label: "الخميس" },
  { id: "fri", label: "الجمعة" },
];

export default function StaffRegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("");
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [specialist, setSpecialist] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [workFrom, setWorkFrom] = useState("");
  const [workTo, setWorkTo] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function toggleDay(dayId: string) {
    setSelectedDays((current) =>
      current.includes(dayId)
        ? current.filter((d) => d !== dayId)
        : [...current, dayId],
    );
  }

  useEffect(() => {
    async function loadClinics() {
      setLoadingClinics(true);
      try {
        const response = await fetch("/api/clinic", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Failed to fetch clinics");
        const clinicList = Array.isArray(data)
          ? data
          : (data.data ?? data.clinics ?? data.data?.clinics ?? []);
        setClinics(clinicList);
      } catch (error) {
        console.error("Failed to load clinics", error);
      } finally {
        setLoadingClinics(false);
      }
    }
    loadClinics();
  }, []);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) nextErrors.full_name = "الاسم الكامل مطلوب";
    if (!selectedClinic.trim()) nextErrors.name = "اختر العيادة";
    if (!specialist) nextErrors.specialist = "التخصص مطلوب";
    if (selectedDays.length === 0) nextErrors.work_days = "اختر يوم عمل على الأقل";
    if (!workFrom) nextErrors.work_from = "وقت بدء العمل مطلوب";
    if (!workTo) nextErrors.work_to = "وقت انتهاء العمل مطلوب";
    if (!consultationPrice || isNaN(Number(consultationPrice)) || Number(consultationPrice) <= 0)
      nextErrors.consultation_price = "سعر الاستشارة مطلوب";
    if (!email.trim()) nextErrors.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "صيغة البريد غير صحيحة";
    if (!password) nextErrors.password = "كلمة المرور مطلوبة";
    else if (password.length < 6)
      nextErrors.password = "يجب أن تكون كلمة المرور 6 أحرف على الأقل";
    if (password !== confirm) nextErrors.confirm = "كلمات المرور غير متطابقة";
    if (!terms) nextErrors.terms = "يجب الموافقة على الشروط";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const profile: StaffSignupProfile = {
        full_name: fullName.trim(),
        name: selectedClinic,
        role_title: "doctor",
        specialist,
        work_days: selectedDays.join(","),
        work_from: workFrom,
        work_to: workTo,
        consultation_price: Number(consultationPrice),
      };

      const response = await signup({
        email: email.trim(),
        password,
        user_type: "staff",
        profile,
      });

      const redirectPath = getDashboardPathByUserType(response.user_type);
      router.push(redirectPath);
    } catch (error) {
      const message =
        getApiErrorMessage(error) ||
        (error instanceof Error ? error.message : "تعذر إنشاء الحساب، حاول مرة أخرى");

      if (isDuplicateEmailError(error, message)) {
        setErrors({ email: getDuplicateEmailValidationMessage() });
      } else {
        setErrors({ form: message });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setErrors({ form: "التسجيل عبر جوجل غير متاح حاليا" });
  }

  const inputCls = (key: string) =>
    `w-full text-sm sm:text-base border rounded-md px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
      errors[key] ? "border-red-300" : "border-zinc-200"
    }`;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {Object.keys(errors).length > 0 && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 p-3 rounded animate-[shake_0.3s_ease-in-out]"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-medium">يرجى تصحيح الأخطاء التالية:</p>
          <ul className="mt-2 list-disc list-inside">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* الاسم الكامل */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 mb-1">
          الاسم الكامل
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={!!errors.full_name}
          className={inputCls("full_name")}
        />
        {errors.full_name && <p className="text-sm text-red-700 mt-1">{errors.full_name}</p>}
      </div>

      {/* العيادة */}
      <div>
        <label htmlFor="clinic" className="block text-sm font-medium text-zinc-700 mb-1">
          العيادة
        </label>
        <select
          id="clinic"
          name="clinic"
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
          aria-invalid={!!errors.name}
          className={inputCls("name")}
          disabled={loadingClinics}
        >
          <option value="">اختر العيادة</option>
          {clinics.map((clinic, index) => (
            <option key={clinic.id ?? clinic.name ?? index} value={clinic.name}>
              {clinic.name}
            </option>
          ))}
        </select>
        {errors.name && <p className="text-sm text-red-700 mt-1">{errors.name}</p>}
      </div>

      {/* التخصص */}
      <div>
        <label htmlFor="specialist" className="block text-sm font-medium text-zinc-700 mb-1">
          التخصص
        </label>
        <select
          id="specialist"
          name="specialist"
          value={specialist}
          onChange={(e) => setSpecialist(e.target.value)}
          aria-invalid={!!errors.specialist}
          className={inputCls("specialist")}
        >
          <option value="">اختر التخصص...</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.specialist && <p className="text-sm text-red-700 mt-1">{errors.specialist}</p>}
      </div>

      {/* أيام العمل */}
      <div>
        <span className="block text-sm font-medium text-zinc-700 mb-2">أيام العمل</span>
        <div className="flex flex-wrap gap-2">
          {WORK_DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDay(day.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                selectedDays.includes(day.id)
                  ? "bg-indigo-700 text-white border-indigo-700"
                  : "border-zinc-200 text-zinc-600 hover:border-indigo-400"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        {errors.work_days && <p className="text-sm text-red-700 mt-1">{errors.work_days}</p>}
      </div>

      {/* ساعات العمل */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="workFrom" className="block text-sm font-medium text-zinc-700 mb-1">
            من
          </label>
          <input
            id="workFrom"
            type="time"
            value={workFrom}
            onChange={(e) => setWorkFrom(e.target.value)}
            aria-invalid={!!errors.work_from}
            className={inputCls("work_from")}
          />
          {errors.work_from && <p className="text-sm text-red-700 mt-1">{errors.work_from}</p>}
        </div>
        <div>
          <label htmlFor="workTo" className="block text-sm font-medium text-zinc-700 mb-1">
            إلى
          </label>
          <input
            id="workTo"
            type="time"
            value={workTo}
            onChange={(e) => setWorkTo(e.target.value)}
            aria-invalid={!!errors.work_to}
            className={inputCls("work_to")}
          />
          {errors.work_to && <p className="text-sm text-red-700 mt-1">{errors.work_to}</p>}
        </div>
      </div>

      {/* سعر الاستشارة */}
      <div>
        <label htmlFor="consultationPrice" className="block text-sm font-medium text-zinc-700 mb-1">
          سعر الاستشارة (ريال)
        </label>
        <input
          id="consultationPrice"
          type="number"
          min="1"
          step="1"
          placeholder="مثال: 150"
          value={consultationPrice}
          onChange={(e) => setConsultationPrice(e.target.value)}
          aria-invalid={!!errors.consultation_price}
          className={inputCls("consultation_price")}
        />
        {errors.consultation_price && (
          <p className="text-sm text-red-700 mt-1">{errors.consultation_price}</p>
        )}
      </div>

      {/* البريد الإلكتروني */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          className={inputCls("email")}
        />
        {errors.email && <p className="text-sm text-red-700 mt-1">{errors.email}</p>}
      </div>

      {/* كلمة المرور */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">كلمة المرور</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className={`w-full border rounded-md px-3 py-2 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
              errors.password ? "border-red-300" : "border-zinc-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-700"
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-700 mt-1">{errors.password}</p>}
      </div>

      {/* تأكيد كلمة المرور */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">تأكيد كلمة المرور</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="تأكيد كلمة المرور"
            className={`w-full border rounded-md px-3 py-2 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
              errors.confirm ? "border-red-300" : "border-zinc-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-700"
          >
            <EyeIcon off={showConfirm} />
          </button>
        </div>
        {errors.confirm && <p className="text-sm text-red-700 mt-1">{errors.confirm}</p>}
      </div>

      {/* الشروط */}
      <label htmlFor="terms" className="flex items-center gap-2 text-sm text-zinc-600">
        <input
          id="terms"
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="accent-indigo-700"
        />
        أوافق على الشروط
      </label>
      {errors.terms && <p className="text-sm text-red-700 mt-1">{errors.terms}</p>}

      <button
        type="submit"
        className="w-full bg-indigo-900 text-white py-2 sm:py-2.5 rounded-md text-sm sm:text-base transition-all duration-300 hover:bg-indigo-800 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "جاري التسجيل..." : "التسجيل"}
      </button>

      <div className="flex items-center gap-3 my-2 sm:my-3" aria-hidden="true">
        <div className="h-px bg-zinc-200 flex-1" />
        <div className="text-sm text-zinc-500">أو</div>
        <div className="h-px bg-zinc-200 flex-1" />
      </div>

      <div className="mt-1 sm:mt-2">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full border border-zinc-200 rounded-md px-3 py-2 flex items-center justify-center gap-2 hover:shadow-sm text-sm sm:text-base"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none">
            <path d="M21.35 11.1h-9.18v2.92h5.28c-.23 1.61-1.33 2.95-2.84 3.63v3.02h4.6c2.69-2.49 4.21-6.14 3.14-10.57-.18-.68-.46-1.32-.99-1.9z" fill="#4285F4" />
            <path d="M12.17 22c2.78 0 5.12-.92 6.82-2.5l-4.6-3.02c-1.1.74-2.5 1.18-4.22 1.18-3.26 0-6.02-2.2-7.01-5.15H.68v3.23C2.38 19.9 6.8 22 12.17 22z" fill="#34A853" />
            <path d="M5.16 13.51c-.24-.72-.38-1.49-.38-2.28 0-.79.14-1.56.38-2.28V5.72H.68A11.99 11.99 0 0 0 0 11.23c0 1.86.4 3.63 1.12 5.24l4.04-2.96z" fill="#FBBC05" />
            <path d="M12.17 4.44c1.9 0 3.58.66 4.92 1.96l3.67-3.67C17.28.75 14.95 0 12.17 0 6.8 0 2.38 2.1.68 5.72l4.48 3.44c.99-2.95 3.75-5.15 7.01-5.15z" fill="#EA4335" />
          </svg>
          التسجيل عبر جوجل
        </button>
      </div>
    </form>
  );
}
