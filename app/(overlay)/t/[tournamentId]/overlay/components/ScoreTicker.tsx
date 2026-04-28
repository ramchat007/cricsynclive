"use client";
import React, { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [players, setPlayers] = useState<any>({});

  const prevBallRef = useRef<string | null>(null);
  const prevAnimBallRef = useRef<string | null>(null);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsertDelivery = (list: any[], delivery: any) => {
    const idx = list.findIndex((d) => d.id === delivery.id);
    if (idx === -1) return [...list, delivery];
    const next = [...list];
    next[idx] = delivery;
    return next;
  };

  // --------------------------------------------------------
  // 1. FETCH LIVE STATS & PLAYERS (Full Match Fetch)
  // --------------------------------------------------------
  useEffect(() => {
    if (!liveMatch?.id) return;

    const fetchLiveStats = async () => {
      const pIds = [
        liveMatch.live_striker_id,
        liveMatch.live_non_striker_id,
        liveMatch.live_bowler_id,
      ].filter(Boolean);

      if (pIds.length > 0) {
        const { data: pData } = await supabase
          .from("players")
          .select("id, full_name")
          .in("id", pIds);

        const pMap = pData?.reduce(
          (acc: any, p: any) => ({ ...acc, [p.id]: p.full_name }),
          {},
        );
        setPlayers(pMap || {});
      }

      // Fetch ALL deliveries for the match to remember 1st innings Target
      const { data: dData } = await supabase
        .from("deliveries")
        .select("*")
        .eq("match_id", liveMatch.id)
        .order("created_at", { ascending: true });

      if (dData && dData.length > 0) {
        const lastBall = dData[dData.length - 1];
        prevBallRef.current = lastBall.id;
        prevAnimBallRef.current = lastBall.id;
      }
      setDeliveries(dData || []);
    };

    fetchLiveStats();

    const sub = supabase
      .channel(`ticker_realtime_${liveMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
          filter: `match_id=eq.${liveMatch.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDeliveries((prev) => upsertDelivery(prev, payload.new));
          } else if (payload.eventType === "UPDATE") {
            setDeliveries((prev) => {
              const exists = prev.some((d) => d.id === payload.new.id);
              if (exists) {
                prevBallRef.current = null;
                prevAnimBallRef.current = null;
                return upsertDelivery(prev, payload.new);
              }
              return prev;
            });
          } else if (payload.eventType === "DELETE") {
            setDeliveries((prev) => {
              const exists = prev.some((d) => d.id === payload.old.id);
              if (exists) {
                prevBallRef.current = null;
                prevAnimBallRef.current = null;
                return prev.filter((d) => d.id !== payload.old.id);
              }
              return prev;
            });
          }
        },
      )
      .subscribe();

    return () => {
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      if (scoreAnimTimerRef.current) clearTimeout(scoreAnimTimerRef.current);
      supabase.removeChannel(sub);
    };
  }, [liveMatch?.id]);

  // --------------------------------------------------------
  // 2. SLIDE-OVER ANIMATION TRIGGER
  // --------------------------------------------------------
  const prevEventTimeRef = useRef<any>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (overlayData?.event && overlayData?.eventTime) {
      if (prevEventTimeRef.current === overlayData.eventTime) return;
      prevEventTimeRef.current = overlayData.eventTime;

      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      const validEvents = ["WICKET", "SIX", "FOUR"];
      if (validEvents.includes(overlayData.event.toUpperCase())) {
        setEventTrigger(overlayData.event.toUpperCase());
        const timer = setTimeout(() => {
          setEventTrigger(null);
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [overlayData?.event, overlayData?.eventTime]);

  useEffect(() => {
    if (!deliveries.length) return;
    const lastBall = deliveries[deliveries.length - 1];

    if (prevBallRef.current === lastBall.id) return;
    prevBallRef.current = lastBall.id;

    let event: string | null = null;
    const runs = Number(lastBall.runs_off_bat) || 0;

    if (lastBall.is_wicket) {
      event = "WICKET";
    } else if (runs === 6) {
      event = "SIX";
    } else if (runs === 4) {
      event = "FOUR";
    }

    if (event) {
      setEventTrigger(event);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      eventTimerRef.current = setTimeout(() => setEventTrigger(null), 2500);
    }
  }, [deliveries]);

  useEffect(() => {
    if (!deliveries.length) return;
    const lastBall = deliveries[deliveries.length - 1];
    if (prevAnimBallRef.current === lastBall.id) return;
    prevAnimBallRef.current = lastBall.id;

    if (lastBall.is_wicket || Number(lastBall.runs_off_bat) >= 4) {
      setScoreAnim(true);
      if (scoreAnimTimerRef.current) clearTimeout(scoreAnimTimerRef.current);
      scoreAnimTimerRef.current = setTimeout(() => setScoreAnim(false), 500);
    }
  }, [deliveries]);

  if (!liveMatch) return null;

  // --------------------------------------------------------
  // 3. ROCK-SOLID DATA PIPELINE (Deriving Score + Target)
  // --------------------------------------------------------
  const currentInnings = Number(liveMatch.current_innings) || 1;
  const isFirstInnings = currentInnings === 1;

  // Split deliveries by innings (normalize to number to avoid string/number mismatch)
  const currentInningsBalls = deliveries.filter(
    (d) => Number(d.innings) === currentInnings,
  );
  const firstInningsBalls = deliveries.filter((d) => Number(d.innings) === 1);

  // Live Score Math
  const score = currentInningsBalls.reduce(
    (acc, d) =>
      acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
    0,
  );
  const wickets = currentInningsBalls.filter((d) => d.is_wicket).length;
  const totalBalls = currentInningsBalls.filter((d) => {
    const type = (d.extras_type || "").toLowerCase();
    return (
      type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball"
    );
  }).length;
  const displayOvers = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

  // Live Target Math (Derived strictly from 1st innings deliveries)
  let calculatedTarget: number | null = null;
  if (!isFirstInnings && firstInningsBalls.length > 0) {
    const inn1Score = firstInningsBalls.reduce(
      (acc, d) =>
        acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
      0,
    );
    calculatedTarget = inn1Score + 1;
  }

  // Batting Team Math
  let team1IsBattingNow = true;
  if (
    currentInningsBalls.length > 0 &&
    (currentInningsBalls[0].batting_team_id || currentInningsBalls[0].team_id)
  ) {
    const activeTeamId =
      currentInningsBalls[0].batting_team_id || currentInningsBalls[0].team_id;
    team1IsBattingNow = String(activeTeamId) === String(liveMatch.team1_id);
  } else {
    const choseBat = String(liveMatch.toss_decision || "")
      .toLowerCase()
      .includes("bat");
    const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
    const t1BattedFirst = choseBat ? t1Won : !t1Won;
    team1IsBattingNow = isFirstInnings ? t1BattedFirst : !t1BattedFirst;
  }

  // --------------------------------------------------------
  // 4. BRANDING & COLORS
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 5. INDIVIDUAL STATS & STRINGS
  // --------------------------------------------------------
  const getBatsmanStats = (id: string) => {
    const d = currentInningsBalls.filter((b) => b.striker_id === id);
    return {
      runs: d.reduce((s, b) => s + (Number(b.runs_off_bat) || 0), 0),
      balls: d.filter((b) => {
        const type = (b.extras_type || "").toLowerCase();
        return type !== "wd" && type !== "wide";
      }).length,
    };
  };

  const getBowlerStats = (id: string) => {
    const d = currentInningsBalls.filter((b) => b.bowler_id === id);
    const bLegalBalls = d.filter((b) => {
      const type = (b.extras_type || "").toLowerCase();
      return (
        type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball"
      );
    }).length;
    return {
      runs: d.reduce(
        (s, b) =>
          s + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0),
        0,
      ),
      wickets: d.filter((b) => b.is_wicket).length,
      overs: `${Math.floor(bLegalBalls / 6)}.${bLegalBalls % 6}`,
      timeline: d.slice(-9),
    };
  };

  const strikerName =
    players[liveMatch.live_striker_id] ||
    liveMatch?.live_striker?.full_name ||
    "Striker";
  const nonStrikerName =
    players[liveMatch.live_non_striker_id] ||
    liveMatch?.live_non_striker?.full_name ||
    "Non-Striker";
  const bowlerName =
    players[liveMatch.live_bowler_id] ||
    liveMatch?.live_bowler?.full_name ||
    "Bowler";

  const sStats = getBatsmanStats(liveMatch.live_striker_id);
  const nsStats = getBatsmanStats(liveMatch.live_non_striker_id);
  const bStats = getBowlerStats(liveMatch.live_bowler_id);

  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(2) : "0.00";
  const totalMatchBalls = (Number(liveMatch.overs_count) || 20) * 6;

  let rrrVal = "0.00";
  let equationStr = "MATCH IN PROGRESS";
  let projScoreStr = "0";

  // The fixed Target logic applied perfectly
  if (!isFirstInnings && calculatedTarget) {
    const runsNeeded = calculatedTarget - score;
    const ballsRemaining = totalMatchBalls - totalBalls;

    if (runsNeeded <= 0) {
      equationStr = "SCORES LEVEL / WON";
    } else {
      rrrVal =
        ballsRemaining > 0
          ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
          : "0.00";
      equationStr = `NEED ${runsNeeded} runs in ${ballsRemaining} balls`;
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

  // --------------------------------------------------------
  // UI RENDER
  // --------------------------------------------------------
  return (
    <>
      <style>{`
          @keyframes slideUpFade { 0% { transform: translateY(100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
          .anim-entry { animation: slideUpFade 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes scorePop { 0% { transform: scale(1); color: white; text-shadow: none; } 30% { transform: scale(1.15); color: #fde047; text-shadow: 0 0 20px rgba(253, 224, 71, 0.8); } 100% { transform: scale(1); color: white; text-shadow: none; } }
          .animate-scorePop { animation: scorePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes pulseGlow { 0%, 100% { opacity: 0.7; transform: scale(0.9); filter: drop-shadow(0 0 2px rgba(251,191,36,0.5)); } 50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 10px rgba(251,191,36,1)); } }
          .animate-pulseGlow { animation: pulseGlow 1.5s ease-in-out infinite; }
          @keyframes popIn { 0% { transform: scale(0.3); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }@keyframes flash {0% { opacity: 0.8; } 100% { opacity: 0; }}
        `}</style>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1920px] h-[120px]">
        {/* EVENT OVERLAY */}
        <div
          className={`absolute inset-0 z-[60] flex items-center justify-center transition-all duration-500
            ${eventTrigger ? "opacity-100 scale-100" : "opacity-0 scale-125 pointer-events-none"}
          `}
        >
          <div
            className={`absolute inset-0 blur-2xl opacity-70
              ${
                eventTrigger === "WICKET"
                  ? "bg-red-600"
                  : eventTrigger === "SIX"
                    ? "bg-amber-400"
                    : "bg-emerald-500"
              }
            `}
          />

          <div className="absolute w-[600px] h-[300px] rounded-full border-[6px] border-white/20 animate-ping" />

          <h2
            className={`text-[90px] font-black italic uppercase tracking-tighter z-10
            ${
              eventTrigger === "WICKET"
                ? "text-red-500 drop-shadow-[0_0_40px_#ef4444]"
                : eventTrigger === "SIX"
                  ? "text-amber-300 drop-shadow-[0_0_40px_#fbbf24]"
                  : "text-emerald-300 drop-shadow-[0_0_40px_#10b981]"
            }
            animate-bounce`}
          >
            {eventTrigger === "WICKET"
              ? "WICKET!"
              : eventTrigger === "SIX"
                ? "SIX!"
                : eventTrigger === "FOUR"
                  ? "FOUR!"
                  : eventTrigger}
          </h2>

          <div className="absolute inset-0 bg-white opacity-0 animate-[flash_0.4s_ease-out]" />
        </div>

        {/* TOP TABS */}
        <div className="absolute -top-[32px] left-0 w-full flex justify-between items-end px-24 z-10">
          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-1 shadow-lg text-[13px] font-black uppercase text-white pb-1">
              {battingName}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-16 py-1 shadow-lg text-[12px] font-black uppercase text-white pb-1 min-w-0 max-w-[780px]">
            <span className="text-amber-400 shrink-0">
              {isFirstInnings ? "1st Innings" : "2nd Innings"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span className="drop-shadow-md min-w-0">
              {liveMatch.stage || "Live Match"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span className="text-cyan-400 drop-shadow-md min-w-0">
              {calculatedTarget
                ? `${battingName} ${equationStr}`
                : tossWinnerName
                  ? `${tossWinnerName} won toss, elected to ${liveMatch.toss_decision || "bat"}`
                  : "Live Action"}
            </span>
          </div>

          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-1 shadow-lg text-[13px] font-black uppercase text-white pb-1">
              {bowlingName}
            </span>
          </div>
        </div>

        {/* MAIN TICKER CONTAINER */}
        <div
          className="w-full h-full flex relative overflow-hidden border-t-[3px] border-white/20 shadow-2xl"
          style={{
            background: `linear-gradient(90deg,
              ${battingColor} 0%,
              ${battingColor} 18%,
              rgba(10, 10, 15, 0.98) 40%,
              rgba(10, 10, 15, 0.98) 60%,
              ${bowlingColor} 82%,
              ${bowlingColor} 100%)`,
          }}
        >
          <div
            className="absolute inset-y-0 left-0 w-[45%] pointer-events-none mix-blend-screen"
            style={{
              background: `linear-gradient(90deg, ${battingColor} 0%, transparent 100%)`,
              opacity: 0.3,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-[45%] pointer-events-none mix-blend-screen"
            style={{
              background: `linear-gradient(270deg, ${bowlingColor} 0%, transparent 100%)`,
              opacity: 0.3,
            }}
          />

          <div className="relative z-10 w-full flex h-full bg-black/30 backdrop-blur-sm">
            {/* 1. BATTING LOGO */}
            <div className="w-[180px] h-full shrink-0 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <img
                src={battingLogo}
                className="w-[85px] h-[85px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10"
                alt="Batting Team"
              />
            </div>

            {/* 2. SCORE COLUMN */}
            <div className="w-[430px] h-full flex flex-col justify-center shrink-0 relative border-r border-white/10">
              <div className="text-white text-[13px] font-black tracking-[0.25em] uppercase drop-shadow-md absolute top-2 left-8 right-8 opacity-90 ">
                {battingInitials}{" "}
                <span className="text-white/40 mx-2 text-[11px]">VS</span>{" "}
                {bowlingInitials}
              </div>

              <div className="flex items-end gap-5 px-8 pt-6">
                <span
                  className={`min-w-[210px] flex items-end whitespace-nowrap font-mono text-[4.5rem] font-black leading-none drop-shadow-lg tracking-tighter origin-left ${scoreAnim ? "animate-scorePop" : "text-white"}`}
                >
                  <span>{score}</span>
                  <span className="text-[2.5rem] text-white/80">
                    /{wickets}
                  </span>
                </span>

                <span className="flex-none min-w-[90px] text-center font-bold text-xl text-white/90 leading-none drop-shadow-md bg-white/5 px-4 py-1.5 rounded border border-white/10">
                  {displayOvers}{" "}
                  <span className="text-base font-normal text-white/50 ml-1">
                    Ov
                  </span>
                </span>
              </div>

              <div className="text-[11px] text-amber-400 font-bold uppercase mt-1 drop-shadow-sm px-8">
                {scoreContextText}
              </div>
            </div>

            {/* 3. BATSMEN COLUMN */}
            <div className="w-[450px] h-full flex flex-col justify-center px-12 shrink-0 text-white border-r border-white/10">
              <div className="flex justify-between items-end font-bold">
                <span className="pr-3 flex items-center gap-2 text-xl drop-shadow-md min-w-0">
                  <span className="truncate max-w-[200px]">{strikerName}</span>
                  <Zap
                    size={18}
                    className="text-amber-400 fill-amber-400 animate-pulseGlow shrink-0"
                  />
                </span>
                <span className="font-mono text-3xl font-black drop-shadow-md leading-none shrink-0">
                  {sStats.runs}
                  <span className="text-lg font-sans font-bold text-white/60 ml-2">
                    ({sStats.balls})
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-end mt-2 text-white/70">
                <span className="pr-3 text-lg drop-shadow-md min-w-0 truncate max-w-[200px]">
                  {nonStrikerName}
                </span>
                <span className="font-mono text-2xl font-bold drop-shadow-md leading-none shrink-0">
                  {nsStats.runs}
                  <span className="text-base font-sans text-white/50 ml-2">
                    ({nsStats.balls})
                  </span>
                </span>
              </div>
            </div>

            {/* 4. CENTER MATH BOX */}
            <div className="w-[320px] h-full flex flex-col justify-center items-center px-4 shrink-0 border-r border-white/10">
              {calculatedTarget ? (
                <>
                  <div className="flex w-full justify-between items-center px-6 mb-2">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white/40 uppercase mb-1">
                        Target
                      </div>
                      <div className="text-lg font-black text-white">
                        {calculatedTarget}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-white/20"></div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white/40 uppercase mb-1">
                        CRR
                      </div>
                      <div className="text-lg font-black text-white">{crr}</div>
                    </div>
                    <div className="h-6 w-px bg-white/20"></div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-amber-500/60 uppercase mb-1">
                        RRR
                      </div>
                      <div className="text-lg font-black text-amber-400">
                        {rrrVal}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-1 rounded text-amber-400 font-black text-[11px] uppercase drop-shadow-md tracking-wider">
                    {equationStr}
                  </div>
                </>
              ) : (
                <div className="flex w-full justify-center gap-12 items-center">
                  <div className="text-center">
                    <div className="text-xs font-black text-white/40 uppercase mb-1">
                      CRR
                    </div>
                    <div className="text-2xl font-black text-white drop-shadow-md">
                      {crr}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-xs font-black text-cyan-500/60 uppercase mb-1">
                      Projected
                    </div>
                    <div className="text-2xl font-black text-cyan-400 drop-shadow-md">
                      {projScoreStr}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. BOWLER TIMELINE */}
            <div className="flex-1 h-full flex flex-col justify-center px-8 overflow-hidden">
              <div className="flex justify-between items-end mb-2 w-full min-w-0">
                <span className="font-bold text-white text-xl pr-4 drop-shadow-md min-w-0 truncate">
                  {bowlerName}
                </span>
                <span className="font-mono text-2xl text-white font-black shrink-0 drop-shadow-md leading-none">
                  {bStats.wickets}-{bStats.runs}
                  <span className="text-lg font-sans font-normal text-white/70 ml-2">
                    ({bStats.overs})
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-start gap-2 overflow-hidden w-full py-1">
                {bStats.timeline.map((b: any, i: number) => {
                  let bText =
                    Number(b.runs_off_bat) === 0 && !b.extras_runs
                      ? "•"
                      : b.runs_off_bat;
                  let bCls = "bg-white/10 border-white/20 text-white";

                  if (b.is_wicket) {
                    bText = "W";
                    bCls =
                      "bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_#ef4444]";
                  } else if (b.extras_type) {
                    bText = `${Number(b.runs_off_bat) > 0 ? b.runs_off_bat : ""}${b.extras_type}`;
                    bCls = "bg-indigo-600 border-indigo-400 text-white";
                  } else if (Number(b.runs_off_bat) === 4) {
                    bCls =
                      "bg-teal-400 border-teal-200 text-slate-900 shadow-[0_0_10px_#2dd4bf]";
                  } else if (Number(b.runs_off_bat) === 6) {
                    bCls =
                      "bg-amber-400 border-amber-200 text-slate-900 shadow-[0_0_10px_#fbbf24]";
                  }

                  return (
                    <div
                      key={b.id || i}
                      className={`w-9 h-9 border-2 rounded-full shrink-0 flex items-center justify-center font-black ${bCls} text-base uppercase opacity-0`}
                      style={{
                        animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    >
                      {bText}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. BOWLING LOGO */}
            <div className="w-[180px] h-full shrink-0 flex items-center justify-center border-l border-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-transparent" />
              <img
                src={bowlingLogo}
                className="w-[85px] h-[85px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10"
                alt="Bowling Team"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
