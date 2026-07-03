"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Zap } from "lucide-react";
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
  deliveries = [],
  team1Squad = [],
  team2Squad = [],
}: {
  overlayData: any;
  liveMatch: any;
  deliveries: any[];
  team1Squad: any[];
  team2Squad: any[];
}) {
  const [scoreAnim, setScoreAnim] = useState(false);
  const [eventTrigger, setEventTrigger] = useState<string | null>(null);
  const selectedTheme = getBroadcastTheme(overlayData?.broadcastThemeId);

  const prevBallRef = useRef<string | null>(null);
  const prevAnimBallRef = useRef<string | null>(null);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. FAST PLAYER DICTIONARY (No Database Calls!)
  const players = useMemo(() => {
    const pMap: Record<string, string> = {};
    [...team1Squad, ...team2Squad].forEach((p) => {
      pMap[p.id] = p.full_name;
    });
    return pMap;
  }, [team1Squad, team2Squad]);

  // 2. SLIDE-OVER ANIMATION TRIGGER
  const prevEventTimeRef = useRef<any>(null);
  const isInitialLoad = useRef(true);

  // Manual trigger from Admin panel
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
        // 🚨 Synced with 5-second CSS Animation
        const timer = setTimeout(() => setEventTrigger(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [overlayData?.event, overlayData?.eventTime]);

  // Auto-trigger from Deliveries Prop
  useEffect(() => {
    if (!deliveries.length) return;
    const lastBall = deliveries[deliveries.length - 1];

    if (prevBallRef.current === lastBall.id) return;
    prevBallRef.current = lastBall.id;

    let event: string | null = null;
    const runs = Number(lastBall.runs_off_bat) || 0;

    if (lastBall.is_wicket) event = "WICKET";
    else if (runs === 6) event = "SIX";
    else if (runs === 4) event = "FOUR";

    if (event) {
      setEventTrigger(event);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      // 🚨 Synced with 5-second CSS Animation
      eventTimerRef.current = setTimeout(() => setEventTrigger(null), 5000);
    }

    if (lastBall.is_wicket || runs >= 4) {
      setScoreAnim(true);
      if (scoreAnimTimerRef.current) clearTimeout(scoreAnimTimerRef.current);
      scoreAnimTimerRef.current = setTimeout(() => setScoreAnim(false), 500);
    }
  }, [deliveries]);

  if (!liveMatch) return null;

  // 3. ROCK-SOLID DATA PIPELINE
  const currentInnings = Number(liveMatch.current_innings) || 1;
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
    if (d.force_legal_ball) return true;
    const type = (d.extras_type || "").toLowerCase();
    return ![
      "wd",
      "wide",
      "nb",
      "no-ball",
      "penalty",
      "p",
      "dead-ball",
    ].includes(type);
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
    team1IsBattingNow = String(activeTeamId) === String(liveMatch.team1_id);
  } else {
    const choseBat = String(liveMatch.toss_decision || "")
      .toLowerCase()
      .includes("bat");
    const t1Won = liveMatch.toss_winner_id === liveMatch.team1_id;
    team1IsBattingNow = isFirstInnings
      ? choseBat
        ? t1Won
        : !t1Won
      : !(choseBat ? t1Won : !t1Won);
  }

  // 4. BRANDING
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

  // 5. INDIVIDUAL STATS
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

  const getBatsmanStats = (id: string) => {
    const d = currentInningsBalls.filter((b) => b.striker_id === id);
    return {
      runs: d.reduce((s, b) => s + (Number(b.runs_off_bat) || 0), 0),
      balls: d.filter(
        (b) =>
          !["wd", "wide", "penalty", "p", "dead-ball"].includes(
            (b.extras_type || "").toLowerCase(),
          ),
      ).length,
    };
  };

  const getBowlerStats = (id: string) => {
    const d = currentInningsBalls.filter((b) => b.bowler_id === id);
    let oversArray = [],
      currentOver = [],
      currentValid = 0,
      totalValid = 0;
    for (const b of d) {
      currentOver.push(b);
      const isLegal =
        b.force_legal_ball ||
        !["wd", "wide", "nb", "no-ball", "penalty", "p", "dead-ball"].includes(
          (b.extras_type || "").toLowerCase(),
        );
      if (isLegal) {
        currentValid++;
        totalValid++;
      }
      if (currentValid === 6) {
        oversArray.push(currentOver);
        currentOver = [];
        currentValid = 0;
      }
    }
    if (currentOver.length > 0) oversArray.push(currentOver);
    return {
      runs: d.reduce((s, b) => {
        if (
          ["bye", "b", "leg-bye", "lb", "penalty", "p"].includes(
            (b.extras_type || "").toLowerCase(),
          )
        )
          return s + (Number(b.runs_off_bat) || 0);
        return s + (Number(b.runs_off_bat) || 0) + (Number(b.extras_runs) || 0);
      }, 0),
      wickets: d.filter((b) => b.is_wicket).length,
      overs: `${Math.floor(totalValid / 6)}.${totalValid % 6}`,
      timeline: oversArray.length > 0 ? oversArray[oversArray.length - 1] : [],
    };
  };

  const sStats = getBatsmanStats(liveMatch.live_striker_id);
  const nsStats = getBatsmanStats(liveMatch.live_non_striker_id);
  const bStats = getBowlerStats(liveMatch.live_bowler_id);

  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(2) : "0.00";
  const totalMatchBalls = (Number(liveMatch.overs_count) || 20) * 6;

  let rrrVal = "0.00",
    equationStr = "MATCH IN PROGRESS",
    projScoreStr = "0";
  if (!isFirstInnings && calculatedTarget) {
    const runsNeeded = calculatedTarget - score;
    const ballsRemaining = totalMatchBalls - totalBalls;
    if (runsNeeded <= 0) {
      equationStr = `${battingTeamObj?.short_name || battingName} WON`;
      rrrVal = "-";
    } else if (ballsRemaining <= 0 || liveMatch.status === "completed") {
      equationStr =
        runsNeeded === 1 && ballsRemaining === 0
          ? "MATCH TIED"
          : `${bowlingTeamObj?.short_name || bowlingName} WON`;
      rrrVal = "-";
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
  if (isFirstInnings && totalBalls < 12 && tossWinnerName)
    scoreContextText = `${tossWinnerName} won toss, elected to ${liveMatch.toss_decision || "bat"}`;

  // --------------------------------------------------------
  // CSS & DYNAMIC THEMES
  // --------------------------------------------------------
  let eventBgStyle = {};
  let eventBorderStyle = {};
  let flashBgStyle = {};
  let subtextStyle = {};
  let subtextContent = "";

  if (eventTrigger === "WICKET") {
    // Red transparent
    eventBgStyle = {
      background:
        "linear-gradient(180deg, rgba(153, 27, 27, 0.85) 0%, rgba(127, 29, 29, 0.85) 100%)",
    };
    eventBorderStyle = {
      borderTop: "3px solid #ef4444",
      borderBottom: "1px solid #450a0a",
    };
    flashBgStyle = {
      background:
        "linear-gradient(90deg, rgba(239,68,68,0) 10%, rgba(239,68,68,0.8) 40%, rgba(255,255,255,1) 50%, rgba(239,68,68,0.8) 60%, rgba(239,68,68,0) 90%)",
    };
    subtextStyle = { color: "#fca5a5" };
    subtextContent = "EXCELLENT BOWLING";
  } else if (eventTrigger === "SIX") {
    // Amber transparent
    eventBgStyle = {
      background:
        "linear-gradient(180deg, rgba(202, 138, 4, 0.85) 0%, rgba(133, 77, 14, 0.85) 100%)",
    };
    eventBorderStyle = {
      borderTop: "3px solid #facc15",
      borderBottom: "1px solid #713f12",
    };
    flashBgStyle = {
      background:
        "linear-gradient(90deg, rgba(245,158,11,0) 10%, rgba(251,191,36,0.8) 40%, rgba(255,255,255,1) 50%, rgba(251,191,36,0.8) 60%, rgba(245,158,11,0) 90%)",
    };
    subtextStyle = { color: "#fef08a" };
    subtextContent = "MAXIMUM!";
  } else {
    // Blue transparent
    eventBgStyle = {
      background:
        "linear-gradient(180deg, rgba(2, 132, 199, 0.85) 0%, rgba(3, 105, 161, 0.85) 100%)",
    };
    eventBorderStyle = {
      borderTop: "3px solid #38bdf8",
      borderBottom: "1px solid #082f49",
    };
    flashBgStyle = {
      background:
        "linear-gradient(90deg, rgba(2,132,199,0) 10%, rgba(56,189,248,0.8) 40%, rgba(255,255,255,1) 50%, rgba(56,189,248,0.8) 60%, rgba(2,132,199,0) 90%)",
    };
    subtextStyle = { color: "#bae6fd" };
    subtextContent = "BOUNDARY!";
  }

  return (
    <>
      <style>{`
        .anim-entry { animation: diagonalWipe 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes diagonalWipe { 0% { clip-path: polygon(100% -100px, 120% -100px, 100% 100%, 80% 100%); transform: translateX(80px); opacity: 0; } 100% { clip-path: polygon(0 -100px, 100% -100px, 100% 100%, 0% 100%); transform: translateX(0); opacity: 1; } }
        
        .animate-scorePop { animation: scorePunch 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        @keyframes scorePunch { 0%, 100% { transform: scale(1); color: white; } 20% { transform: scale(1.25); color: #fde047; } }
        
        .animate-pulseGlow { animation: heartbeat 1.2s ease-in-out infinite; }
        @keyframes heartbeat { 0%, 100% { transform: scale(0.95); opacity: 0.7; } 15%, 45% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 8px rgba(251,191,36,0.9)); } 30% { transform: scale(1); opacity: 0.8; } }
        
        @keyframes shootIn { 0% { transform: translateX(30px) skewX(-15deg); opacity: 0; } 70% { transform: translateX(-5px) skewX(5deg); opacity: 1; } 100% { transform: translateX(0) skewX(0); opacity: 1; } }

        /* 🔥 FIXED: THE BREAKOUT EVENT OVERLAY 🔥 */
        .event-overlay-layer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 120px; 
          z-index: 50;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transform: translateY(100%);
          pointer-events: none;
          box-shadow: 0 -15px 30px rgba(0,0,0,0.4);
          overflow: hidden;
        }
        
        .event-overlay-layer.active {
          animation: breakoutSequence 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes breakoutSequence {
          0% { opacity: 0; transform: translateY(100%); }
          5% { opacity: 1; transform: translateY(0); }
          93% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(100%); }
        }

        .glass-glare {
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%);
          animation: glareSweep 3s ease-in-out infinite;
          z-index: 2;
        }

        @keyframes glareSweep { 
          0% { transform: translateX(-35%); } 
          100% { transform: translateX(55%); } 
        }

        .full-bar-flash {
          position: absolute;
          top: 0; 
          left: 0;
          width: 100%;
          height: 100%;
          mix-blend-mode: screen;
          opacity: 0;
          pointer-events: none;
          z-index: 50;
        }

        .full-bar-flash.active {
          animation: hyperFlash 0.5s cubic-bezier(0.075, 0.82, 0.165, 1) forwards;
        }

        @keyframes hyperFlash {
          0% { opacity: 0; transform: scaleX(0.2); filter: blur(4px); }
          25% { opacity: 1; transform: scaleX(1); filter: blur(0px); }
          100% { opacity: 0; transform: scaleX(1.1); filter: blur(20px); }
        }
      `}</style>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1920px] h-[120px] anim-entry">
        {/* ---------------------------------------------------- */}
        {/* 🔥 1. THE BREAKOUT EVENT OVERLAY (Shoots Up) 🔥 */}
        {/* ---------------------------------------------------- */}
        <div
          className={`event-overlay-layer backdrop-blur-md ${eventTrigger ? "active" : ""}`}
          style={{ ...eventBgStyle, ...eventBorderStyle }}>
          <div className="glass-glare" />
          <div className="relative z-10 flex items-center gap-6">
            <span
              className="text-[56px] text-white italic tracking-[2px] font-black uppercase"
              style={{ textShadow: "0 3px 6px rgba(0,0,0,0.5)" }}>
              {eventTrigger === "WICKET"
                ? "WICKET!"
                : eventTrigger === "SIX"
                  ? "SIX!"
                  : "FOUR!"}
            </span>
            <span
              className="text-[20px] tracking-[6px] font-black uppercase"
              style={subtextStyle}>
              {subtextContent}
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 🔥 2. TOP TABS (Z-INDEX FIXED) 🔥 */}
        {/* Changed z-20 to z-[2] so the animation slides cleanly in front of them */}
        {/* ---------------------------------------------------- */}
        <div className="absolute -top-[52px] left-0 w-full flex justify-between items-end px-24 z-[2]">
          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-1 shadow-lg text-[15px] font-black uppercase text-white pb-1">
              {battingName}
            </span>
          </div>

          <div
            className="flex items-center gap-2 border-t border-l border-r rounded-t-xl px-16 py-1 shadow-lg text-[15px] font-black uppercase text-white pb-1 min-w-0 max-w-[780px]"
            style={{
              backgroundColor: selectedTheme.tokens.panelBg,
              borderColor: selectedTheme.tokens.panelBorder,
            }}>
            <span
              className="shrink-0"
              style={{ color: selectedTheme.tokens.warning }}>
              {isFirstInnings ? "1st Innings" : "2nd Innings"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span className="drop-shadow-md min-w-0">
              {liveMatch.stage || "Live Match"}
            </span>
            <span className="text-white/40 shrink-0">|</span>
            <span
              className="drop-shadow-md min-w-0"
              style={{ color: selectedTheme.tokens.accent }}>
              {calculatedTarget
                ? `${battingName} - ${equationStr}`
                : tossWinnerName
                  ? `${tossWinnerName} won toss, elected to ${liveMatch.toss_decision || "bat"}`
                  : "Live Action"}
            </span>
          </div>

          <div className="w-[220px] text-center">
            <span className="block bg-slate-950/95 border-t border-l border-r border-white/20 rounded-t-xl px-4 py-1 shadow-lg text-[15px] font-black uppercase text-white pb-1">
              {bowlingName}
            </span>
          </div>
        </div>

        {/* MAIN TICKER CONTAINER (Stays at Z-10) */}
        <div
          className="relative z-10 w-full h-full flex overflow-hidden border-t-[3px] border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
          style={{
            background: `linear-gradient(90deg, ${battingColor} 0%, ${battingColor} 18%, rgba(10, 10, 15, 0.98) 40%, rgba(10, 10, 15, 0.98) 60%, ${bowlingColor} 82%, ${bowlingColor} 100%)`,
          }}>
          <div
            className={`full-bar-flash ${eventTrigger ? "active" : ""}`}
            style={flashBgStyle}
          />

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
              <div className="text-white text-[15px] font-black tracking-[0.25em] uppercase drop-shadow-md absolute top-2 left-8 right-8 opacity-90 ">
                {battingInitials}{" "}
                <span className="text-white/40 mx-2 text-[11px]">VS</span>{" "}
                {bowlingInitials}
              </div>

              <div className="flex items-end gap-5 px-8 pt-6">
                <span
                  className={`text-white min-w-[210px] flex items-end whitespace-nowrap font-mono text-[4.5rem] font-black leading-none drop-shadow-lg tracking-tighter origin-left ${scoreAnim ? "animate-scorePop" : ""}`}>
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
              <div className="text-[15px] text-amber-400 font-bold mt-1 drop-shadow-sm px-8">
                {scoreContextText}
              </div>
            </div>

            {/* 3. BATSMEN COLUMN */}
            <div className="w-[450px] h-full flex flex-col justify-center px-12 shrink-0 text-white border-r border-white/10">
              <div className="flex justify-between items-end font-bold">
                <span className="pr-3 flex items-center gap-2 text-[23px] drop-shadow-md min-w-0">
                  <span className="truncate max-w-[250px]">{strikerName}</span>
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
                <span className="pr-3 text-[23px] drop-shadow-md min-w-0 truncate max-w-[250px]">
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
                <div className="flex w-full justify-between items-center px-6 mb-2">
                  <div className="text-center">
                    <div className="text-[11px] font-black text-[#38bdf8] tracking-[2px] uppercase mb-1">
                      Target
                    </div>
                    <div className="text-[26px] font-black text-white leading-none">
                      {calculatedTarget}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-[11px] font-black text-[#38bdf8] tracking-[2px] uppercase mb-1">
                      CRR
                    </div>
                    <div className="text-[26px] font-black text-white leading-none">
                      {crr}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-[11px] font-black text-amber-500 tracking-[2px] uppercase mb-1">
                      RRR
                    </div>
                    <div className="text-[26px] font-black text-amber-400 leading-none">
                      {rrrVal}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full justify-center gap-12 items-center">
                  <div className="text-center">
                    <div className="text-[11px] font-black text-[#38bdf8] tracking-[2px] uppercase mb-1">
                      CRR
                    </div>
                    <div className="text-[26px] font-black text-white drop-shadow-md leading-none">
                      {crr}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-[11px] font-black text-[#38bdf8] tracking-[2px] uppercase mb-1">
                      Projected
                    </div>
                    <div className="text-[26px] font-black text-white drop-shadow-md leading-none">
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
                  let bText: string | number =
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
                    const extType = b.extras_type.toLowerCase();
                    if (extType === "penalty" || extType === "p") {
                      const pRuns = Number(b.extras_runs) || 0;
                      bText = `${pRuns > 0 ? "+" : ""}${pRuns}P`;
                    } else if (extType === "dead-ball") {
                      bText = "DB";
                    } else {
                      bText = getExtraLabel(b);
                    }
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
                        animation: `shootIn 0.35s ease-out forwards`,
                        animationDelay: `${i * 0.08}s`,
                      }}>
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
