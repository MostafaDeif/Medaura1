"use client";

import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import DashboardThemeProvider from "../providers/DashboardThemeProvider";
import RouteGuard from "@/components/auth/RouteGuard";

export default function ClinicDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RouteGuard allowedRoles={["clinic"]}>
      <DashboardThemeProvider>
        <div
          className="min-h-screen flex bg-(--background) transition-all duration-700 ease-in-out"
          data-theme-dashboard
          dir="rtl"
        >
          {/* Sidebar — right side for RTL */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main content */}
          <div className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out">
            <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

            <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto w-full max-w-[1400px] rounded-[20px] bg-[radial-gradient(1200px_circle_at_100%_0%,rgba(20,184,166,0.05),transparent_50%),radial-gradient(900px_circle_at_0%_20%,rgba(14,116,144,0.04),transparent_60%)] p-4 sm:p-5">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </DashboardThemeProvider>
    </RouteGuard>
  );
}
