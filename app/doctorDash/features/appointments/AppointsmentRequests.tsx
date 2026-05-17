"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, Calendar } from "lucide-react";

interface Appointment {
  id: number;
  name: string;
  specialty: string;
  time: string;
  image: string;
  status: "pending" | "approved" | "rejected";
}

const fallbackAppointments: Appointment[] = [

  ];

export default function AppointsmentRequests({
  appointments: appointmentsProp,
}: {
  appointments?: Appointment[];
}) {
  const [appointments, setAppointmets] = useState<Appointment[]>(
    appointmentsProp ?? fallbackAppointments
  );

  useEffect(() => {
    if (appointmentsProp !== undefined) {
      setAppointmets(appointmentsProp);
    }
  }, [appointmentsProp]);

  const updateStatus = (id: number, newStatus: "approved" | "rejected") => {
    setAppointmets((prev) =>
      prev.map((item) =>
        item.id === id
          ? ({ ...item, status: newStatus } as Appointment)
          : item
      )
    );
  };

  const getSpecialtyColor = (specialty: string) => {
    switch (specialty) {
      case "مخ واعصاب":
        return "bg-[#EEF9F1] text-[#09800F]";
      case "عظام":
        return "bg-[#EBF3FC] text-[#1976D2]";
      case "جلدية":
        return "bg-[#EBF2F1] text-[#00796B]";
      case "اسنان":
        return "bg-[#F1EBF7] text-[#6A1B9A]";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusColor = (
    status: "pending" | "approved" | "rejected" | "canceled"
  ) => {
    switch (status) {
      case "pending":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "approved":
        return "bg-[#EEF9F1] text-[#09800F]";
      case "rejected":
        return "bg-[#FEE2E2] text-[#7F1D1D]";
      case "canceled":
        return "bg-[#FBECEA] text-[#B71C1C]";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusText = (
    status: "pending" | "approved" | "rejected" | "canceled"
  ) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "approved":
        return "مؤكّد";
      case "rejected":
        return "مرفوض";
      case "canceled":
        return "اعتذر";
      default:
        return status;
    }
  };

  const date = appointments.map((item) => {
    return item.time.split("-");
  });

  console.log(date[0]);

  return (
    <div className="bg-(--card-bg) rounded-xl shadow-sm">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-(--card-border) mb-6 p-6">
        <button className="w-full sm:w-auto border-2 border-(--card-border) px-3 py-2 rounded-[5px] text-sm sm:text-base text-(--text-primary) font-normal cursor-pointer hover:text-white hover:bg-[#1F2B6C] transition-colors duration-500">
          جميع المواعيد
        </button>

        <h1 className="text-2xl font-bold text-(--text-primary)">
         طلب حجز موعد
        </h1>
      </div>

      {/* List */}
      <div className="space-y-4 px-6 py-4 ">
        {appointments.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-10 flex-col sm:flex-row items-start sm:items-center rounded-3xl border border-(--card-border) bg-(--card-bg) p-4"
          >

            {/* Left Actions */}
            <div className="flex gap-3 ">
              {item.status === "pending" ? (
                <>
                  <button
                    onClick={() => updateStatus(item.id, "rejected")}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#EEF2F7] hover:bg-[#FECACA] transition cursor-pointer"
                  >
                    <X size={14} className="text-[#0B0D0E]" />
                  </button>

                  <button
                    onClick={() => updateStatus(item.id, "approved")}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#EEF2F7] hover:bg-[#BFDBFE] transition cursor-pointer"
                  >
                    <Check size={14} className="text-[#0B0D0E]" />
                  </button>
                </>
              ) : (
                <span
                  className={`px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(
                    item.status
                  )}`}
                >
                  {getStatusText(item.status)}
                </span>
              )}
            </div>

            {/* specialty */}
            <div className="shrink-0">
              <span
                className={`px-2 py-1 rounded-md text-xs sm:text-sm ${getSpecialtyColor(
                  item.specialty
                )}`}
              >
                {item.specialty}
              </span>
            </div>

            {/* Right Info */}
            <div className="flex flex-1 justify-end flex-col sm:flex-row items-start sm:items-center gap-3 min-w-0">
              
              <div className="text-right min-w-0">
                <p className="font-semibold text-xl text-(--text-primary)">
                  {item.name}
                </p>

                <div className="flex items-center justify-end gap-1 text-xs text-(--text-secondary)">
                  
                  <div className="flex items-center gap-1 border-r border-(--card-border) pr-2">
                    {item.time.split("-")[0]}
                    <Clock size={12} />
                  </div>

                  <div className="flex items-center gap-1">
                    {item.time.split("-")[1]}
                    <Calendar size={12} />
                  </div>

                </div>
              </div>

              <img
                src={item.image}
                alt=""
                className="w-10 h-10 rounded-md object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
