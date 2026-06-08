"use client";

import { X, AlertTriangle, Trash2, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";

type DialogVariant = "warning" | "danger";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  variant?: DialogVariant;
  icon?: ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variants: Record<
  DialogVariant,
  { iconBg: string; iconColor: string; btnBg: string; btnHover: string }
> = {
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-500",
    btnBg: "bg-amber-500",
    btnHover: "hover:bg-amber-600",
  },
  danger: {
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-500",
    btnBg: "bg-red-500",
    btnHover: "hover:bg-red-600",
  },
};

const defaultIcons: Record<DialogVariant, ReactNode> = {
  warning: <ShieldOff size={26} />,
  danger: <Trash2 size={26} />,
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  variant = "warning",
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const v = variants[variant];
  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-2xl p-6 space-y-5"
        style={{ animation: "scaleIn 0.2s ease both" }}
        dir="rtl"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-(--hover-bg) text-(--text-secondary) transition"
        >
          <X size={15} />
        </button>

        {/* Icon + Text */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${v.iconBg}`}
          >
            <span className={v.iconColor}>{displayIcon}</span>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-(--text-primary) text-base">
              {title}
            </h3>
            <p className="text-sm text-(--text-secondary) mt-1">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-(--card-border) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white ${v.btnBg} ${v.btnHover} transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                جاري...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
