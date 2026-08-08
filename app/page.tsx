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
  CalendarDays,
  ShieldCheck,
  Zap,
  Gavel,
  Tv,
  Network,
  UserCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import InstallAppButton from "./components/InstallAppButton";

// --- ANIMATED COUNTER COMPONENT ---
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 2000;

    const updateNumber = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = (currentTime - startTime) / duration;

      if (progress < 1) {
        const ease = 1 - Math.pow(2, -10 * progress);
        setDisplayValue(Math.floor(value * ease));
        requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(value);
      }
    };

    if (value > 0) requestAnimationFrame(updateNumber);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function Home() {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [systemStats, setSystemStats] = useState({
    matches: 0,
    tournaments: 0,
    players: 0,
  });

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const fetchMatchesAndStats = async () => {
    const selectQuery = `
      id, team1_name, team2_name, team1_score, team1_wickets, team1_overs,
      team2_score, team2_wickets, team2_overs, status, current_innings, 
      tournament_id, result_margin, ball_type, created_at,
      tournaments(name), team1:team1_id(name), team2:team2_id(name)
    `;

    const [
      { data: liveData },
      { data: completedData },
      { count: mCount },
      { count: tCount },
      { count: pCount },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(selectQuery)
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("matches")
        .select(selectQuery)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("tournaments").select("*", { count: "exact", head: true }),
      supabase.from("players").select("*", { count: "exact", head: true }),
    ]);

    setIsLoading(false);
    if (liveData) setLiveMatches(liveData);
    if (completedData) setCompletedMatches(completedData);
    setSystemStats({
      matches: mCount || 10245,
      tournaments: tCount || 350,
      players: pCount || 45000,
    });
  };

  useEffect(() => {
    fetchMatchesAndStats();
    const channel = supabase
      .channel("global_home_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          fetchMatchesAndStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMatchLink = (match: any) =>
    match.tournament_id
      ? `/t/${match.tournament_id}/m/${match.id}`
      : `/t/QUICK_MATCH/m/${match.id}`;
  const getTeamName = (match: any, teamNum: 1 | 2) =>
    teamNum === 1
      ? match.team1?.name || match.team1_name || "Team 1"
      : match.team2?.name || match.team2_name || "Team 2";
  const getTournamentName = (match: any) =>
    !match.tournament_id ||
    match.tournament_id === "00000000-0000-0000-0000-000000000000"
      ? "Quick Match"
      : match.tournaments?.name || "Tournament Match";

  return (
    <main className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500 selection:bg-[var(--accent)] selection:text-white flex flex-col overflow-hidden">
      {/* 1. DYNAMIC VIDEO BACKGROUND WITH SOFT GRADIENT */}
      <div className="fixed inset-0 z-0">
        {/* Video opacity increased so it's clearly visible */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/cricket-bg.mp4" type="video/mp4" />
        </video>
        {/* Soft Radial/Linear Gradient: Darker at edges, transparent in center to reveal the video */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--background)_90%)] transition-colors duration-500" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/80 via-transparent to-[var(--background)] transition-colors duration-500" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col pt-5 md:pt-20 pb-5">
        {/* --- SECTION 1: LIVE MATCHES TICKER --- */}
        <section className="w-full max-w-7xl mx-auto px-4 mb-8 md:mb-14 animate-in fade-in duration-700 overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="font-black uppercase tracking-widest text-xs md:text-sm text-[var(--foreground)]">
                Action Live Now
              </h2>
            </div>
            
            {/* Optional helper text for mobile swipe */}
            {liveMatches.length > 1 && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest md:hidden">
                Swipe ➔
              </span>
            )}
          </div>

          <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible gap-4 pb-4 pt-1 snap-x snap-mandatory no-scrollbar px-2">
            {/* 1. Show Skeletons while fetching data */}
            {isLoading ? (
              [1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="shrink-0 w-[90%] sm:w-[380px] md:w-full bg-[var(--surface-1)] border border-[var(--border-1)] p-5 rounded-2xl snap-center animate-pulse shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <div className="h-5 w-14 bg-[var(--surface-2)] rounded-full"></div>
                      <div className="h-5 w-16 bg-[var(--surface-2)] rounded-lg"></div>
                    </div>
                  </div>
                  <div className="mb-4 h-4 w-2/3 bg-[var(--surface-2)] rounded"></div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-1/3 bg-[var(--surface-2)] rounded"></div>
                      <div className="h-7 w-14 bg-[var(--surface-2)] rounded-xl"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-1/3 bg-[var(--surface-2)] rounded"></div>
                      <div className="h-7 w-14 bg-[var(--surface-2)] rounded-xl"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : liveMatches.length > 0 ? (
              liveMatches.map((match) => (
                <Link
                  key={match.id}
                  href={getMatchLink(match)}
                  className="group relative shrink-0 w-[90%] sm:w-[380px] md:w-full bg-[var(--surface-1)] backdrop-blur-xl border border-[var(--border-1)] p-5 rounded-2xl snap-center transition-all duration-300 hover:border-[var(--accent)] hover:shadow-xl overflow-hidden shadow-sm active:scale-[0.98]"
                >
                  {/* Subtle background glow effect on hover */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--accent)]/10 rounded-full blur-2xl -z-10 group-hover:bg-[var(--accent)]/20 transition-all duration-500" />

                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">
                        LIVE
                      </span>
                      <span className="text-[10px] opacity-75 font-bold uppercase tracking-wider bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-1)]">
                        {match.ball_type || "Tennis"} Ball
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[11px] text-[var(--accent)] font-black uppercase tracking-widest truncate">
                      🏆 {getTournamentName(match)}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Team 1 Score */}
                    <div className="flex justify-between items-center bg-[var(--surface-2)]/60 px-3 py-2 rounded-xl border border-[var(--border-1)]">
                      <span className="font-black text-xs uppercase truncate pr-2 text-[var(--foreground)]">
                        {getTeamName(match, 1)}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-black text-lg text-[var(--foreground)]">
                          {match.team1_score || 0}
                          <span className="opacity-50 text-xs">
                            /{match.team1_wickets || 0}
                          </span>
                        </span>
                        <span className="opacity-50 text-[11px] font-black ml-1.5">
                          ({match.team1_overs || 0})
                        </span>
                      </div>
                    </div>

                    {/* Team 2 Score */}
                    <div className="flex justify-between items-center bg-[var(--surface-2)]/60 px-3 py-2 rounded-xl border border-[var(--border-1)]">
                      <span className="font-black text-xs uppercase truncate pr-2 text-[var(--foreground)]">
                        {getTeamName(match, 2)}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-black text-lg text-[var(--foreground)]">
                          {match.team2_score || 0}
                          <span className="opacity-50 text-xs">
                            /{match.team2_wickets || 0}
                          </span>
                        </span>
                        <span className="opacity-50 text-[11px] font-black ml-1.5">
                          ({match.team2_overs || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="w-full md:col-span-3 text-center py-10 text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest border border-dashed border-[var(--border-1)] rounded-2xl bg-[var(--surface-1)]">
                No live matches at the moment.
              </div>
            )}
          </div>
        </section>

        {/* --- MAIN HERO & CTA --- */}
        <section className="relative flex-1 flex flex-col items-center justify-center text-center pt-5 pb-5 md:pt-12 md:pb-8 md:mb-16 min-h-[40vh] md:min-h-[60vh] px-4 md:px-6">
          <div className="animate-in zoom-in-95 duration-1000 flex flex-col items-center w-full max-w-4xl mx-auto">
            
            {/* 1. Responsive Typography */}
            <h1 className="text-[4rem] leading-[0.85] tracking-tighter sm:text-6xl md:text-8xl lg:text-9xl font-black italic uppercase text-[var(--foreground)] transition-colors duration-300 drop-shadow-lg">
              CricSync <br className="md:hidden" />
              <span className="text-[var(--accent)] drop-shadow-[0_0_20px_rgba(245,158,11,0.3)] inline-block mt-2 md:mt-0">
                Live
              </span>
            </h1>
            
            <p className="text-[11px] sm:text-sm md:text-xl font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] mt-5 md:mt-6 opacity-80 text-[var(--text-dark)] max-w-xs md:max-w-none mx-auto">
              Run Cricket Like a Pro <br className="md:hidden" /> From Toss to Trophy
            </p>
            
            {/* 📱 2. MOBILE-OPTIMIZED BUTTON LAYOUT */}
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-5 w-full max-w-sm sm:max-w-none">
              
              {/* Primary Action: Always Full Width on Mobile */}
              <Link
                href="/quick-match"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent)] text-white px-6 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-full font-black uppercase tracking-widest text-sm shadow-[0_8px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_40px_rgba(245,158,11,0.5)] active:scale-95 transition-all group"
              >
                <Flame size={20} className="group-hover:animate-bounce shrink-0" /> 
                <span>Quick Match</span>
              </Link>

              {/* Secondary Actions: Side-by-Side Grid on Mobile */}
              <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto sm:gap-5">
                <Link
                  href="/explore"
                  className="w-full flex items-center justify-center gap-2 bg-[var(--surface-2)] hover:bg-[var(--border-1)] border border-[var(--border-1)] text-[var(--foreground)] px-2 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-full font-bold uppercase tracking-widest text-[11px] md:text-sm active:scale-95 transition-all shadow-sm"
                >
                  <Search size={16} className="shrink-0" /> 
                  <span className="truncate">Find</span>
                </Link>
                
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 bg-[var(--surface-2)] hover:bg-[var(--border-1)] border border-[var(--border-1)] text-[var(--foreground)] px-2 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-full font-bold uppercase tracking-widest text-[11px] md:text-sm active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={16} className="shrink-0" /> 
                  <span className="truncate">Create</span>
                </Link>
              </div>

              {/* Tertiary Action: Grounded Full Width */}
              <InstallAppButton className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-full font-black uppercase tracking-widest text-[12px] md:text-sm hover:opacity-90 active:scale-95 transition-all shadow-xl mt-1 md:mt-0" />
              
            </div>
          </div>
        </section>

        {/* --- SECTION 2: RECENT RESULTS --- */}
        <section className="w-full max-w-7xl mx-auto px-4 mb-10 md:mb-16">
          <div className="flex items-center gap-3 mb-8 px-2 border-b border-[var(--foreground)]/10 pb-4">
            <CheckCircle2
              className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              size={24}
            />
            <h2 className="font-black uppercase tracking-widest text-sm text-[var(--foreground)]">
              Recent Match Results
            </h2>
          </div>

          {/* 1. Show Skeletons while fetching data */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((skeleton) => (
                <div
                  key={skeleton}
                  className="bg-[var(--background)]/[0.7] backdrop-blur-2xl border border-[var(--foreground)]/10 p-6 rounded-xl flex flex-col justify-between min-h-[160px] animate-pulse shadow-sm"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b border-[var(--foreground)]/10 pb-3">
                      <div className="h-6 w-24 bg-[var(--foreground)]/10 rounded-lg"></div>
                      <div className="h-4 w-20 bg-[var(--foreground)]/10 rounded-md"></div>
                    </div>

                    <div className="mb-4 h-4 w-3/4 bg-[var(--foreground)]/10 rounded"></div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-1/3 bg-[var(--foreground)]/10 rounded"></div>
                        <div className="h-6 w-16 bg-[var(--foreground)]/10 rounded-md"></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-1/3 bg-[var(--foreground)]/10 rounded"></div>
                        <div className="h-6 w-16 bg-[var(--foreground)]/10 rounded-md"></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--foreground)]/10">
                    <div className="h-4 w-1/2 bg-[var(--foreground)]/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : completedMatches.length > 0 ? (
            /* 2. Show actual matches once data arrives */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedMatches.map((match) => (
                <Link
                  key={match.id}
                  href={getMatchLink(match)}
                  className="group relative bg-[var(--background)]/[0.7] backdrop-blur-2xl border border-[var(--foreground)]/10 p-6 rounded-xl transition-all flex flex-col justify-between min-h-[160px] hover:-translate-y-2 hover:shadow-xl shadow-sm overflow-hidden"
                >
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-all duration-500" />

                  <div>
                    <div className="flex justify-between items-center text-[13px] font-bold opacity-70 uppercase mb-4 border-b border-[var(--foreground)]/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-[var(--foreground)]/10 px-2 py-1 rounded-lg">
                          🏁 Finished
                        </span>
                        <span>{match.ball_type || "Tennis"} Ball</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />{" "}
                        {formatDateTime(match.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--accent)] font-black uppercase tracking-wide truncate mb-4">
                      🏆 {getTournamentName(match)}
                    </p>

                    <div className="space-y-3 text-sm font-bold text-[var(--foreground)]">
                      <div className="flex justify-between items-center">
                        <span className="truncate pr-2">
                          {getTeamName(match, 1)}
                        </span>
                        <span className="font-black text-lg">
                          {match.team1_score || 0}
                          <span className="opacity-50 text-sm">
                            /{match.team1_wickets || 0}
                          </span>{" "}
                          <span className="text-[13px] opacity-50 font-normal">
                            ({match.team1_overs || 0})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="truncate pr-2">
                          {getTeamName(match, 2)}
                        </span>
                        <span className="font-black text-lg">
                          {match.team2_score || 0}
                          <span className="opacity-50 text-sm">
                            /{match.team2_wickets || 0}
                          </span>{" "}
                          <span className="text-[13px] opacity-50 font-normal">
                            ({match.team2_overs || 0})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--foreground)]/10">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-wide truncate">
                      📢 {match.result_margin || "Match Ended"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* 3. Empty State if no matches are found */
            <div className="text-center py-12 bg-[var(--background)]/[0.7] backdrop-blur-md rounded-xl border border-dashed border-[var(--foreground)]/20 opacity-60 text-xs font-bold uppercase tracking-wider">
              No completed matches found yet.
            </div>
          )}
        </section>

        {/* --- SECTION 3: THE 6 ECOSYSTEM MODULES --- */}
        <section className="w-full max-w-7xl mx-auto px-4 mb-12 md:mb-16">
          <div className="flex items-center gap-3 mb-8 md:mb-10 px-2 border-b border-[var(--border-1)] pb-4">
            <Zap className="text-[var(--accent)] animate-bounce" size={22} />
            <h2 className="font-black uppercase tracking-widest text-xs md:text-sm text-[var(--foreground)]">
              The CricSync Power Grid
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
            {/* Module 01 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-blue-500 rounded-full" />
                  <span className="text-blue-500 font-black uppercase tracking-widest text-xs">
                    Module 01
                  </span>
                </div>
                <ShieldCheck
                  size={20}
                  className="text-blue-500/50 group-hover:text-blue-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Tournament <br />
                <span className="text-blue-500">Command Center</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                Take full control from a single dashboard. Assign umpires,
                manage scorers (online/offline), and onboard commentators
                effortlessly.
              </p>
            </div>

            {/* Module 02 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -z-10 group-hover:bg-teal-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-teal-500 rounded-full" />
                  <span className="text-teal-500 font-black uppercase tracking-widest text-xs">
                    Module 02
                  </span>
                </div>
                <Zap
                  size={20}
                  className="text-teal-500/50 group-hover:text-teal-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Ball-by-Ball, <br />
                <span className="text-teal-500">Zero Delay</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                A lightning-fast scoring engine built for accuracy. Every single
                delivery is tracked, mathematically synced, and updated in real
                time.
              </p>
            </div>

            {/* Module 03 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -z-10 group-hover:bg-amber-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-amber-500 rounded-full" />
                  <span className="text-amber-500 font-black uppercase tracking-widest text-xs">
                    Module 03
                  </span>
                </div>
                <Gavel
                  size={20}
                  className="text-amber-500/50 group-hover:text-amber-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Auctions <br />
                <span className="text-amber-500">Simplified</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                Host high-energy IPL-style player auctions with live bidding
                screens, virtual franchise wallet tracking, and automated squad
                sorting.
              </p>
            </div>

            {/* Module 04 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -z-10 group-hover:bg-red-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-red-500 rounded-full" />
                  <span className="text-red-500 font-black uppercase tracking-widest text-xs">
                    Module 04
                  </span>
                </div>
                <Tv
                  size={20}
                  className="text-red-500/50 group-hover:text-red-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Stream Like a <br />
                <span className="text-red-500">TV Network</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                Deliver professional match broadcasts with OBS-ready live
                graphical overlays, wagon wheels, and smooth YouTube live
                integration.
              </p>
            </div>

            {/* Module 05 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-fuchsia-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl -z-10 group-hover:bg-fuchsia-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-fuchsia-500 rounded-full" />
                  <span className="text-fuchsia-500 font-black uppercase tracking-widest text-xs">
                    Module 05
                  </span>
                </div>
                <Network
                  size={20}
                  className="text-fuchsia-500/50 group-hover:text-fuchsia-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Smart Fixtures <br />
                <span className="text-fuchsia-500">& Standings</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                Dynamic auto-advancing knockout brackets, round-robin schedule
                generators, and Net Run Rate (NRR) calculated points tables.
              </p>
            </div>

            {/* Module 06 */}
            <div className="group relative bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--border-1)] p-6 md:p-8 rounded-2xl hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -z-10 group-hover:bg-purple-500/10 transition-all" />
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-purple-500 rounded-full" />
                  <span className="text-purple-500 font-black uppercase tracking-widest text-xs">
                    Module 06
                  </span>
                </div>
                <UserCheck
                  size={20}
                  className="text-purple-500/50 group-hover:text-purple-500 transition-colors"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic mb-3 md:mb-4 text-[var(--foreground)]">
                Digital Player <br />
                <span className="text-purple-500">Passport</span>
              </h3>
              <p className="text-xs md:text-sm font-medium opacity-80 leading-relaxed text-[var(--text-muted)]">
                Track every single run, hat-trick, and MVP award across multiple
                tournaments. Players get a permanent shareable QR verified web
                profile.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* --- LIVE ANIMATED STATS FOOTER --- */}
      <section className="border-t border-[var(--border-1)] bg-[var(--surface-1)]/80 backdrop-blur-3xl w-full py-6 md:py-8 mt-auto relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-3 gap-2 md:gap-5 divide-x divide-[var(--border-1)]">
          
          {/* Stat 1 */}
          <div className="flex flex-col items-center justify-center text-center px-1 md:px-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
              <AnimatedNumber value={systemStats.matches} />+
            </span>
            <span className="text-[10px] sm:text-xs md:text-[13px] text-[var(--accent)] font-black uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1">
              <Play size={10} className="shrink-0" /> 
              <span className="truncate">Matches</span>
            </span>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center justify-center text-center px-1 md:px-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
              <AnimatedNumber value={systemStats.tournaments} />+
            </span>
            <span className="text-[10px] sm:text-xs md:text-[13px] text-[var(--accent)] font-black uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1">
              <Trophy size={10} className="shrink-0" /> 
              <span className="truncate">Tournaments</span>
            </span>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center justify-center text-center px-1 md:px-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight">
              <AnimatedNumber value={systemStats.players} />+
            </span>
            <span className="text-[10px] sm:text-xs md:text-[13px] text-[var(--accent)] font-black uppercase tracking-widest mt-1 md:mt-2 flex items-center gap-1">
              <Users size={10} className="shrink-0" /> 
              <span className="truncate">Players</span>
            </span>
          </div>

        </div>
      </section>
    </main>
  );
}
