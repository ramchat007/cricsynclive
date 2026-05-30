"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Target, Globe } from "lucide-react";

export default function PlayerSpotlight({
  playerId,
  matchId,
}: {
  playerId: string;
  matchId: string;
}) {
  const [player, setPlayer] = useState<any>(null);
  const [careerStats, setCareerStats] = useState<any>(null);

  useEffect(() => {
    if (!playerId || !matchId) return;

    const fetchSpotlightData = async () => {
      // 1. Fetch Player
      const { data: pData } = await supabase
        .from("players")
        .select("*, teams(primary_color)")
        .eq("id", playerId)
        .single();

      if (pData) setPlayer(pData);

      // 2. Fetch Master Stats
      const { data: cStats } = await supabase
        .from("global_career_stats")
        .select("*")
        .eq("player_id", playerId)
        .single();

      if (cStats) setCareerStats(cStats);
    };

    fetchSpotlightData();

    // 3. Real-Time Sync
    const spotlightChannel = supabase
      .channel(`spotlight_career_sync_${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
          filter: `match_id=eq.${matchId}`,
        },
        () => fetchSpotlightData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(spotlightChannel);
    };
  }, [playerId, matchId]);

  if (!player || !careerStats) return null;

  // --- BULLETPROOF DATA EXTRACTORS ---
  const safeRuns = careerStats.total_runs ?? "0";
  const safeFours = careerStats.total_fours ?? "0";
  const safeSixes = careerStats.total_sixes ?? "0";
  const safeSR = careerStats.career_strike_rate ?? "0.0";

  const safeWickets = careerStats.total_wickets ?? "0";
  const safeEcon = careerStats.career_economy ?? "0.0";
  const rawBalls = careerStats.legal_balls_bowled ?? 0;
  const safeOvers = `${Math.floor(rawBalls / 6)}.${rawBalls % 6}`;

  const teamColor = player.teams?.primary_color || "#06b6d4";
  const photoUrl = player.photo_url || player.profile_url;

  return (
    <div
      className="flex bg-slate-900 border-[3px] rounded-2xl min-w-[450px] overflow-hidden"
      style={{
        backgroundColor: "#0f172a",
        borderColor: teamColor,
        boxShadow: `0 0 30px ${teamColor}66`,
        animation:
          "slide-in-left 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      }}
    >
      {/* Player Photo Section */}
      <div className="w-[140px] bg-gradient-to-t from-slate-950 to-slate-800 flex items-end justify-center relative border-r border-slate-700 shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={player.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={80} className="text-slate-600 mb-4" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
      </div>

      {/* Details & Stacked Stats */}
      <div className="flex-1 p-5 flex flex-col justify-center">
        <h3
          className="font-black tracking-[0.3em] uppercase text-[10px] flex items-center gap-1.5 mb-1"
          style={{ color: teamColor }}
        >
          <Globe size={12} /> Career Record
        </h3>
        <h2
          className="text-white font-black text-2xl uppercase tracking-tight leading-none mb-1 drop-shadow-md"
          style={{ color: teamColor }}
        >
          {player.full_name}
        </h2>
        <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">
          {player.player_role || player.role || "Player"}
        </p>

        <div className="flex flex-col gap-2">
          {/* BATTING GRID */}
          <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                Runs
              </div>
              <div className="text-lg font-black">{safeRuns}</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                4s/6s
              </div>
              <div className="text-lg font-black">
                {safeFours}/{safeSixes}
              </div>
            </div>
            <div className="text-center border-l border-slate-800 col-span-2">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                Strike Rate
              </div>
              <div className="text-lg font-black">{safeSR}</div>
            </div>
          </div>

          {/* BOWLING GRID */}
          <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                Overs
              </div>
              <div className="text-lg text-rose-500 font-black">
                {safeOvers}
              </div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                Wickets
              </div>
              <div className="text-lg text-rose-500 font-black">
                {safeWickets}
              </div>
            </div>
            <div className="text-center border-l border-slate-800 col-span-2">
              <div className="text-[12px] text-slate-500 font-bold uppercase mb-0.5">
                Economy
              </div>
              <div className="text-lg text-rose-500 font-black">{safeEcon}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
