"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, User, Clock, Phone, Stethoscope } from "lucide-react";
import Swal from "sweetalert2";
import DatePicker from "@/components/booking/DatePicker";
import TimePicker from "@/components/booking/TimePicker";
import { useAuth } from "@/context/AuthContext";

function parseWorkDays(workDaysString?: string): string[] | undefined {
  if (!workDaysString) return undefined;
  return workDaysString
    .split(/[,/|]/)
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  role: "doctor" | "clinic";
  staffMembers?: { _id?: string | number; staff_id?: string | number; id?: string | number; full_name?: string; work_days?: string }[];
  onSuccess?: () => void;
};

export default function ProviderBookingModal({ isOpen, onClose, role, staffMembers = [], onSuccess }: Props) {
  const { user } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingFrom, setBookingFrom] = useState("");
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ from: string; to: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const allowedDays = React.useMemo(() => {
    if (role === "doctor") {
      return parseWorkDays(user?.profile?.work_days as string);
    } else if (role === "clinic" && staffId) {
      const selected = staffMembers.find((s) => String(s._id || s.staff_id || s.id) === String(staffId));
      return parseWorkDays(selected?.work_days);
    }
    return undefined;
  }, [role, user, staffId, staffMembers]);

  useEffect(() => {
    if (!isOpen) {
      setPatientName("");
      setPatientPhone("");
      setBookingDate("");
      setBookingFrom("");
      setStaffId("");
      setAvailableSlots([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (bookingDate) {
      if (role === "clinic" && !staffId) {
        setAvailableSlots([]);
        return;
      }
      fetchSlots();
    }
  }, [bookingDate, staffId, role]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      let query = `?booking_date=${bookingDate}`;
      if (role === "clinic" && staffId) {
        query += `&staff_id=${staffId}`;
      } else if (role === "doctor") {
        query += `&doctor_id=me`; // Handled by API route using token
      }

      const res = await fetch(`/api/book/slots${query}`);
      const data = await res.json();
      if (data.success) {
        setAvailableSlots(data.data?.slots || data.data?.available_slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error("Failed to fetch slots:", err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !bookingDate || !bookingFrom) {
      Swal.fire({
        icon: "error",
        title: "بيانات ناقصة",
        text: "يرجى تعبئة جميع الحقول المطلوبة",
      });
      return;
    }

    if (role === "clinic" && !staffId) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "يرجى اختيار الطبيب",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/book/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          patient_phone: patientPhone || undefined,
          booking_date: bookingDate,
          booking_from: bookingFrom,
          ...(role === "clinic" ? { staff_id: staffId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إنشاء الحجز");
      }

      Swal.fire({
        icon: "success",
        title: "نجاح",
        text: "تم إنشاء الحجز بنجاح",
        timer: 2000,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: err.message || "حدث خطأ أثناء الحجز",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-(--card-bg) border border-(--card-border) w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--card-border) bg-(--hover-bg)">
          <h2 className="text-xl font-bold text-(--text-primary)">حجز جديد</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            {role === "clinic" && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary) mb-2">
                  <Stethoscope size={16} className="text-teal-500" />
                  اختيار الطبيب
                </label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text-primary) transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:outline-none"
                  required
                >
                  <option value="">اختر الطبيب...</option>
                  {staffMembers.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary) mb-2">
                <User size={16} className="text-[#1F2B6C]" />
                اسم المريض (مطلوب)
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="أدخل اسم المريض بالكامل"
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text-primary) transition focus:border-[#1F2B6C] focus:ring-4 focus:ring-[#1F2B6C]/10 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary) mb-2">
                <Phone size={16} className="text-[#1F2B6C]" />
                رقم الهاتف (اختياري)
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text-primary) transition focus:border-[#1F2B6C] focus:ring-4 focus:ring-[#1F2B6C]/10 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary) mb-2">
                <Calendar size={16} className="text-teal-500" />
                تاريخ الحجز (مطلوب)
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                disabled={role === "clinic" && !staffId}
                className="w-full text-right rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text-primary) transition hover:border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingDate || "اختر التاريخ"}
              </button>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary) mb-2">
                <Clock size={16} className="text-teal-500" />
                الوقت (مطلوب)
              </label>
              <button
                type="button"
                onClick={() => setShowTimePicker(true)}
                disabled={!bookingDate}
                className="w-full text-right rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-3 text-sm text-(--text-primary) transition hover:border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingFrom || "اختر الوقت"}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-(--card-border) flex gap-3">
            <button
              type="submit"
              disabled={loading || !bookingFrom}
              className="flex-1 py-3 bg-[#1F2B6C] hover:bg-[#151F52] text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "تأكيد الحجز"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-(--hover-bg) text-(--text-primary) border border-(--card-border) rounded-xl font-bold hover:bg-gray-100 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>

      {showDatePicker && (
        <DatePicker
          selectedDate={bookingDate}
          allowedDays={allowedDays}
          onSelect={(date) => {
            setBookingDate(date);
            setBookingFrom("");
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {showTimePicker && (
        <TimePicker
          slots={availableSlots.map((s) => ({ ...s, available: true }))}
          loading={loadingSlots}
          onSelect={(time) => {
            setBookingFrom(time);
            setShowTimePicker(false);
          }}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
