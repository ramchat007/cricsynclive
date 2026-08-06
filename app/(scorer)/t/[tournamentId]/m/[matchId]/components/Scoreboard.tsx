"use client";

import { Settings } from "lucide-react";
import Partnership from "./Partnership";

export default function Scoreboard({
  battingTeam,
  currentScore,
  currentWickets,
  currentOvers,
  match,
  runRate,
  targetScore,
  rrr,
  remainingRuns,
  remainingBalls,
  openSettings,
  isAuthorized,
  extras,
  deliveries = [],
  currentOverDeliveries = [],
  team1Players = [],
  team2Players = [],
}: any) {
  const team1Name = match?.team1?.name || match?.team1?.short_name || "Team 1";
  const team2Name = match?.team2?.name || match?.team2?.short_name || "Team 2";
  const isTeam1Batting = battingTeam?.id === match?.team1_id;

  const isCompleted = match?.status === "completed";
  const isSecondInnings = match?.current_innings === 2 || isCompleted;

  const inn1Dels = deliveries.filter((d: any) => d.innings === 1);
  const inn1Wickets = inn1Dels.filter((d: any) => d.is_wicket).length;
  const inn1LegalBalls = inn1Dels.filter(
    (d: any) =>
      !["wide", "wd", "no-ball", "nb"].includes(d.extras_type?.toLowerCase()),
  ).length;
  const inn1Overs = `${Math.floor(inn1LegalBalls / 6)}.${inn1LegalBalls % 6}`;

  // Helper function to format ball text (e.g., '1wd', 'W', '4')
  const getBallDisplay = (d: any) => {
    if (d.is_wicket) return "W";
    const e = d.extras_type?.toLowerCase();
    if (e === "wide" || e === "wd") return `${d.extras_runs || 1}wd`;
    if (e === "no-ball" || e === "nb")
      return `${Number(d.runs_off_bat || 0) + Number(d.extras_runs || 1)}nb`;
    if (e === "leg-bye" || e === "lb") return `${d.extras_runs}lb`;
    if (e === "bye" || e === "b") return `${d.extras_runs}b`;
    if (e === "penalty") return `P`;
    return d.runs_off_bat?.toString() || "0";
  };

  // 🔥 SMART TAPE LOGIC (Handles "Over Completed" scenario) 🔥
  const inningsDeliveries = deliveries.filter(
    (d: any) => d.innings === match?.current_innings,
  );
  let tapeDeliveries =
    currentOverDeliveries?.length > 0 ? currentOverDeliveries : [];
  let tapeLabel = "This Over:";

  if (tapeDeliveries.length === 0 && inningsDeliveries.length > 0) {
    const lastDel = inningsDeliveries[inningsDeliveries.length - 1];
    tapeDeliveries = inningsDeliveries.filter(
      (d: any) => d.over_number === lastDel.over_number,
    );
    if (tapeDeliveries.length === 0)
      tapeDeliveries = inningsDeliveries.slice(-6);
    tapeLabel = "Last Over:";
  }

  // Helper to extract player names securely
  const getPlayerName = (id: string) => {
    const p =
      team1Players.find((p: any) => p.id === id) ||
      team2Players.find((p: any) => p.id === id);
    return p?.full_name || p?.name || p?.short_name || "Unknown";
  };

  // Extract Top 3 Performers for Completed Summary
  const getTopPerformers = () => {
    const batterStats: Record<string, any> = {};
    const bowlerStats: Record<string, any> = {};

    deliveries.forEach((d: any) => {
      // Batting Stats
      if (d.striker_id) {
        if (!batterStats[d.striker_id])
          batterStats[d.striker_id] = { id: d.striker_id, runs: 0, balls: 0 };
        batterStats[d.striker_id].runs += Number(d.runs_off_bat) || 0;
        const isWide =
          d.extras_type?.toLowerCase() === "wide" ||
          d.extras_type?.toLowerCase() === "wd";
        if (!isWide) batterStats[d.striker_id].balls += 1;
      }

      // Bowling Stats
      if (d.bowler_id) {
        if (!bowlerStats[d.bowler_id])
          bowlerStats[d.bowler_id] = {
            id: d.bowler_id,
            wickets: 0,
            runs: 0,
            balls: 0,
          };
        const runsOffBat = Number(d.runs_off_bat) || 0;
        const extraRuns = Number(d.extras_runs) || 0;
        const eType = d.extras_type?.toLowerCase();

        // Calculate runs conceded (excludes byes/leg-byes)
        if (!["bye", "b", "leg-bye", "lb", "penalty"].includes(eType)) {
          bowlerStats[d.bowler_id].runs += runsOffBat + extraRuns;
        } else {
          bowlerStats[d.bowler_id].runs += runsOffBat;
        }

        // Calculate Wickets (excludes run outs)
        const isWicket = d.is_wicket || d.wicket_type;
        if (
          isWicket &&
          ![
            "run out",
            "retired hurt",
            "hit ball twice",
            "obstructing the field",
          ].includes(d.wicket_type?.toLowerCase())
        ) {
          bowlerStats[d.bowler_id].wickets += 1;
        }

        // Calculate legal deliveries
        const isWide = eType === "wide" || eType === "wd";
        const isNoBall = eType === "no-ball" || eType === "nb";
        if (!isWide && !isNoBall) {
          bowlerStats[d.bowler_id].balls += 1;
        }
      }
    });

    const topBatters = Object.values(batterStats)
      .sort((a: any, b: any) => b.runs - a.runs)
      .slice(0, 3);
    const topBowlers = Object.values(bowlerStats)
      .sort((a: any, b: any) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return a.runs - b.runs;
      })
      .slice(0, 3);

    return { topBatters, topBowlers };
  };

  /* 🏆 ==========================================
      COMPLETED MATCH VIEW 
     ========================================== 🏆 */
  if (isCompleted) {
    const { topBatters, topBowlers } = getTopPerformers();

    return (
      <div className="flex flex-col gap-4 animate-in fade-in w-full">
        <div className="bg-[var(--surface-1)] p-4 sm:p-6 rounded-sm border border-[var(--border-1)] shadow-sm">
          <div className="text-center mb-6">
            <span className="bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-1)] text-[12px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3">
              {match.stage || "Match"} • Final Scorecard
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] uppercase tracking-tighter">
              {match.result_margin || "Match Finished"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Team 1 Summary */}
            <div
              className={`p-4 rounded-xl border flex justify-between items-center ${match.winner_id === match.team1_id ? "bg-[var(--accent)]/10 border-[var(--accent)]/30" : "bg-[var(--surface-2)] border-[var(--border-1)]"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {match.winner_id === match.team1_id && (
                  <span className="text-xl shrink-0">🏆</span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[var(--foreground)] text-sm sm:text-base truncate">
                    {match?.team1?.name}
                  </span>
                  <span className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    {match.team1_overs} Overs
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-[var(--foreground)]">
                  {match.team1_score}
                  <span className="text-base text-[var(--text-muted)]">
                    /{match.team1_wickets}
                  </span>
                </span>
              </div>
            </div>

            {/* Team 2 Summary */}
            <div
              className={`p-4 rounded-xl border flex justify-between items-center ${match.winner_id === match.team2_id ? "bg-[var(--accent)]/10 border-[var(--accent)]/30" : "bg-[var(--surface-2)] border-[var(--border-1)]"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {match.winner_id === match.team2_id && (
                  <span className="text-xl shrink-0">🏆</span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[var(--foreground)] text-sm sm:text-base truncate">
                    {match?.team2?.name}
                  </span>
                  <span className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    {match.team2_overs} Overs
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-[var(--foreground)]">
                  {match.team2_score}
                  <span className="text-base text-[var(--text-muted)]">
                    /{match.team2_wickets}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* TOP 3 PERFORMERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--border-1)] pt-6">
            {/* Batters */}
            <div>
              <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="text-[var(--accent)]">🏏</span> Top Batters
              </h3>
              <div className="flex flex-col gap-2">
                {topBatters.map((b: any, i: number) => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border-1)]"
                  >
                    <span className="text-xs font-bold text-[var(--foreground)] truncate pr-2">
                      {i + 1}. {getPlayerName(b.id)}
                    </span>
                    <span className="text-sm font-black text-[var(--foreground)] shrink-0">
                      {b.runs}{" "}
                      <span className="text-[12px] text-[var(--text-muted)] font-bold">
                        ({b.balls})
                      </span>
                    </span>
                  </div>
                ))}
                {topBatters.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)] italic">
                    No batting data available
                  </span>
                )}
              </div>
            </div>

            {/* Bowlers */}
            <div>
              <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="text-[var(--accent)]">⚾</span> Top Bowlers
              </h3>
              <div className="flex flex-col gap-2">
                {topBowlers.map((b: any, i: number) => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border-1)]"
                  >
                    <span className="text-xs font-bold text-[var(--foreground)] truncate pr-2">
                      {i + 1}. {getPlayerName(b.id)}
                    </span>
                    <span className="text-sm font-black text-[var(--foreground)] shrink-0">
                      {b.wickets}-{b.runs}{" "}
                      <span className="text-[12px] text-[var(--text-muted)] font-bold">
                        ({Math.floor(b.balls / 6)}.{b.balls % 6})
                      </span>
                    </span>
                  </div>
                ))}
                {topBowlers.length === 0 && (
                  <span className="text-xs text-[var(--text-muted)] italic">
                    No bowling data available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 🔴 ==========================================
      LIVE MATCH VIEW 
     ========================================== 🔴 */
  return (
    <div className="flex flex-col gap-2 sm:gap-4 animate-in fade-in flex-1">
      {/* 1. COMPACT MATCHUP HEADER */}
      {/* <div className="bg-[var(--surface-1)] p-2 sm:p-4 rounded-xl sm:rounded-xl border border-[var(--border-1)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-2 transition-colors">
        <div className="bg-[var(--surface-2)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-1)] shrink-0">
          <p className="text-[9px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            Inn {match?.current_innings || 1}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 text-xs sm:text-lg font-black uppercase tracking-tight truncate min-w-0">
          <span
            className={`truncate transition-colors ${isTeam1Batting ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
          >
            {team1Name}{" "}
            <span className="hidden sm:inline">{isTeam1Batting && "🏏"}</span>
          </span>
          <span className="text-[var(--text-muted)] opacity-50 text-[9px] sm:text-sm shrink-0">
            VS
          </span>
          <span
            className={`truncate transition-colors ${!isTeam1Batting ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
          >
            <span className="hidden sm:inline">{!isTeam1Batting && "🏏 "}</span>
            {team2Name}
          </span>
        </div>
      </div> */}

      {/* 2. CHASE MATH BANNER */}
      {isSecondInnings && (
        <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl p-2.5 sm:p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[9px] font-black text-[var(--background)] uppercase tracking-widest bg-[var(--foreground)] px-2 py-0.5 rounded-md mb-1 inline-block">
              Target: {targetScore}
            </p>
            <p className="text-xs sm:text-xl font-bold text-[var(--foreground)] leading-tight">
              Need {remainingRuns} off {remainingBalls}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] sm:text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
              Req RR
            </p>
            <p
              className={`text-sm sm:text-lg font-black leading-none ${parseFloat(rrr) > 10 ? "text-red-500" : "text-[var(--foreground)]"}`}
            >
              {rrr}
            </p>
          </div>
        </div>
      )}

      {/* 3. MAIN SCOREBOARD GRID */}
      <div
        className={`grid grid-cols-1 gap-2 sm:gap-4 ${isSecondInnings ? "md:grid-cols-2" : "md:grid-cols-2"}`}
      >
        {/* INNINGS 1 SCORE (Shows during chase) */}
        {isSecondInnings && (
          <div className="bg-[var(--surface-2)] p-3 sm:p-6 rounded-xl sm:rounded-sm border border-[var(--border-1)] shadow-inner flex flex-row md:flex-col justify-between md:justify-center items-center text-left md:text-center md:opacity-80 relative gap-2 md:gap-0">
            <div>
              <p className="text-[9px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest md:mb-1">
                1st Inn{" "}
                <span className="hidden md:inline">
                  • {isTeam1Batting ? team2Name : team1Name}
                </span>
              </p>
              <div className="md:hidden mt-0.5 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                Overs:{" "}
                <span className="text-[var(--foreground)]">{inn1Overs}</span>
              </div>
            </div>

            <div className="flex flex-col items-end md:items-center">
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--foreground)] leading-none tracking-tighter">
                {targetScore ? targetScore - 1 : "0"}
                <span className="text-base sm:text-3xl text-[var(--text-muted)] opacity-70">
                  /{inn1Wickets}
                </span>
              </h2>
              <div className="hidden md:block mt-2 text-[12px] font-bold text-[var(--text-muted)] bg-[var(--surface-1)] px-2 py-1 rounded-md border border-[var(--border-1)] uppercase tracking-widest">
                Overs:{" "}
                <span className="text-[var(--foreground)] ml-1">
                  {inn1Overs}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE / LIVE SCORE HERO */}
        <div
          className={`${!isSecondInnings ? "md:col-span-1" : ""} bg-[var(--surface-1)] p-3 sm:p-6 rounded-xl rounded-2xl border border-[var(--accent)]/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)] flex flex-col justify-center items-center text-center relative overflow-hidden`}
        >
          <p className="text-[12px] sm:text-xs font-black text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 rounded-full uppercase tracking-widest mb-2 relative z-10">
            {isSecondInnings ? "2nd Innings" : "1st Innings"}{" "}
            <span className="inline">
              • {battingTeam?.name || battingTeam?.short_name}
            </span>
          </p>

          <h1 className="text-6xl sm:text-8xl lg:text-[110px] font-black text-[var(--foreground)] leading-[0.85] tracking-tighter relative z-10 pb-1">
            {currentScore}
            <span className="text-3xl sm:text-5xl lg:text-[70px] text-[var(--text-muted)] opacity-60 font-black">
              /{currentWickets}
            </span>
          </h1>

          {/* Mobile-Only Unified Metrics */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 relative z-10 md:hidden">
            <div className="flex items-center text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
              Overs:{" "}
              <span className="text-[var(--foreground)] ml-1 mr-0.5">
                {currentOvers}
              </span>
              {isAuthorized && (
                <button
                  onClick={openSettings}
                  className="ml-1 text-[var(--accent)] p-1 -m-1 active:scale-95"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
            <div className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
              CRR:{" "}
              <span className="text-[var(--foreground)] ml-1">{runRate}</span>
            </div>
            {tapeDeliveries?.length > 0 && (
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[var(--border-1)]/50 w-full flex flex-col items-center relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 w-full justify-center">
                  <span className="text-[9px] sm:text-[12px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-2)] px-2 py-0.5 rounded-md">
                    {tapeLabel}
                  </span>
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto max-w-full sm:max-w-md px-1 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {tapeDeliveries.map((d: any, idx: number) => {
                      const text = getBallDisplay(d);
                      const isWicket = text === "W";
                      const isBoundary = text === "4" || text === "6";
                      const isExtra =
                        text.includes("wd") || text.includes("nb");

                      return (
                        <span
                          key={d.id || idx}
                          className={`flex items-center justify-center min-w-[28px] h-[28px] sm:min-w-[36px] sm:h-[36px] px-1 rounded-full text-[11px] sm:text-sm font-black shadow-sm shrink-0 ${
                            isWicket
                              ? "bg-red-500 text-white border border-red-600"
                              : isBoundary
                                ? "bg-[var(--accent)] text-[var(--background)] border border-[var(--accent)]"
                                : isExtra
                                  ? "bg-orange-500 text-white border border-orange-600"
                                  : "bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)]"
                          }`}
                        >
                          {text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[12px] sm:text-xs font-bold text-[var(--text-muted)] mt-1 bg-[var(--surface-1)] border border-[var(--border-1)] p-2 rounded-xl">
            Extras:{" "}
            <span className="text-[var(--foreground)] ml-0.5 mr-1 text-[11px] sm:text-sm font-black">
              {extras?.total || 0}
            </span>
            <span className="opacity-70 uppercase tracking-widest">
              (W{extras?.w || 0} NB{extras?.nb || 0} B{extras?.b || 0} LB
              {extras?.lb || 0})
            </span>
          </div>
        </div>

        {/* RIGHT METRICS STACK (HIDDEN ON MOBILE, VISIBLE ON DESKTOP) */}
        {!isSecondInnings && (
          <div className="hidden md:flex flex-col gap-4 w-full">
            <div className="bg-[var(--surface-1)] p-3 rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 bg-[var(--surface-2)] px-3 py-1 rounded-full">
                Overs
              </p>
              <button
                onClick={openSettings}
                disabled={!isAuthorized}
                className={`group flex items-end gap-2 text-3xl font-black text-[var(--foreground)] leading-none ${isAuthorized ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
              >
                {currentOvers}
                <span className="text-2xl font-bold text-[var(--text-muted)] transition-colors mb-1">
                  / {match?.overs_count}{" "}
                  {isAuthorized && (
                    <span className="hidden sm:inline group-hover:text-[var(--accent)] ml-1">
                      ⚙️
                    </span>
                  )}
                </span>
              </button>
            </div>

            <div className="bg-[var(--surface-1)] p-3 rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 bg-[var(--surface-2)] px-3 py-1 rounded-full">
                Current RR
              </p>
              <p className="text-3xl font-black text-[var(--foreground)] leading-none">
                {runRate}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* These will ONLY render if the match is Live. */}
      <Partnership
        matchData={match}
        deliveries={deliveries}
        team1Squad={team1Players}
        team2Squad={team2Players}
      />
    </div>
  );
}
