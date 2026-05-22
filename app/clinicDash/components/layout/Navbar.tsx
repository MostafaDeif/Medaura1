"use client";

import { Sun, Moon, Bell, Search, LogOut, X, Menu } from "lucide-react";
import { useState, useRef, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { DashboardThemeContext } from "../../../providers/DashboardThemeProvider";
import { useAuth } from "@/context/AuthContext";

function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { darkMode, toggleTheme } = useContext(DashboardThemeContext);
  const { logout, user } = useAuth();
  const clinicName = (user?.profile?.name as string) || "عيادتي";
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const avatarSrc = "/images/blank-profile-picture.png";
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch notifications
  useEffect(() => {
    fetch("/api/notifications/list", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setNotifications(
            res.data.map((n: any) => ({
              id: String(n.id),
              title: n.title,
              body: n.message,
              time: new Date(n.created_at).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              read: n.read,
              avatar: "/images/blank-profile-picture.png",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("click", clickHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("click", clickHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const handleThemeChange = () => {
    setIsTransitioning(true);
    toggleTheme();
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[999] pointer-events-none transition-opacity duration-200" />
      )}
      <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-(--background)/80 border-b border-(--card-border)">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) text-(--foreground) hover:bg-(--hover-bg) transition xl:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <Menu size={18} />
            </button>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  id="clinic-nav-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن موظف، موعد..."
                  dir="rtl"
                  className="w-full pr-10 pl-4 py-2 rounded-2xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
                />
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme toggle */}
              <button
                onClick={handleThemeChange}
                title={darkMode ? "الوضع الفاتح" : "الوضع الداكن"}
                aria-pressed={darkMode}
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer"
              >
                <span className="sr-only">Toggle theme</span>
                <div className="relative w-[18px] h-[18px]">
                  <Sun
                    size={18}
                    className={`absolute inset-0 transition-all duration-500 ${
                      darkMode ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50 hidden"
                    }`}
                  />
                  <Moon
                    size={18}
                    className={`absolute inset-0 transition-all duration-500 ${
                      darkMode ? "opacity-0 -rotate-90 scale-50 hidden" : "opacity-100 rotate-0 scale-100"
                    }`}
                  />
                </div>
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={notifOpen}
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-(--card-bg) border border-(--card-border) rounded-2xl shadow-[var(--shadow-soft)] p-3 z-40 backdrop-blur-md">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h4 className="font-semibold text-(--text-primary) text-sm">الإشعارات</h4>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-teal-600 hover:text-teal-700"
                          >
                            تحديد الكل كمقروء
                          </button>
                        )}
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="p-1 rounded hover:bg-(--hover-bg)"
                        >
                          <X size={14} className="text-(--text-secondary)" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-auto space-y-1">
                      {notifications.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-(--text-secondary) text-center">
                          لا توجد إشعارات جديدة
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifications((prev) =>
                                prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                              );
                              setNotifOpen(false);
                            }}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition hover:bg-(--hover-bg) ${
                              !n.read ? "bg-teal-50/60 dark:bg-teal-900/10" : ""
                            }`}
                          >
                            <img
                              src={n.avatar}
                              alt=""
                              width={36}
                              height={36}
                              className="rounded-full shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-(--text-primary) truncate">
                                {n.title}
                              </p>
                              <p className="text-xs text-(--text-secondary) truncate mt-0.5">
                                {n.body}
                              </p>
                            </div>
                            <span className="text-[10px] text-(--text-secondary) whitespace-nowrap mt-0.5">
                              {n.time}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer"
                >
                  <img
                    src={avatarSrc}
                    alt={clinicName}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                  <span className="hidden sm:block text-sm font-medium text-(--text-primary) max-w-[120px] truncate">
                    {clinicName}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-(--card-bg) border border-(--card-border) rounded-2xl shadow-[var(--shadow-soft)] p-2 z-50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <img
                        src={avatarSrc}
                        alt={clinicName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-(--text-primary) truncate">
                          {clinicName}
                        </div>
                        <div className="text-xs text-teal-600 mt-0.5">عيادة</div>
                      </div>
                    </div>
                    <div className="border-t border-(--card-border) mt-1" />
                    <button
                      onClick={async () => {
                        await logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-red-600 hover:bg-(--hover-bg) rounded-xl transition text-sm"
                    >
                      <LogOut size={15} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Navbar;
