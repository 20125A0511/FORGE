"use client";

import "./globals.css";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Radio,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/workers", label: "Workers", icon: Users },
  { href: "/dispatch", label: "Dispatch", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col border-r border-slate-700/50 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-700/50">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
          <Image src="/logo.png" alt="FORGE" fill className="object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold tracking-wide text-white">
              FORGE
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              Field Operations
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer group relative ${
                active
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
              )}
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  active
                    ? "text-blue-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-slate-700/50 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <Settings className="w-5 h-5 text-slate-600 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs text-slate-600">v0.1.0</span>
          )}
        </div>
      </div>
    </aside>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/portal") ?? false;
  if (isPortal) {
    return <>{children}</>;
  }
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#0f172a]">
        <MainContent>{children}</MainContent>
      </body>
    </html>
  );
}
