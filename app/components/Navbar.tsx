"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Menu, X, User, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { APP_THEMES } from "@/lib/themes";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // 1. Logic to find the current theme object and handle the cycle toggle
  const activeTheme = mounted ? theme : "light";
  const currentThemeConfig =
    APP_THEMES.find((t) => t.id === activeTheme) || APP_THEMES[0];
  const IconTag = currentThemeConfig.icon;

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
    if (isOpen) {
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
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    setIsOpen(false);
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Players", path: "/players" },
    { name: "Tournaments", path: "/explore" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border-1)] shadow-sm transition-colors duration-300">
        <div className="mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center">
            {/* If you have a dark mode logo, you can swap it here based on theme later! */}
            <img
              src="/cricsync-light-logo.png"
              alt="CricSync"
              className="w-50 md:w-[235px] h-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                  isActive(link.path)
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                }`}>
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-3">
              {/* NEW: SEARCH BUTTON (Desktop) */}
              <Link
                href="/search"
                aria-label="Search"
                className="p-2.5 rounded-full transition-all active:scale-95 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)] hover:text-[var(--foreground)]">
                <Search size={20} />
              </Link>

              {/* THEME TOGGLE (Desktop) */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2.5 rounded-full transition-all active:scale-95 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)] hover:text-[var(--foreground)]">
                {mounted ? <IconTag size={20} /> : <div className="w-5 h-5" />}
              </button>
            </div>

            {session ? (
              <div className="flex items-center gap-5 border-l border-[var(--border-1)] pl-5">
                <Link
                  href="/dashboard"
                  className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                    isActive("/dashboard")
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }`}>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors tracking-widest flex items-center gap-1.5">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[11px] font-black uppercase px-6 py-2.5 rounded-full bg-[var(--foreground)] text-[var(--background)] hover:opacity-80 transition-all shadow-lg">
                Login / Register
              </Link>
            )}
          </div>

          {/* MOBILE ACTIONS */}
          <div className="flex items-center gap-3 md:hidden">
            {/* NEW: SEARCH BUTTON (Mobile) */}
            <Link
              href="/search"
              className="w-10 h-10 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] active:scale-90 transition-transform">
              <Search size={20} />
            </Link>

            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] active:scale-90 transition-transform">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE SLIDE-OUT MENU */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] isolate md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-[var(--surface-1)] border-l border-[var(--border-1)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center px-6 h-20 border-b border-[var(--border-1)]">
              <Link href="/" onClick={() => setIsOpen(false)}>
                <img
                  src="/cricsync-light-logo.png"
                  alt="CricSync"
                  className="w-50 h-auto object-contain"
                />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all active:scale-90 hover:text-[var(--foreground)]">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mb-6 block">
                Navigation
              </label>
              <div className="space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between p-6 rounded-[2rem] text-xl font-black uppercase tracking-tighter transition-all active:scale-95 border ${
                      isActive(link.path)
                        ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--background)] shadow-lg shadow-[var(--accent)]/20"
                        : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)] hover:text-[var(--foreground)]"
                    }`}>
                    {link.name}
                    {isActive(link.path) && (
                      <div className="w-2 h-2 bg-[var(--background)] rounded-full animate-pulse shadow-sm" />
                    )}
                  </Link>
                ))}
              </div>

              {/* THEME TOGGLE (Mobile) */}
              <div className="mt-6 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
                  App Theme
                </p>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-3">
                    {mounted ? (
                      <IconTag size={20} className="text-[var(--accent)]" />
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {mounted ? currentThemeConfig.label : "Loading..."}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                    Tap to Switch
                  </span>
                </button>
              </div>

              <div className="mt-auto pt-10 pb-4 flex flex-col gap-4">
                {session ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] border border-[var(--border-1)] bg-[var(--surface-2)] hover:bg-[var(--border-1)] transition-colors">
                      <User size={24} className="text-[var(--accent)]" />
                      <span className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">
                        Dashboard
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                      <LogOut size={24} className="text-red-500" />
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                        Logout
                      </span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-5 rounded-[2rem] text-center font-black uppercase tracking-widest text-sm shadow-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity">
                    Login / Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
