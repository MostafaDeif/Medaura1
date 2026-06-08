"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Mail,
  Hash,
  Stethoscope,
  BadgeCheck,
  Clock,
  CheckCircle,
  CircleOff,
  ShieldOff,
  Trash2,
  Pencil,
  KeyRound,
  Power,
} from "lucide-react";
import type { StaffMember } from "./StaffTable";
import { getStaffId, getStaffVerified } from "./staffIdentity";
import ConfirmDialog from "./ConfirmDialog";

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function toBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(n)) return true;
    if (["false", "0", "no", "inactive"].includes(n)) return false;
  }
  return null;
}

function getActiveStatus(m: StaffMember) {
  return toBooleanFlag(m.is_active ?? m.isActive ?? m.active);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ── Info Row ───────────────────────────────────────────────────────────────── */
function InfoRow({
  icon,
  label,
  value,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  dir?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-xl bg-(--semi-card-bg) flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wide">
          {label}
        </p>
        <p
          className="text-sm font-medium text-(--text-primary) mt-0.5 break-all"
          dir={dir}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Disabled Action Button ─────────────────────────────────────────────────── */
function DisabledAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="relative group/tip">
      <button
        disabled
        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-(--card-border) text-sm font-medium text-(--text-secondary) opacity-50 cursor-not-allowed transition"
      >
        {icon}
        {label}
        <span className="mr-auto text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
          قريباً
        </span>
      </button>
    </div>
  );
}

/* ── Props ──────────────────────────────────────────────────────────────────── */
interface DoctorDrawerProps {
  doctor: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onVerify: (id: number) => Promise<void>;
  onUnverify: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function DoctorDrawer({
  doctor,
  open,
  onClose,
  onVerify,
  onUnverify,
  onDelete,
}: DoctorDrawerProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "unverify" | "delete" | null
  >(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleAction = useCallback(
    async (action: string, fn: () => Promise<void>) => {
      setActionLoading(action);
      try {
        await fn();
      } finally {
        setActionLoading(null);
        setConfirmAction(null);
      }
    },
    []
  );

  if (!doctor) return null;

  const staffId = getStaffId(doctor);
  const verified = getStaffVerified(doctor);
  const active = getActiveStatus(doctor);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* ── Desktop Drawer (right side for RTL) ─────────────────────────────── */}
      <div
        className={`fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-(--card-bg) border-l border-(--card-border) shadow-2xl transition-transform duration-300 ease-out hidden sm:flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--card-border)">
          <h2 className="text-base font-bold text-(--text-primary)">
            تفاصيل الطبيب
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-(--hover-bg) transition text-(--text-secondary)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <DrawerContent
            doctor={doctor}
            staffId={staffId}
            verified={verified}
            active={active}
            actionLoading={actionLoading}
            onVerify={() => {
              if (staffId !== null)
                void handleAction("verify", () => onVerify(staffId));
            }}
            onUnverifyClick={() => setConfirmAction("unverify")}
            onDeleteClick={() => setConfirmAction("delete")}
          />
        </div>
      </div>

      {/* ── Mobile Bottom Sheet ─────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[110] bg-(--card-bg) border-t border-(--card-border) rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out sm:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "90vh" }}
        dir="rtl"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-(--card-border)" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-(--card-border)">
          <h2 className="text-base font-bold text-(--text-primary)">
            تفاصيل الطبيب
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-(--hover-bg) transition text-(--text-secondary)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 100px)" }}>
          <DrawerContent
            doctor={doctor}
            staffId={staffId}
            verified={verified}
            active={active}
            actionLoading={actionLoading}
            onVerify={() => {
              if (staffId !== null)
                void handleAction("verify", () => onVerify(staffId));
            }}
            onUnverifyClick={() => setConfirmAction("unverify")}
            onDeleteClick={() => setConfirmAction("delete")}
          />
        </div>
      </div>

      {/* ── Confirm Dialogs ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmAction === "unverify"}
        title="إلغاء التوثيق"
        description={`هل تريد إلغاء توثيق "${doctor.full_name}"؟ سيعود إلى وضع الانتظار.`}
        confirmText="إلغاء التوثيق"
        variant="warning"
        icon={<ShieldOff size={26} />}
        loading={actionLoading === "unverify"}
        onConfirm={() => {
          if (staffId !== null)
            void handleAction("unverify", () => onUnverify(staffId));
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === "delete"}
        title="حذف الطبيب"
        description={`هل أنت متأكد من حذف "${doctor.full_name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        confirmText="حذف نهائي"
        variant="danger"
        icon={<Trash2 size={26} />}
        loading={actionLoading === "delete"}
        onConfirm={() => {
          if (staffId !== null)
            void handleAction("delete", () => onDelete(staffId));
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

/* ── Shared Drawer Content ──────────────────────────────────────────────────── */
function DrawerContent({
  doctor,
  staffId,
  verified,
  active,
  actionLoading,
  onVerify,
  onUnverifyClick,
  onDeleteClick,
}: {
  doctor: StaffMember;
  staffId: number | null;
  verified: boolean;
  active: boolean | null;
  actionLoading: string | null;
  onVerify: () => void;
  onUnverifyClick: () => void;
  onDeleteClick: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      {/* ── Profile Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-3">
        {/* Large Avatar */}
        <div className="w-20 h-20 rounded-3xl bg-teal-500/10 flex items-center justify-center overflow-hidden border-2 border-(--card-border) shadow-sm">
          {doctor.photo ? (
            <img
              src={doctor.photo}
              alt={doctor.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">
              {getInitials(doctor.full_name)}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-(--text-primary)">
            {doctor.full_name}
          </h3>
          {doctor.specialist && (
            <p className="text-sm text-(--text-secondary) mt-0.5">
              {doctor.specialist}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {verified ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <BadgeCheck size={13} />
              موثق
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock size={13} />
              بانتظار التوثيق
            </span>
          )}

          {active !== null && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                active
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {active ? <CheckCircle size={13} /> : <CircleOff size={13} />}
              {active ? "نشط" : "غير نشط"}
            </span>
          )}
        </div>
      </div>

      {/* ── Details ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-(--card-border) bg-(--semi-card-bg)/50 p-4 divide-y divide-(--card-border)">
        <InfoRow
          icon={<Hash size={15} className="text-(--text-secondary)" />}
          label="رقم الموظف"
          value={staffId ? `#${staffId}` : "—"}
        />
        {doctor.email && (
          <InfoRow
            icon={<Mail size={15} className="text-(--text-secondary)" />}
            label="البريد الإلكتروني"
            value={doctor.email}
            dir="ltr"
          />
        )}
        {doctor.specialist && (
          <InfoRow
            icon={
              <Stethoscope size={15} className="text-(--text-secondary)" />
            }
            label="التخصص"
            value={doctor.specialist}
          />
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wide px-1">
          الإجراءات
        </p>

        {/* Verify / Unverify */}
        {!verified ? (
          <button
            onClick={onVerify}
            disabled={staffId === null || actionLoading === "verify"}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <BadgeCheck size={16} />
            {actionLoading === "verify" ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                جاري التوثيق...
              </>
            ) : (
              "توثيق الطبيب"
            )}
          </button>
        ) : (
          <button
            onClick={onUnverifyClick}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all duration-200"
          >
            <ShieldOff size={16} />
            إلغاء التوثيق
          </button>
        )}

        {/* Disabled actions */}
        <DisabledAction
          icon={<Pencil size={15} />}
          label="تعديل البيانات"
        />
        <DisabledAction
          icon={<KeyRound size={15} />}
          label="إعادة تعيين كلمة المرور"
        />
        <DisabledAction
          icon={<Power size={15} />}
          label={active === false ? "تفعيل الحساب" : "تعطيل الحساب"}
        />

        {/* Delete */}
        <button
          onClick={onDeleteClick}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <Trash2 size={16} />
          حذف الطبيب
        </button>
      </div>
    </div>
  );
}
