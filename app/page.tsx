"use client";

import {
  Search,
  Play,
  Trophy,
  Activity,
  Flame,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);

  const fetchMatches = async () => {
    // 1. Fetch LIVE matches
    const { data: liveData } = await supabase
      .from("matches")
      .select(
        `
        id, team1_name, team2_name, team1_score, team1_wickets, team1_overs,
        team2_score, team2_wickets, team2_overs, status, current_innings, tournament_id
      `,
      )
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(10);

    // 2. Fetch COMPLETED matches
    const { data: completedData } = await supabase
      .from("matches")
      .select(
        `
        id, team1_name, team2_name, team1_score, team1_wickets, team1_overs,
        team2_score, team2_wickets, team2_overs, status, tournament_id, result_margin, ball_type
      `,
      )
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(6);

    if (liveData) setLiveMatches(liveData);
    if (completedData) setCompletedMatches(completedData);
  };

  useEffect(() => {
    fetchMatches();

    // Listen to ALL updates on matches (so when a match finishes, it moves sections instantly)
    const channel = supabase
      .channel("global_live_ticker")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
        },
        () => {
          fetchMatches(); // Re-fetch to sort live vs completed automatically
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper to route to the correct match pad
  const getMatchLink = (match: any) => {
    return match.tournament_id
      ? `/t/${match.tournament_id}/m/${match.id}`
      : `/t/QUICK_MATCH/m/${match.id}`;
  };

  return (
    <main className="relative min-h-screen bg-slate-950 overflow-hidden selection:bg-[var(--accent)] selection:text-white flex flex-col">
      {/* 1. DYNAMIC VIDEO BACKGROUND (z-0) */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/cricket-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950" />
      </div>

      {/* 2. CONTENT WRAPPER (z-10) */}
      <div className="relative z-10 flex-1 flex flex-col pt-20 pb-10">
        {/* --- SECTION 1: LIVE MATCHES TICKER --- */}
        {liveMatches.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4 mb-10 animate-in fade-in slide-in-from-top-10 duration-700">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Activity className="text-red-500 animate-pulse" size={20} />
              <h2 className="text-white font-black uppercase tracking-widest text-sm">
                Action Live Now
              </h2>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
              {liveMatches.map((match) => (
                <Link
                  key={match.id}
                  href={getMatchLink(match)}
                  className="shrink-0 w-80 md:w-96 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-slate-500 p-5 rounded-3xl snap-center transition-all hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                      🔴 LIVE
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {match.tournament_id ? "Tournament" : "Quick Match"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold truncate pr-2">
                        {match.team1_name}
                      </span>
                      <div className="text-right">
                        <span className="text-white font-black text-lg">
                          {match.team1_score || 0} / {match.team1_wickets || 0}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">
                          ({match.team1_overs || 0})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center opacity-80">
                      <span className="text-white font-bold truncate pr-2">
                        {match.team2_name}
                      </span>
                      <div className="text-right">
                        <span className="text-white font-black text-lg">
                          {match.team2_score || 0} / {match.team2_wickets || 0}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">
                          ({match.team2_overs || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* --- MAIN HERO & CTA --- */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-4 mb-16">
          <div className="max-w-4xl animate-in fade-in zoom-in-95 duration-1000">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black italic uppercase leading-none drop-shadow-2xl text-white">
              CricSync <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-md">
                Live
              </span>
            </h1>
            <p className="text-sm md:text-xl font-bold uppercase tracking-[0.2em] mt-6 text-slate-300">
              Run Cricket Like a Pro — From Toss to Trophy
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/quick-match"
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all active:scale-95 group"
              >
                <Flame size={20} className="group-hover:animate-bounce" />
                Start Quick Match
              </Link>

              <Link
                href="/explore"
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-5 rounded-full font-bold uppercase tracking-widest text-sm transition-all active:scale-95"
              >
                <Search size={18} />
                Find Tournaments
              </Link>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: RECENT RESULTS (AUTOMATIC ARCHIVE) --- */}
        <section className="w-full max-w-7xl mx-auto px-4 animate-in fade-in duration-700 mb-16">
          <div className="flex items-center gap-2 mb-6 px-2 border-b border-slate-800 pb-3">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <h2 className="text-white font-black uppercase tracking-widest text-sm">
              Recent Match Results
            </h2>
          </div>

          {completedMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedMatches.map((match) => (
                <Link
                  key={match.id}
                  href={getMatchLink(match)}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-600 p-5 rounded-3xl transition-all flex flex-col justify-between min-h-[140px] backdrop-blur-sm hover:scale-[1.02]"
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase mb-4 border-b border-slate-800 pb-2">
                      <span>🏁 Finished</span>
                      <span>{match.ball_type || "Tennis"}</span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-200 font-bold">
                      <div className="flex justify-between items-center">
                        <span className="truncate pr-2">
                          {match.team1_name}
                        </span>
                        <span className="font-black text-white shrink-0">
                          {match.team1_score || 0}/{match.team1_wickets || 0}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({match.team1_overs || 0})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="truncate pr-2">
                          {match.team2_name}
                        </span>
                        <span className="font-black text-white shrink-0">
                          {match.team2_score || 0}/{match.team2_wickets || 0}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({match.team2_overs || 0})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-black text-amber-500 uppercase tracking-tight mt-5 truncate">
                    📢 {match.result_margin || "Match Ended"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              No completed matches found yet.
            </div>
          )}
        </section>
      </div>

      {/* --- SOCIAL PROOF STATS BAR --- */}
      <section className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl w-full py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-800">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-2xl md:text-3xl font-black text-white">
              10,245+
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Play size={12} /> Matches Scored
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-2xl md:text-3xl font-black text-white">
              350+
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Trophy size={12} /> Tournaments
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-2xl md:text-3xl font-black text-white">
              45K+
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Users size={12} /> Players Registered
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 group cursor-pointer">
            <span className="text-sm font-black text-[var(--accent)] uppercase flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              View All Stats <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
