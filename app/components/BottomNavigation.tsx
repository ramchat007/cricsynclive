"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Swords,
  LayoutDashboard,
  User,
  Menu,
  Trophy,
  Shield,
  Settings,
  X,
  LogOut,
  CreditCard,
} from "lucide-react";

export default function BottomNavigation() {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Close the bottom sheet automatically when the route changes
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  // 1. Detect if the user is in a Tournament Context
  const isTournamentConsole = pathname?.startsWith("/t/");

  // Extract tournament ID securely from the URL
  const tournamentId = isTournamentConsole ? pathname.split("/")[2] : null;

  // 🌍 GLOBAL NAV ITEMS
  const globalNav = [
    { name: "Home", href: "/", icon: Home },
    { name: "Matches", href: "/matches", icon: Swords },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/profile/edit", icon: User },
  ];

  // 🏆 CONSOLE NAV ITEMS
  const consoleNav = [
    { name: "Hub", href: `/t/${tournamentId}`, icon: Trophy },
    { name: "Teams", href: `/t/${tournamentId}/teams`, icon: Shield },
    { name: "Matches", href: `/t/${tournamentId}/matches`, icon: Swords },
  ];

  const activeNav = isTournamentConsole ? consoleNav : globalNav;

  return (
    <>
      {/* 📱 FIXED BOTTOM BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] bg-[var(--surface-1)]/90 backdrop-blur-2xl border-t border-[var(--border-1)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)] transition-all duration-300">
        <div className="flex items-center justify-between px-2 h-[68px]">
          {activeNav.map((item) => {
            // Precise active state matching
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all ${isActive ? "bg-[var(--accent)]/10" : "bg-transparent"}`}
                >
                  <Icon
                    size={20}
                    className={isActive ? "fill-[var(--accent)]/20" : ""}
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* DYNAMIC MORE / ADMIN BUTTON */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all active:scale-95"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full">
              {isTournamentConsole ? (
                <Settings size={20} />
              ) : (
                <Menu size={20} />
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isTournamentConsole ? "Admin" : "More"}
            </span>
          </button>
        </div>
      </nav>

      {/* 🚀 SLIDE-UP DRAWER (replaces old sidebar menus) */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-300 ${isMoreMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMoreMenuOpen(false)}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[100] bg-[var(--surface-1)] border-t border-[var(--border-1)] rounded-t-[2.5rem] flex flex-col max-h-[85vh] lg:hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMoreMenuOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] flex-1 overflow-y-auto no-scrollbar">
          <div className="w-12 h-1.5 bg-[var(--border-1)] rounded-full mx-auto mb-6 shrink-0" />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
              {isTournamentConsole ? "Tournament Actions" : "More Options"}
            </h3>
            <button
              onClick={() => setIsMoreMenuOpen(false)}
              className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {isTournamentConsole ? (
              /* CONSOLE DRAWER CONTENT */
              <>
                <Link
                  href={`/t/${tournamentId}/billing`}
                  className="flex items-center gap-3 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)] hover:border-[var(--accent)]/50 active:scale-[0.98] transition-all font-bold text-sm"
                >
                  <CreditCard size={18} className="text-purple-500" />{" "}
                  Subscription & Billing
                </Link>
                <Link
                  href={`/`}
                  className="flex items-center gap-3 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-red-500 active:scale-[0.98] transition-all font-bold text-sm mt-4"
                >
                  <LogOut size={18} /> Exit Console
                </Link>
              </>
            ) : (
              /* GLOBAL DRAWER CONTENT */
              <>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)] active:scale-[0.98] transition-all font-bold text-sm"
                >
                  <Settings size={18} className="text-[var(--text-muted)]" />{" "}
                  Account Settings
                </Link>
                {/* Add standard global links here (Support, Legal, etc) */}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
