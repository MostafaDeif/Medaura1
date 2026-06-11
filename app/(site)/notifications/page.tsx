"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [markingAll, setMarkingAll] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/me", {
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
      setError(err instanceof Error ? err.message : "فشل في جلب الإشعارات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadNotifications();
  }, [isAuthenticated, loadNotifications]);

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.notification_id}/read`, {
            method: "PATCH",
            credentials: "include",
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
    setMarkingAll(false);
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (authLoading) return null;

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-20 pt-28"
      style={{ background: "linear-gradient(160deg,#f5f7ff 0%,#f9fafb 100%)" }}
    >
      <div className="mx-auto w-full max-w-2xl px-4">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dbe2f5] bg-white text-[#0f1a4f] transition hover:bg-[#eef2ff]"
                aria-label="رجوع"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="text-[26px] font-bold text-[#0f1b3d]">الإشعارات</h1>
              {unreadCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-gray-400">
              {notifications.length} إشعار إجمالاً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2f5] bg-white text-[#0f1a4f] transition hover:bg-[#eef2ff] disabled:opacity-50"
              aria-label="تحديث"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-xl border border-[#dbe2f5] bg-white px-3 py-2 text-[12px] font-semibold text-[#0f1a4f] transition hover:bg-[#eef2ff] disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="mb-4 flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm shadow-[#001a6e]/05" style={{ border: "1px solid #e6eaf0" }}>
          {([
            { key: "all", label: `الكل (${notifications.length})` },
            { key: "unread", label: `غير مقروء (${unreadCount})` },
            { key: "read", label: `مقروء (${notifications.length - unreadCount})` },
          ] as { key: typeof filter; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-all duration-200 ${
                filter === tab.key
                  ? "bg-[#0f1a4f] text-white shadow-md"
                  : "text-gray-500 hover:bg-[#f0f4ff] hover:text-[#0f1a4f]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex animate-pulse gap-4 rounded-2xl bg-white p-4 shadow-sm"
                style={{ border: "1px solid #e6eaf0" }}
              >
                <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-3/5 rounded-full bg-gray-200" />
                  <div className="h-3 w-full rounded-full bg-gray-100" />
                  <div className="h-3 w-2/3 rounded-full bg-gray-100" />
                  <div className="h-2.5 w-1/4 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-sm" style={{ border: "1px solid #e6eaf0" }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <BellOff className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#0f1b3d]">حدث خطأ</p>
              <p className="mt-1 text-[13px] text-gray-400">{error}</p>
            </div>
            <button
              onClick={loadNotifications}
              className="rounded-xl bg-[#0f1a4f] px-6 py-2 text-[13px] font-semibold text-white hover:opacity-90"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-20 text-center shadow-sm" style={{ border: "1px solid #e6eaf0" }}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f4ff]">
              <Bell className="h-10 w-10 text-[#0f1a4f]/30" />
            </div>
            <div>
              <p className="text-[17px] font-bold text-[#0f1b3d]">لا توجد إشعارات</p>
              <p className="mt-1 text-[13px] text-gray-400">
                {filter === "unread"
                  ? "أنت محدّث! لا توجد إشعارات غير مقروءة."
                  : filter === "read"
                  ? "لا توجد إشعارات مقروءة بعد."
                  : "لم تصلك أي إشعارات حتى الآن."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((notif, idx) => (
              <NotificationCard
                key={notif.notification_id}
                notif={notif}
                idx={idx}
                onMarkRead={() => markAsRead(notif.notification_id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function NotificationCard({
  notif,
  idx,
  onMarkRead,
}: {
  notif: Notification;
  idx: number;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        notif.is_read ? "" : "ring-2 ring-[#0f1a4f]/10"
      }`}
      style={{
        border: "1px solid #e6eaf0",
        boxShadow: "0 2px 12px rgba(15,26,79,0.06)",
        animationDelay: `${idx * 40}ms`,
      }}
    >
      {/* Unread accent */}
      {!notif.is_read && (
        <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#0f1a4f] to-[#3b5bdb]" />
      )}

      <div className="flex items-start gap-4 p-4 pr-5">
        {/* Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            notif.is_read ? "bg-gray-100" : "bg-[#eef2ff]"
          }`}
        >
          <Bell
            className={`h-5 w-5 ${
              notif.is_read ? "text-gray-400" : "text-[#0f1a4f]"
            }`}
            strokeWidth={1.8}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] leading-5 ${
                  notif.is_read
                    ? "font-medium text-gray-600"
                    : "font-bold text-[#0f1b3d]"
                }`}
              >
                {notif.title}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">
                {notif.message}
              </p>
            </div>

            {/* Unread dot */}
            {!notif.is_read && (
              <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f1a4f]" />
            )}
          </div>

          {/* Footer row */}
          <div className="mt-2.5 flex items-center justify-between">
            {notif.created_at ? (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="h-3 w-3" />
                <span title={formatDate(notif.created_at)}>
                  {timeAgo(notif.created_at)}
                </span>
              </div>
            ) : (
              <span />
            )}

            {!notif.is_read && (
              <button
                type="button"
                onClick={onMarkRead}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#0f1a4f] opacity-0 transition hover:bg-[#eef2ff] group-hover:opacity-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                تحديد كمقروء
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
