"use client";

import {
  Bell,
  Search,
  LogOut,
  X,
  Menu,
  ChevronDown,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/lib/types/api";
import { fetchNotificationsClient } from "@/lib/utils/fetchNotifications";

function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { logout, user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const adminName =
    (user?.profile?.full_name as string) || user?.email?.split("@")[0] || "Admin";
  const adminEmail = user?.email || "";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const avatarSrc =
    (typeof user?.photo === "string" && user.photo) ||
    (user?.profile?.photo as string) ||
    "/images/blank-profile-picture.png";
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Close all dropdowns on outside click
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("click", clickHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("click", clickHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, []);

  // Focus search input when mobile search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);
      const result = await fetchNotificationsClient();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch notifications");
      }
      const items: Notification[] = Array.isArray(result.data) ? result.data : [];
      items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch notifications";
      setNotificationsError(message);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      loadNotifications();
      return;
    }
    if (notifOpen) {
      loadNotifications();
    }
  }, [loadNotifications, notifOpen]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      /* best-effort */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(
      unread.map((n) =>
        fetch(`/api/notifications/${n.id}/read`, {
          method: "PATCH",
          credentials: "include",
        })
      )
    );
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatNotificationTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Avatar initials fallback
  const initials = adminName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header className="w-full sticky top-0 z-50 bg-white border-b border-[#e6eaf0] shadow-sm">
      <div className="px-3 sm:px-6 py-3">
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Sidebar toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6eaf0] bg-white text-[#5e6b85] hover:bg-[#f1f4f9] transition xl:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Desktop search bar */}
          <form
            onSubmit={handleSearch}
            className="relative hidden sm:flex flex-1 max-w-sm"
          >
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e6b85] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, doctors..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
            />
          </form>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mobile search toggle */}
          <div className="relative sm:hidden" ref={searchRef}>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6eaf0] bg-white text-[#5e6b85] hover:bg-[#f1f4f9] transition"
              aria-label="Search"
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>

            {searchOpen && (
              <div className="absolute ltr:right-0 rtl:left-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs z-50">
                <form onSubmit={handleSearch} className="flex gap-2 p-2 bg-white border border-[#e6eaf0] rounded-2xl shadow-lg">
                  <Search size={16} className="flex-shrink-0 self-center text-[#5e6b85] ml-1" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 py-1 text-sm text-[#0f1b3d] placeholder-[#a0aab8] focus:outline-none bg-transparent"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} className="text-[#a0aab8]">
                      <X size={14} />
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={notifOpen}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6eaf0] bg-white text-[#5e6b85] hover:bg-[#f1f4f9] transition"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute ltr:right-[-80px] rtl:left-[-80px] sm:ltr:right-0 sm:rtl:left-0 mt-2 w-[300px] sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-[#e6eaf0] rounded-2xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#e6eaf0]">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#0f1b3d]">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#1f6feb] text-white text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 text-xs text-[#1f6feb] hover:text-[#1b5bd7] px-2 py-1 rounded-lg hover:bg-[#f1f4f9] transition"
                      >
                        <CheckCheck size={12} /> All read
                      </button>
                    )}
                    <button
                      onClick={loadNotifications}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#5e6b85] hover:bg-[#f1f4f9] transition"
                      aria-label="Refresh notifications"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#5e6b85] hover:bg-[#f1f4f9] transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-72 overflow-y-auto">
                  {notificationsLoading && (
                    <div className="flex items-center justify-center py-8 text-sm text-[#5e6b85]">
                      <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                    </div>
                  )}
                  {!notificationsLoading && notificationsError && (
                    <div className="px-4 py-6 text-sm text-red-500 text-center">
                      {notificationsError}
                    </div>
                  )}
                  {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                    <div className="flex flex-col items-center py-8 text-sm text-[#5e6b85]">
                      <Bell size={28} className="mb-2 text-[#d8dee7]" />
                      You&apos;re all caught up!
                    </div>
                  )}
                  {!notificationsLoading &&
                    !notificationsError &&
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          setNotifOpen(false);
                        }}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#f6f8fb] transition border-b border-[#f1f4f9] last:border-0 ${
                          n.read ? "opacity-60" : ""
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#e7edf3] flex items-center justify-center text-sm font-semibold text-[#1f6feb]">
                            {n.title?.[0] || "N"}
                          </div>
                          {!n.read && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-[#1f6feb] rounded-full ring-2 ring-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium text-[#0f1b3d] truncate ${!n.read ? "font-semibold" : ""}`}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-[#a0aab8] whitespace-nowrap flex-shrink-0 mt-0.5">
                              {formatNotificationTime(n.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-[#5e6b85] mt-0.5 truncate">{n.message}</p>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[#e6eaf0] bg-[#f6f8fb]">
                  <button
                    onClick={() => {
                      router.push("/dashboard/notifications");
                      setNotifOpen(false);
                    }}
                    className="w-full text-center text-xs text-[#1f6feb] hover:text-[#1b5bd7] font-medium py-1 transition"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative flex-shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[#e6eaf0] bg-white hover:bg-[#f6f8fb] transition"
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              {/* Avatar */}
              {avatarSrc && avatarSrc !== "/images/blank-profile-picture.png" ? (
                <img
                  src={avatarSrc}
                  alt={adminName}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1f6feb] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
              )}
              {/* Name — hidden on small screens */}
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-semibold text-[#0f1b3d] truncate max-w-[120px]">{adminName}</p>
                <p className="text-[10px] text-[#5e6b85] truncate max-w-[120px]">{adminEmail}</p>
              </div>
              <ChevronDown size={14} className={`hidden sm:block text-[#5e6b85] transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute ltr:right-[-20px] rtl:left-[-20px] sm:ltr:right-0 sm:rtl:left-0 top-full mt-2 w-48 sm:w-52 bg-white border border-[#e6eaf0] rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* Profile header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#f6f8fb] border-b border-[#e6eaf0]">
                  {avatarSrc && avatarSrc !== "/images/blank-profile-picture.png" ? (
                    <img src={avatarSrc} alt={adminName} width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1f6feb] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0f1b3d] truncate">{adminName}</p>
                    {adminEmail && <p className="text-[11px] text-[#5e6b85] truncate">{adminEmail}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
                  >
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
