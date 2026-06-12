"use client";

import Link from "next/link";
import { FC, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathByUserType } from "@/lib/utils/redirect";
import { t } from "@/i18n";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
}

const PREVIEW_COUNT = 5;

const Navbar: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [locale, setLocale] = useState<string>("en");

  // Notifications — single state, single ref
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // User dropdown — single state, single ref
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ── locale ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("locale");
      if (stored) {
        setLocale(stored);
        window.dispatchEvent(new CustomEvent("localeChange", { detail: stored }));
      }
    } catch {}
  }, []);

  function toggleLocale() {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
    try {
      localStorage.setItem("locale", next);
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("localeChange", { detail: next }));
    }
  }

  // ── nav items ─────────────────────────────────────────────
  const navItems = [
    { href: "/", label: t("nav.home", locale) },
    { href: "/specialties", label: t("nav.specialties", locale) },
    { href: "/doctors", label: t("nav.doctors", locale) },
    { href: "/clinics", label: t("nav.clinics", locale) },
    { href: "/appointments", label: t("nav.appointments", locale) },
    { href: "/about", label: t("nav.about", locale) },
    { href: "/contact", label: t("nav.contact", locale) },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const profileHref =
    user?.user_type?.toLowerCase() === "patient"
      ? "/patientProfile"
      : getDashboardPathByUserType(user?.user_type);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── outside-click: use pointerdown so it runs before click ──
  // FIX: ONE handler for both dropdowns, checked inside one useEffect
  useEffect(() => {
    function handle(e: PointerEvent) {
      // Close notification panel if clicked outside its container
      if (
        notifOpen &&
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
      // Close user menu if clicked outside its container
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [notifOpen, userMenuOpen]);

  // close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // ── notifications API ─────────────────────────────────────
  async function loadNotifications() {
    setLoadingNotif(true);
    setNotifError(null);
    try {
      const res = await fetch("/api/notifications/me", {
        method: "GET",
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok || !result.success)
        throw new Error(result.error || "فشل في جلب الإشعارات");
      
      const mapped = (result.data || []).map((n: any) => ({
        notification_id: n.id,
        title: n.title,
        message: n.message,
        is_read: n.read,
        created_at: n.created_at,
      }));
      setNotifications(mapped);
    } catch (err) {
      setNotifError(
        err instanceof Error ? err.message : "فشل في جلب الإشعارات"
      );
    } finally {
      setLoadingNotif(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true } : n
        )
      );
    } catch {}
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (notifOpen) {
      loadNotifications();
    }
  }, [notifOpen]);

  // ── user photo ────────────────────────────────────────────
  const userPhoto: string | undefined =
    (user as any)?.photo || (user?.profile as any)?.photo || undefined;

  const userName: string =
    (user?.profile as any)?.full_name || user?.email || "";

  // ── render ────────────────────────────────────────────────
  // IMPORTANT: dir="ltr" on the nav so it always renders left-to-right
  // regardless of the page's RTL direction.
  return (
    <nav
      dir="ltr"
      className="fixed left-0 top-0 z-50 w-full border-b border-[#d9e3ff] bg-[#edf2ff]"
    >
      {/* ── Main bar ── */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 lg:px-12 xl:px-24">

        {/* Left: Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="relative h-10 w-10">
            <Image
              src="/images/Logo1.png"
              alt="Medaura logo"
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
          <span className="hidden text-xl font-bold text-[#0f1a4f] sm:inline">
            Medaura
          </span>
        </Link>

        {/* Center: Desktop nav links */}
        <ul className="hidden items-center gap-5 xl:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative pb-1 text-[14px] font-medium text-[#0f1a4f] transition-opacity hover:opacity-70 ${
                  isActive(item.href)
                    ? "font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[#0f1a4f] after:content-['']"
                    : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="rounded-full border border-[#c5d0f0] px-2.5 py-1 text-[12px] font-semibold text-[#0f1a4f] transition hover:bg-[#d9e3ff]"
          >
            {locale === "en" ? "ع" : "EN"}
          </button>

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-[#d9e3ff]" />
          ) : isAuthenticated ? (
            <>
              {/* ── Notification bell — SINGLE instance with its own ref ── */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#c5d0f0] bg-white text-[#0f1a4f] transition hover:bg-[#d9e3ff]"
                  aria-label="الإشعارات"
                >
                  <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed left-1/2 -translate-x-1/2 top-[70px] sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:top-[calc(100%+10px)] z-50 w-[90vw] max-w-[340px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_16px_48px_rgba(15,26,79,0.18)]">
                    {/* Notif header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-[#f5f7ff] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bell
                          className="h-4 w-4 text-[#0f1a4f]"
                          strokeWidth={1.8}
                        />
                        <span className="text-[14px] font-bold text-[#0f1a4f]">
                          الإشعارات
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadNotifications();
                        }}
                        className="text-[11px] font-semibold text-[#0f1a4f] opacity-60 transition hover:opacity-100"
                      >
                        تحديث
                      </button>
                    </div>

                    {/* Notif body */}
                    <div className="max-h-[280px] overflow-y-auto">
                      {loadingNotif ? (
                        <div>
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="flex animate-pulse gap-3 border-b border-zinc-50 px-4 py-3"
                            >
                              <div className="h-7 w-7 shrink-0 rounded-full bg-gray-200" />
                              <div className="flex-1 space-y-1.5 pt-0.5">
                                <div className="h-3 w-3/4 rounded-full bg-gray-200" />
                                <div className="h-2.5 w-full rounded-full bg-gray-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : notifError ? (
                        <div className="px-4 py-6 text-center text-[13px] text-red-600">
                          {notifError}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                          <Bell className="h-10 w-10 text-gray-200" />
                          <p className="text-[13px] text-gray-400">
                            لا توجد إشعارات
                          </p>
                        </div>
                      ) : (
                        notifications.slice(0, PREVIEW_COUNT).map((notif) => (
                          <button
                            key={notif.notification_id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notif.is_read)
                                markAsRead(notif.notification_id);
                            }}
                            className={`w-full border-b border-zinc-50 px-4 py-3 text-right transition last:border-b-0 hover:bg-[#f5f7ff] ${
                              notif.is_read ? "bg-white" : "bg-[#eef2ff]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                  notif.is_read
                                    ? "bg-gray-200"
                                    : "bg-[#0f1a4f]"
                                }`}
                              />
                              <div className="min-w-0 flex-1 text-right">
                                <p className="line-clamp-1 text-[13px] font-semibold text-[#0f1b3d]">
                                  {notif.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Notif footer — show more */}
                    <div className="border-t border-zinc-100 bg-[#f5f7ff] px-4 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifOpen(false);
                          router.push("/notifications");
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold text-[#0f1a4f] transition hover:bg-[#dde4f8]"
                      >
                        عرض جميع الإشعارات
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── User avatar — SINGLE instance with its own ref ── */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#c5d0f0] bg-white transition hover:border-[#0f1a4f]"
                  aria-label="قائمة المستخدم"
                >
                  {userPhoto ? (
                    <Image
                      src={userPhoto}
                      alt="avatar"
                      width={36}
                      height={36}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <CircleUserRound
                      className="h-6 w-6 text-[#0f1a4f]"
                      strokeWidth={1.5}
                    />
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_16px_48px_rgba(15,26,79,0.18)]">
                    {/* User info card */}
                    <div className="flex items-center gap-3 border-b border-zinc-100 bg-[#f5f7ff] px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#c5d0f0] bg-white">
                        {userPhoto ? (
                          <Image
                            src={userPhoto}
                            alt="avatar"
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <CircleUserRound
                            className="h-5 w-5 text-[#0f1a4f]"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <div className="min-w-0 text-right">
                        {userName && (
                          <p className="truncate text-[13px] font-bold text-[#0f1b3d]">
                            {userName}
                          </p>
                        )}
                        {user?.email && (
                          <p className="truncate text-[11px] text-gray-400">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Menu actions */}
                    <div className="py-1">
                      <Link
                        href={profileHref}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#0f1b3d] transition hover:bg-[#f0f4ff]"
                      >
                        <User
                          className="h-4 w-4 text-[#0f1a4f]"
                          strokeWidth={1.8}
                        />
                        الملف الشخصي
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.8} />
                        تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Not authenticated */
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-full border border-[#0f1a4f] px-4 py-1.5 text-[14px] font-medium text-[#0f1a4f] transition hover:bg-[#d9e3ff]"
              >
                {t("nav.login", locale)}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#0f1a4f] px-4 py-1.5 text-[14px] font-medium text-white transition hover:bg-[#1b2773]"
              >
                {t("nav.createAccount", locale)}
              </Link>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => {
              setMobileOpen((v) => !v);
              setNotifOpen(false);
              setUserMenuOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c5d0f0] bg-white text-[#0f1a4f] transition hover:bg-[#d9e3ff] xl:hidden"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={`overflow-hidden border-t border-[#d9e3ff] transition-[max-height,opacity] duration-300 ease-in-out xl:hidden ${
          mobileOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 bg-[#edf2ff] px-4 pb-5 pt-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[15px] font-medium transition ${
                isActive(item.href)
                  ? "bg-[#0f1a4f] text-white"
                  : "text-[#0f1a4f] hover:bg-[#d9e3ff]"
              }`}
            >
              <span>{item.label}</span>
              {isActive(item.href) && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}

          {/* Mobile: login/register when not authenticated */}
          {!loading && !isAuthenticated && (
            <div className="mt-3 flex flex-col gap-2 border-t border-[#d9e3ff] pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-xl border border-[#0f1a4f] py-2.5 text-[15px] font-medium text-[#0f1a4f] transition hover:bg-[#d9e3ff]"
              >
                {t("nav.login", locale)}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-xl bg-[#0f1a4f] py-2.5 text-[15px] font-medium text-white transition hover:bg-[#1b2773]"
              >
                {t("nav.createAccount", locale)}
              </Link>
            </div>
          )}

          {/* Mobile: profile + logout when authenticated */}
          {!loading && isAuthenticated && (
            <div className="mt-3 flex flex-col gap-2 border-t border-[#d9e3ff] pt-3">
              <Link
                href={profileHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium text-[#0f1a4f] transition hover:bg-[#d9e3ff]"
              >
                <User className="h-5 w-5" strokeWidth={1.8} />
                الملف الشخصي
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" strokeWidth={1.8} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;