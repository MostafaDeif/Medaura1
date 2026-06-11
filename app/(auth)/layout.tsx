"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import authImg from "@/public/images/register.png";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathByUserType } from "@/lib/utils/redirect";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Navigation items
const NAV_ITEMS = [
  { label: "إنشاء حساب", href: "/register", key: "register" },
  { label: "تسجيل الدخول", href: "/login", key: "login" },
];

// Register account types
const REGISTER_TYPES = [
  {
    key: "patient",
    label: "مريض",
    href: "/register",
    icon: "customer-icon",
  },
  {
    key: "staff",
    label: "انضم لعيادة",
    href: "/register/staff",
    icon: "clinic-icon",
  },
  {
    key: "clinic",
    label: "انشأ عيادة",
    href: "/register/clinic",
    icon: "clinic-icon",
  },
  {
    key: "doctor",
    label: "طبيب",
    href: "/register/doctor",
    icon: "doctor-icon",
  },
];


export default function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  // ── Protected route: redirect authenticated users away from auth pages ──
  useEffect(() => {
    if (loading) return; // wait until auth state is known
    if (!isAuthenticated) return; // not logged in, stay on auth page

    const profile = user?.profile as Record<string, unknown> | undefined;
    const destination = getDashboardPathByUserType(user?.user_type, profile);
    // Replace so the browser back button won't re-show the auth page
    router.replace(destination);
  }, [loading, isAuthenticated, user, router]);

  // If we are on the doctor documents page, render without the auth layout wrapper
  if (pathname.startsWith("/doctorDocument")) {
    return <>{children}</>;
  }

  // While auth is still loading, show a minimal spinner so we don't flash
  // the login form before deciding to redirect
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f4f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d9e3ff] border-t-indigo-700" />
          <p className="text-sm text-zinc-500">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  // If the user is authenticated we're about to redirect — render nothing
  // to avoid flashing the auth form before navigation completes
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f4f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d9e3ff] border-t-indigo-700" />
          <p className="text-sm text-zinc-500">جاري التوجيه...</p>
        </div>
      </div>
    );
  }

  // Determine active nav item
  const getActiveNav = () => {
    if (pathname.includes("/register")) return "register";
    if (pathname.includes("/login")) return "login";
    return "login";
  };

  // Determine active register type
  const getActiveType = () => {
    if (pathname.includes("/staff")) return "staff";
    if (pathname.includes("/clinic")) return "clinic";
    if (pathname.includes("/doctor")) return "doctor";
    return "patient";
  };

  const activeNav = getActiveNav();
  const activeType = getActiveType();
  const isRegisterPage = activeNav === "register";

  return (
    <div className="min-h-screen bg-[#f2f4f8] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full rounded-xl shadow-lg overflow-hidden bg-white flex flex-col lg:flex-row transition-all duration-500 ease-out">
        {/* LEFT SECTION */}
        <section className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12" dir="rtl">
          {/* HEADER */}
          <header className="flex flex-col items-center lg:items-start gap-4 mb-6">
            {/* LOGO */}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold transition hover:scale-105">
                M
              </div>
              <h1 className="text-xl font-semibold text-indigo-900">Medaura</h1>
            </div>

            {/* NAVIGATION TABS */}
            <nav className="flex w-full sm:w-auto items-center p-1 bg-zinc-100 rounded-full">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex-1 sm:flex-none text-center px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base transition ${
                    activeNav === item.key
                      ? "bg-indigo-900 text-white"
                      : "text-zinc-700 hover:text-indigo-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          {/* CONTENT CONTAINER */}
          <div className="border border-zinc-100 rounded-lg p-4 sm:p-6 shadow-sm">
            {/* REGISTER ACCOUNT TYPE SELECTOR */}
            {isRegisterPage && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-6">
                {REGISTER_TYPES.map((type) => (
                  <Link
                    key={type.key}
                    href={type.href}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                      activeType === type.key
                        ? "border-indigo-700 bg-indigo-50 shadow-md"
                        : "border-zinc-100 hover:border-indigo-300"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium flex items-center gap-1">
                      <span className="truncate">{type.label}</span>
                      {type.key !== "patient" && (
                        <img
                          src={`/images/${type.icon}.png`}
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-4 inline-block"
                        />
                      )}
                      {type.key === "patient" && (
                        <img
                          src="/images/customer-icon.png"
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-4 inline-block"
                        />
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* PAGE CONTENT */}
            {children}
          </div>
        </section>

        {/* RIGHT SECTION - IMAGE */}
        <aside className="hidden lg:flex w-1/2 bg-indigo-50 items-center justify-center p-8 transition-transform duration-500 hover:scale-[1.02]">
          <div className="text-indigo-700 text-lg font-medium">
            <Image
              src={authImg}
              alt="medaura authentication"
              className="max-w-xs sm:max-w-sm lg:max-w-md"
              priority
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
