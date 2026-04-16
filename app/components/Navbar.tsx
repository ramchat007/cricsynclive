"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Menu, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link
          href="/"
          className="text-xl font-black tracking-widest text-teal-600 dark:text-teal-400 uppercase flex items-center gap-2">
          <div className="w-6 h-6 bg-teal-600 rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full -rotate-45" />
          </div>
          CricSync
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Link
            href="/pricing"
            className="hover:text-teal-500 transition-colors">
            Pricing
          </Link>
          <Link
            href="/contact"
            className="hover:text-teal-500 transition-colors">
            Contact
          </Link>

          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-slate-900 dark:text-white hover:text-teal-500 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-full transition-colors">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-full transition-all shadow-lg shadow-teal-500/20">
              Login / Register
            </Link>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 dark:text-slate-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col p-6 gap-4 font-bold shadow-xl">
          <Link
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-600 dark:text-slate-400">
            Pricing
          </Link>
          <Link
            href="/contact"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-600 dark:text-slate-400">
            Contact
          </Link>
          <hr className="border-slate-100 dark:border-slate-800" />

          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-teal-600 dark:text-teal-400">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-left text-red-500 flex items-center gap-2">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-teal-600 text-white text-center py-3 rounded-xl mt-2">
              Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
