"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Trophy,
  Users,
  Activity,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

export default function V2LandingPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTournaments();
  }, []);

  const fetchActiveTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, location, format, banner_url")
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) setTournaments(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-teal-500/30">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-sm">
            Tournament Operating System
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 leading-tight drop-shadow-2xl">
            Pro-Level Scoring <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
              For Every Pitch
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mb-10">
            Live broadcasts, dynamic overlays, franchise auctions, and real-time
            global player directories. Run your tournament like the pros.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/players"
              className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-2">
              <Users size={18} /> Global Directory
            </Link>
            {/* You can point this to your actual login/dashboard route */}
            <Link
              href="/dashboard"
              className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2">
              <PlayCircle size={18} /> Organizer Hub
            </Link>
          </div>
        </div>
      </div>

      {/* ACTIVE TOURNAMENTS GRID */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Trophy className="text-teal-500" /> Active Tournaments
            </h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
              Follow the latest action
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                <Activity size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  No Active Tournaments
                </h3>
                <p className="text-slate-500 font-bold mt-1">
                  Check back soon for upcoming events.
                </p>
              </div>
            ) : (
              tournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.id}/`} // Or whichever public page you want them to land on
                  className="group block relative h-64 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                  <div
                    className="absolute inset-0 bg-slate-300 dark:bg-slate-800 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: t.banner_url
                        ? `url(${t.banner_url})`
                        : "none",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-90"></div>

                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <span className="bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded w-max mb-2">
                      {t.format || "T20"}
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1 group-hover:text-teal-400 transition-colors">
                      {t.name}
                    </h3>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        📍 {t.location || "Local Ground"}
                      </p>
                      <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-teal-500 transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
