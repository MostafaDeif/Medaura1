"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathByUserType } from "@/lib/utils/redirect";
import type { ClinicSignupProfile } from "@/lib/types/api";
import { EyeIcon } from "../utils";

export default function ClinicRegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!clinicName.trim()) nextErrors.name = "اسم العيادة مطلوب";
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
      const profile: ClinicSignupProfile = {
        name: clinicName.trim(),
        address: "",
        location: "",
        phone: "",
        geo_location: {
          latitude: 0,
          longitude: 0,
        },
      };

      const response = await signup({
        email: email.trim(),
        password,
        user_type: "clinic",
        profile,
      });

      const redirectPath = getDashboardPathByUserType(response.user_type);
      router.push(redirectPath);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء الحساب، حاول مرة أخرى",
      });
    } finally {
      setLoading(false);
    }
  }

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

      <div>
        <label
          htmlFor="clinicName"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          اسم العيادة
        </label>
        <input
          id="clinicName"
          name="clinicName"
          placeholder="اسم العيادة"
          value={clinicName}
          onChange={(event) => setClinicName(event.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "clinicName-error" : undefined}
          className={`w-full text-sm sm:text-base border rounded-md px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
            errors.name ? "border-red-300" : "border-zinc-200"
          }`}
        />
        {errors.name && (
          <p
            id="clinicName-error"
            role="alert"
            className="text-sm text-red-700 mt-1"
          >
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full text-sm sm:text-base border rounded-md px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
            errors.email ? "border-red-300" : "border-zinc-200"
          }`}
        />
        {errors.email && (
          <p
            id="email-error"
            role="alert"
            className="text-sm text-red-700 mt-1"
          >
            {errors.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <div className="relative">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 mb-1"
          >
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="كلمة المرور"
              className={`w-full border rounded-md px-3 py-2 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
                errors.password ? "border-red-300" : "border-zinc-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-500 hover:text-indigo-700"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-700 mt-1">{errors.password}</p>
          )}
        </div>

        <div className="relative">
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-zinc-700 mb-1"
          >
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <input
              id="confirm"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="تأكيد كلمة المرور"
              className={`w-full border rounded-md px-3 py-2 pr-12 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:scale-[1.01] ${
                errors.confirm ? "border-red-300" : "border-zinc-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-500 hover:text-indigo-700"
            >
              <EyeIcon off={showConfirm} />
            </button>
          </div>
          {errors.confirm && (
            <p className="text-sm text-red-700 mt-1">{errors.confirm}</p>
          )}
        </div>
      </div>



      <label
        htmlFor="terms"
        className="flex items-center gap-2 text-sm text-zinc-600"
      >
        <input
          id="terms"
          type="checkbox"
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
          className="accent-indigo-700"
          aria-invalid={!!errors.terms}
          aria-describedby={errors.terms ? "terms-error" : undefined}
        />
        أوافق على الشروط
      </label>
      {errors.terms && (
        <p id="terms-error" role="alert" className="text-sm text-red-700 mt-1">
          {errors.terms}
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-indigo-900 text-white py-2 sm:py-2.5 rounded-md text-sm sm:text-base transition-all duration-300 hover:bg-indigo-800 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "جاري التسجيل..." : "التسجيل"}
      </button>
    </form>
  );
}
