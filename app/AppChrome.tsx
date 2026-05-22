"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/nav/nav";
import Footer from "@/components/footer/footer";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/doctorDash") ||
    pathname.startsWith("/clinicDash");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-reset-otp") ||
    pathname.startsWith("/resetPassword") ||
    pathname.startsWith("/passwordResetSent") ||
    pathname.startsWith("/emailVerfication") ||
    pathname.startsWith("/doctorDocument");

  if (isDashboardRoute || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="lg:px-12 xl:px-24">{children}</div>
      <Footer />
    </>
  );
}
