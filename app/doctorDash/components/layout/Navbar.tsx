"use client";

import { Sun, Moon, Bell, Search, LogOut, X, Menu } from "lucide-react";
import { useState, useRef, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { DashboardThemeContext } from "../../../providers/DashboardThemeProvider";
import { useAuth } from "@/context/AuthContext";

function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { darkMode, toggleTheme } = useContext(DashboardThemeContext);
  const { logout, user } = useAuth();
  const fullName = (user?.profile?.full_name as string) || "د.محمد إسماعيل";
  const specialist = (user?.profile?.specialist as string) || "طبيب قلب";
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications/me", { credentials: "include" });
        const json = await response.json();
        if (response.ok && json.success && Array.isArray(json.data)) {
          const mapped = json.data.map((item: any) => {
            let timeStr = "";
            if (item.created_at) {
              const diffMs = Date.now() - new Date(item.created_at).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              if (diffMins < 60) {
                timeStr = `${Math.max(1, diffMins)}m`;
              } else if (diffHours < 24) {
                timeStr = `${diffHours}h`;
              } else {
                timeStr = `${diffDays}d`;
              }
            }
            return {
              id: String(item.id),
              title: item.title || "Notification",
              body: item.message || "",
              time: timeStr || "now",
              read: Boolean(item.read),
              avatar: "/images/blank-profile-picture.png"
            };
          });
          setNotifications(mapped);
        }
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    }
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })
        )
      );
    } catch (e) {
      console.error("Failed to mark notifications as read", e);
    }
  };
  const [query, setQuery] = useState("");
  const avatarSrc =
    (typeof user?.photo === "string" && user.photo) ||
    (user?.profile?.photo as string) ||
    "/images/blank-profile-picture.png";
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const suggestions = [
    "محمد احمد",
    "د.احمد السيد",
    "Cardiology",
    "Orthopedics",
    "Oncology",
  ];

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
      if (
        e.key === "Enter" &&
        document.activeElement === document.getElementById("nav-search-input")
      ) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    };
    window.addEventListener("click", clickHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("click", clickHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [query, router]);

  const toggleThemes = () => {
    // const next = !darkMode;
    toggleTheme();
  };
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const handleThemeChange = () => {
    setIsTransitioning(true);
    toggleTheme();

    setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  };
  return (
    <>
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-999 pointer-events-none transition-opacity duration-200" />
      )}
      <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-(--background)/80 border-b border-(--card-border)">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) text-(--foreground) hover:bg-(--hover-bg) transition xl:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <Menu size={18} />
            </button>

            <div className="flex-1 min-w-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                }}
                className="relative"
              >
                <input
                  id="nav-search-input"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveIndex((i) =>
                        Math.min(i + 1, suggestions.length - 1),
                      );
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveIndex((i) => Math.max(i - 1, 0));
                    }
                    if (e.key === "Enter" && activeIndex >= 0) {
                      e.preventDefault();
                      const s = suggestions[activeIndex];
                      router.push(`/search?q=${encodeURIComponent(s)}`);
                    }
                  }}
                  role="combobox"
                  aria-expanded={query.length > 0}
                  aria-controls="nav-search-list"
                  placeholder="Search patients, doctors, appointments..."
                  dir="ltr"
                  className="w-full pl-10 pr-4 py-2 rounded-2xl border border-(--input-border) bg-(--input-bg) text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/40"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
                />

                {query.length > 0 && (
                  <ul
                    id="nav-search-list"
                    role="listbox"
                    className="absolute left-0 right-0 mt-2 bg-(--input-bg)  border border-(--input-border) rounded shadow z-40"
                  >
                    <li className="px-3 py-2 text-sm text-(--text-secondary)">
                      Search for "{query}"
                    </li>
                    {suggestions.map((s, idx) => (
                      <li
                        key={s}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          router.push(`/search?q=${encodeURIComponent(s)}`);
                        }}
                        className={`px-3 py-2 hover:bg-(--semi-card-bg) cursor-pointer ${activeIndex === idx ? "bg-(--hover-bg)" : ""}`}
                      >
                        {s}
                      </li>
                    ))}
                    <li className="px-3 py-2 text-xs text-slate-400">
                      Tip: use arrows and Enter
                    </li>
                  </ul>
                )}
              </form>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleThemeChange}
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                aria-pressed={darkMode}
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer"
              >
                <span className="sr-only">Toggle theme</span>
                <div className="relative w-4.5 h-4.5">
                  {/* Sun */}
                  <Sun
                    size={18}
                    className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] animate-spin [animation-duration:5s] opacity-80
                        ${
                          darkMode
                            ? "opacity-100 rotate-0 scale-100 "
                            : "opacity-0 rotate-90 scale-50 hidden"
                        }
                    `}
                  />

                  {/* Moon */}
                  <Moon
                    size={18}
                    className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] animate-bounce [animation-duration:.8s] opacity-80 
                        ${
                          darkMode
                            ? "opacity-0 -rotate-90 scale-50 hidden"
                            : "opacity-100 rotate-0 scale-100"
                        }
                    `}
                  />
                </div>
              </button>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={notifOpen}
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer"
                >
                  <Bell size={18} />
                </button>
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {notifOpen && (
                  <div className="absolute left-[-100px] sm:-left-2 mt-2 w-[300px] sm:w-96 max-w-[calc(100vw-2rem)] bg-(--card-bg) border border-(--card-border) rounded-2xl shadow-[var(--shadow-soft)] p-3 z-40 backdrop-blur-md transform origin-top-left transition-all duration-150 ease-out">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="font-semibold">Notifications</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Mark all read
                        </button>
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X size={14} className="text-slate-500" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 max-h-64 overflow-auto">
                      {notifications.length === 0 && (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          You're all caught up
                        </div>
                      )}

                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            setNotifications((prev) =>
                              prev.map((x) =>
                                x.id === n.id ? { ...x, read: true } : x,
                              ),
                            );
                            setNotifOpen(false);
                            try {
                              if (!n.read) {
                                await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`group flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer transition hover:bg-(--hover-bg) ${n.read ? "bg-transparent opacity-70" : "bg-[#f0f4ff] dark:bg-blue-950/30 border border-[#e2e8f0]/40 dark:border-blue-900/20"}`}
                        >
                          <div className="relative">
                            <img
                              src={n.avatar}
                              alt="a"
                              width={44}
                              height={44}
                              className="rounded-full"
                            />
                            {!n.read && (
                              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-(--text-primary) truncate">
                                {n.title}
                              </p>
                              <span className="text-xs text-(--text-secondary) ml-2 whitespace-nowrap">
                                {n.time}
                              </span>
                            </div>
                            <p className="text-xs text-(--text-secondary) mt-1 truncate">
                              {n.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 border-t pt-2 flex items-center justify-between px-2">
                      <button
                        onClick={() => setNotifications([])}
                        className="text-xs text-red-500"
                      >
                        Clear all
                      </button>
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          router.push("/doctorDash/notifications");
                        }}
                        className="text-xs text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-(--card-border) bg-(--card-bg) hover:bg-(--semi-card-bg) transition cursor-pointer"
                >
                  <img
                    src={avatarSrc}
                    alt={fullName}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </button>

                {profileOpen && (
                  <div className="absolute left-[-40px] sm:left-0 top-full mt-2 w-48 bg-white/90 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 backdrop-blur-sm transform origin-top-left transition-all duration-150">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <img
                        src={avatarSrc}
                        alt={fullName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {fullName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {specialist}
                        </div>
                      </div>
                    </div>
                    <div className="border-t mt-1" />
                    <button
                      onClick={async () => {
                        await logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
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
