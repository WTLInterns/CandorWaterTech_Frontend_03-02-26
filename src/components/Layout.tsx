import Link from "next/link";
import { ReactNode, useState } from "react";
import { useRouter } from "next/router";
import classNames from "classnames";
import {
  LayoutDashboard,
  FileText,
  Package,
  UserCircle2,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  Map as MapIcon,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales-orders", label: "Sales Orders", icon: FileText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/field-staff", label: "Field Staff", icon: UserCircle2 },
  // Attendance is rendered as a grouped submenu below
  { href: "/activities", label: "Activity", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/map", label: "Live Map", icon: MapIcon },
  { href: "/live-tracking", label: "Live Tracking", icon: MapIcon },
  // { href: "/agent-route", label: "Agent Route", icon: MapIcon },
  { href: "/movement-report", label: "Movement Report", icon: BarChart3 },
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
   const [attendanceOpen, setAttendanceOpen] = useState(true);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  const SidebarContent = (
    <div className="flex h-full flex-col text-neo-textPrimary neo-sidebar-gradient">
      <div className="flex items-center justify-between px-4 py-4 border-b border-neo-border/70">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neo-pageBg/40 overflow-hidden border border-neo-border/70">
            <img
              src="/CWT%20New%20Logo%201.jpeg"
              alt="Candor Water Tech logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight">Candor Water Tech</span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "flex items-center gap-2 rounded-md px-3 py-2 transition",
                active
                  ? "bg-neo-cardBg text-neo-textPrimary shadow-sm"
                  : "text-neo-textSecondary hover:bg-neo-cardBg hover:text-neo-textPrimary"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Attendance grouped submenu */}
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => setAttendanceOpen((v) => !v)}
            className={classNames(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition",
              router.pathname.startsWith("/attendance")
                ? "bg-neo-cardBg text-neo-textPrimary shadow-sm"
                : "text-neo-textSecondary hover:bg-neo-cardBg hover:text-neo-textPrimary"
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              <span>Attendance</span>
            </span>
            <ChevronDown
              className={classNames(
                "h-4 w-4 transition-transform",
                attendanceOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </button>

          {attendanceOpen && (
            <div className="ml-7 space-y-1">
              <Link
                href="/attendance"
                className={classNames(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition",
                  router.pathname === "/attendance"
                    ? "bg-neo-cardBg text-neo-textPrimary shadow-sm"
                    : "text-neo-textSecondary hover:bg-neo-cardBg hover:text-neo-textPrimary"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <span>Mark Attendance</span>
              </Link>
              <Link
                href="/attendance/images"
                className={classNames(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition",
                  router.pathname === "/attendance/images"
                    ? "bg-neo-cardBg text-neo-textPrimary shadow-sm"
                    : "text-neo-textSecondary hover:bg-neo-cardBg hover:text-neo-textPrimary"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <span>Check Images</span>
              </Link>
            </div>
          )}
        </div>
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-3 text-sm text-neo-textSecondary border-t border-neo-border/70 hover:bg-neo-cardBg hover:text-neo-textPrimary"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-neo-pageBg text-neo-textPrimary flex">
      <aside className="hidden md:block w-64 border-r border-neo-border">
        {SidebarContent}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            {SidebarContent}
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-neo-border px-4 py-3 bg-neo-headerBg/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md border border-neo-border bg-neo-cardBg px-2 py-1 text-neo-textPrimary"
              onClick={() => setSidebarOpen(true)}
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight hidden sm:block text-neo-textSecondary">
              {router.pathname === "/dashboard" ? "Dashboard" : "Candor Water Tech"}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <div className="font-medium text-neo-textPrimary">{user?.name ?? "Guest"}</div>
              <div className="text-neo-textSecondary text-[11px]">
                {user?.email ?? "Not signed in"}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neo-primary to-neo-secondary flex items-center justify-center text-[11px] font-semibold">
              {user?.name?.charAt(0).toUpperCase() ?? "F"}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 overflow-y-auto bg-neo-pageBg">
          {children}
        </main>
      </div>
    </div>
  );
}
