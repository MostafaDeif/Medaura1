"use client";

import { useState, useMemo, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

export default function AdminSettingsPage() {
  const { user, loading, updateUser } = useAuth();
  
  const [profileName, setProfileName] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photo States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const userPhoto = user?.photo || (user?.profile?.photo as string) || "";
  useEffect(() => {
    if (userPhoto) {
      setPhotoPreview(userPhoto);
    }
  }, [userPhoto]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // New Admin States
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminCreating, setAdminCreating] = useState(false);

  // Load current user profile details
  const adminProfile = user?.profile as { full_name?: string } | undefined;
  const currentName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";

  useEffect(() => {
    if (adminProfile?.full_name) {
      setProfileName(adminProfile.full_name);
    }
  }, [adminProfile?.full_name]);

  const initials = useMemo(() => {
    return currentName
      .split(" ")
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();
  }, [currentName]);

  // Handle Profile Update (full_name and photo)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "الرجاء إدخال الاسم الكامل",
        confirmButtonText: "موافق",
      });
      return;
    }

    try {
      setProfileUpdating(true);

      const formData = new FormData();
      formData.append("full_name", profileName.trim());
      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const response = await fetch("/api/user/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "فشل تحديث الملف الشخصي");
      }

      // Extract the Cloudinary photo URL returned from backend
      const updatedPhoto = result.photo || result.data?.photo || photoPreview;

      // Update AuthContext state
      if (updateUser && user) {
        updateUser({
          ...user,
          photo: updatedPhoto,
          profile: {
            ...((user.profile as Record<string, unknown>) || {}),
            full_name: profileName.trim(),
            photo: updatedPhoto,
          },
        });
      }

      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم تحديث الملف الشخصي بنجاح",
        confirmButtonText: "رائع",
        timer: 2000,
      });

      // Quick reload after saving to make sure all cached components pull the new Cloudinary image correctly
      if (photoFile) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "فشل التحديث",
        text: err.message || "حدث خطأ أثناء تحديث بياناتك",
        confirmButtonText: "موافق",
      });
    } finally {
      setProfileUpdating(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "الرجاء تعبئة جميع حقول كلمة المرور",
        confirmButtonText: "موافق",
      });
      return;
    }

    if (newPassword.length < 8) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
        confirmButtonText: "موافق",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
        confirmButtonText: "موافق",
      });
      return;
    }

    try {
      setPasswordUpdating(true);
      const response = await fetch("/api/user/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "فشل تغيير كلمة المرور");
      }

      Swal.fire({
        icon: "success",
        title: "تم بنجاح",
        text: "تم تغيير كلمة المرور بنجاح",
        confirmButtonText: "رائع",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "فشل التغيير",
        text: err.message || "حدث خطأ أثناء تغيير كلمة المرور",
        confirmButtonText: "موافق",
      });
    } finally {
      setPasswordUpdating(false);
    }
  };


  // Handle Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "الرجاء تعبئة جميع الحقول المطلوبة",
        confirmButtonText: "موافق",
      });
      return;
    }

    if (newAdminPassword.length < 8) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
        confirmButtonText: "موافق",
      });
      return;
    }

    try {
      setAdminCreating(true);

      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify({
          full_name: newAdminName.trim(),
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "فشل إنشاء حساب المدير");
      }

      Swal.fire({
        icon: "success",
        title: "تم الإنشاء",
        text: `تم إنشاء حساب المدير للمستخدم ${newAdminName} بنجاح!`,
        confirmButtonText: "ممتاز",
      });

      // Reset form fields
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "فشل الإنشاء",
        text: err.message || "حدث خطأ أثناء إنشاء حساب المدير",
        confirmButtonText: "موافق",
      });
    } finally {
      setAdminCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-[#5e6b85]">
        <div className="w-10 h-10 border-3 border-[#e6eaf0] border-t-[#1F2B6C] rounded-full animate-spin" />
        <p className="text-sm font-medium">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-1" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-(--card-border) pb-4 mb-6">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EBF2F9] px-3 py-1 text-xs font-semibold text-[#1F2B6C]">
            <Shield size={14} />
            إدارة الحساب والصلاحيات
          </p>
          <h1 className="text-3xl font-bold text-(--text-primary)">الإعدادات</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            إدارة ملفك الشخصي وإنشاء حسابات مشرفين جديدة للمنصة.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Admin Profile Card */}
        <div className="lg:col-span-5 bg-(--card-bg) rounded-2xl border border-(--card-border) shadow-[var(--shadow-soft)] overflow-hidden transition-all duration-300 hover:shadow-md">
          {/* Cover Header Graphic */}
          <div className="h-28 bg-gradient-to-r from-[#1F2B6C] to-[#005fb8] relative">
            <div className="absolute -bottom-10 right-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-[#1F2B6C] text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md font-sans overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt={currentName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute -bottom-2 -left-2 w-7 h-7 bg-[#10b981] hover:bg-[#0e9f6e] border-2 border-white rounded-lg flex items-center justify-center text-white cursor-pointer shadow transition-all hover:scale-110">
                  <Camera size={13} />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-14 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-(--text-primary)">{currentName}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-(--text-secondary)">
                <Shield size={14} className="text-[#1F2B6C]" />
                <span className="text-xs font-semibold uppercase tracking-wider">مدير النظام (Admin)</span>
              </div>
            </div>

            <hr className="border-(--card-border)" />

            {/* Profile Update Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-(--text-primary)">
                <div className="w-6 h-6 rounded-lg bg-[#EBF2F9] flex items-center justify-center text-[#1F2B6C]">
                  <User size={13} />
                </div>
                <span>الاسم الكامل</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="أدخل اسمك الكامل..."
                  className="w-full px-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={profileUpdating}
                className="w-full py-2.5 px-4 bg-[#1F2B6C] hover:bg-[#151F52] text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات</span>
                )}
              </button>
            </form>

            <hr className="border-(--card-border)" />

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-(--text-primary)">
                <div className="w-6 h-6 rounded-lg bg-[#EBF2F9] flex items-center justify-center text-[#1F2B6C]">
                  <Lock size={13} />
                </div>
                <span>تغيير كلمة المرور</span>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="كلمة المرور الحالية"
                    className="w-full px-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    className="w-full px-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تأكيد كلمة المرور"
                    className="w-full px-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordUpdating}
                className="w-full py-2.5 px-4 bg-(--input2-bg) hover:bg-[#e6eaf0] text-(--text-primary) border border-(--card-border) text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordUpdating ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    تحديث كلمة المرور
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Add Admin Form */}
        <div className="lg:col-span-7 bg-(--card-bg) rounded-2xl border border-(--card-border) shadow-[var(--shadow-soft)] p-6 space-y-6 transition-all duration-300 hover:shadow-md">
          {/* Card Title Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <UserPlus size={16} />
                </div>
                <h2 className="text-lg font-bold text-(--text-primary)">إضافة مدير جديد</h2>
              </div>
              <p className="text-xs text-(--text-secondary) pr-10">إنشاء حساب مدير مسؤول آخر يتمتع بكافة صلاحيات الإشراف على المنصة</p>
            </div>
          </div>

          <hr className="border-(--card-border)" />

          {/* Add Admin Form */}
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-primary) block">الاسم الكامل</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-(--text-secondary)">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="أدخل الاسم الكامل للمدير الجديد..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-primary) block">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-(--text-secondary)">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="example@medaura.com"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-primary) block">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-(--text-secondary)">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية (٨ أحرف على الأقل)..."
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-(--input-border) bg-(--input2-bg) text-sm text-(--text-primary) placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1F2B6C]/20 focus:border-[#1F2B6C] transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 left-3 flex items-center text-(--text-secondary) hover:text-(--text-primary) transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={adminCreating}
              className="w-full mt-2 py-2.5 px-4 bg-[#10b981] hover:bg-[#0e9f6e] text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adminCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <span>إضافة المدير</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
