"use client";
import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import { Zap } from "lucide-react";

const normalizeName = (p: any) => {
  if (!p) return "";
  if (typeof p === "object") return p.name || p.playerName || "";
  return String(p).trim();
};

const getInitials = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 3).toUpperCase();
};

export default function DedicatedScoreTicker({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [overlayData, setOverlayData] = useState<any>({ activeViews: [] });
  const [liveMatch, setLiveMatch] = useState<any>(null);
  const [scoreAnim, setScoreAnim] = useState(false);
  const [eventFlash, setEventFlash] = useState<string | null>(null); // 'FOUR', 'SIX', 'WICKET'
  const prevScoreRef = useRef(0);

  // 1. FORCE TRANSPARENCY
  useEffect(() => {
    document.documentElement.style.setProperty(
      "background",
      "transparent",
      "important",
    );
    document.body.style.setProperty("background", "transparent", "important");
    const nav = document.querySelector("nav");
    if (nav) nav.style.display = "none";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
      if (nav) nav.style.display = "";
    };
  }, []);

  // 2. LISTEN TO THE STUDIO CONTROLLER
  useEffect(() => {
    if (!tournamentId) return;
    const channel = supabase.channel(`broadcast-${tournamentId}`);

    channel
      .on("broadcast", { event: "overlay-sync" }, (payload) => {
        setOverlayData(payload.payload);

        // STAR SPORTS STYLE EVENT ANIMATION CATCHER
        if (payload.payload.manualAnimation) {
          setEventFlash(payload.payload.manualAnimation);
          setTimeout(() => setEventFlash(null), 4000); // Hide after 4 seconds
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // 3. LISTEN TO LIVE MATCH
  useEffect(() => {
    const matchId = overlayData.activeMatchId;
    if (!matchId) {
      setLiveMatch(null);
      return;
    }

    supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()
      .then(({ data }) => {
        setLiveMatch(data);
        if (data)
          prevScoreRef.current =
            data.innings?.[data.currentInnings || 0]?.score || 0;
      });

    const matchSub = supabase
      .channel(`ticker-listener-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newScore =
            payload.new?.innings?.[payload.new?.currentInnings || 0]?.score;
          if (newScore !== undefined && newScore > prevScoreRef.current) {
            setScoreAnim(true);
            setTimeout(() => setScoreAnim(false), 400);
            prevScoreRef.current = newScore;
          }
          setLiveMatch(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchSub);
    };
  }, [overlayData.activeMatchId]);

  if (!liveMatch || !overlayData.activeViews?.includes("SCOREBUG")) return null;

  // --- DATA EXTRACTION ---
  const currentInnIdx = liveMatch.currentInnings || 0;
  const currentInn = liveMatch.innings?.[currentInnIdx];
  const meta = liveMatch.meta || {};

  const battingTeam = currentInn?.battingTeam || meta.teamA || "TEAM A";
  const bowlingTeam = currentInn?.bowlingTeam || meta.teamB || "TEAM B";
  const isTeamABatting = battingTeam === meta.teamA;

  const leftLogo =
    meta.teamALogo || "https://cdn-icons-png.flaticon.com/512/164/164449.png";
  const rightLogo =
    meta.teamBLogo || "https://cdn-icons-png.flaticon.com/512/164/164449.png";
  const leftColor = meta.teamAColor || "#0284c7";
  const rightColor = meta.teamBColor || "#e11d48";

  const score = currentInn?.score || 0;
  const wickets = currentInn?.wickets || 0;
  const overs = currentInn?.over || 0;
  const balls = currentInn?.overBallCount || 0;
  const displayOvers = `${overs}.${balls}`;
  const totalBalls = overs * 6 + balls;
  const crr = totalBalls > 0 ? ((score / totalBalls) * 6).toFixed(1) : "0.0";

  const isChasing = currentInnIdx === 1;
  const target =
    meta.target ||
    (liveMatch.innings?.[0] ? liveMatch.innings[0].score + 1 : null);

  let equationStr = "";
  let runsNeeded = 0;
  let projScoreStr = "";

  if (isChasing && target) {
    runsNeeded = target - score;
    const ballsRemaining = (meta.overs || 20) * 6 - totalBalls;
    if (runsNeeded <= 0) equationStr = "SCORES LEVEL";
    else if (ballsRemaining > 0)
      equationStr = `NEED ${runsNeeded} IN ${ballsRemaining}`;
  } else if (!isChasing && totalBalls > 0) {
    const projScore = Math.round(
      (score / totalBalls) * ((meta.overs || 20) * 6),
    );
    projScoreStr = `PROJ: ${projScore}`;
  }

  const isMatchFinished =
    liveMatch.status === "completed" ||
    liveMatch.result ||
    (isChasing && score >= target);
  let resultText = liveMatch.result || (isMatchFinished ? "MATCH ENDED" : "");

  const striker = normalizeName(currentInn?.striker);
  const nonStriker = normalizeName(currentInn?.nonStriker);
  const bowler = normalizeName(currentInn?.currentBowler);
  const sStats = currentInn?.batsmenStats?.[striker] || { runs: 0, balls: 0 };
  const nsStats = currentInn?.batsmenStats?.[nonStriker] || {
    runs: 0,
    balls: 0,
  };
  const bStats = currentInn?.bowlerStats?.[bowler] || {
    wickets: 0,
    runs: 0,
    balls: 0,
  };

  const ballsInThisOver = bStats.balls % 6;
  const bOvers = `${Math.floor(bStats.balls / 6)}.${ballsInThisOver}`;
  const timeline = (currentInn?.timeline || [])
    .filter((b: any) => b.over == overs)
    .slice(-6);

  let scoreContextText = `${bowlingTeam} Bowling`;
  if (currentInnIdx === 0 && overs < 2 && meta.toss?.winner) {
    scoreContextText = `${meta.toss.winner} won toss, elected to ${meta.toss.decision}`;
  }

  return (
    <div className="w-screen h-screen flex flex-col justify-end pointer-events-none overflow-hidden font-sans text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes slideUp { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
          .anim-entry { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes scorePop { 0% { transform: scale(1); color: white; } 30% { transform: scale(1.15); color: #fde047; } 100% { transform: scale(1); color: white; } }
          .animate-scorePop { animation: scorePop 0.4s forwards; }
          @keyframes popIn { 0% { transform: scale(0.3); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `,
        }}
      />

      <div
        className={`absolute left-0 w-full flex flex-col items-center px-8 anim-entry drop-shadow-2xl z-50 transition-all duration-300 ${overlayData.showTicker ? "bottom-[32px]" : "bottom-6"}`}>
        {/* Dynamic Top Bar */}
        <div className="w-full max-w-[1750px] flex justify-between items-end px-4 mb-2 z-10">
          <div className="w-[200px] text-center">
            <span className="block bg-slate-900/95 border border-white/20 rounded-full px-4 py-1.5 shadow-lg text-xs font-black uppercase tracking-widest truncate">
              {battingTeam}
            </span>
          </div>
          {!isMatchFinished && (
            <div className="flex items-center gap-6 bg-slate-900/95 border border-white/20 rounded-full px-8 py-1.5 shadow-lg text-xs font-black uppercase tracking-widest text-white">
              <span className="text-amber-400">
                {currentInnIdx === 0 ? "1st Innings" : "2nd Innings"}
              </span>
              <span className="text-white/40">|</span>
              <span className="truncate max-w-[300px]">
                {meta.matchTitle || "Live Match"}
              </span>
              {isChasing && target ? (
                <>
                  <span className="text-white/40">|</span>
                  <span className="text-cyan-400">
                    {battingTeam} needs {target - score} runs
                  </span>
                </>
              ) : null}
            </div>
          )}
          <div className="w-[200px] text-center">
            <span className="block bg-slate-900/95 border border-white/20 rounded-full px-4 py-1.5 shadow-lg text-xs font-black uppercase tracking-widest truncate">
              {bowlingTeam}
            </span>
          </div>
        </div>

        {/* --- JIO CINEMA / STAR SPORTS EVENT FLASH --- */}
        {eventFlash && (
          <div
            className="absolute bottom-0 w-full max-w-[1750px] h-[110px] z-[60] flex items-center justify-center animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-300 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[3px] border-white/50 overflow-hidden"
            style={{
              background:
                eventFlash === "FOUR"
                  ? "linear-gradient(90deg, #14b8a6, #0f766e, #14b8a6)"
                  : eventFlash === "SIX"
                    ? "linear-gradient(90deg, #f59e0b, #b45309, #f59e0b)"
                    : "linear-gradient(90deg, #e11d48, #9f1239, #e11d48)",
            }}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
            <span className="text-white font-black text-[5rem] uppercase tracking-[0.3em] italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-10">
              {eventFlash === "WICKET" ? "WICKET!" : `${eventFlash} RUNS!`}
            </span>
          </div>
        )}

        {/* Main Capsule */}
        <div
          className="w-full max-w-[1750px] h-[110px] flex relative overflow-hidden rounded-full border-[3px] border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          style={{
            background: `linear-gradient(to right, ${leftColor} 0%, ${leftColor} 15%, rgba(15, 23, 42, 0.95) 28%, rgba(15, 23, 42, 0.95) 72%, ${rightColor} 85%, ${rightColor} 100%)`,
          }}>
          <div className="relative z-10 w-full flex h-full">
            <div className="w-[160px] h-full shrink-0 flex items-center justify-center p-2">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg border-[3px] border-white/50">
                <img
                  src={leftLogo}
                  alt="Team A"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {isMatchFinished ? (
              <div className="flex-1 flex items-center justify-center bg-black/40 backdrop-blur-md">
                <span className="text-amber-400 font-black text-3xl uppercase tracking-[0.3em] mr-6">
                  Match Finished:
                </span>
                <span className="text-white font-black text-5xl uppercase tracking-wider">
                  {resultText}
                </span>
              </div>
            ) : (
              <>
                {/* Score Column */}
                <div className="w-[360px] h-full flex flex-col justify-center border-r border-white/10 shrink-0 bg-black/30">
                  <div className="text-white text-xl font-black tracking-widest mt-2 uppercase px-10">
                    {getInitials(battingTeam)}{" "}
                    <span className="text-white/50 mx-2 text-lg">VS</span>{" "}
                    {getInitials(bowlingTeam)}
                  </div>
                  <div className="flex items-baseline gap-4 px-10">
                    <span
                      className={`font-mono text-[5rem] font-black leading-none drop-shadow-lg tracking-tighter inline-block ${scoreAnim ? "animate-scorePop" : "text-white"}`}>
                      {score}
                      <span className="text-[3.5rem] text-white/80">
                        /{wickets}
                      </span>
                    </span>
                    <span className="font-bold text-2xl text-white/90 leading-none bg-black/30 px-3 py-1.5 rounded border border-white/10">
                      {displayOvers}
                    </span>
                  </div>
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider truncate mt-1.5 px-10">
                    {scoreContextText}
                  </div>
                </div>

                {/* Batsmen Column */}
                <div className="w-[400px] h-full flex flex-col justify-center px-8 border-r border-white/10 shrink-0 text-white bg-black/20">
                  {!striker && !nonStriker ? (
                    <div className="text-white/40 font-black uppercase tracking-widest text-center animate-pulse">
                      Waiting for Batters...
                    </div>
                  ) : (
                    <>
                      <div
                        className={`flex justify-between items-end ${striker ? "font-bold" : "opacity-50"}`}>
                        <span className="truncate pr-3 flex items-center gap-2 text-2xl">
                          {striker || "Striker"}{" "}
                          {striker && (
                            <Zap
                              size={18}
                              className="text-amber-400 fill-amber-400"
                            />
                          )}
                        </span>
                        <span className="font-mono text-4xl font-black">
                          {sStats.runs}
                          <span className="text-lg font-sans text-white/60 ml-2">
                            ({sStats.balls})
                          </span>
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-end mt-2 ${!striker ? "font-bold" : "text-white/70"}`}>
                        <span className="truncate pr-3 text-xl">
                          {nonStriker || "Non-Striker"}
                        </span>
                        <span className="font-mono text-3xl font-bold">
                          {nsStats.runs}
                          <span className="text-base font-sans text-white/50 ml-2">
                            ({nsStats.balls})
                          </span>
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Center Math Box */}
                <div className="w-[280px] h-full flex flex-col justify-center items-center px-4 bg-black/50 border-r border-white/10 shrink-0">
                  {isChasing ? (
                    <div className="text-center w-full">
                      <div className="flex justify-between items-center px-4 mb-2">
                        <div>
                          <div className="text-[10px] font-black text-white/50 uppercase">
                            Target
                          </div>
                          <div className="text-xl font-black text-white">
                            {target}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div>
                          <div className="text-[10px] font-black text-white/50 uppercase">
                            CRR
                          </div>
                          <div className="text-xl font-black text-white">
                            {crr}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div>
                          <div className="text-[10px] font-black text-amber-500/70 uppercase">
                            RRR
                          </div>
                          <div className="text-xl font-black text-amber-400">
                            {(
                              (runsNeeded /
                                ((meta.overs || 20) * 6 - totalBalls)) *
                              6
                            ).toFixed(1) || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded text-amber-400 font-black text-[11px] uppercase truncate">
                        {equationStr}
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full justify-center gap-8 items-center">
                      <div className="text-center">
                        <div className="text-xs font-black text-white/50 uppercase mb-1">
                          CRR
                        </div>
                        <div className="text-3xl font-black text-white">
                          {crr}
                        </div>
                      </div>
                      <div className="h-10 w-px bg-white/20"></div>
                      <div className="text-center">
                        <div className="text-xs font-black text-cyan-500/70 uppercase mb-1">
                          Projected
                        </div>
                        <div className="text-3xl font-black text-cyan-400">
                          {projScoreStr.replace("PROJ: ", "")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bowler Column */}
                <div className="flex-1 h-full flex flex-col justify-center px-8 border-r border-white/10 overflow-hidden bg-black/10">
                  {!bowler ? (
                    <div className="text-white/40 font-black uppercase tracking-widest text-center animate-pulse">
                      Waiting for Bowler...
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-white text-2xl truncate pr-4">
                          {bowler}
                        </span>
                        <span className="font-mono text-3xl text-white font-black leading-none">
                          {bStats.wickets}-{bStats.runs}{" "}
                          <span className="text-lg font-sans font-normal text-white/70 ml-1">
                            ({bOvers})
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 h-11 py-1">
                        {timeline.length === 0 ? (
                          <span className="text-sm text-white/40 italic font-bold">
                            Starting over...
                          </span>
                        ) : (
                          timeline.map((b: any, i: number) => {
                            let text = b.runs === 0 ? "•" : b.runs;
                            let bubbleClass = b.isWicket
                              ? "bg-rose-600 border-rose-400"
                              : b.isWide || b.isNoBall
                                ? "bg-indigo-600 border-indigo-400"
                                : b.runs === 4
                                  ? "bg-teal-400 border-teal-200 text-slate-900"
                                  : b.runs === 6
                                    ? "bg-amber-400 border-amber-200 text-slate-900"
                                    : "bg-white/10 border-white/20";
                            if (b.isWicket) text = "W";
                            else if (b.isWide || b.isNoBall)
                              text =
                                b.runs > 0
                                  ? `${b.runs}${b.isWide ? "wd" : "nb"}`
                                  : b.isWide
                                    ? "wd"
                                    : "nb";
                            return (
                              <div
                                key={i}
                                className={`w-11 h-11 border-2 rounded-full flex items-center justify-center font-black ${bubbleClass} text-white opacity-0 uppercase`}
                                style={{
                                  animation: `popIn 0.3s forwards`,
                                  animationDelay: `${i * 0.05}s`,
                                }}>
                                {text}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="w-[160px] h-full shrink-0 flex items-center justify-center p-2">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg border-[3px] border-white/50">
                <img
                  src={rightLogo}
                  alt="Team B"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
