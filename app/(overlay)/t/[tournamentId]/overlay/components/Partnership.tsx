"use client";
import React from "react";
import { getBroadcastTheme } from "@/lib/themes";

export default function Partnership({
  matchData,
  deliveries = [],
  team1Squad = [],
  team2Squad = [],
  themeId,
}: any) {
  if (!matchData || !deliveries.length) return null;

  const currentInnings = Number(matchData.current_innings) || 1;
  const currentInningsBalls = deliveries.filter(
    (d: any) => Number(d.innings) === currentInnings,
  );
  if (!currentInningsBalls.length) return null;

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

  const buildBatterStats = (playerId: string | null, fallback: string) => {
    if (!playerId) return { name: fallback, runs: 0, balls: 0 };
    const faced = partnershipBalls.filter(
      (b: any) => String(b.striker_id) === String(playerId),
    );
    return {
      name: findName(playerId, fallback),
      // ✅ FIX: Include extras_runs like the total partnership does
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
  const theme = getBroadcastTheme(themeId);

  return (
    <div
      className="px-10 py-4 rounded-t-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-12 animate-in slide-in-from-bottom-10"
      style={{
        background: theme.tokens.panelBg,
        borderTop: `4px solid ${theme.tokens.accent}`,
      }}>
      <div className="flex flex-col border-r border-white/10 pr-10">
        <span
          className="font-black uppercase tracking-[0.2em] text-[10px] mb-1"
          style={{ color: theme.tokens.accent }}>
          Partnership
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-black text-4xl">{totalRuns}</span>
          <span className="text-white/40 font-bold text-sm uppercase">Runs</span>
          <span className="text-white/20 font-medium text-xs ml-1">
            ({totalBalls} b)
          </span>
        </div>
      </div>

      <div className="flex gap-10">
        {[
          { label: "Striker", ...strikerStats },
          { label: "Non-Striker", ...nonStrikerStats },
        ].map((player) => (
          <div key={player.label} className="flex flex-col">
            <span className="text-white/40 font-black uppercase tracking-widest text-[9px] mb-1">
              {player.label}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-white font-black uppercase text-lg tracking-tight">
                {player.name}
              </span>
              <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <span
                  className="font-black text-lg"
                  style={{ color: theme.tokens.accent }}>
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
