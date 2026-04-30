"use client";
import React, { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getBroadcastTheme } from "@/lib/themes";

const getInitials = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 3).toUpperCase();
};

const getExtraLabel = (ball: any) => {
  const rawType = String(ball?.extras_type || "").toLowerCase();
  const extrasRuns = Number(ball?.extras_runs) || 0;
  const typeMap: Record<string, string> = {
    wd: "WD",
    wide: "WD",
    nb: "NB",
    "no-ball": "NB",
    lb: "LB",
    legbye: "LB",
    b: "B",
    bye: "B",
  };
  const typeLabel = typeMap[rawType] || rawType.toUpperCase();
  return `${extrasRuns > 0 ? extrasRuns : ""}${typeLabel}`;
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
  const [currentMatch, setCurrentMatch] = useState(liveMatch);
  const selectedTheme = getBroadcastTheme(overlayData?.broadcastThemeId);

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
  // 1. FETCH LIVE STATS & PLAYERS
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

    const matchSub = supabase
      .channel(`ticker_match_monitor_${liveMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${liveMatch.id}`,
        },
        async (payload) => {
          const updatedMatch = payload.new;

          setCurrentMatch((prev: any) => ({
            ...prev,
            ...updatedMatch,
            team1: prev?.team1 || liveMatch.team1,
            team2: prev?.team2 || liveMatch.team2,
          }));

          const newPlayerIds = [
            updatedMatch.live_striker_id,
            updatedMatch.live_non_striker_id,
            updatedMatch.live_bowler_id,
          ].filter(Boolean);

          if (newPlayerIds.length > 0) {
            const { data: pData } = await supabase
              .from("players")
              .select("id, full_name")
              .in("id", newPlayerIds);

            if (pData) {
              setPlayers((prev: any) => {
                const updated = { ...prev };
                pData.forEach((p: any) => {
                  updated[p.id] = p.full_name;
                });
                return updated;
              });
            }
          }
        },
      )
      .subscribe();

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
      supabase.removeChannel(matchSub);
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

  const activeMatch = currentMatch || liveMatch;

  // --------------------------------------------------------
  // 3. ROCK-SOLID DATA PIPELINE
  // --------------------------------------------------------
  const currentInnings = Number(activeMatch.current_innings) || 1;
  const isFirstInnings = currentInnings === 1;

  const currentInningsBalls = deliveries.filter(
    (d) => Number(d.innings) === currentInnings,
  );
  const firstInningsBalls = deliveries.filter((d) => Number(d.innings) === 1);

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

  let calculatedTarget: number | null = null;
  if (!isFirstInnings && firstInningsBalls.length > 0) {
    const inn1Score = firstInningsBalls.reduce(
      (acc, d) =>
        acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
      0,
    );
    calculatedTarget = inn1Score + 1;
  }

  let team1IsBattingNow = true;
  if (
    currentInningsBalls.length > 0 &&
    (currentInningsBalls[0].batting_team_id || currentInningsBalls[0].team_id)
  ) {
    const activeTeamId =
      currentInningsBalls[0].batting_team_id || currentInningsBalls[0].team_id;
    team1IsBattingNow = String(activeTeamId) === String(activeMatch.team1_id);
  } else {
    const choseBat = String(activeMatch.toss_decision || "")
      .toLowerCase()
      .includes("bat");
    const t1Won = activeMatch.toss_winner_id === activeMatch.team1_id;
    const t1BattedFirst = choseBat ? t1Won : !t1Won;
    team1IsBattingNow = isFirstInnings ? t1BattedFirst : !t1BattedFirst;
  }

  // --------------------------------------------------------
  // 4. BRANDING & COLORS
  // --------------------------------------------------------
  const battingTeamObj = team1IsBattingNow
    ? activeMatch.team1
    : activeMatch.team2;
  const bowlingTeamObj = team1IsBattingNow
    ? activeMatch.team2
    : activeMatch.team1;

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
  // 5. INDIVIDUAL STATS
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

    let oversArray = [];
    let currentOver = [];
    let currentValid = 0;
    let totalValid = 0;

    // Group all balls into perfect overs
    for (const b of d) {
      currentOver.push(b);
      const type = (b.extras_type || "").toLowerCase();
      const isLegal =
        type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball";

      if (isLegal) {
        currentValid++;
        totalValid++;
      }

      // When an over hits 6 valid balls, save it and reset for the next over
      if (currentValid === 6) {
        oversArray.push(currentOver);
        currentOver = [];
        currentValid = 0;
      }
    }

    // Add any remaining balls in the currently unfinished over
    if (currentOver.length > 0) {
      oversArray.push(currentOver);
    }

    const timelineToDisplay =
      oversArray.length > 0 ? oversArray[oversArray.length - 1] : [];
    const completedOvers = Math.floor(totalValid / 6);
    const ballsInCurrentOver = totalValid % 6;

    return {
      runs: d.reduce(
        (s, b) =>
          s + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0),
        0,
      ),
      wickets: d.filter((b) => b.is_wicket).length,
      overs: `${completedOvers}.${ballsInCurrentOver}`,
      timeline: timelineToDisplay,
    };
  };

  const strikerName =
    players[activeMatch.live_striker_id] ||
    activeMatch?.live_striker?.full_name ||
    "Striker";
  const nonStrikerName =
    players[activeMatch.live_non_striker_id] ||
    activeMatch?.live_non_striker?.full_name ||
    "Non-Striker";
  const bowlerName =
    players[activeMatch.live_bowler_id] ||
    activeMatch?.live_bowler?.full_name ||
    "Bowler";

  const sStats = getBatsmanStats(activeMatch.live_striker_id);
  const nsStats = getBatsmanStats(activeMatch.live_non_striker_id);
  const bStats = getBowlerStats(activeMatch.live_bowler_id);

  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(2) : "0.00";
  const totalMatchBalls = (Number(activeMatch.overs_count) || 20) * 6;

  let rrrVal = "0.00";
  let equationStr = "MATCH IN PROGRESS";
  let projScoreStr = "0";

  if (!isFirstInnings && calculatedTarget) {
    const runsNeeded = calculatedTarget - score;
    const ballsRemaining = totalMatchBalls - totalBalls;

    if (runsNeeded <= 0) {
      // Batting team successfully chased the target
      equationStr = `${battingTeamObj?.short_name || battingName} WON`;
      rrrVal = "-";
    } else if (ballsRemaining <= 0 || activeMatch.status === "completed") {
      // Out of balls or match manually marked complete
      if (runsNeeded === 1 && ballsRemaining === 0) {
        equationStr = "MATCH TIED";
      } else {
        equationStr = `${bowlingTeamObj?.short_name || bowlingName} WON`;
      }
      rrrVal = "-";
    } else {
      // Normal live match calculation
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
    activeMatch.toss_winner_id === activeMatch.team1_id
      ? activeMatch.team1?.name
      : activeMatch.team2?.name;

  let scoreContextText = `${bowlingName} Bowling`;
  if (isFirstInnings && totalBalls < 12 && tossWinnerName) {
    scoreContextText = `${tossWinnerName} won toss, elected to ${activeMatch.toss_decision || "bat"}`;
  }

  // --------------------------------------------------------
  // UI RENDER
  // --------------------------------------------------------
  return (
    <>
      <style>{`
        /* 1. MAIN TICKER */
        @keyframes diagonalWipe { 
          0% { clip-path: polygon(100% -100px, 120% -100px, 100% 100%, 80% 100%); transform: translateX(80px); opacity: 0; } 
          100% { clip-path: polygon(0 -100px, 100% -100px, 100% 100%, 0% 100%); transform: translateX(0); opacity: 1; } 
        }
        .anim-entry { animation: diagonalWipe 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        
        /* 2. SCORE UPDATE */
        @keyframes scorePunch { 
          0% { transform: scale(1) translateZ(0); color: white; } 
          20% { transform: scale(1.25) translateZ(50px); color: #fde047; text-shadow: 0 10px 25px rgba(253, 224, 71, 0.9); } 
          100% { transform: scale(1) translateZ(0); color: white; } 
        }
        .animate-scorePop { animation: scorePunch 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        
        /* 3. BATTER PULSE */
        @keyframes heartbeat { 
          0%, 100% { transform: scale(0.95); opacity: 0.7; } 
          15%, 45% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 8px rgba(251,191,36,0.9)); } 
          30% { transform: scale(1); opacity: 0.8; }
        }
        .animate-pulseGlow { animation: heartbeat 1.2s ease-in-out infinite; }
        
        /* 4. TIMELINE BALLS */
        @keyframes shootIn { 
          0% { transform: translateX(30px) skewX(-15deg); opacity: 0; } 
          70% { transform: translateX(-5px) skewX(5deg); opacity: 1; } 
          100% { transform: translateX(0) skewX(0); opacity: 1; } 
        }

        /* ---------------------------------------------------- */
        /* 5. 🔥 NEW EVENT TRIGGERS (DIAMOND LAYER STYLE) 🔥    */
        /* ---------------------------------------------------- */
        
        /* The text slams down from a massive size and vibrates */
        @keyframes impactSlam {
          0% { transform: scale(4) rotate(-5deg); opacity: 0; filter: blur(10px); }
          15% { transform: scale(0.9) rotate(2deg); opacity: 1; filter: blur(0px); }
          25% { transform: scale(1.05) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1.2); }
        }
        .animate-impactSlam { animation: impactSlam 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        /* Solid Diamond Mask that aggressively reveals outward */
        @keyframes diamondMaskExpand {
          0% { clip-path: polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%); opacity: 1; }
          20% { opacity: 0.9; }
          100% { clip-path: polygon(50% -150%, 250% 50%, 50% 250%, -150% 50%); opacity: 0; }
        }
        .animate-diamondMask { animation: diamondMaskExpand 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Diamond borders that echo outward */
        @keyframes diamondOutline {
          0% { width: 0px; height: 0px; opacity: 1; border-width: 40px; transform: translate(-50%, -50%) rotate(45deg); }
          100% { width: 1800px; height: 1800px; opacity: 0; border-width: 0px; transform: translate(-50%, -50%) rotate(45deg); }
        }
        .animate-diamondOutline { animation: diamondOutline 0.7s ease-out forwards; }
        
        /* Fast camera flash/strobe to make it feel energetic */
        @keyframes strobeFlash { 
          0%, 10% { opacity: 0.8; } 
          5%, 15% { opacity: 0; } 
          100% { opacity: 0; } 
        }
          /* Smooth, centered parallelogram reveal */
        @keyframes angledReveal {
          0% { clip-path: polygon(50% 0, 50% 0, 50% 100%, 50% 100%); opacity: 0;}
          /* Changed opacity from 1 to 0.85 here 👇 */
          100% { clip-path: polygon(30px 0, 100% 0, calc(100% - 30px) 100%, 0% 100%); opacity: 0.75;}
        }
        .animate-angledReveal { animation: angledReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* Text tracking in from wide to narrow */
        @keyframes textTracking {
          0% { letter-spacing: 0.4em; opacity: 0; transform: scale(0.85); }
          100% { letter-spacing: 0.05em; opacity: 1; transform: scale(1); }
        }
        .animate-textTracking { animation: textTracking 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* Glossy light reflection sweep */
        @keyframes lightSweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        .animate-lightSweep { animation: lightSweep 1.5s ease-in-out infinite; }
      `}</style>

      {/* ✅ Added anim-entry to the main wrapper here */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1920px] h-[120px] anim-entry">
        {/* EVENT OVERLAY (Premium Broadcast Style) */}
        <div
          className={`absolute inset-0 z-[60] flex items-center justify-center transition-opacity duration-300 ${
            eventTrigger
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {eventTrigger && (
            <>
              {/* Sleek Angled Background */}
              <div
                className="absolute inset-0 animate-angledReveal backdrop-blur-md"
                style={{
                  background:
                    eventTrigger === "WICKET"
                      ? `linear-gradient(90deg, ${selectedTheme.tokens.danger} 0%, #991b1b 100%)`
                      : eventTrigger === "SIX"
                        ? `linear-gradient(90deg, ${selectedTheme.tokens.warning} 0%, #b45309 100%)`
                        : `linear-gradient(90deg, ${selectedTheme.tokens.success} 0%, #047857 100%)`,
                }}
              >
                {/* Subtle sweeping light effect */}
                <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-lightSweep" />
              </div>

              {/* Animated Text */}
              <h2
                className="text-[64px] md:text-[80px] font-black italic uppercase z-10 animate-textTracking drop-shadow-2xl text-white"
                style={{
                  textShadow: "0 10px 30px rgba(0,0,0,0.6)",
                }}
              >
                {eventTrigger === "WICKET"
                  ? "WICKET!"
                  : eventTrigger === "SIX"
                    ? "SIX!"
                    : eventTrigger === "FOUR"
                      ? "FOUR!"
                      : eventTrigger}
              </h2>
            </>
          )}
        </div>

        {/* TOP TABS */}
        <div className="absolute -top-[32px] left-0 w-full flex justify-between items-end px-24 z-10">
          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-1 shadow-lg text-[13px] font-black uppercase text-white pb-1">
              {battingName}
            </span>
          </div>

          <div
            className="flex items-center gap-2 border-t border-l border-r rounded-t-xl px-16 py-1 shadow-lg text-[12px] font-black uppercase text-white pb-1 min-w-0 max-w-[780px]"
            style={{
              backgroundColor: selectedTheme.tokens.panelBg,
              borderColor: selectedTheme.tokens.panelBorder,
            }}
          >
            <span
              className="shrink-0"
              style={{ color: selectedTheme.tokens.warning }}
            >
              {isFirstInnings ? "1st Innings" : "2nd Innings"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span className="drop-shadow-md min-w-0">
              {activeMatch.stage || "Live Match"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span
              className="drop-shadow-md min-w-0"
              style={{ color: selectedTheme.tokens.accent }}
            >
              {calculatedTarget
                ? `${battingName} ${equationStr}`
                : tossWinnerName
                  ? `${tossWinnerName} won toss, elected to ${activeMatch.toss_decision || "bat"}`
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
            background: `linear-gradient(90deg, ${battingColor} 0%, ${battingColor} 18%, rgba(10, 10, 15, 0.98) 40%, rgba(10, 10, 15, 0.98) 60%, ${bowlingColor} 82%, ${bowlingColor} 100%)`,
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
                  className={`text-white min-w-[210px] flex items-end whitespace-nowrap font-mono text-[4.5rem] font-black leading-none drop-shadow-lg tracking-tighter origin-left ${scoreAnim ? "animate-scorePop" : ""}`}
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

              <div className="flex items-center justify-start gap-2 gap-y-1 flex-wrap overflow-hidden w-full py-1">
                {bStats.timeline.map((b: any, i: number) => {
                  let bText =
                    Number(b.runs_off_bat) === 0 && !b.extras_runs
                      ? "•"
                      : b.runs_off_bat;
                  let bCls = "bg-white/10 border-white/20 text-white";
                  let bShape = "w-9 h-9 rounded-full text-base";

                  if (b.is_wicket) {
                    bText = "W";
                    bCls =
                      "bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_#ef4444]";
                  } else if (b.extras_type) {
                    bText = getExtraLabel(b);
                    bCls = "bg-indigo-600 border-indigo-400 text-white";
                    bShape = "h-9 min-w-[46px] px-2 rounded-xl text-[12px]";
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
                      className={`${bShape} border-2 shrink-0 flex items-center justify-center font-black ${bCls} uppercase opacity-0 leading-none`}
                      style={{
                        /* ✅ FIX 3: Swapped popIn for shootIn */
                        animation: `shootIn 0.35s ease-out forwards`,
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
