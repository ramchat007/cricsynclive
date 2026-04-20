"use client";
import React, { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

const getInitials = (n: string) =>
  n
    ? n
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 3)
    : "T";

export default function ScoreTicker({
  overlayData,
  liveMatch,
}: {
  overlayData: any;
  liveMatch: any;
}) {
  const [scoreAnim, setScoreAnim] = useState(false);
  const [eventTrigger, setEventTrigger] = useState<string | null>(null);
  const prevScoreRef = useRef(0);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [players, setPlayers] = useState<any>({});

  useEffect(() => {
    if (!liveMatch?.id) return;
    const fetchLiveStats = async () => {
      const pIds = [
        liveMatch.live_striker_id,
        liveMatch.live_non_striker_id,
        liveMatch.live_bowler_id,
      ].filter(Boolean);
      if (pIds.length > 0) {
        const { data: p } = await supabase
          .from("players")
          .select("id, full_name")
          .in("id", pIds);
        setPlayers(
          p?.reduce((a, v) => ({ ...a, [v.id]: v.full_name }), {}) || {},
        );
      }
      const { data: d } = await supabase
        .from("deliveries")
        .select("*")
        .eq("match_id", liveMatch.id)
        .eq("innings", liveMatch.current_innings)
        .order("created_at", { ascending: true });
      setDeliveries(d || []);
    };
    fetchLiveStats();

    const sub = supabase
      .channel(`del_${liveMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deliveries",
          filter: `match_id=eq.${liveMatch.id}`,
        },
        (p) => setDeliveries((prev) => [...prev, p.new]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [liveMatch?.id, liveMatch?.current_innings]);

  useEffect(() => {
    if (overlayData?.event && overlayData?.eventTime) {
      setEventTrigger(overlayData.event);
      const timer = setTimeout(() => setEventTrigger(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [overlayData?.event, overlayData?.eventTime]);

  // 🔥 RESTORED CORRECT BATTING LOGIC
  const isFirstInnings = Number(liveMatch.current_innings) === 1;
  const t1HasData =
    Number(liveMatch.team1_runs) > 0 || Number(liveMatch.team1_balls) > 0;
  const t2HasData =
    Number(liveMatch.team2_runs) > 0 || Number(liveMatch.team2_balls) > 0;

  let t1IsBattingNow = true;
  if (isFirstInnings) {
    t1IsBattingNow = t2HasData && !t1HasData ? false : true;
    if (!t1HasData && !t2HasData) {
      const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
      t1IsBattingNow = String(liveMatch.toss_decision).includes("bat")
        ? t1Won
        : !t1Won;
    }
  } else {
    // 2nd innings logic: whoever DIDN'T bat first
    const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
    const t1BattedFirst = String(liveMatch.toss_decision).includes("bat")
      ? t1Won
      : !t1Won;
    t1IsBattingNow = !t1BattedFirst;
  }

  const score = t1IsBattingNow
    ? Number(liveMatch.team1_runs) || 0
    : Number(liveMatch.team2_runs) || 0;
  const wickets = t1IsBattingNow
    ? Number(liveMatch.team1_wickets) || 0
    : Number(liveMatch.team2_wickets) || 0;
  const totalBalls = t1IsBattingNow
    ? Number(liveMatch.team1_balls) || 0
    : Number(liveMatch.team2_balls) || 0;
  const displayOvers = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

  const batObj = t1IsBattingNow ? liveMatch.team1 : liveMatch.team2;
  const bowlObj = t1IsBattingNow ? liveMatch.team2 : liveMatch.team1;

  // 🔥 MATH LOGIC FIXED (PREVENTS NO VALUES)
  const totalMatchBalls = (Number(liveMatch.overs_count) || 20) * 6;
  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(2) : "0.00";
  const target = isFirstInnings
    ? null
    : t1IsBattingNow
      ? (Number(liveMatch.team2_runs) || 0) + 1
      : (Number(liveMatch.team1_runs) || 0) + 1;

  let rrrVal = "0.00";
  let equationStr = "MATCH IN PROGRESS";
  let projScoreStr = "0";
  if (!isFirstInnings && target) {
    const runsNeeded = target - score;
    const ballsRemaining = totalMatchBalls - totalBalls;
    rrrVal =
      ballsRemaining > 0
        ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
        : "0.00";
    equationStr =
      runsNeeded <= 0
        ? "SCORES LEVEL"
        : `NEED ${runsNeeded} IN ${ballsRemaining}`;
  } else {
    projScoreStr =
      totalBalls > 0
        ? Math.round((score / totalBalls) * totalMatchBalls).toString()
        : "0";
  }

  useEffect(() => {
    if (score > prevScoreRef.current) {
      setScoreAnim(true);
      setTimeout(() => setScoreAnim(false), 400);
      prevScoreRef.current = score;
    }
  }, [score]);

  return (
    <div className="w-full h-[120px] flex flex-col font-sans relative pointer-events-none drop-shadow-2xl">
      <style>{`
        @keyframes scorePop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); color: #fde047; } }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* JIO SLIDE-OVER */}
      <div
        className={`absolute inset-0 z-[60] flex items-center justify-center transition-transform duration-500 transform ${eventTrigger ? "translate-y-0" : "translate-y-full"} ${eventTrigger === "WICKET" ? "bg-rose-700" : eventTrigger === "SIX" ? "bg-amber-500" : "bg-emerald-600"}`}>
        <h2 className="text-7xl font-black italic uppercase text-white animate-pulse">
          {eventTrigger === "WICKET" ? "OUT!" : eventTrigger}
        </h2>
      </div>

      {/* TOP TABS */}
      <div className="absolute -top-[32px] w-full flex justify-between px-24 z-10">
        <span className="bg-slate-950/95 border border-white/20 rounded-t-xl px-6 py-1 text-sm font-black text-white uppercase">
          {batObj?.name}
        </span>
        <div className="bg-slate-950/95 border border-white/20 rounded-t-xl px-12 py-1 text-sm font-black text-white flex gap-4">
          <span className="text-amber-400">
            INN {liveMatch.current_innings}
          </span>
          <span className="text-white/40">|</span>
          <span className="text-cyan-400 truncate max-w-[400px]">
            {target
              ? `${batObj?.short_name} needs ${target - score} runs`
              : overlayData.tickerText || "Live Match"}
          </span>
        </div>
        <span className="bg-slate-950/95 border border-white/20 rounded-t-xl px-6 py-1 text-sm font-black text-white uppercase">
          {bowlObj?.name}
        </span>
      </div>

      {/* MAIN TICKER */}
      <div
        className="w-full h-full flex overflow-hidden border-t-[3px] border-white/30"
        style={{
          background: `linear-gradient(to right, ${batObj?.primary_color || "#1e40af"} 0%, #020617 25%, #020617 75%, ${bowlObj?.primary_color || "#991b1b"} 100%)`,
        }}>
        <div className="w-[180px] h-full flex items-center justify-center bg-black/40 border-r border-white/10 shrink-0">
          <img src={batObj?.logo_url} className="h-24 w-24 object-contain" />
        </div>

        <div className="w-[420px] h-full flex flex-col justify-center px-12 border-r border-white/10 bg-black/20 shrink-0">
          <span className="text-xs font-black text-white/40 uppercase mb-1 tracking-widest">
            {getInitials(batObj?.name)} VS {getInitials(bowlObj?.name)}
          </span>
          <div className="flex items-baseline gap-4">
            <span
              className={`text-[6.5rem] font-black font-mono leading-none tracking-tighter drop-shadow-lg ${scoreAnim ? "animate-[scorePop_0.4s_ease-out]" : "text-white"}`}>
              {score}
              <span className="text-5xl text-white/50">/{wickets}</span>
            </span>
            <span className="text-3xl font-bold text-white/40 italic">
              ({displayOvers})
            </span>
          </div>
        </div>

        <div className="w-[320px] h-full flex flex-col justify-center items-center px-4 bg-black/40 border-r border-white/10 shrink-0">
          {target ? (
            <div className="flex flex-col items-center">
              <div className="flex gap-4">
                <div className="text-center text-xs text-white/40">
                  Target
                  <p className="text-xl font-black text-white">{target}</p>
                </div>
                <div className="text-center text-xs text-white/40">
                  RRR
                  <p className="text-xl font-black text-amber-500">{rrrVal}</p>
                </div>
              </div>
              <p className="text-[10px] font-black text-amber-500 uppercase mt-1">
                {equationStr}
              </p>
            </div>
          ) : (
            <div className="flex gap-8">
              <div className="text-center text-xs text-white/40 uppercase">
                CRR<p className="text-3xl font-black text-white">{crr}</p>
              </div>
              <div className="text-center text-xs text-white/40 uppercase">
                Projected
                <p className="text-3xl font-black text-cyan-400">
                  {projScoreStr}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center px-12 justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-black text-amber-500 uppercase">
              Bowler
            </span>
            <span className="text-2xl font-bold text-white truncate max-w-[150px]">
              {players[liveMatch.live_bowler_id]?.split(" ").pop()}
            </span>
          </div>
          <div className="flex gap-2">
            {deliveries.slice(-6).map((b, i) => (
              <div
                key={i}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-sm animate-[popIn_0.3s_ease-out] ${b.is_wicket ? "bg-rose-600 border-rose-400" : b.runs_off_bat === 4 ? "bg-teal-500" : b.runs_off_bat === 6 ? "bg-amber-500" : "bg-white/10 border-white/20"}`}>
                {b.is_wicket ? "W" : b.runs_off_bat}
              </div>
            ))}
          </div>
        </div>

        <div className="w-[180px] flex items-center justify-center bg-black/40 border-l border-white/10 shrink-0">
          <img
            src={bowlObj?.logo_url}
            className="h-24 w-24 object-contain opacity-30 grayscale"
          />
        </div>
      </div>
    </div>
  );
}
