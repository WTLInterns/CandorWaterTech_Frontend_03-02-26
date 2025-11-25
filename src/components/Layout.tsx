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
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales-orders", label: "Sales Orders", icon: FileText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/field-staff", label: "Field Staff", icon: UserCircle2 },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/activities", label: "Activity", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/map", label: "Live Map", icon: MapIcon },
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.push("/auth/login");
  }

  const SidebarContent = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-semibold">
            CW
          </span>
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
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 border-t border-slate-800 hover:bg-slate-900 hover:text-slate-50"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      <aside className="hidden md:block w-64 border-r border-slate-800">
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
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight hidden sm:block">
              {router.pathname === "/dashboard" ? "Dashboard" : "Candor Water Tech"}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <div className="font-medium">{user?.name ?? "Guest"}</div>
              <div className="text-slate-400 text-[11px]">
                {user?.email ?? "Not signed in"}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-[11px] font-semibold">
              {user?.name?.charAt(0).toUpperCase() ?? "F"}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
