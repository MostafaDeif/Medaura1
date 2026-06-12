"use client";

import StatsCard from "./components/ui/StatsCard";
import DashboardHeader from "./dashboardHeader/DashboardHeader";
import ChartBar from "./components/charts/ChartBar";
import AppointsmentRequests from "./features/appointments/AppointsmentRequests";
import VisitsGauge from "./components/charts/VisitsGauge";
import DoctorsList from "./features/doctors/doctorsList";
import ClinicsList from "./features/patient/PatientReport";
import DepartmentsChart from "./components/charts/DepartmentsChart";
import PatientsTable from "./features/patient/PatientTaple";
import AppointmentsTable from "./features/appointments/AppointmentsTable";
import ProviderBookingModal from "@/app/components/ui/ProviderBookingModal";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, User, Plus } from "lucide-react";

type DashboardApiData = {
  cards?: {
    appointments?: {
      value: number;
      percentage: number;
      trend: { value: number }[];
    };
    patients?: {
      value: number;
      percentage: number;
      trend: { value: number }[];
    };
  };
  weeklyPatients?: {
    date: string;
    exixiting: number;
    new: number;
  }[];
  genderStats?: {
    male: number;
    female: number;
    total: number;
  };
  appointmentRequests?: {
    id: number;
    name: string;
    specialty: string;
    time: string;
    image: string;
    status: "pending" | "approved" | "rejected";
  }[];
  appointments?: {
    id: string;
    name: string;
    type: string;
    doctor: string;
    status: string;
    date: string;
  }[];
  patients?: {
    name: string;
    gender: string;
    department: string;
    date: string;
  }[];
  reports?: {
    id: number;
    name: string;
    status: "available" | "busy";
    description?: string;
  }[];
  todayAppointments?: {
    id?: number;
    name: string;
    type: string;
    date: string;
    time: string;
  }[];
};

function Dashboard({ childern }: { childern: React.ReactNode }) {
  const [range, setRange] = useState<any>();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardApiData | null>(
    null,
  );

  const weeklyData = [
    { date: "2026-01-25", exixiting: 40, new: 20 },
    { date: "2026-01-26", exixiting: 50, new: 30 },
    { date: "2026-01-27", exixiting: 45, new: 25 },
    { date: "2026-01-28", exixiting: 60, new: 35 },
    { date: "2026-01-29", exixiting: 38, new: 22 },
    { date: "2026-01-30", exixiting: 55, new: 28 },
    { date: "2026-01-31", exixiting: 65, new: 32 },
  ];

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/doctor-dashboard", {
          credentials: "include",
        });
        const result = await response.json();

        if (active && response.ok && result.success) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error("Failed to load doctor dashboard", error);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      dashboardData?.weeklyPatients?.length
        ? dashboardData.weeklyPatients
        : weeklyData,
    [dashboardData],
  );

  const filteredData = chartData.filter((item) => {
    if (!range?.from || !range?.to) return true;
    const itemDate = new Date(item.date);
    return itemDate >= range.from && itemDate <= range.to;
  });

  const appointmentCard = dashboardData?.cards?.appointments;
  const patientCard = dashboardData?.cards?.patients;

  return (
    <div className="flex w-full">
      <div className="flex w-full flex-col bg-(--background) min-h-screen transition-colors duration-300">
        <div className="space-y-4">
          <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-[var(--shadow-soft)] px-4 py-3 sm:px-5 sm:py-4">
            <DashboardHeader range={range} setRange={setRange} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
            <StatsCard
              title="المواعيد"
              value={appointmentCard?.value ?? 0}
              percentage={appointmentCard?.percentage ?? 0}
              icon={
                <Calendar size={18} strokeWidth={2} className="text-white" />
              }
              iconBg="bg-[#E65100]"
              chartColor="#E65100"
              data={
                appointmentCard?.trend ?? [
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                ]
              }
            />
            <StatsCard
              title="إجمالي المرضى"
              value={patientCard?.value ?? 0}
              percentage={patientCard?.percentage ?? 0}
              icon={<User size={18} strokeWidth={2} className="text-white" />}
              iconBg="bg-[#001A6E]"
              chartColor="#001A6E"
              data={
                patientCard?.trend ?? [
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                  { value: 0 },
                ]
              }
            />
          </div>

          {/* Charts + Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="lg:col-span-1">
              <ChartBar data={filteredData} />
            </div>
            <AppointsmentRequests
              appointments={dashboardData?.appointmentRequests?.slice(0, 5)}
            />
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <VisitsGauge
              male={dashboardData?.genderStats?.male ?? 0}
              female={dashboardData?.genderStats?.female ?? 0}
              total={dashboardData?.genderStats?.total ?? 0}
            />
            <DoctorsList appointments={dashboardData?.todayAppointments?.slice(0, 5)} />
            <PatientsTable patients={dashboardData?.patients?.slice(0, 5)} />
          </div>
          <div className="grid grid-cols-1 gap-5">
            <ClinicsList reports={dashboardData?.reports?.slice(0, 5)} />
          </div>
          {/* Appointments */}
          <div className="grid grid-cols-1 gap-5">
            <div className="flex justify-between items-center bg-(--card-bg) p-4 rounded-2xl shadow-[var(--shadow-soft)] border border-(--card-border)">
              <h2 className="text-lg font-bold text-(--text-primary)">الحجوزات</h2>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center gap-2 bg-[#1F2B6C] hover:bg-[#151F52] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={16} />
                حجز جديد
              </button>
            </div>
            <AppointmentsTable appointments={dashboardData?.appointments?.slice(0, 5)} />
          </div>
        </div>
      </div>
      <ProviderBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        role="doctor"
        onSuccess={() => {
          // You might want to refresh data here
          window.location.reload();
        }}
      />
    </div>
  );
}

export default Dashboard;
