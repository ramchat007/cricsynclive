"use client";
import React from "react";

export default function Partnership({ matchData, deliveries = [] }: any) {
  if (!matchData || !deliveries.length) return null;

  // 1. Get balls for the current innings
  const currentInningsBalls = deliveries.filter(
    (d: any) => d.innings === matchData.current_innings,
  );

  // 2. Identify the partnership window (from the latest ball back to the last wicket)
  let partnershipBalls: any[] = [];
  for (let i = currentInningsBalls.length - 1; i >= 0; i--) {
    if (currentInningsBalls[i].is_wicket) break;
    partnershipBalls.unshift(currentInningsBalls[i]); // Keep chronological order
  }

  // 3. Initialize Stats
  let totalRuns = 0;
  let totalBalls = 0;

  // We use a Map to track the two specific batsmen in this partnership
  const playerMap = new Map<
    string,
    { name: string; runs: number; balls: number }
  >();

  partnershipBalls.forEach((ball) => {
    const sId = ball.striker_id;
    const sName = ball.striker_name || "Batter";

    // Total partnership math
    totalRuns +=
      (Number(ball.runs_off_bat) || 0) + (Number(ball.extras_runs) || 0);
    if (ball.extras_type !== "wd") totalBalls++;

    // Individual contribution math
    if (!playerMap.has(sId)) {
      playerMap.set(sId, { name: sName, runs: 0, balls: 0 });
    }

    const stats = playerMap.get(sId)!;
    stats.runs += Number(ball.runs_off_bat) || 0;
    if (ball.extras_type !== "wd") stats.balls++;
  });

  // Convert map to array for rendering (usually exactly 2 players)
  const contributors = Array.from(playerMap.values());

  return (
    <div className="bg-slate-950/90 border-t-4 border-teal-500 px-10 py-4 rounded-t-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-12 animate-in slide-in-from-bottom-10">
      {/* TOTAL SECTION */}
      <div className="flex flex-col border-r border-white/10 pr-10">
        <span className="text-teal-400 font-black uppercase tracking-[0.2em] text-[10px] mb-1">
          Partnership
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-black text-4xl">{totalRuns}</span>
          <span className="text-white/40 font-bold text-sm uppercase">
            Runs
          </span>
          <span className="text-white/20 font-medium text-xs ml-1">
            ({totalBalls} b)
          </span>
        </div>
      </div>

      {/* INDIVIDUAL BREAKDOWN SECTION */}
      <div className="flex gap-10">
        {contributors.map((player, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-white/40 font-black uppercase tracking-widest text-[9px] mb-1">
              Batter {idx + 1}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-white font-black uppercase text-lg tracking-tight">
                {player.name}
              </span>
              <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-teal-400 font-black text-lg">
                  {player.runs}
                </span>
                <span className="text-white/30 font-bold text-xs ml-1">
                  ({player.balls})
                </span>
              </div>
            </div>
          </div>
        ))}

        {contributors.map((player, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-white/40 font-black uppercase tracking-widest text-[9px] mb-1">
              Batter 2 {idx + 1}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-white font-black uppercase text-lg tracking-tight">
                {player.name}
              </span>
              <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-teal-400 font-black text-lg">
                  {player.runs}
                </span>
                <span className="text-white/30 font-bold text-xs ml-1">
                  ({player.balls})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
