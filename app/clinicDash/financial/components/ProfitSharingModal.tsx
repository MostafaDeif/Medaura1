"use client";

import { useState, useEffect } from "react";
import { X, Percent } from "lucide-react";
import type { DoctorFinancialRecord } from "../lib/types";

interface Props {
  record: DoctorFinancialRecord | null;
  onClose: () => void;
  onSave: (doctorId: number, percentage: number) => Promise<void>;
}

export default function ProfitSharingModal({ record, onClose, onSave }: Props) {
  const [value, setValue] = useState(70);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) setValue(record.doctorPercentage);
  }, [record]);

  if (!record) return null;

  const clinicPct = 100 - value;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(record.doctorId, value);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-2xl p-6 space-y-6"
        style={{ animation: "scaleIn 0.2s ease both" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-(--hover-bg) text-(--text-secondary) transition"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-(--text-primary)">تعديل نسبة الأرباح</h2>
          <p className="text-sm text-(--text-secondary) mt-1">{record.doctorName}</p>
        </div>

        {/* Visual split */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-amber-600 dark:text-amber-400">🧑‍⚕️ الطبيب — {value}%</span>
            <span className="text-teal-600 dark:text-teal-400">🏥 العيادة — {clinicPct}%</span>
          </div>

          {/* Bar */}
          <div className="relative h-6 rounded-xl overflow-hidden bg-(--semi-card-bg) flex">
            <div
              className="bg-amber-400 h-full transition-all duration-300 flex items-center justify-center"
              style={{ width: `${value}%` }}
            >
              {value >= 20 && (
                <span className="text-[10px] font-bold text-white">{value}%</span>
              )}
            </div>
            <div
              className="bg-teal-500 h-full flex-1 flex items-center justify-center"
            >
              {clinicPct >= 15 && (
                <span className="text-[10px] font-bold text-white">{clinicPct}%</span>
              )}
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />

          {/* Manual input */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-(--text-secondary) shrink-0">نسبة الطبيب</label>
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(100, Number(e.target.value)));
                  setValue(n);
                }}
                className="w-full px-3 py-2 pr-8 rounded-xl border border-(--card-border) bg-(--input-bg) text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
              <Percent size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--text-secondary)" />
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {[60, 65, 70, 75, 80].map((p) => (
            <button
              key={p}
              onClick={() => setValue(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                value === p
                  ? "bg-teal-500 text-white shadow-sm"
                  : "bg-(--semi-card-bg) text-(--text-secondary) hover:bg-(--hover-bg)"
              }`}
            >
              {p}% / {100 - p}%
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-(--card-border) text-sm font-medium text-(--text-secondary) hover:bg-(--hover-bg) transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ النسبة"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
