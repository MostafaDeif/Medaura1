"use client";

import { useState } from "react";
import { X, User, Mail, Lock, Briefcase, Stethoscope, Plus } from "lucide-react";

interface CreateStaffForm {
  email: string;
  password: string;
  full_name: string;
  role_title: string;
  specialist: string;
}

interface CreateStaffModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SPECIALTIES = [
  "طب عام",
  "طب الأطفال",
  "طب الأسنان",
  "طب العيون",
  "جراحة العظام",
  "القلب والأوعية الدموية",
  "الجهاز الهضمي",
  "الأمراض الجلدية",
  "الصحة النفسية",
  "طب الطوارئ",
  "التمريض",
  "الصيدلة",
  "الأشعة",
  "التحاليل المخبرية",
  "العلاج الطبيعي",
];

const ROLES = [
  "طبيب",
  "ممرض",
  "ممرضة",
  "صيدلاني",
  "فني مختبر",
  "موظف استقبال",
  "إداري",
  "فني أشعة",
  "معالج فيزيائي",
];

export default function CreateStaffModal({
  open,
  onClose,
  onSuccess,
}: CreateStaffModalProps) {
  const [form, setForm] = useState<CreateStaffForm>({
    email: "",
    password: "",
    full_name: "",
    role_title: "",
    specialist: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role_title: form.role_title,
          ...(form.specialist ? { specialist: form.specialist } : {}),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "فشل إنشاء الموظف");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({ email: "", password: "", full_name: "", role_title: "", specialist: "" });
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-staff-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-(--card-bg) border border-(--card-border) rounded-3xl shadow-2xl p-6 animate-[fadeUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 flex items-center justify-center">
              <Plus size={18} className="text-teal-600" />
            </div>
            <div>
              <h2
                id="create-staff-title"
                className="text-base font-bold text-(--text-primary)"
              >
                إضافة موظف جديد
              </h2>
              <p className="text-xs text-(--text-secondary)">أدخل بيانات الموظف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-(--hover-bg) transition text-(--text-secondary)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success state */}
        {success && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-700 font-semibold">تم إضافة الموظف بنجاح!</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                الاسم الكامل *
              </label>
              <div className="relative">
                <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
                <input
                  id="staff-full-name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  placeholder="محمد أحمد"
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="staff@example.com"
                  dir="ltr"
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                كلمة المرور *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
            </div>

            {/* Role title */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                الدور الوظيفي *
              </label>
              <div className="relative">
                <Briefcase size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none" />
                <select
                  id="staff-role"
                  name="role_title"
                  value={form.role_title}
                  onChange={handleChange}
                  required
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40 appearance-none"
                >
                  <option value="">اختر الدور...</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specialist */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                التخصص <span className="text-(--text-secondary) font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <Stethoscope size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) pointer-events-none" />
                <select
                  id="staff-specialist"
                  name="specialist"
                  value={form.specialist}
                  onChange={handleChange}
                  className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500/40 appearance-none"
                >
                  <option value="">اختر التخصص...</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-(--card-border) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                id="create-staff-submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    إضافة الموظف
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
