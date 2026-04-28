"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Menu, X, User } from "lucide-react";
import { useTheme } from "next-themes";
import { APP_THEMES } from "@/lib/themes";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for real-time login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Block background scroll when mobile menu is open
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
    { name: "Players", path: "/players" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      {/* 1. MAIN DESKTOP NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center">
            <img
              src="/cricsync-light-logo.png"
              alt="CricSync"
              className="w-50 h-auto object-contain"
            />
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                  isActive(link.path)
                    ? "text-teal-600"
                    : "text-slate-500 hover:text-slate-900"
                }`}>
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full p-1">
              {APP_THEMES.map((appTheme) => (
                <button
                  key={appTheme.id}
                  onClick={() => setTheme(appTheme.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    theme === appTheme.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}>
                  {appTheme.label}
                </button>
              ))}
            </div>

            {session ? (
              <div className="flex items-center gap-5 border-l border-slate-200 pl-5">
                <Link
                  href="/dashboard"
                  className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                    isActive("/dashboard")
                      ? "text-teal-600"
                      : "text-slate-500 hover:text-slate-900"
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
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-[11px] font-black uppercase px-6 py-2.5 rounded-full bg-slate-900 text-white hover:bg-teal-600 transition-all shadow-lg">
                  Login / Register
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE MENU TRIGGER */}
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 active:scale-90 transition-transform">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* 2. FULL SCREEN MOBILE DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] isolate md:hidden">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in Menu Panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            {/* Drawer Header */}
            <div className="flex justify-between items-center px-6 h-20 border-b border-slate-100">
              <Link href="/" onClick={() => setIsOpen(false)}>
                <img
                  src="/cricsync-light-logo.png"
                  alt="CricSync"
                  className="w-50 h-auto object-contain"
                />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>

            {/* Links Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 block">
                Navigation
              </label>

              <div className="space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between p-6 rounded-[2rem] text-xl font-black uppercase tracking-tighter transition-all active:scale-95 ${
                      isActive(link.path)
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-xl shadow-teal-500/20"
                        : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}>
                    {link.name}
                    {isActive(link.path) && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
                    )}
                  </Link>
                ))}
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  App Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {APP_THEMES.map((appTheme) => (
                    <button
                      key={appTheme.id}
                      onClick={() => setTheme(appTheme.id)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        theme === appTheme.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200"
                      }`}>
                      {appTheme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Auth Actions */}
              <div className="mt-auto pt-10 pb-4 flex flex-col gap-4">
                {session ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] border border-slate-200 bg-slate-50 active:bg-slate-100 transition-colors">
                      <User size={24} className="text-teal-600" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Dashboard
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] bg-red-50 border border-red-100 active:bg-red-100 transition-all">
                      <LogOut size={24} className="text-red-500" />
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                        Logout
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="w-full py-5 rounded-[2rem] text-center font-black uppercase tracking-widest text-sm shadow-xl bg-slate-900 text-white active:scale-[0.98] transition-transform">
                      Login / Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
