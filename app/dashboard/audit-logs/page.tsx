"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  Fragment,
} from "react";
import {
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Shield,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Search,
} from "lucide-react";
import type { AuditLog, AuditStats } from "@/lib/types/api";

const PAGE_SIZE = 15;

// ──────────────────────────── helpers ────────────────────────────

function formatTimestamp(value?: string) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function formatTimestampShort(value?: string) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function getLevelStyle(level?: string): { cls: string; icon: React.ReactNode } {
  const n = level?.toLowerCase();
  if (n === "error")
    return {
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle size={11} />,
    };
  if (n === "warn" || n === "warning")
    return {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <AlertTriangle size={11} />,
    };
  if (n === "success")
    return {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle size={11} />,
    };
  return {
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Info size={11} />,
  };
}

function getMethodStyle(method?: string) {
  const m = method?.toUpperCase();
  if (m === "GET") return "bg-teal-50 text-teal-700 border-teal-200";
  if (m === "POST") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (m === "PUT") return "bg-violet-50 text-violet-700 border-violet-200";
  if (m === "PATCH") return "bg-orange-50 text-orange-700 border-orange-200";
  if (m === "DELETE") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getRoleStyle(role?: string) {
  const r = role?.toLowerCase();
  if (r === "admin") return "bg-[#1f6feb]/10 text-[#1f6feb] border-[#1f6feb]/20";
  if (r === "doctor") return "bg-violet-50 text-violet-700 border-violet-200";
  if (r === "patient") return "bg-teal-50 text-teal-700 border-teal-200";
  if (r === "clinic") return "bg-amber-50 text-amber-700 border-amber-200";
  if (r === "staff") return "bg-pink-50 text-pink-700 border-pink-200";
  return "bg-slate-100 text-slate-500 border-slate-200"; // guest
}

function getStatusStyle(code?: number | null) {
  if (!code) return "text-[#5e6b85]";
  if (code >= 200 && code < 300) return "text-emerald-600 font-semibold";
  if (code >= 300 && code < 400) return "text-amber-600 font-semibold";
  if (code >= 400 && code < 500) return "text-orange-600 font-semibold";
  if (code >= 500) return "text-red-600 font-semibold";
  return "text-[#5e6b85]";
}

function parseAuditStats(result: unknown): AuditStats | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (r.success && r.data) return r.data as AuditStats;
  if (r.stats) return r.stats as AuditStats;
  if (r.data && typeof r.data === "object") return r.data as AuditStats;
  return result as AuditStats;
}

function parseAuditLogs(result: unknown): AuditLog[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data as AuditLog[];
  if (Array.isArray(r.logs)) return r.logs as AuditLog[];
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.logs)) return d.logs as AuditLog[];
  }
  return [];
}

function getActorName(log: AuditLog) {
  if (log.actor_name) return log.actor_name;
  const role = log.actor_role || (log.actor_user_id ? "user" : "guest");
  const id = log.actor_user_id ?? log.user_id;
  return id ? `${role} #${id}` : role;
}

function getActorEmail(log: AuditLog) {
  if (log.actor_email) return log.actor_email;
  const body = log.body && typeof log.body === "object" ? log.body : null;
  if (body && "email" in body && typeof body.email === "string") return body.email;
  return null;
}

