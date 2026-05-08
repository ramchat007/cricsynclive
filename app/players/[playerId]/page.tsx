"use client";
import React, { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Shield,
  Activity,
  Trophy,
  BarChart2,
  Medal,
  Target,
  Gavel,
  Calendar,
  ChevronRight,
} from "lucide-react";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    matches: 0,
    batting: {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      highest: 0,
      dismissals: 0,
    },
    bowling: {
      wickets: 0,
      runsConceded: 0,
      ballsBowled: 0,
      bestWickets: 0,
      bestRuns: 0,
    },
  });

  useEffect(() => {
    fetchPlayerProfile();
  }, [playerId]);

  const fetchPlayerProfile = async () => {
    setIsLoading(true);

    try {
      // 1. Fetch Player Details
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          `
          *,
          teams (id, name, short_name, logo_url, primary_color),
          tournaments (id, name, format)
        `,
        )
        .eq("id", playerId)
        .single();

      if (playerError) throw playerError;
      setPlayer(playerData);

      // 2. Fetch Match Data to aggregate stats
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("*, matches(id)")
        .or(`striker_id.eq.${playerId},bowler_id.eq.${playerId}`);

      if (deliveries && deliveries.length > 0) {
        // Calculate Matches Played
        const uniqueMatchIds = Array.from(
          new Set(deliveries.map((d) => d.match_id)),
        );

        // 3. FETCH RECENT MATCHES DATA
        const { data: matchesData } = await supabase
          .from("matches")
          .select(
            `
            id,
            status,
            created_at,
            tournament_id,
            result_margin,
            tournaments (name),
            team1:teams!team1_id (short_name, logo_url),
            team2:teams!team2_id (short_name, logo_url)
          `,
          )
          .in("id", uniqueMatchIds)
          .order("created_at", { ascending: false })
          .limit(10); // Show last 10 matches

        if (matchesData) setRecentMatches(matchesData);

        // Calculate Batting
        const batDelivs = deliveries.filter((d) => d.striker_id === playerId);
        const batRuns = batDelivs.reduce(
          (sum, d) => sum + (d.runs_off_bat || 0),
          0,
        );
        const batBalls = batDelivs.filter(
          (d) => d.extras_type !== "wide",
        ).length;
        const fours = batDelivs.filter((d) => d.runs_off_bat === 4).length;
        const sixes = batDelivs.filter((d) => d.runs_off_bat === 6).length;
        const dismissals = deliveries.filter(
          (d) => d.is_wicket && d.player_out_id === playerId,
        ).length;

        // Match-by-match calculation for Highest Score
        const runsPerMatch: Record<string, number> = {};
        batDelivs.forEach((d) => {
          runsPerMatch[d.match_id] =
            (runsPerMatch[d.match_id] || 0) + (d.runs_off_bat || 0);
        });
        const highestScore =
          Object.values(runsPerMatch).length > 0
            ? Math.max(...Object.values(runsPerMatch))
            : 0;

        // Calculate Bowling
        const bowlDelivs = deliveries.filter((d) => d.bowler_id === playerId);
        const bowlRuns = bowlDelivs
          .filter(
            (d) =>
              d.extras_type !== "bye" &&
              d.extras_type !== "leg-bye" &&
              d.extras_type !== "penalty",
          )
          .reduce(
            (sum, d) => sum + (d.runs_off_bat || 0) + (d.extras_runs || 0),
            0,
          );
        const bowlBalls = bowlDelivs.filter(
          (d) =>
            (d.extras_type !== "wide" &&
              d.extras_type !== "no-ball" &&
              d.extras_type !== "penalty") ||
            d.force_legal_ball,
        ).length;
        const wickets = bowlDelivs.filter(
          (d) => d.is_wicket && d.wicket_type !== "run-out",
        ).length;

        // Match-by-match calculation for Best Bowling
        const bowlStatsPerMatch: Record<string, { w: number; r: number }> = {};
        bowlDelivs.forEach((d) => {
          if (!bowlStatsPerMatch[d.match_id])
            bowlStatsPerMatch[d.match_id] = { w: 0, r: 0 };
          if (
            d.extras_type !== "bye" &&
            d.extras_type !== "leg-bye" &&
            d.extras_type !== "penalty"
          ) {
            bowlStatsPerMatch[d.match_id].r +=
              (d.runs_off_bat || 0) + (d.extras_runs || 0);
          }
          if (d.is_wicket && d.wicket_type !== "run-out")
            bowlStatsPerMatch[d.match_id].w += 1;
        });

        let bestW = 0,
          bestR = 999;
        Object.values(bowlStatsPerMatch).forEach((s) => {
          if (s.w > bestW || (s.w === bestW && s.r < bestR)) {
            bestW = s.w;
            bestR = s.r;
          }
        });
        if (bestR === 999) bestR = 0;

        setStats({
          matches: uniqueMatchIds.length,
          batting: {
            runs: batRuns,
            balls: batBalls,
            fours,
            sixes,
            highest: highestScore,
            dismissals,
          },
          bowling: {
            wickets,
            runsConceded: bowlRuns,
            ballsBowled: bowlBalls,
            bestWickets: bestW,
            bestRuns: bestR,
          },
        });
      }
    } catch (err) {
      console.error("Error loading profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-[var(--text-muted)]">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={40}
        />
        <p className="font-black uppercase tracking-widest text-xs">
          Loading Athlete Data...
        </p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-[var(--text-muted)] p-4">
        <h1 className="text-2xl font-black uppercase text-[var(--foreground)] mb-2">
          Player Not Found
        </h1>
        <p className="font-bold mb-6">
          This profile might have been removed or doesn't exist.
        </p>
        <Link
          href="/search"
          className="bg-[var(--surface-1)] border border-[var(--border-1)] px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:text-[var(--accent)] transition-colors">
          Go Back
        </Link>
      </div>
    );
  }

  // Derived calculations for UI
  const batAvg =
    stats.batting.dismissals > 0
      ? (stats.batting.runs / stats.batting.dismissals).toFixed(1)
      : stats.batting.runs > 0
        ? stats.batting.runs
        : "-";
  const batSR =
    stats.batting.balls > 0
      ? ((stats.batting.runs / stats.batting.balls) * 100).toFixed(1)
      : "0.0";

  const bowlEcon =
    stats.bowling.ballsBowled > 0
      ? (stats.bowling.runsConceded / (stats.bowling.ballsBowled / 6)).toFixed(
          2,
        )
      : "0.00";
  const bowlSR =
    stats.bowling.wickets > 0
      ? (stats.bowling.ballsBowled / stats.bowling.wickets).toFixed(1)
      : "-";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans transition-colors duration-300 pb-20">
      {/* 1. HERO SECTION */}
      <div className="relative w-full bg-[var(--surface-1)] border-b border-[var(--border-1)] pt-8 px-6 md:px-12 pb-12 overflow-hidden shadow-sm">
        {player.teams?.primary_color && (
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/3"
            style={{ backgroundColor: player.teams.primary_color }}
          />
        )}

        <div className="max-w-6xl mx-auto relative z-10">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-[var(--text-muted)] font-bold mb-8 hover:text-[var(--accent)] w-max transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-[var(--surface-2)] border-2 border-[var(--border-1)] rounded-full p-2 shrink-0 relative shadow-xl">
              <div
                className="w-full h-full rounded-full bg-cover bg-center overflow-hidden"
                style={{
                  backgroundImage: player.photo_url
                    ? `url(${player.photo_url})`
                    : "none",
                }}>
                {!player.photo_url && (
                  <User className="w-full h-full text-[var(--text-muted)] p-6 opacity-30" />
                )}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--background)] px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg whitespace-nowrap border-2 border-[var(--surface-1)]">
                {player.player_role || "Athlete"}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left pt-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                  {player.full_name}
                </h1>

                {player.teams && (
                  <Link
                    href={`/t/${player.tournament_id}/teams`}
                    className="inline-flex items-center justify-center md:justify-start gap-2 bg-[var(--surface-2)] border border-[var(--border-1)] px-3 py-1.5 rounded-xl hover:border-[var(--accent)] transition-colors mx-auto md:mx-0 w-max">
                    <div
                      className="w-5 h-5 bg-contain bg-center bg-no-repeat rounded"
                      style={{
                        backgroundImage: player.teams.logo_url
                          ? `url(${player.teams.logo_url})`
                          : "none",
                      }}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      {player.teams.short_name}
                    </span>
                  </Link>
                )}
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center justify-center md:justify-start gap-1">
                <Trophy size={14} className="text-[var(--accent)]" />{" "}
                {player.tournaments?.name || "Global Database"}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="bg-[var(--surface-2)] border border-[var(--border-1)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} className="text-[var(--text-muted)]" />{" "}
                  {player.batting_hand || "Right Hand"} Bat
                </span>
                <span className="bg-[var(--surface-2)] border border-[var(--border-1)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} className="text-[var(--text-muted)]" />{" "}
                  {player.bowling_style || "Right Arm Fast"}
                </span>
                {player.auction_status === "sold" && player.sold_price && (
                  <span className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm">
                    <Gavel size={14} /> ₹
                    {player.sold_price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-10 animate-in fade-in slide-in-from-bottom-4">
        {stats.matches === 0 ? (
          <div className="text-center py-20 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem]">
            <Activity
              size={40}
              className="mx-auto text-[var(--text-muted)] opacity-50 mb-4"
            />
            <h3 className="font-black text-xl uppercase tracking-tighter mb-2">
              No Match Data Yet
            </h3>
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Stats will appear here once they play their first game.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Matches
                </p>
                <p className="text-4xl font-black">{stats.matches}</p>
              </div>
              <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Total Runs
                </p>
                <p className="text-4xl font-black text-[var(--accent)]">
                  {stats.batting.runs}
                </p>
              </div>
              <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Total Wickets
                </p>
                <p className="text-4xl font-black text-red-500">
                  {stats.bowling.wickets}
                </p>
              </div>
              <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Highest Score
                </p>
                <p className="text-4xl font-black">{stats.batting.highest}</p>
              </div>
            </div>

            {/* BATTING & BOWLING STATS GRID */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[var(--border-1)] bg-[var(--surface-2)] flex items-center gap-3">
                  <BarChart2 className="text-[var(--accent)]" size={20} />
                  <h3 className="font-black uppercase tracking-widest">
                    Batting Career
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-y-8 gap-x-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Innings
                    </p>
                    <p className="text-2xl font-black">{stats.matches}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Average
                    </p>
                    <p className="text-2xl font-black">{batAvg}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Strike Rate
                    </p>
                    <p className="text-2xl font-black text-[var(--accent)]">
                      {batSR}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Boundaries (4s/6s)
                    </p>
                    <p className="text-2xl font-black">
                      {stats.batting.fours}{" "}
                      <span className="text-[var(--text-muted)] font-medium">
                        /
                      </span>{" "}
                      {stats.batting.sixes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[var(--border-1)] bg-[var(--surface-2)] flex items-center gap-3">
                  <Medal className="text-red-500" size={20} />
                  <h3 className="font-black uppercase tracking-widest">
                    Bowling Career
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-y-8 gap-x-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Overs
                    </p>
                    <p className="text-2xl font-black">
                      {Math.floor(stats.bowling.ballsBowled / 6)}.
                      {stats.bowling.ballsBowled % 6}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Economy
                    </p>
                    <p className="text-2xl font-black text-[var(--accent)]">
                      {bowlEcon}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Strike Rate
                    </p>
                    <p className="text-2xl font-black">{bowlSR}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Best Bowling
                    </p>
                    <p className="text-2xl font-black">
                      {stats.bowling.bestWickets}/{stats.bowling.bestRuns}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT MATCHES SECTION */}
            {recentMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <Calendar className="text-[var(--accent)]" size={24} />
                  <h2 className="text-2xl font-black uppercase tracking-tighter">
                    Recent Matches
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentMatches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/t/${m.tournament_id}/match/${m.id}`}
                      className="bg-[var(--surface-1)] p-5 rounded-[2rem] border border-[var(--border-1)] hover:border-[var(--accent)] transition-all group flex flex-col justify-between shadow-sm">
                      {/* Top Context Row */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border-1)] max-w-[150px] truncate">
                          {m.tournaments?.name || "Tournament"}
                        </span>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
                          {new Date(m.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {/* Matchup */}
                      <div className="flex items-center justify-between my-2">
                        <div className="text-center w-20">
                          <div
                            className="w-12 h-12 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] bg-contain bg-center bg-no-repeat p-1 mb-2"
                            style={{
                              backgroundImage: m.team1?.logo_url
                                ? `url(${m.team1.logo_url})`
                                : "none",
                            }}
                          />
                          <p className="font-black text-xs text-[var(--foreground)] truncate">
                            {m.team1?.short_name || "T1"}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 rounded-full">
                          VS
                        </span>
                        <div className="text-center w-20">
                          <div
                            className="w-12 h-12 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] bg-contain bg-center bg-no-repeat p-1 mb-2"
                            style={{
                              backgroundImage: m.team2?.logo_url
                                ? `url(${m.team2.logo_url})`
                                : "none",
                            }}
                          />
                          <p className="font-black text-xs text-[var(--foreground)] truncate">
                            {m.team2?.short_name || "T2"}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-4 border-t border-[var(--border-1)] flex justify-between items-center">
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[180px] ${m.status === "completed" ? "text-[var(--accent)]" : "text-amber-500 animate-pulse"}`}>
                          {m.status === "completed"
                            ? m.result_margin || "Match Ended"
                            : "Live Now"}
                        </p>
                        <ChevronRight
                          size={16}
                          className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
