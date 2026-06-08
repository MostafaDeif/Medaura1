"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  Settings,
  Building2,
  ChevronRight,
  DollarSign,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menu = [
  {
    title: "الرئيسية",
    items: [
      {
        text: "لوحة القيادة",
        icon: <LayoutDashboard size={16} />,
        href: "/clinicDash",
        exact: true,
      },
    ],
  },
  {
    title: "إدارة الأطباء",
    items: [
      {
        text: "أطباء العيادة",
        icon: <Users size={16} />,
        href: "/clinicDash/staff",
        exact: false,
      },
      {
        text: "طلبات الأطباء",
        icon: <Clock size={16} />,
        href: "/clinicDash/pending",
        exact: false,
      },
    ],
  },
  {
    title: "الإدارة",
    items: [
      {
        text: "الإدارة المالية",
        icon: <DollarSign size={16} />,
        href: "/clinicDash/financial",
        exact: false,
      },
      {
        text: "الإعدادات",
        icon: <Settings size={16} />,
        href: "/clinicDash/settings",
        exact: false,
      },
    ],
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 h-screen w-64 bg-[#0f2044] text-white p-4 space-y-4 overflow-auto shadow-2xl xl:shadow-none transform transition-transform duration-300 ease-in-out border-l border-white/10 xl:sticky xl:top-0 ${
        open ? "translate-x-0" : "translate-x-full xl:translate-x-0"
      }`}
      dir="rtl"
    >
      {/* Close button (mobile only) */}
      <button
        className="xl:hidden mb-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Logo */}
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/10">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Medaura</h1>
          <p className="text-[11px] text-white/50 mt-0.5">لوحة العيادة</p>
        </div>
        <span className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
          <Building2 size={15} className="text-teal-300" />
        </span>
      </div>

      {/* Menu */}
      {menu.map((section, i) => (
        <div key={i} className="space-y-1">
          <span className="text-[10px] text-white/40 mb-2 block uppercase tracking-[0.18em] px-1">
            {section.title}
          </span>

          <div className="space-y-0.5">
            {section.items.map((item, idx) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link key={idx} href={item.href} className="block" onClick={onClose}>
                  <div
                    className={`relative w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? "bg-teal-500/15 text-white ring-1 ring-teal-400/25 shadow-[0_4px_14px_rgba(20,184,166,0.15)]"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:-rotate-6 ${
                          isActive ? "text-teal-300" : ""
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[13px] font-medium">{item.text}</span>
                    </div>
                    {isActive && (
                      <ChevronRight size={13} className="text-teal-300 opacity-70" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