function safeDecode(val?: string | null): string {
  if (!val) return "";
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

function getLocationString(log: AuditLog) {
  const loc = log.ip_location;
  if (!loc) return null;
  const city = safeDecode(loc.city);
  const region = safeDecode(loc.region);
  const country = safeDecode(loc.country);
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

// ──────────────────────────── stat card ────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#e6eaf0] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-[#5e6b85] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#0f1b3d] leading-none">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ──────────────────────────── filter bar ────────────────────────────

interface Filters {
  search: string;
  actor_role: string;
  method: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  actor_role: "",
  method: "",
  location: "",
  dateFrom: "",
  dateTo: "",
  status: "",
};

const ROLES = ["patient", "doctor", "staff", "clinic", "admin", "guest"];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// ──────────────────────────── main page ────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<Filters>(INITIAL_FILTERS);
  const fetchController = useRef<AbortController | null>(null);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ""),
    [filters]
  );

  // Build fetch URL from backend-side filters (role, method, location)
  const buildFetchUrl = useCallback((f: Filters) => {
    const params = new URLSearchParams();
    if (f.actor_role) params.set("actor_role", f.actor_role);
    if (f.method) params.set("method", f.method);
    if (f.location) params.set("location_contains", f.location);
    const qs = params.toString();
    return `/api/admin/audit-logs${qs ? "?" + qs : ""}`;
  }, []);

  const loadAuditData = useCallback(
    async (f: Filters) => {
      if (fetchController.current) fetchController.current.abort();
      fetchController.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch("/api/admin/audit-stats", {
            credentials: "include",
            signal: fetchController.current.signal,
          }),
          fetch(buildFetchUrl(f), {
            credentials: "include",
            signal: fetchController.current.signal,
          }),
        ]);

        const [statsJson, logsJson] = await Promise.all([
          statsRes.json().catch(() => null),
          logsRes.json().catch(() => null),
        ]);

        const parsedStats = parseAuditStats(statsJson);
        const parsedLogs = parseAuditLogs(logsJson).sort((a, b) => {
          const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
          const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
          return bTime - aTime;
        });

        setStats(parsedStats);
        setLogs(parsedLogs);
        if (!statsRes.ok || !logsRes.ok) {
          const msg =
            logsJson?.error || statsJson?.error || "Partial data available";
          setError(msg);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load audit data");
      } finally {
        setLoading(false);
      }
    },
    [buildFetchUrl]
  );

  useEffect(() => {
    loadAuditData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter: search (path/action), date range, and status
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.path?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.method?.toLowerCase().includes(q)
      );
    }

    if (filters.dateFrom) {
      const from = Date.parse(filters.dateFrom);
      if (!Number.isNaN(from)) {
        result = result.filter(
          (l) => l.timestamp && Date.parse(l.timestamp) >= from
        );
      }
    }

    if (filters.dateTo) {
      const to = Date.parse(filters.dateTo + "T23:59:59");
      if (!Number.isNaN(to)) {
        result = result.filter(
          (l) => l.timestamp && Date.parse(l.timestamp) <= to
        );
      }
    }

    if (filters.status) {
      const statusFilter = filters.status.toLowerCase();
      if (statusFilter === "success") {
        result = result.filter(
          (l) =>
            l.level?.toLowerCase() === "success" ||
            (typeof l.status_code === "number" && l.status_code >= 200 && l.status_code < 400)
        );
      } else if (statusFilter === "failed") {
        result = result.filter(
          (l) =>
            l.level?.toLowerCase() === "failed" ||
            (typeof l.status_code === "number" && l.status_code >= 400)
        );
      } else if (statusFilter === "error") {
        result = result.filter(
          (l) => l.level?.toLowerCase() === "error"
        );
      }
    }

    return result;
  }, [logs, filters]);

  // Derived stats (always from raw logs count)
  const derivedStats = useMemo(() => {
    const totals = { info: 0, error: 0, success: 0, failed: 0 };
    logs.forEach((log) => {
      const level = log.level?.toLowerCase();
      if (level === "info") totals.info++;
      if (level === "error") totals.error++;
      if (typeof log.status_code === "number") {
        if (log.status_code >= 200 && log.status_code < 400) totals.success++;
        if (log.status_code >= 400) totals.failed++;
      }
    });
    return {
      total_logs: stats?.total_logs ?? logs.length,
      total_info_logs: stats?.total_info_logs ?? totals.info,
      total_error_logs: stats?.total_error_logs ?? totals.error,
      total_success_logs: stats?.total_success_logs ?? totals.success,
      total_failed_logs: stats?.total_failed_logs ?? totals.failed,
    };
  }, [stats, logs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const pageLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  const pageNumbers = useMemo(() => {
    const max = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - max + 1));
    const end = Math.min(totalPages, start + max - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const applyFilters = () => {
    const next = { ...pendingFilters };
    setFilters(next);
    setFiltersOpen(false);
    // If backend-filterable fields changed, re-fetch
    if (
      next.actor_role !== filters.actor_role ||
      next.method !== filters.method ||
      next.location !== filters.location
    ) {
      loadAuditData(next);
    }
  };

  const clearFilters = () => {
    setPendingFilters(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setFiltersOpen(false);
    loadAuditData(INITIAL_FILTERS);
  };

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getRowId = (log: AuditLog, index: number) =>
    `${log.id ?? "log"}-${index}`;

  return (
    <div className="space-y-5 pb-10">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1b3d]">Audit Logs</h1>
          <p className="text-sm text-[#5e6b85] mt-0.5">
            Monitor all system activity across the platform in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFiltersOpen((v) => !v);
              setPendingFilters(filters);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${
              hasActiveFilters || filtersOpen
                ? "border-[#1f6feb] bg-[#1f6feb]/10 text-[#1f6feb]"
                : "border-[#e6eaf0] bg-white text-[#5e6b85] hover:bg-[#f6f8fb]"
            }`}
          >
            <Filter size={15} />
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-[#1f6feb] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={() => loadAuditData(filters)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e6eaf0] bg-white text-[#5e6b85] hover:bg-[#f6f8fb] text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Logs"
          value={derivedStats.total_logs}
          icon={<Activity size={18} />}
          color="text-[#1f6feb]"
          bgColor="bg-[#1f6feb]/10"
        />
        <StatCard
          label="Info"
          value={derivedStats.total_info_logs}
          icon={<Info size={18} />}
          color="text-slate-600"
          bgColor="bg-slate-100"
        />
        <StatCard
          label="Errors"
          value={derivedStats.total_error_logs}
          icon={<XCircle size={18} />}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          label="Successful"
          value={derivedStats.total_success_logs}
          icon={<CheckCircle size={18} />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          label="Failed"
          value={derivedStats.total_failed_logs}
          icon={<AlertTriangle size={18} />}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* ── Filter panel ────────────────────────────────────────── */}
      {filtersOpen && (
        <div className="bg-white border border-[#e6eaf0] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f1b3d] flex items-center gap-2">
              <Filter size={15} className="text-[#1f6feb]" />
              Filter Logs
            </h3>
            <button
              onClick={() => setFiltersOpen(false)}
              className="text-[#5e6b85] hover:text-[#0f1b3d] transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Search Path / Action
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a0aab8]" />
                <input
                  type="text"
                  value={pendingFilters.search}
                  onChange={(e) =>
                    setPendingFilters((p) => ({ ...p, search: e.target.value }))
                  }
                  placeholder="/api/... or action name"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Actor Role
              </label>
              <select
                value={pendingFilters.actor_role}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, actor_role: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                HTTP Method
              </label>
              <select
                value={pendingFilters.method}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, method: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
              >
                <option value="">All methods</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Location (city / country)
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a0aab8]" />
                <input
                  type="text"
                  value={pendingFilters.location}
                  onChange={(e) =>
                    setPendingFilters((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="e.g. Cairo, Egypt"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] placeholder-[#a0aab8] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Date From
              </label>
              <input
                type="date"
                value={pendingFilters.dateFrom}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, dateFrom: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Date To
              </label>
              <input
                type="date"
                value={pendingFilters.dateTo}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, dateTo: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
              />
            </div>

            {/* Log Status */}
            <div>
              <label className="block text-xs font-medium text-[#5e6b85] mb-1">
                Log Status
              </label>
              <select
                value={pendingFilters.status}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#e6eaf0] bg-[#f6f8fb] text-sm text-[#0f1b3d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb]/30 focus:border-[#1f6feb] transition"
              >
                <option value="">All statuses</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
                <option value="error">Errors</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[#e6eaf0]">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-[#1f6feb] hover:bg-[#1b5bd7] text-white text-sm font-semibold rounded-xl transition"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-[#e6eaf0] text-[#5e6b85] hover:bg-[#f6f8fb] text-sm rounded-xl transition"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !filtersOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <FilterChip label={`Search: ${filters.search}`} onRemove={() => {
              setFilters((p) => ({ ...p, search: "" }));
            }} />
          )}
          {filters.actor_role && (
            <FilterChip label={`Role: ${filters.actor_role}`} onRemove={() => {
              const next = { ...filters, actor_role: "" };
              setFilters(next);
              loadAuditData(next);
            }} />
          )}
          {filters.method && (
            <FilterChip label={`Method: ${filters.method}`} onRemove={() => {
              const next = { ...filters, method: "" };
              setFilters(next);
              loadAuditData(next);
            }} />
          )}
          {filters.location && (
            <FilterChip label={`Location: ${filters.location}`} onRemove={() => {
              const next = { ...filters, location: "" };
              setFilters(next);
              loadAuditData(next);
            }} />
          )}
          {filters.dateFrom && (
            <FilterChip label={`From: ${filters.dateFrom}`} onRemove={() => {
              setFilters((p) => ({ ...p, dateFrom: "" }));
            }} />
          )}
          {filters.dateTo && (
            <FilterChip label={`To: ${filters.dateTo}`} onRemove={() => {
              setFilters((p) => ({ ...p, dateTo: "" }));
            }} />
          )}
          {filters.status && (
            <FilterChip label={`Status: ${filters.status === "success" ? "Successful" : filters.status === "failed" ? "Failed" : "Errors"}`} onRemove={() => {
              setFilters((p) => ({ ...p, status: "" }));
            }} />
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-[#5e6b85] hover:text-[#0f1b3d] underline underline-offset-2 transition"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Log table ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#e6eaf0] rounded-2xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e6eaf0] bg-[#f6f8fb]">
          <h2 className="text-sm font-semibold text-[#0f1b3d]">
            Log Entries
            {filteredLogs.length > 0 && (
              <span className="ml-2 text-xs font-normal text-[#5e6b85]">
                ({filteredLogs.length} {filteredLogs.length !== logs.length ? `of ${logs.length} ` : ""}
                {filteredLogs.length === 1 ? "entry" : "entries"})
              </span>
            )}
          </h2>
          <span className="text-xs text-[#5e6b85]">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#f1f4f9] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 px-6 py-5 text-sm text-red-600 bg-red-50 border-b border-red-100">
            <XCircle size={18} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="flex flex-col items-center py-14 text-[#5e6b85]">
            <Activity size={36} className="mb-3 text-[#d8dee7]" />
            <p className="font-medium text-sm">No logs found</p>
            <p className="text-xs mt-1">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Logs will appear here once API activity is recorded"}
            </p>
          </div>
        )}

        {/* ── Mobile cards ─── */}
        {!loading && !error && pageLogs.length > 0 && (
          <>
            <div className="sm:hidden divide-y divide-[#f1f4f9]">
              {pageLogs.map((log, index) => {
                const rowId = getRowId(log, index);
                const expanded = expandedId === rowId;
                const levelStyle = getLevelStyle(log.level);
                const role = log.actor_role || "guest";
                const locationStr = getLocationString(log);
                const actorName = getActorName(log);
                const actorEmail = getActorEmail(log);

                return (
                  <div key={rowId}>
                    <div
                      className="px-4 py-3 cursor-pointer active:bg-[#f6f8fb]"
                      onClick={() => toggleRow(rowId)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          {log.method && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodStyle(log.method)}`}>
                              {log.method}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${levelStyle.cls}`}>
                            {levelStyle.icon}
                            {log.level || "info"}
                          </span>
                        </div>
                        {expanded ? <ChevronUp size={14} className="text-[#5e6b85] flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-[#5e6b85] flex-shrink-0 mt-0.5" />}
                      </div>

                      <p className="text-sm font-medium text-[#0f1b3d] truncate mb-1">
                        {log.path || log.action || "—"}
                      </p>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <span className="text-[#5e6b85]">Actor</span>
                        <span className="text-[#0f1b3d] truncate font-medium">{actorName}</span>

                        {actorEmail && (
                          <>
                            <span className="text-[#5e6b85]">Email</span>
                            <span className="text-[#0f1b3d] truncate">{actorEmail}</span>
                          </>
                        )}

                        <span className="text-[#5e6b85]">IP</span>
                        <span className="text-[#0f1b3d] font-mono">{log.ip || "—"}</span>

                        {locationStr && (
                          <>
                            <span className="text-[#5e6b85]">Location</span>
                            <span className="text-[#0f1b3d]">{locationStr}</span>
                          </>
                        )}

                        <span className="text-[#5e6b85]">Time</span>
                        <span className="text-[#0f1b3d]">{formatTimestampShort(log.timestamp)}</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <ExpandedDetail log={log} role={role} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ─── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[#f6f8fb] border-b border-[#e6eaf0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide w-8" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide">Method / Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide">Path / Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide hidden md:table-cell">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide hidden lg:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide hidden xl:table-cell">IP / Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5e6b85] uppercase tracking-wide hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLogs.map((log, index) => {
                    const rowId = getRowId(log, index);
                    const expanded = expandedId === rowId;
                    const levelStyle = getLevelStyle(log.level);
                    const role = log.actor_role || "guest";
                    const locationStr = getLocationString(log);
                    const actorName = getActorName(log);
                    const actorEmail = getActorEmail(log);

                    return (
                      <Fragment key={rowId}>
                        <tr
                          key={rowId}
                          onClick={() => toggleRow(rowId)}
                          className={`border-t border-[#f1f4f9] cursor-pointer transition-colors ${
                            expanded ? "bg-[#f6fbff]" : "hover:bg-[#f6f8fb]"
                          }`}
                        >
                          {/* Expand toggle */}
                          <td className="px-3 py-3">
                            <div className="w-6 h-6 flex items-center justify-center rounded-lg text-[#a0aab8] hover:text-[#5e6b85] hover:bg-[#e6eaf0] transition">
                              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </td>

                          {/* Method + Level */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {log.method && (
                                <span className={`inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodStyle(log.method)}`}>
                                  {log.method}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-0.5 w-fit px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${levelStyle.cls}`}>
                                {levelStyle.icon}
                                {log.level || "info"}
                              </span>
                            </div>
                          </td>

                          {/* Path */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <p className="text-[#0f1b3d] font-medium truncate text-xs">
                              {log.path || log.action || "—"}
                            </p>
                            {log.action && log.path && (
                              <p className="text-[#5e6b85] text-[11px] truncate">{log.action}</p>
                            )}
                          </td>

                          {/* Actor */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div>
                              <p className="text-[#0f1b3d] text-xs font-medium truncate max-w-[130px]">{actorName}</p>
                              <span className={`inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded-full text-[10px] font-semibold border ${getRoleStyle(role)}`}>
                                {role}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-[#5e6b85] text-xs truncate max-w-[160px] block">
                              {actorEmail || "—"}
                            </span>
                          </td>

                          {/* IP / Location */}
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <div>
                              <p className="text-[#0f1b3d] text-xs font-mono">{log.ip || "—"}</p>
                              {locationStr && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} className="text-[#1f6feb] flex-shrink-0" />
                                  <span className="text-[11px] text-[#5e6b85] truncate max-w-[140px]">{locationStr}</span>
                                  {log.ip_location?.map_url && (
                                    <a
                                      href={log.ip_location.map_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[#1f6feb] hover:text-[#1b5bd7] flex-shrink-0"
                                    >
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[#5e6b85] text-xs">
                              <Clock size={11} className="flex-shrink-0" />
                              {formatTimestampShort(log.timestamp)}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            {log.status_code ? (
                              <span className={`text-xs font-mono ${getStatusStyle(log.status_code)}`}>
                                {log.status_code}
                              </span>
                            ) : (
                              <span className="text-[#a0aab8] text-xs">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {expanded && (
                          <tr key={`${rowId}-detail`} className="border-t border-[#e6f0ff]">
                            <td colSpan={8} className="px-0 py-0">
                              <ExpandedDetail log={log} role={role} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#5e6b85]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl border border-[#e6eaf0] text-xs font-medium text-[#5e6b85] hover:bg-[#f6f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            {pageNumbers.map((pg) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 rounded-xl border text-xs font-medium transition ${
                  pg === page
                    ? "border-[#1f6feb] bg-[#1f6feb] text-white"
                    : "border-[#e6eaf0] text-[#5e6b85] hover:bg-[#f6f8fb]"
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl border border-[#e6eaf0] text-xs font-medium text-[#5e6b85] hover:bg-[#f6f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── sub-components ────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1f6feb]/10 text-[#1f6feb] border border-[#1f6feb]/20 rounded-full text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-[#1b5bd7] transition"
        aria-label="Remove filter"
      >
        <X size={11} />
      </button>
    </span>
  );
}

function ExpandedDetail({ log, role }: { log: AuditLog; role: string }) {
  const loc = log.ip_location;
  const hasLocation = loc && (loc.city || loc.country || loc.latitude);
  const actorEmail = getActorEmail(log);

  return (
    <div className="bg-[#f6fbff] border-t border-[#dbeafe] px-5 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

        {/* Actor detail */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#0f1b3d] uppercase tracking-wide flex items-center gap-1">
            <Shield size={12} className="text-[#1f6feb]" /> Actor
          </h4>
          <div className="space-y-1 text-xs">
            <InfoRow label="Name" value={getActorName(log)} />
            {actorEmail && <InfoRow label="Email" value={actorEmail} />}
            <InfoRow
              label="Role"
              value={
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleStyle(role)}`}>
                  {role}
                </span>
              }
            />
            {log.user_agent && (
              <InfoRow label="User Agent" value={log.user_agent} truncate />
            )}
          </div>
        </div>

        {/* Request detail */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#0f1b3d] uppercase tracking-wide flex items-center gap-1">
            <Activity size={12} className="text-[#1f6feb]" /> Request
          </h4>
          <div className="space-y-1 text-xs">
            <InfoRow label="Method" value={log.method || "—"} />
            <InfoRow label="Path" value={log.path || "—"} mono />
            <InfoRow label="Status" value={log.status_code ? String(log.status_code) : "—"} />
            <InfoRow label="Duration" value={log.duration_ms != null ? `${log.duration_ms}ms` : "—"} />
            {log.error_message && (
              <InfoRow label="Error" value={log.error_message} cls="text-red-600" />
            )}
          </div>
        </div>

        {/* IP / Location */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#0f1b3d] uppercase tracking-wide flex items-center gap-1">
            <MapPin size={12} className="text-[#1f6feb]" /> IP & Location
          </h4>
          <div className="space-y-1 text-xs">
            <InfoRow label="IP Address" value={log.ip || "—"} mono />
            {hasLocation ? (
              <>
                {loc.city && <InfoRow label="City" value={safeDecode(loc.city)} />}
                {loc.region && <InfoRow label="Region" value={safeDecode(loc.region)} />}
                {loc.country && <InfoRow label="Country" value={safeDecode(loc.country)} />}
                {loc.latitude != null && loc.longitude != null && (
                  <InfoRow
                    label="Coordinates"
                    value={`${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}`}
                    mono
                  />
                )}
                {loc.source && (
                  <InfoRow label="Source" value={loc.source} />
                )}
                {loc.map_url && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={loc.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f6feb] hover:bg-[#1b5bd7] text-white text-[11px] font-semibold rounded-lg transition"
                    >
                      <MapPin size={11} /> View on Map
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[#a0aab8]">No location data</p>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp full */}
      <div className="mt-3 pt-3 border-t border-[#dbeafe] flex items-center gap-1.5 text-xs text-[#5e6b85]">
        <Clock size={11} />
        <span>Full timestamp: {formatTimestamp(log.timestamp)}</span>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  truncate = false,
  cls = "",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  truncate?: boolean;
  cls?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#5e6b85] min-w-[70px] flex-shrink-0">{label}:</span>
      <span
        className={`text-[#0f1b3d] flex-1 ${mono ? "font-mono" : ""} ${truncate ? "truncate" : "break-words"} ${cls}`}
      >
        {value}
      </span>
    </div>
  );
}
