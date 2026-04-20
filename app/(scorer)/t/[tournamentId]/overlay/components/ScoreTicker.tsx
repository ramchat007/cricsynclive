"use client";
import React, { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { log } from "console";

const getInitials = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 3).toUpperCase();
};

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

  // Inside ScoreTicker component
  useEffect(() => {
    if (!liveMatch?.id) return;

    // 1. Initial Load
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

    // 2. 🔥 INSTANT TIMELINE SYNC
    const deliverySub = supabase
      .channel(`instant_balls_${liveMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deliveries",
          filter: `match_id=eq.${liveMatch.id}`,
        },
        (payload) => {
          // Add the new ball to the timeline instantly
          setDeliveries((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliverySub);
    };
  }, [liveMatch?.id, liveMatch?.current_innings]);

  // 2. SLIDE-OVER ANIMATION TRIGGER
  useEffect(() => {
    if (overlayData?.event && overlayData?.eventTime) {
      setEventTrigger(overlayData.event);
      const timer = setTimeout(() => setEventTrigger(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [overlayData?.event, overlayData?.eventTime]);

  if (!liveMatch) return null;

  console.log(liveMatch);

  // 3. ROCK-SOLID DATA PIPELINE (Restored exact working logic)
  const isFirstInnings = Number(liveMatch.current_innings) === 1;

  // Checking where the data actually is prevents the teams from swapping
  const team1HasData =
    Number(liveMatch.team1_runs) > 0 || Number(liveMatch.team1_balls) > 0;
  const team2HasData =
    Number(liveMatch.team2_runs) > 0 || Number(liveMatch.team2_balls) > 0;

  let team1IsBattingNow = true;

  if (isFirstInnings) {
    if (team2HasData && !team1HasData) {
      team1IsBattingNow = false;
    } else if (team1HasData) {
      team1IsBattingNow = true;
    } else {
      const choseBat = String(liveMatch.toss_decision)
        .toLowerCase()
        .includes("bat");
      const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
      team1IsBattingNow = choseBat ? t1Won : !t1Won;
    }
  } else {
    // 2nd Innings Logic
    const choseBat = String(liveMatch.toss_decision)
      .toLowerCase()
      .includes("bat");
    const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
    const t1BattedFirst = choseBat ? t1Won : !t1Won;
    team1IsBattingNow = !t1BattedFirst;
  }

  const score = team1IsBattingNow
    ? Number(liveMatch.team1_runs) || 0
    : Number(liveMatch.team2_runs) || 0;
  const wickets = team1IsBattingNow
    ? Number(liveMatch.team1_wickets) || 0
    : Number(liveMatch.team2_wickets) || 0;
  const totalBalls = team1IsBattingNow
    ? Number(liveMatch.team1_balls) || 0
    : Number(liveMatch.team2_balls) || 0;

  const displayOvers = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

  // 4. BRANDING & COLORS (Batting Left, Bowling Right)
  const battingTeamObj = team1IsBattingNow ? liveMatch.team1 : liveMatch.team2;
  const bowlingTeamObj = team1IsBattingNow ? liveMatch.team2 : liveMatch.team1;

  const battingName = battingTeamObj?.name || "Team 1";
  const bowlingName = bowlingTeamObj?.name || "Team 2";
  const battingInitials = getInitials(
    battingTeamObj?.short_name || battingName,
  );
  const bowlingInitials = getInitials(
    bowlingTeamObj?.short_name || bowlingName,
  );

  const battingLogo = battingTeamObj?.logo_url || "/default-logo.png";
  const bowlingLogo = bowlingTeamObj?.logo_url || "/default-logo.png";
  const battingColor = battingTeamObj?.primary_color || "#0284c7";
  const bowlingColor = bowlingTeamObj?.primary_color || "#e11d48";

  // 5. SCORE POP ANIMATION
  useEffect(() => {
    if (score > prevScoreRef.current) {
      setScoreAnim(true);
      const timer = setTimeout(() => setScoreAnim(false), 400);
      prevScoreRef.current = score;
      return () => clearTimeout(timer);
    }
  }, [score]);

  // 6. INDIVIDUAL STATS
  const getBatsmanStats = (id: string) => {
    const d = deliveries.filter((b) => b.striker_id === id);
    return {
      runs: d.reduce((s, b) => s + (Number(b.runs_off_bat) || 0), 0),
      balls: d.filter((b) => b.extras_type !== "wd").length,
    };
  };

  const getBowlerStats = (id: string) => {
    const d = deliveries.filter((b) => b.bowler_id === id);
    const bLegalBalls = d.filter(
      (b) => b.extras_type !== "wd" && b.extras_type !== "nb",
    ).length;
    return {
      runs: d.reduce(
        (s, b) =>
          s + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0),
        0,
      ),
      wickets: d.filter((b) => b.is_wicket).length,
      overs: `${Math.floor(bLegalBalls / 6)}.${bLegalBalls % 6}`,
      timeline: d.slice(-6),
    };
  };

  const strikerName = players[liveMatch.live_striker_id] || "Striker";
  const nonStrikerName =
    players[liveMatch.live_non_striker_id] || "Non-Striker";
  const bowlerName = players[liveMatch.live_bowler_id] || "Bowler";

  const sStats = getBatsmanStats(liveMatch.live_striker_id);
  const nsStats = getBatsmanStats(liveMatch.live_non_striker_id);
  const bStats = getBowlerStats(liveMatch.live_bowler_id);

  // 7. TARGET & MATH LOGIC
  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(2) : "0.00";
  const totalMatchBalls = (Number(liveMatch.overs_count) || 20) * 6;

  const target = isFirstInnings
    ? null
    : team1IsBattingNow
      ? (Number(liveMatch.team2_runs) || 0) + 1
      : (Number(liveMatch.team1_runs) || 0) + 1;

  let rrrVal = "0.00";
  let equationStr = "MATCH IN PROGRESS";
  let projScoreStr = "0";

  if (!isFirstInnings && target) {
    const runsNeeded = target - score;
    const ballsRemaining = totalMatchBalls - totalBalls;

    if (runsNeeded <= 0) {
      equationStr = "SCORES LEVEL";
    } else if (ballsRemaining > 0) {
      rrrVal = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
      equationStr = `NEED ${runsNeeded} IN ${ballsRemaining}`;
    } else {
      equationStr = "INNINGS COMPLETE";
    }
  } else {
    projScoreStr =
      totalBalls > 0
        ? Math.round((score / totalBalls) * totalMatchBalls).toString()
        : "0";
  }

  const tossWinnerName =
    liveMatch.toss_winner_id === liveMatch.team1_id
      ? liveMatch.team1?.name
      : liveMatch.team2?.name;
  let scoreContextText = `${bowlingName} Bowling`;
  if (isFirstInnings && totalBalls < 12 && tossWinnerName) {
    scoreContextText = `${tossWinnerName} won toss, elected to ${liveMatch.toss_decision || "bat"}`;
  }

  return (
    <>
      <style>{`
          @keyframes slideUpFade { 0% { transform: translateY(100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
          .anim-entry { animation: slideUpFade 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes scorePop { 0% { transform: scale(1); color: white; text-shadow: none; } 30% { transform: scale(1.15); color: #fde047; text-shadow: 0 0 20px rgba(253, 224, 71, 0.8); } 100% { transform: scale(1); color: white; text-shadow: none; } }
          .animate-scorePop { animation: scorePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes pulseGlow { 0%, 100% { opacity: 0.7; transform: scale(0.9); filter: drop-shadow(0 0 2px rgba(251,191,36,0.5)); } 50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 10px rgba(251,191,36,1)); } }
          .animate-pulseGlow { animation: pulseGlow 1.5s ease-in-out infinite; }
          @keyframes popIn { 0% { transform: scale(0.3); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>

      {/* 🔴 EDG-TO-EDGE FLUSH CONTAINER 🔴 */}
      <div className="absolute bottom-0 left-0 w-full h-[120px] flex flex-col font-sans anim-entry z-50 pointer-events-none drop-shadow-2xl">
        {/* 🟢 JIO-STYLE OVERLAY ANIMATION 🟢 */}
        <div
          className={`absolute bottom-0 left-0 w-full h-full z-[60] flex items-center justify-center transition-all duration-500 transform
            ${eventTrigger ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
            ${eventTrigger === "WICKET" ? "bg-rose-700" : eventTrigger === "SIX" ? "bg-amber-500" : "bg-emerald-600"}
          `}>
          <h2 className="text-7xl font-black italic uppercase text-white animate-pulse tracking-tighter drop-shadow-2xl">
            {eventTrigger === "WICKET" ? "OUT!" : eventTrigger}
          </h2>
        </div>

        {/* --- TOP TABS (Info Layer) --- */}
        <div className="absolute -top-[32px] left-0 w-full flex justify-between items-end px-24 z-10">
          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-2 shadow-lg text-sm font-black uppercase tracking-widest text-white truncate pb-2">
              {battingName}
            </span>
          </div>

          <div className="flex items-center gap-8 bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-16 py-2 shadow-lg text-sm font-black uppercase tracking-widest text-white pb-2">
            <span className="text-amber-400">
              {isFirstInnings ? "1st Innings" : "2nd Innings"}
            </span>
            <span className="text-white/40">|</span>
            <span className="drop-shadow-md truncate">
              {liveMatch.stage || "Live Match"}
            </span>
            <span className="text-white/40">|</span>
            <span className="text-cyan-400 drop-shadow-md">
              {target
                ? `${battingName} needs ${target - score} runs`
                : tossWinnerName
                  ? `${tossWinnerName} won toss, elected to ${liveMatch.toss_decision || "bat"}`
                  : "Live Action"}
            </span>
          </div>

          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-2 shadow-lg text-sm font-black uppercase tracking-widest text-white truncate pb-2">
              {bowlingName}
            </span>
          </div>
        </div>

        {/* --- MAIN FULL-WIDTH TICKER --- */}
        <div
          className="w-full h-full flex relative overflow-hidden border-t-[3px] border-white/30 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
          style={{
            background: `linear-gradient(to right, ${battingColor} 0%, ${battingColor} 18%, rgba(2, 6, 23, 0.98) 35%, rgba(2, 6, 23, 0.98) 65%, ${bowlingColor} 82%, ${bowlingColor} 100%)`,
          }}>
          <div className="relative z-10 w-full flex h-full">
            {/* 1. BATTING LOGO - SQUARE FLUSH */}
            <div className="w-[180px] h-full shrink-0 flex items-center justify-center bg-black/40 border-r border-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <img
                src={battingLogo}
                className="w-[110px] h-[110px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10"
              />
            </div>

            {/* 2. SCORE COLUMN */}
            <div className="w-[380px] h-full flex flex-col justify-center border-r border-white/10 shrink-0 bg-black/30 backdrop-blur-sm relative">
              <div className="text-white text-sm font-black tracking-[0.25em] uppercase drop-shadow-md absolute top-3 left-10 opacity-90">
                {battingInitials}{" "}
                <span className="text-white/40 mx-2 text-xs">VS</span>{" "}
                {bowlingInitials}
              </div>

              <div className="flex items-baseline gap-4 px-10 mt-6">
                <span
                  className={`font-mono text-[6.2rem] font-black leading-none drop-shadow-lg tracking-tighter origin-left inline-block ${scoreAnim ? "animate-scorePop" : "text-white"}`}>
                  {score}
                  <span className="text-[4rem] text-white/80">/{wickets}</span>
                </span>
                <span className="font-bold text-3xl text-white/90 leading-none drop-shadow-md bg-black/50 px-4 py-2 rounded border border-white/20">
                  {displayOvers}{" "}
                  <span className="text-xl font-normal text-white/50 ml-1">
                    Ov
                  </span>
                </span>
              </div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-widest truncate mt-2 drop-shadow-sm px-10">
                {scoreContextText}
              </div>
            </div>

            {/* 3. BATSMEN COLUMN */}
            <div className="w-[450px] h-full flex flex-col justify-center px-12 border-r border-white/10 shrink-0 text-white bg-black/20 backdrop-blur-sm">
              <div className="flex justify-between items-end font-bold">
                <span className="truncate pr-3 flex items-center gap-3 text-3xl drop-shadow-md">
                  {strikerName.split(" ").pop()}{" "}
                  <Zap
                    size={22}
                    className="text-amber-400 fill-amber-400 animate-pulseGlow"
                  />
                </span>
                <span className="font-mono text-5xl font-black drop-shadow-md leading-none">
                  {sStats.runs}
                  <span className="text-2xl font-sans font-bold text-white/60 ml-2">
                    ({sStats.balls})
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-end mt-3 text-white/70">
                <span className="truncate pr-3 text-2xl drop-shadow-md">
                  {nonStrikerName.split(" ").pop()}
                </span>
                <span className="font-mono text-4xl font-bold drop-shadow-md leading-none">
                  {nsStats.runs}
                  <span className="text-xl font-sans text-white/50 ml-2">
                    ({nsStats.balls})
                  </span>
                </span>
              </div>
            </div>

            {/* 4. CENTER MATH BOX */}
            <div className="w-[320px] h-full flex flex-col justify-center items-center px-4 bg-black/60 border-r border-white/10 shrink-0 shadow-[inset_0_0_40px_rgba(0,0,0,1)] backdrop-blur-md">
              {target ? (
                <>
                  <div className="flex w-full justify-between items-center px-6 mb-2">
                    <div className="text-center">
                      <div className="text-xs font-black text-white/40 tracking-widest uppercase mb-1">
                        Target
                      </div>
                      <div className="text-2xl font-black text-white">
                        {target}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/20"></div>
                    <div className="text-center">
                      <div className="text-xs font-black text-white/40 tracking-widest uppercase mb-1">
                        CRR
                      </div>
                      <div className="text-2xl font-black text-white">
                        {crr}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/20"></div>
                    <div className="text-center">
                      <div className="text-xs font-black text-amber-500/60 tracking-widest uppercase mb-1">
                        RRR
                      </div>
                      <div className="text-2xl font-black text-amber-400">
                        {rrrVal}
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-1.5 rounded text-amber-400 font-black text-xs tracking-widest uppercase drop-shadow-md">
                    {equationStr}
                  </div>
                </>
              ) : (
                <div className="flex w-full justify-center gap-12 items-center">
                  <div className="text-center">
                    <div className="text-sm font-black text-white/40 tracking-widest uppercase mb-1">
                      CRR
                    </div>
                    <div className="text-4xl font-black text-white drop-shadow-md">
                      {crr}
                    </div>
                  </div>
                  <div className="h-14 w-px bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-sm font-black text-cyan-500/60 tracking-widest uppercase mb-1">
                      Projected
                    </div>
                    <div className="text-4xl font-black text-cyan-400 drop-shadow-md">
                      {projScoreStr}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. BOWLER & TIMELINE */}
            <div className="flex-1 h-full flex flex-col justify-center px-12 border-l border-white/10 overflow-hidden bg-black/10 backdrop-blur-sm">
              <div className="flex justify-between items-end mb-3 w-full">
                <span className="font-bold text-white text-3xl truncate pr-4 drop-shadow-md">
                  {bowlerName.split(" ").pop()}
                </span>
                <span className="font-mono text-4xl text-white font-black shrink-0 drop-shadow-md leading-none">
                  {bStats.wickets}-{bStats.runs}
                  <span className="text-2xl font-sans font-normal text-white/70 ml-2">
                    ({bStats.overs})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-start gap-3 overflow-hidden w-full py-1">
                {bStats.timeline.map((b: any, i: number) => {
                  let bText =
                    Number(b.runs_off_bat) === 0 && !b.extras_runs
                      ? "•"
                      : b.runs_off_bat;
                  let bCls = "bg-white/10 border-white/30 text-white";
                  if (b.is_wicket) {
                    bText = "W";
                    bCls =
                      "bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_#ef4444]";
                  } else if (b.extras_type) {
                    bText = `${Number(b.runs_off_bat) > 0 ? b.runs_off_bat : ""}${b.extras_type}`;
                    bCls = "bg-indigo-600 border-indigo-400 text-white";
                  } else if (Number(b.runs_off_bat) === 4) {
                    bCls =
                      "bg-teal-400 border-teal-200 text-slate-900 shadow-[0_0_15px_#2dd4bf]";
                  } else if (Number(b.runs_off_bat) === 6) {
                    bCls =
                      "bg-amber-400 border-amber-200 text-slate-900 shadow-[0_0_15px_#fbbf24]";
                  }

                  return (
                    <div
                      key={b.id || i}
                      className={`w-12 h-12 border-2 rounded-full shrink-0 flex items-center justify-center font-black ${bCls} text-xl uppercase opacity-0`}
                      style={{
                        animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                        animationDelay: `${i * 0.08}s`,
                      }}>
                      {bText}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. BOWLING LOGO - SQUARE FLUSH */}
            <div className="w-[180px] h-full shrink-0 flex items-center justify-center bg-black/40 border-l border-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-transparent" />
              <img
                src={bowlingLogo}
                className="w-[110px] h-[110px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
