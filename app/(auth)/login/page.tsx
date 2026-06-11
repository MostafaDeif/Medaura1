"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathByUserType } from "@/lib/utils/redirect";
import { validateEmail, validatePassword } from "../validators";
import { ErrorAlert, PasswordInput, EmailInput } from "../components";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError) e.email = emailError;
    if (passwordError) e.password = passwordError;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await login({ email, password });
      // Redirect based on user type/role
      const redirectPath = getDashboardPathByUserType(response.user_type);
      router.push(redirectPath);
    } catch (error) {
      let errorMessage = "تعذر تسجيل الدخول، حاول مرة أخرى";
      if (error instanceof Error) {
        if (error.message.includes("Incorrect email or password")) {
          errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        } else if (error.message.includes("Too many") || error.message.includes("rate limit")) {
          errorMessage = "محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة لاحقاً";
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({
        form: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrors({ form: "تسجيل الدخول عبر جوجل غير متاح حاليا" });
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-indigo-900">
          تم تسجيل الدخول!
        </h2>
        <p className="text-zinc-600">تم دخولك بنجاح (محلي فقط).</p>
        <button
          onClick={() => {
            setSubmitted(false);
            setEmail("");
            setPassword("");
            setErrors({});
            setShowPassword(false);
          }}
          className="inline-block w-full bg-indigo-700 text-white py-2 rounded transition hover:bg-indigo-600 active:scale-95"
        >
          تسجيل دخول آخر
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ErrorAlert errors={errors} />

      <EmailInput
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />

      <PasswordInput
        label="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        showPassword={showPassword}
        onToggle={() => setShowPassword(!showPassword)}
        placeholder="كلمة المرور"
        error={errors.password}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-indigo-700"
          />
          حفظ تسجيل الدخول
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-indigo-700 hover:text-indigo-900 transition"
        >
          نسيت كلمة المرور؟
        </Link>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-900 text-white py-2 sm:py-2.5 rounded-md text-sm sm:text-base transition-all duration-300 hover:bg-indigo-800 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </button>

      <div className="flex items-center gap-3 my-2 sm:my-3" aria-hidden="true">
        <div className="h-px bg-zinc-200 flex-1" />
        <div className="text-sm text-zinc-500">أو</div>
        <div className="h-px bg-zinc-200 flex-1" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled
        aria-label="تسجيل الدخول عبر جوجل"
        className="w-full border border-zinc-200 rounded-md px-3 py-2 flex items-center justify-center gap-2 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        <svg
          className="h-4 w-4 sm:h-5 sm:w-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.35 11.1h-9.18v2.92h5.28c-.23 1.61-1.33 2.95-2.84 3.63v3.02h4.6c2.69-2.49 4.21-6.14 3.14-10.57-.18-.68-.46-1.32-.99-1.9z"
            fill="#4285F4"
          />
          <path
            d="M12.17 22c2.78 0 5.12-.92 6.82-2.5l-4.6-3.02c-1.1.74-2.5 1.18-4.22 1.18-3.26 0-6.02-2.2-7.01-5.15H.68v3.23C2.38 19.9 6.8 22 12.17 22z"
            fill="#34A853"
          />
          <path
            d="M5.16 13.51c-.24-.72-.38-1.49-.38-2.28 0-.79.14-1.56.38-2.28V5.72H.68A11.99 11.99 0 0 0 0 11.23c0 1.86.4 3.63 1.12 5.24l4.04-2.96z"
            fill="#FBBC05"
          />
          <path
            d="M12.17 4.44c1.9 0 3.58.66 4.92 1.96l3.67-3.67C17.28.75 14.95 0 12.17 0 6.8 0 2.38 2.1.68 5.72l4.48 3.44c.99-2.95 3.75-5.15 7.01-5.15z"
            fill="#EA4335"
          />
        </svg>
        تسجيل الدخول عبر جوجل
      </button>

      <p className="text-center text-sm text-zinc-600 mt-4">
        ليس لديك حساب بعد؟{" "}
        <Link
          href="/register"
          className="text-indigo-700 font-medium hover:text-indigo-900 transition"
        >
          سجل الآن
        </Link>
      </p>
    </form>
  );
}
