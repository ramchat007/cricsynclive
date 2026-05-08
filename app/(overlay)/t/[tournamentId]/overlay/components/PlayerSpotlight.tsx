"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Target } from "lucide-react";

export default function PlayerSpotlight({
  playerId,
  matchId,
}: {
  playerId: string;
  matchId: string;
}) {
  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState<any>({ type: "none" });

  useEffect(() => {
    if (!playerId || !matchId) return;

    const fetchSpotlightData = async () => {
      // 1. Fetch Player Profile WITH Team Color
      const { data: pData } = await supabase
        .from("players")
        .select("*, teams(primary_color)")
        .eq("id", playerId)
        .single();

      if (pData) setPlayer(pData);

      // 2. Fetch Live Match State to see what they are doing
      const { data: mData } = await supabase
        .from("matches")
        .select("live_striker_id, live_non_striker_id, live_bowler_id")
        .eq("id", matchId)
        .single();

      // 3. Fetch Deliveries for Stats calculation
      const { data: dData } = await supabase
        .from("deliveries")
        .select("*")
        .eq("match_id", matchId);
      const deliveries = dData || [];

      if (
        mData?.live_striker_id === playerId ||
        mData?.live_non_striker_id === playerId
      ) {
        // Calculate Batting Stats accurately
        const faced = deliveries.filter((d) => d.striker_id === playerId);
        const runs = faced.reduce(
          (acc, d) => acc + (Number(d.runs_off_bat) || 0),
          0,
        );
        const balls = faced.filter(
          (d) => d.extras_type !== "wd" && d.extras_type !== "wide",
        ).length;
        const fours = faced.filter((d) => Number(d.runs_off_bat) === 4).length;
        const sixes = faced.filter((d) => Number(d.runs_off_bat) === 6).length;
        const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";
        setStats({ type: "batting", runs, balls, fours, sixes, sr });
      } else if (mData?.live_bowler_id === playerId) {
        // Calculate Bowling Stats accurately
        const bowled = deliveries.filter((d) => d.bowler_id === playerId);
        const legalBalls = bowled.filter(
          (d) =>
            d.extras_type !== "wd" &&
            d.extras_type !== "wide" &&
            d.extras_type !== "nb" &&
            d.extras_type !== "no-ball" &&
            d.extras_type !== "penalty",
        ).length;

        // Exclude Byes and Leg-Byes from Bowler's runs
        const runsGiven = bowled
          .filter(
            (d) =>
              d.extras_type !== "bye" &&
              d.extras_type !== "leg-bye" &&
              d.extras_type !== "penalty",
          )
          .reduce(
            (acc, d) =>
              acc +
              (Number(d.runs_off_bat) || 0) +
              (Number(d.extras_runs) || 0),
            0,
          );

        // Run-outs don't belong to the bowler!
        const wickets = bowled.filter(
          (d) => d.is_wicket && d.wicket_type !== "run-out",
        ).length;

        const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
        const econ =
          legalBalls > 0 ? ((runsGiven / legalBalls) * 6).toFixed(1) : "0.0";
        setStats({ type: "bowling", overs, runs: runsGiven, wickets, econ });
      }
    };

    fetchSpotlightData();
  }, [playerId, matchId]);

  if (!player) return null;

  // Extract Dynamic Color and Photo
  const teamColor = player.teams?.primary_color || "#06b6d4"; // Fallback to cyan
  const photoUrl = player.photo_url || player.profile_url;

  return (
    <div
      className="flex bg-slate-900 border-[3px] rounded-2xl min-w-[450px] overflow-hidden"
      style={{
        backgroundColor: "#0f172a", // Forced dark slate background
        borderColor: teamColor,
        boxShadow: `0 0 30px ${teamColor}66`,
        animation:
          "slide-in-left 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      }}>
      {/* Player Photo / Avatar */}
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

      {/* Details & Stats */}
      <div className="flex-1 p-5 flex flex-col justify-center">
        <h3
          className="font-black tracking-[0.3em] uppercase text-[12px] flex items-center gap-1 mb-1"
          style={{ color: teamColor }}>
          <Target size={12} /> Player Spotlight
        </h3>
        <h2
          className="text-white font-black text-2xl uppercase tracking-tight leading-none mb-1 drop-shadow-md"
          style={{ color: teamColor }}>
          {player.full_name}
        </h2>
        <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">
          {player.player_role || player.role || "Player"}
        </p>

        {/* Dynamic Stat Grid */}
        {stats.type === "batting" && (
          <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Runs
              </div>
              <div className="text-xl text-white font-black">{stats.runs}</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Balls
              </div>
              <div className="text-xl text-white font-black">{stats.balls}</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                4s/6s
              </div>
              <div className="text-xl font-black" style={{ color: teamColor }}>
                {stats.fours}/{stats.sixes}
              </div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                SR
              </div>
              <div className="text-xl text-white font-black">{stats.sr}</div>
            </div>
          </div>
        )}

        {stats.type === "bowling" && (
          <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Overs
              </div>
              <div className="text-xl text-white font-black">{stats.overs}</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Runs
              </div>
              <div className="text-xl text-white font-black">{stats.runs}</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Wickets
              </div>
              <div className="text-xl text-rose-500 font-black">
                {stats.wickets}
              </div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Econ
              </div>
              <div className="text-xl text-white font-black">{stats.econ}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
