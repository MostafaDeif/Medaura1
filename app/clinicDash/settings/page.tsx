"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-(--text-primary)">الإعدادات</h1>
        <p className="text-sm text-(--text-secondary) mt-0.5">إدارة إعدادات العيادة</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)]">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <Settings size={28} className="text-teal-500 animate-spin [animation-duration:4s]" />
        </div>
        <p className="text-(--text-primary) font-semibold">صفحة الإعدادات</p>
        <p className="text-(--text-secondary) text-sm text-center max-w-xs">
          سيتم إضافة إعدادات العيادة قريباً
        </p>
      </div>
    </div>
  );
}
