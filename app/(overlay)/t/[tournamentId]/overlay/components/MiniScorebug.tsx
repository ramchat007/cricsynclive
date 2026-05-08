"use client";
import React from "react";

export default function MiniScorebug({ matchData, deliveries = [] }: any) {
  if (!matchData) return null;

  // 1. ROBUST BATTING TEAM LOGIC
  const choseBat = String(matchData.toss_decision || "")
    .toLowerCase()
    .includes("bat");
  const t1Won = matchData.toss_winner_id === matchData.team1_id;
  const t1BattedFirst = choseBat ? t1Won : !t1Won;

  const currentInnings = Number(matchData.current_innings) || 1;
  const isT1Batting = currentInnings === 1 ? t1BattedFirst : !t1BattedFirst;

  const battingTeam = isT1Batting ? matchData.team1 : matchData.team2;
  const battingTeamColor = battingTeam?.primary_color || "#fbbf24"; // Fallback to amber
  const teamShortName = battingTeam?.short_name || "BAT";

  // 2. ISOLATE CURRENT INNINGS DELIVERIES
  const currentInningsBalls = deliveries.filter(
    (d: any) => Number(d.innings) === currentInnings,
  );

  // 3. ACCURATE STAT CALCULATIONS
  const runs = currentInningsBalls.reduce(
    (acc: number, d: any) =>
      acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
    0,
  );

  const wickets = currentInningsBalls.filter((d: any) => d.is_wicket).length;

  const totalValidBalls = currentInningsBalls.filter((d: any) => {
    const type = String(d.extras_type || "").toLowerCase();
    return (
      type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball"
    );
  }).length;

  const overs = `${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`;

  return (
    <div
      className="bg-slate-950/95 backdrop-blur-md rounded-2xl overflow-hidden flex shadow-2xl border border-white/10"
      style={{
        animation: "slide-in 0.5s ease-out forwards",
        boxShadow: `0 10px 40px ${battingTeamColor}30`, // Subtle glow of team color
      }}>
      {/* Team Box with Dynamic Background */}
      <div
        className="px-5 py-3 flex items-center justify-center font-black text-white uppercase tracking-widest text-xl drop-shadow-md"
        style={{ backgroundColor: battingTeamColor }}>
        {teamShortName}
      </div>

      {/* Score Box */}
      <div
        className="px-6 py-3 bg-slate-950 flex items-center gap-5 border-l-4"
        style={{ borderLeftColor: battingTeamColor }}>
        <span className="text-white font-mono font-black text-4xl leading-none drop-shadow-sm">
          {runs}
          <span className="text-2xl text-white/60">/{wickets}</span>
        </span>
        <div className="flex flex-col justify-center">
          <span className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none mb-1">
            Overs
          </span>
          <span className="text-white font-bold text-lg leading-none tabular-nums tracking-wider">
            {overs}
          </span>
        </div>
      </div>
    </div>
  );
}
