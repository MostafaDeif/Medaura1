"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hash,
  Mail,
  ShieldCheck,
  UserRound,
  CalendarDays,
  Trash2,
  RotateCcw,
  Phone,
} from "lucide-react";

type AdminUser = {
  admin_id: number | string;
  user_id: number;
  email: string;
  full_name: string | null;
  photo: string | null;
  is_active: boolean;
  created_at: string | null;
  role?: string | null;
  phone?: string | null;
};

type ApiPayload = {
  success?: boolean;
  status?: string;
  data?: unknown;
  admins?: unknown;
  error?: string;
  message?: string;
};

const FALLBACK = "/images/blank-profile-picture.png";
const PAGE_SIZE = 9;

function getWhatsAppUrl(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "#";
  if (cleaned.startsWith("+20")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("20")) {
    // already prefix
  } else {
    if (cleaned.startsWith("0")) {
      cleaned = "20" + cleaned.substring(1);
    } else {
      cleaned = "20" + cleaned;
    }
  }
  return `https://wa.me/${cleaned}`;
}

function normalizeAdmin(raw: unknown): AdminUser {
  const r = raw as Partial<AdminUser> & { id?: number | string; name?: string; role?: string; phone?: string; profile?: { phone?: string } };
  return {
    admin_id: r.admin_id ?? r.id ?? "",
    user_id: r.user_id ?? r.id ?? "",
    email: r.email ?? "",
    full_name: r.full_name ?? r.name ?? null,
    photo: r.photo ?? null,
    is_active: r.is_active !== false,
    created_at: r.created_at ?? null,
    role: r.role ?? null,
    phone: r.phone ?? r.profile?.phone ?? null,
  };
}

function unwrap(payload: ApiPayload): AdminUser[] {
  let raw = payload.data ?? payload.admins ?? [];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rObj = raw as Record<string, unknown>;
    raw = rObj.data ?? rObj.admins ?? rObj.users ?? rObj.staff ?? [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAdmin);
}

