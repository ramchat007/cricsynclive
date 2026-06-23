"use client";

import { Settings } from "lucide-react";

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
  const team1Name = match?.team1?.short_name || match?.team1?.name || "Team 1";
  const team2Name = match?.team2?.short_name || match?.team2?.name || "Team 2";
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

  return (
    <div className="flex flex-col gap-2 sm:gap-4 animate-in fade-in">
      {/* 1. COMPACT MATCHUP HEADER */}
      <div className="bg-[var(--surface-1)] p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-row items-center justify-between gap-2 transition-colors">
        <div className="bg-[var(--surface-2)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-1)]">
          <p className="text-[9px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            {isCompleted ? "Result" : `Inn ${match?.current_innings || 1}`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs sm:text-lg font-black uppercase tracking-tight truncate">
          <span
            className={`truncate transition-colors ${!isCompleted && isTeam1Batting ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
          >
            {team1Name} {!isCompleted && isTeam1Batting && "🏏"}
          </span>
          <span className="text-[var(--text-muted)] opacity-50 text-[9px] sm:text-sm">
            VS
          </span>
          <span
            className={`truncate transition-colors ${!isCompleted && !isTeam1Batting ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
          >
            {!isCompleted && !isTeam1Batting && "🏏"} {team2Name}
          </span>
        </div>
      </div>

      {/* 2. CHASE MATH OR FINAL RESULT BANNER */}
      {isCompleted ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 sm:p-4 rounded-xl text-center shadow-inner">
          <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">
            Match Result
          </p>
          <p className="text-sm sm:text-xl font-black text-yellow-500">
            {match.result_margin || "Match Finished"}
          </p>
        </div>
      ) : isSecondInnings ? (
        <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl p-2 sm:p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded mb-0.5 inline-block">
              Target: {targetScore}
            </p>
            <p className="text-xs sm:text-xl font-bold text-[var(--foreground)]">
              Need {remainingRuns} off {remainingBalls}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
              Req RR
            </p>
            <p className="text-sm sm:text-lg font-black text-[var(--foreground)]">
              {rrr}
            </p>
          </div>
        </div>
      ) : null}

      {/* 3. MAIN SCOREBOARD GRID */}
      <div
        className={`grid grid-cols-1 gap-2 sm:gap-4 ${isSecondInnings ? "md:grid-cols-2" : "md:grid-cols-3"}`}
      >
        {/* INNINGS 1 SCORE (Shows during chase) */}
        {isSecondInnings && (
          <div className="bg-[var(--surface-2)] p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-[var(--border-1)] shadow-inner flex flex-col justify-center items-center text-center opacity-80 relative">
            <p className="text-[9px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
              1st Innings • {isTeam1Batting ? team2Name : team1Name}
            </p>
            <h2 className="text-3xl sm:text-6xl font-black text-[var(--foreground)] leading-none tracking-tighter">
              {targetScore ? targetScore - 1 : "0"}
              <span className="text-xl sm:text-4xl text-[var(--text-muted)] opacity-70">
                /{inn1Wickets}
              </span>
            </h2>
            <div className="mt-2 text-[10px] sm:text-[12px] font-bold text-[var(--text-muted)] bg-[var(--surface-1)] px-2 py-1 rounded-md border border-[var(--border-1)] uppercase">
              Overs:{" "}
              <span className="text-[var(--foreground)] ml-1">{inn1Overs}</span>
            </div>
          </div>
        )}

        {/* ACTIVE / LIVE SCORE */}
        <div
          className={`${!isSecondInnings ? "md:col-span-2" : ""} bg-[var(--surface-1)] p-4 sm:p-6 rounded-xl sm:rounded-3xl border ${isCompleted ? "border-[var(--border-1)]" : "border-[var(--accent)]/50 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]"} flex flex-col justify-center items-center text-center relative overflow-hidden`}
        >
          <p className="text-[9px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 relative z-10">
            {isSecondInnings ? "2nd Innings" : "1st Innings"} •{" "}
            {battingTeam?.short_name || battingTeam?.name}
          </p>

          <h1
            className={`text-6xl sm:text-7xl lg:text-8xl font-black text-[var(--foreground)] leading-none tracking-tighter relative z-10 ${isCompleted ? "opacity-80" : ""}`}
          >
            {currentScore}
            <span className="text-3xl sm:text-4xl text-[var(--text-muted)] opacity-70">
              /{currentWickets}
            </span>
          </h1>

          {/* 🔥 CHANGED: Added `md:hidden` to this wrapper so it hides on Desktop! 🔥 */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 relative z-10 md:hidden">
            <div className="flex items-center text-[10px] sm:text-[12px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
              Overs:{" "}
              <span className="text-[var(--foreground)] ml-1 text-xs sm:text-sm mr-1">
                {currentOvers}
              </span>
              {isAuthorized && !isCompleted && (
                <button
                  onClick={openSettings}
                  className="ml-1 text-[var(--accent)] hover:scale-110 active:scale-95 p-0.5"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
            <div className="text-[10px] sm:text-[12px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
              CRR:{" "}
              <span className="text-[var(--foreground)] ml-1 text-xs sm:text-sm">
                {runRate}
              </span>
            </div>
          </div>

          {/* 🔥 "THIS OVER / LAST OVER" TAPE 🔥 */}
          {!isCompleted && tapeDeliveries?.length > 0 && (
            <div className="mt-4 pt-3 sm:pt-4 border-t border-[var(--border-1)] w-full flex flex-col items-center relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  {tapeLabel}
                </span>
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar max-w-[250px] sm:max-w-md px-1 pb-1">
                  {tapeDeliveries.map((d: any, idx: number) => {
                    const text = getBallDisplay(d);
                    const isWicket = text === "W";
                    const isBoundary = text === "4" || text === "6";
                    const isExtra = text.includes("wd") || text.includes("nb");

                    return (
                      <span
                        key={d.id || idx}
                        className={`flex items-center justify-center min-w-[24px] h-6 sm:min-w-[32px] sm:h-8 px-1.5 rounded-full text-[10px] sm:text-xs font-black shadow-sm shrink-0 ${
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

        {/* RIGHT METRICS STACK (HIDDEN ON MOBILE, VISIBLE ON DESKTOP) */}
        {!isSecondInnings && (
          <div className="hidden md:flex flex-col gap-4">
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Overs
              </p>
              <button
                onClick={openSettings}
                disabled={!isAuthorized || isCompleted}
                className={`group flex items-end gap-2 text-4xl font-black text-[var(--foreground)] leading-none ${isAuthorized && !isCompleted ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
              >
                {currentOvers}
                <span className="text-xl font-bold text-[var(--text-muted)] transition-colors mb-1">
                  / {match?.overs_count}{" "}
                  {isAuthorized && !isCompleted && (
                    <span className="hidden sm:inline group-hover:text-[var(--accent)] ml-1">
                      ⚙️
                    </span>
                  )}
                </span>
              </button>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Current RR
              </p>
              <p className="text-4xl font-black text-[var(--foreground)] leading-none">
                {runRate}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* EXTRAS FOOTER (Slimline) */}
      <div className="text-center text-[10px] sm:text-xs font-bold text-[var(--text-muted)]">
        Extras:{" "}
        <span className="text-[var(--foreground)] ml-1 mr-1 text-xs sm:text-sm font-black">
          {extras?.total || 0}
        </span>
        <span className="opacity-70 uppercase tracking-widest">
          (W{extras?.w || 0} NB{extras?.nb || 0} B{extras?.b || 0} LB
          {extras?.lb || 0})
        </span>
      </div>
    </div>
  );
}
