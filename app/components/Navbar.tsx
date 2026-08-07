"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOut,
  Menu,
  X,
  User,
  Search,
  Home,
  Compass,
  LayoutDashboard,
  Trophy,
  Shield,
  Swords,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { APP_THEMES } from "@/lib/themes";
import Image from "next/image";
import InstallAppButton from "./InstallAppButton";

export default function Navbar() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);

  // Controls the Global Mobile "More" Bottom Sheet
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const activeTheme = mounted ? theme : "light";
  const currentThemeConfig =
    APP_THEMES.find((t) => t.id === activeTheme) || APP_THEMES[0];
  const IconTag = currentThemeConfig.icon;

  // --- CONTEXT DETECTION LOGIC ---
  const isTournamentConsole = pathname?.startsWith("/t/");
  const tournamentId = isTournamentConsole ? pathname.split("/")[2] : null;

  const toggleTheme = () => {
    const currentIndex = APP_THEMES.findIndex((t) => t.id === activeTheme);
    const nextIndex = (currentIndex + 1) % APP_THEMES.length;
    setTheme(APP_THEMES[nextIndex].id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMoreMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.refresh();
    setIsLoggingOut(false);
  };

  const isActive = (path: string) => pathname === path;

  // --- NAVIGATION DATA ---
  const desktopLinks = [
    { name: "Home", path: "/" },
    { name: "Players", path: "/players" },
    { name: "Tournaments", path: "/explore" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const globalMobileNav = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Players", href: "/players", icon: User },
  ];

  // The 3 items that show on the bottom bar when in a tournament
  const consoleMobileNav = [
    { name: "Teams", href: `/t/${tournamentId}/teams`, icon: Shield },
    { name: "Matches", href: `/t/${tournamentId}/matches`, icon: Swords },
    { name: "Standings", href: `/t/${tournamentId}/standings`, icon: Trophy },
  ];

  const activeMobileNav = isTournamentConsole
    ? consoleMobileNav
    : globalMobileNav;

  return (
    <>
      {/* 🖥️ DESKTOP & MOBILE TOP HEADER */}
      <nav className="sticky top-0 z-[70] bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-1)] shadow-sm transition-colors duration-300">
        <div className="mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
            <Image
              src="/cricsync-logo.png"
              alt="CricSyncLive"
              width={80}
              height={51}
              priority
              className="w-12 md:w-16 lg:w-20 h-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col justify-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-black italic tracking-tighter text-[var(--foreground)] leading-none mb-0.5 md:mb-1">
                CricSync<span className="text-[var(--accent)]">Live</span>
              </div>
              <span className="text-[7px] md:text-[9px] lg:text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Score, Stream, Synchronize
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7">
            {desktopLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-[12px] font-black uppercase tracking-widest transition-all ${isActive(link.path) ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="p-2.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <Search size={20} />
              </Link>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                {mounted ? <IconTag size={20} /> : <div className="w-5 h-5" />}
              </button>
              <InstallAppButton />
            </div>
            {session ? (
              <div className="flex items-center gap-4 xl:gap-5 border-l border-[var(--border-1)] pl-4 xl:pl-5">
                <Link
                  href="/dashboard"
                  className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)]"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[13px] font-black uppercase text-red-500 hover:text-red-600 flex items-center gap-1.5"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="pl-2">
                <Link
                  href={`/login?next=${pathname}`}
                  className="text-[14px] font-black uppercase px-6 py-2.5 rounded-full bg-[var(--foreground)] text-[var(--background)] hover:opacity-80"
                >
                  Login / Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Top Actions */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/search"
              className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)]"
            >
              <Search size={18} />
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)]"
            >
              {mounted ? (
                <IconTag size={18} />
              ) : (
                <div className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 📱 MOBILE FIXED BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] bg-[var(--surface-1)]/95 backdrop-blur-2xl border-t border-[var(--border-1)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)] transition-all duration-300">
        <div className="flex items-center justify-between px-2 h-[64px]">
          {activeMobileNav.map((item) => {
            const Icon = item.icon;
            const isTabActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${isTabActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all ${isTabActive ? "bg-[var(--accent)]/10" : "bg-transparent"}`}
                >
                  <Icon
                    size={20}
                    className={isTabActive ? "fill-[var(--accent)]/20" : ""}
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {item.name}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              if (isTournamentConsole) {
                // Fire a toggle signal to the other file
                window.dispatchEvent(new Event("toggle-tournament-menu"));
              } else {
                // Toggle the global 'More' menu located in this file
                setIsMoreMenuOpen((prev) => !prev);
              }
            }}
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

      {/* 🚀 GLOBAL MOBILE SLIDE-UP DRAWER */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-300 ${isMoreMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMoreMenuOpen(false)}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[100] bg-[var(--surface-1)] border-t border-[var(--border-1)] rounded-t-[2.5rem] flex flex-col max-h-[85vh] lg:hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMoreMenuOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="w-12 h-1.5 bg-[var(--border-1)] rounded-full mx-auto mb-6 shrink-0" />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
              More Options
            </h3>
            <button
              onClick={() => setIsMoreMenuOpen(false)}
              className="p-2 bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3 h-full">
            <Link
              href="/profile/edit"
              onClick={() => setIsMoreMenuOpen(false)}
              className="flex items-center gap-3 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)] font-bold text-sm"
            >
              My Profile
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMoreMenuOpen(false)}
              className="flex items-center gap-3 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)] font-bold text-sm"
            >
              About CricSync
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMoreMenuOpen(false)}
              className="flex items-center gap-3 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)] font-bold text-sm"
            >
              Contact Support
            </Link>

            <div className="mt-auto pt-6 border-t border-[var(--border-1)] flex flex-col gap-3">
              {session ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase tracking-widest text-xs"
                >
                  <LogOut size={16} /> Logout
                </button>
              ) : (
                <Link
                  href={`/login?next=${pathname}`}
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="w-full py-4 rounded-2xl text-center font-black uppercase tracking-widest text-xs shadow-lg bg-[var(--foreground)] text-[var(--background)]"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