function formatDate(iso: string | null) {
  if (!iso) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function getName(a: AdminUser) {
  return a.full_name?.trim() || `مسؤول #${a.admin_id}`;
}

export default function StaffAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<Record<number, boolean>>({});

  const handleToggleActive = useCallback(
    async (admin: AdminUser, activate: boolean) => {
      const uid = admin.user_id;
      if (!uid) return;
      setPendingAction((prev) => ({ ...prev, [uid]: true }));
      try {
        const url = activate
          ? `/api/admin/users/${uid}/undelete`
          : `/api/admin/users/${uid}/delete`;
        const method = activate ? "PATCH" : "DELETE";
        const res = await fetch(url, { method, credentials: "include" });
        if (!res.ok) throw new Error("فشل تنفيذ العملية");
        setAdmins((prev) =>
          prev.map((a) =>
            a.user_id === uid ? { ...a, is_active: activate } : a
          )
        );
      } catch {
        // silent — keep existing state
      } finally {
        setPendingAction((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }
    },
    []
  );

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", { credentials: "include" });
      const payload = (await res.json()) as ApiPayload;
      if (!res.ok || payload.success === false || payload.status === "fail") {
        throw new Error(payload.error || payload.message || "فشل تحميل البيانات");
      }
      setAdmins(unwrap(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل بيانات المسؤولين.");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchAdmins(), 0);
    return () => window.clearTimeout(id);
  }, [fetchAdmins]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return admins;
    return admins.filter((a) =>
      [a.full_name, a.email, String(a.admin_id), String(a.user_id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [admins, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const s = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(s, s + PAGE_SIZE);
  }, [currentPage, filtered]);

  const activeCount = admins.filter((a) => a.is_active).length;

  return (
    <div className="min-h-screen space-y-6 p-1" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EBF2F9] px-3 py-1 text-xs font-semibold text-[#1F2B6C]">
            <ShieldCheck size={14} />
            إدارة المسؤولين
          </p>
          <h1 className="text-3xl font-bold text-(--text-primary)">الموظفون</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            عرض جميع حسابات المسؤولين والمشرفين المسجلين في المنصة.
          </p>
        </div>
        <button
          onClick={() => void fetchAdmins()}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-(--input-border) bg-(--card-bg) px-4 py-2.5 text-sm font-semibold text-(--text-primary) shadow-[var(--shadow-soft)] transition hover:bg-(--hover-bg) disabled:opacity-60 lg:w-auto cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          تحديث
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <StatCard icon={<ShieldCheck size={20} />} label="إجمالي المسؤولين" value={admins.length} color="blue" />
        <StatCard icon={<CheckCircle2 size={20} />} label="النشطون" value={activeCount} color="green" />
        <StatCard icon={<XCircle size={20} />} label="غير النشطين" value={admins.length - activeCount} color="red" />
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchAdmins()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Main card */}
      <section className="overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-(--card-border) p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">دليل المسؤولين</h2>
            <p className="mt-0.5 text-sm text-(--text-secondary)">
              عرض {filtered.length} من أصل {admins.length} مسؤول
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ابحث بالاسم أو البريد أو الرقم..."
              className="w-full rounded-xl border border-(--input-border) bg-(--input2-bg) py-2.5 pl-4 pr-10 text-sm text-(--text-primary) outline-none transition placeholder:text-(--text-secondary) focus:border-[#1F2B6C] text-right"
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-(--card-border) p-5 space-y-3">
                <div className="flex items-center justify-end gap-3">
                  <div className="space-y-2 flex-1 text-right">
                    <div className="h-4 w-2/3 rounded-full bg-gray-200 ml-auto" />
                    <div className="h-3 w-1/2 rounded-full bg-gray-100 ml-auto" />
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-5/6 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <>
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users size={52} className="mb-3 opacity-20 text-(--text-secondary)" />
                <p className="text-base font-bold text-(--text-primary)">لا يوجد مسؤولون مطابقون</p>
                <p className="mt-1 text-xs text-(--text-secondary)">جرّب تغيير مصطلح البحث.</p>
              </div>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((admin) => (
                  <AdminCard
                    key={admin.admin_id}
                    admin={admin}
                    isPending={!!pendingAction[admin.user_id]}
                    onToggle={(activate) => void handleToggleActive(admin, activate)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-(--card-border) p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-(--text-secondary)">
              صفحة <strong className="text-(--text-primary)">{currentPage}</strong> من{" "}
              <strong className="text-(--text-primary)">{totalPages}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <PageBtn disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)} label="السابق">‹</PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-9 min-w-9 rounded-xl px-3 text-sm font-bold transition cursor-pointer ${
                    n === currentPage
                      ? "bg-[#1F2B6C] text-white shadow-md"
                      : "border border-(--input-border) text-(--text-primary) hover:bg-(--hover-bg)"
                  }`}
                >
                  {n}
                </button>
              ))}
              <PageBtn disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)} label="التالي">›</PageBtn>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

const COLORS = {
  blue: { bg: "bg-[#EBF2F9]", text: "text-[#1F2B6C]" },
  green: { bg: "bg-[#DCFCE7]", text: "text-[#008236]" },
  red: { bg: "bg-[#FFE2E2]", text: "text-[#C10007]" },
} as const;

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: keyof typeof COLORS;
}) {
  const c = COLORS[color];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 shadow-[var(--shadow-soft)]">
      <div className={`absolute -left-4 -top-4 h-20 w-20 rounded-full opacity-10 ${c.bg}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-(--text-primary)">{value}</p>
          <p className="mt-1 text-xs font-semibold text-(--text-secondary)">{label}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${c.bg} ${c.text}`}>{icon}</div>
      </div>
    </div>
  );
}

function AdminCard({
  admin,
  isPending,
  onToggle,
}: {
  admin: AdminUser;
  isPending: boolean;
  onToggle: (activate: boolean) => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Accent top bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1F2B6C] to-[#005fb8]" />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Avatar + name */}
        <div className="flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <p className="font-bold text-base text-(--text-primary) group-hover:text-[#1F2B6C] transition truncate">
              {getName(admin)}
            </p>
            {admin.role && (
              <span className="inline-block mt-1 rounded bg-[#EBF2F9] px-2 py-0.5 text-[10px] font-bold text-[#1F2B6C]">
                {admin.role === "admin"
                  ? "مسؤول النظام"
                  : admin.role === "super_admin"
                  ? "مدير عام"
                  : admin.role === "staff"
                  ? "موظف"
                  : admin.role}
              </span>
            )}
            {admin.email && (
              <p className="text-xs text-(--text-secondary) truncate mt-1">{admin.email}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <Image
              src={admin.photo?.trim() || "/images/blank-profile-picture.png"}
              alt={getName(admin)}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border-2 border-(--card-border) object-cover"
            />
            {admin.is_active && (
              <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
        </div>
          <div className="h-px bg-(--card-border)" />

        {/* Info chips */}
        <div className="space-y-2 text-xs text-(--text-secondary)">
          <InfoRow icon={<Hash size={13} />} label={`${admin.admin_id}`} />
          <InfoRow icon={<UserRound size={13} />} label={`${admin.user_id}`} />
          {admin.email && <InfoRow icon={<Mail size={13} />} label={admin.email} />}
          {admin.phone && (
            <div className="flex items-center justify-end gap-1.5 border-t border-(--card-border) pt-2 mt-1">
              <a
                href={getWhatsAppUrl(admin.phone)}
                target="_blank"
                rel="noopener noreferrer"
                title="تواصل عبر الواتساب"
                className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded border border-green-150 transition cursor-pointer"
              >
                <span>واتساب</span>
                <Phone size={10} className="shrink-0 text-green-600" />
              </a>
              <span className="truncate max-w-[200px]" dir="ltr">{admin.phone}</span>
            </div>
          )}
          {admin.created_at && (
            <InfoRow icon={<CalendarDays size={13} />} label={`انضم: ${formatDate(admin.created_at)}`} />
          )}
        </div>

        {/* Status + Action */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {/* Status badge */}
          {admin.is_active ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#B9F8CF] bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#008236]">
              <CheckCircle2 size={12} /> نشط
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FFC9C9] bg-[#FFE2E2] px-3 py-1 text-xs font-bold text-[#C10007]">
              <XCircle size={12} /> غير نشط
            </span>
          )}

          {/* Action button */}
          <ActionToggleBtn
            isActive={admin.is_active}
            isPending={isPending}
            onToggle={onToggle}
          />
        </div>
      </div>
    </article>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="truncate max-w-[200px]">{label}</span>
      <span className="text-[#1F2B6C] shrink-0">{icon}</span>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--input-border) text-(--text-primary) hover:bg-(--hover-bg) disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-lg font-bold"
    >
      {children}
    </button>
  );
}

function ActionToggleBtn({
  isActive,
  isPending,
  onToggle,
}: {
  isActive: boolean;
  isPending: boolean;
  onToggle: (activate: boolean) => void;
}) {
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-(--card-border) px-3 py-1.5 text-xs font-semibold text-(--text-secondary)">
        <Loader2 size={13} className="animate-spin" />
        جاري...
      </span>
    );
  }

  if (isActive) {
    return (
      <button
        onClick={() => onToggle(false)}
        title="تعطيل الحساب"
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
      >
        <Trash2 size={13} />
        تعطيل
      </button>
    );
  }

  return (
    <button
      onClick={() => onToggle(true)}
      title="إعادة تفعيل الحساب"
      className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 transition cursor-pointer"
    >
      <RotateCcw size={13} />
      تفعيل
    </button>
  );
}
