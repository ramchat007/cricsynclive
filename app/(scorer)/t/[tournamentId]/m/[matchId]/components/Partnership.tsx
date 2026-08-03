"use client";
import React from "react";

export default function Partnership({
  matchData,
  deliveries = [],
  team1Squad = [],
  team2Squad = [],
}: any) {
  if (!matchData || !deliveries.length) return null;

  // 1. ISOLATE CURRENT INNINGS BALLS
  const currentInnings = Number(matchData.current_innings) || 1;
  const currentInningsBalls = deliveries.filter(
    (d: any) => Number(d.innings) === currentInnings,
  );
  if (!currentInningsBalls.length) return null;

  // 2. FIND BALLS SINCE LAST WICKET
  let partnershipBalls: any[] = [];
  for (let i = currentInningsBalls.length - 1; i >= 0; i--) {
    if (currentInningsBalls[i].is_wicket) break;
    partnershipBalls.unshift(currentInningsBalls[i]);
  }

  const allPlayers = [...team1Squad, ...team2Squad];
  const findName = (id: string | null, fallback: string) =>
    allPlayers.find((p: any) => String(p.id) === String(id))?.full_name ||
    fallback;

  const strikerId = matchData.live_striker_id;
  const nonStrikerId = matchData.live_non_striker_id;

  // 3. CALCULATE INDIVIDUAL STATS
  const buildBatterStats = (playerId: string | null, fallback: string) => {
    if (!playerId) return { name: fallback, runs: 0, balls: 0 };
    const faced = partnershipBalls.filter(
      (b: any) => String(b.striker_id) === String(playerId),
    );
    return {
      name: findName(playerId, fallback),
      runs: faced.reduce(
        (sum: number, b: any) =>
          sum + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0),
        0,
      ),
      balls: faced.filter((b: any) => {
        const type = String(b.extras_type || "").toLowerCase();
        return type !== "wd" && type !== "wide";
      }).length,
    };
  };

  const strikerStats = buildBatterStats(strikerId, "Striker");
  const nonStrikerStats = buildBatterStats(nonStrikerId, "Non-Striker");

  // 4. CALCULATE TOTALS & PERCENTAGES
  const totalRuns = partnershipBalls.reduce(
    (sum: number, b: any) =>
      sum + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0),
    0,
  );
  const totalBalls = partnershipBalls.filter((b: any) => {
    const type = String(b.extras_type || "").toLowerCase();
    return (
      type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball"
    );
  }).length;

  const strikerRuns = strikerStats.runs;
  const nonStrikerRuns = nonStrikerStats.runs;

  // Calculate percentages for the Tug-of-War bar (Default to 50/50 if 0 runs)
  const combinedRuns = strikerRuns + nonStrikerRuns;
  const strikerPct = combinedRuns > 0 ? (strikerRuns / combinedRuns) * 100 : 50;
  const nonStrikerPct =
    combinedRuns > 0 ? (nonStrikerRuns / combinedRuns) * 100 : 50;

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden z-10 w-full mb-1">
      <div className="flex justify-between items-end">
        <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
          Current Partnership
        </p>
        <p className="text-sm sm:text-lg font-black text-[var(--foreground)] leading-none">
          {totalRuns}{" "}
          <span className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] opacity-70">
            ({totalBalls})
          </span>
        </p>
      </div>

      {/* Tug-of-war Contribution Bar */}
      <div className="flex w-full h-1.5 sm:h-2 rounded-full overflow-hidden bg-[var(--surface-2)] mt-1">
        <div
          className="bg-[var(--accent)] h-full transition-all duration-500"
          style={{ width: `${strikerPct}%` }}
        />
        <div
          className="bg-[var(--text-muted)] opacity-40 h-full transition-all duration-500"
          style={{ width: `${nonStrikerPct}%` }}
        />
      </div>

      {/* Player Breakdown */}
      <div className="flex justify-between items-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mt-1">
        <div className="flex gap-1.5 items-center">
          <span className="text-[var(--accent)]">{strikerRuns}</span>
          <span className="text-[var(--text-muted)] truncate max-w-[90px] sm:max-w-[140px]">
            {strikerStats.name}
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[var(--text-muted)] truncate max-w-[90px] sm:max-w-[140px] text-right">
            {nonStrikerStats.name}
          </span>
          <span className="text-[var(--foreground)] opacity-70">
            {nonStrikerRuns}
          </span>
        </div>
      </div>
    </div>
  );
}
