"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Mic } from "lucide-react";
// Make sure this path correctly points to your gemini utility!
import { fetchAICommentary } from "../../../../../../utils/gemini";

// 🏏 PREDEFINED COMMENTARY SLANGS & PHRASES (Fallback for standard balls)
const COMMENTARY_SLANGS = {
  SIX: [
    "High and handsome! {batter} clears the ropes for a massive SIX! 🔥",
    "Smoked it! That is out of the park from {batter}!",
  ],
  FOUR: [
    "Shot of a boss! {batter} finds the gap perfectly for FOUR! 🎯",
    "Raced away to the boundary! Exquisite timing.",
  ],
  WICKET: [
    "Got him! {bowler} strikes! Huge breakthrough! ☝️ ({dismissal})",
    "Timber! The stumps are in a mess! {batter} has to walk back. ({dismissal})",
  ],
  DOT: [
    "Solid defense from {batter}. No run.",
    "Pushed straight to the fielder. Dot ball.",
    "Beaten! Good pace and carry from {bowler}.",
  ],
  RUNS: [
    "Tucked away nicely by {batter} for {runs} run(s).",
    "Good running between the wickets, they scramble for {runs}.",
  ],
  WIDE: [
    "Wayward from {bowler}. Umpire stretches his arms for a Wide.",
    "Lost his radar there, slipping it down the leg side. Wide called.",
  ],
  NO_BALL: [
    "Oh no, he's overstepped! No Ball called. Free hit coming up!",
    "Siren goes off! {bowler} crosses the line. No Ball.",
  ],
};

const getRandomSlang = (category: keyof typeof COMMENTARY_SLANGS) => {
  const options = COMMENTARY_SLANGS[category];
  return options[Math.floor(Math.random() * options.length)];
};

export default function Commentary({
  match,
  deliveries = [],
  battingSquad = [],
  bowlingSquad = [],
}: any) {
  const [selectedInnings, setSelectedInnings] = useState(1);
  const [aiComments, setAiComments] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);

  // Sync innings tab with live match
  useEffect(() => {
    if (match?.current_innings) {
      setSelectedInnings(match.current_innings);
    }
  }, [match?.current_innings]);

  const getPlayerName = (id: string) => {
    const player = [...battingSquad, ...bowlingSquad].find((p) => p.id === id);
    return player ? player.full_name : "Unknown";
  };

  // --- 🧠 CONTEXT LOGIC (Result & Target) ---
  const matchContext = useMemo(() => {
    if (!match) return { resultText: null, chaseText: null, isFinished: false };

    const isFinished =
      match.status === "completed" || match.stage === "completed";
    let resultText = isFinished
      ? match.result_margin || "Match Completed"
      : null;

    const inn1Delivs = deliveries.filter((d: any) => d.innings === 1);
    const inn2Delivs = deliveries.filter((d: any) => d.innings === 2);

    const inn1Score = inn1Delivs.reduce(
      (sum: number, d: any) =>
        sum + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
      0,
    );
    const inn2Score = inn2Delivs.reduce(
      (sum: number, d: any) =>
        sum + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
      0,
    );
    const inn2Balls = inn2Delivs.filter(
      (d: any) =>
        d.extras_type !== "wd" &&
        d.extras_type !== "wide" &&
        d.extras_type !== "nb" &&
        d.extras_type !== "no-ball",
    ).length;

    const target = inn1Score + 1;
    let chaseText = null;

    if (selectedInnings === 2 && !isFinished && inn1Delivs.length > 0) {
      const runsNeeded = target - inn2Score;
      const totalMatchBalls = (Number(match.overs_count) || 20) * 6;
      const ballsRemaining = Math.max(0, totalMatchBalls - inn2Balls);
      chaseText =
        runsNeeded > 0
          ? `Target: ${target} • Need ${runsNeeded} off ${ballsRemaining}`
          : "Scores Level!";
    }

    return { resultText, chaseText, isFinished };
  }, [match, deliveries, selectedInnings]);

  // --- 📝 TIMELINE GENERATOR ---
  const generateFallbackCommentary = (e: any) => {
    let msg = "";
    if (e.isWicket) {
      msg = getRandomSlang("WICKET")
        .replace("{bowler}", e.bowler)
        .replace("{batter}", e.batter)
        .replace("{dismissal}", e.dismissalText);
      if (e.runs > 0) msg += ` Batters completed ${e.runs} run(s).`;
      return msg;
    }
    if (e.extrasType === "No Ball") {
      msg = getRandomSlang("NO_BALL").replace("{bowler}", e.bowler);
      if (e.runs > 0) msg += ` Plus they scramble for ${e.runs} off the bat!`;
      return msg;
    }
    if (e.extrasType === "Wide")
      return getRandomSlang("WIDE").replace("{bowler}", e.bowler);
    if (e.runs === 6)
      return getRandomSlang("SIX").replace("{batter}", e.batter);
    if (e.runs === 4)
      return getRandomSlang("FOUR").replace("{batter}", e.batter);
    if (e.runs === 0)
      return getRandomSlang("DOT")
        .replace("{batter}", e.batter)
        .replace("{bowler}", e.bowler);
    return getRandomSlang("RUNS")
      .replace("{batter}", e.batter)
      .replace("{runs}", e.runs.toString());
  };

  const getBadgeText = (
    val: string,
    extrasType: string,
    runs: number,
    isWicket: boolean,
  ) => {
    if (isWicket) {
      if (extrasType === "Wide") return runs > 0 ? `W+${runs}WD` : "W+WD";
      if (extrasType === "No Ball") return runs > 0 ? `W+${runs}NB` : "W+NB";
      return runs > 0 ? `W+${runs}` : "W";
    }
    if (extrasType === "Wide") return runs > 0 ? `${runs}WD` : "WD";
    if (extrasType === "No Ball") return runs > 0 ? `${runs}NB` : "NB";
    return val;
  };

  const timelineData = useMemo(() => {
    const innDelivs = deliveries.filter(
      (d: any) => d.innings === selectedInnings,
    );
    if (!innDelivs.length) return [];

    const processedEvents: any[] = [];
    let currentScore = 0,
      currentWickets = 0,
      overRuns = 0,
      overWickets = 0,
      legalBallCount = 0,
      overNumber = 0;

    innDelivs.forEach((d: any) => {
      const runsBat = Number(d.runs_off_bat) || 0;
      const runsExt = Number(d.extras_runs) || 0;
      const isW = !!d.is_wicket;
      const eTypeCode = (d.extras_type || "").toLowerCase();
      const isWide = eTypeCode === "wd" || eTypeCode === "wide";
      const isNoBall = eTypeCode === "nb" || eTypeCode === "no-ball";
      const isLegal = !isWide && !isNoBall;

      const batter = getPlayerName(d.striker_id);
      const bowler = getPlayerName(d.bowler_id);

      let extrasType = "";
      if (isWide) extrasType = "Wide";
      if (isNoBall) extrasType = "No Ball";

      let dismissalText = "";
      if (isW) {
        const wType = d.wicket_type || "OUT";
        dismissalText =
          wType === "run-out" || wType === "runout"
            ? "Run Out"
            : wType.toUpperCase();
      }

      const totalRunsOnBall = runsBat + runsExt;
      currentScore += totalRunsOnBall;
      overRuns += totalRunsOnBall;
      if (isW) {
        currentWickets++;
        overWickets++;
      }
      if (isLegal) legalBallCount++;

      let displayVal = isW ? "W" : runsBat.toString();
      if (isWide) displayVal = `${totalRunsOnBall}WD`;
      else if (isNoBall) displayVal = `${totalRunsOnBall}NB`;

      const eventObj = {
        type: "BALL",
        id: d.id,
        val: displayVal,
        runs: runsBat,
        isWicket: isW,
        extrasType,
        dismissalText,
        batter: batter.split(" ").pop(),
        bowler: bowler.split(" ").pop(),
      };

      // 🟢 Attach AI Comment if it exists, otherwise use Fallback Slang
      processedEvents.push({
        ...eventObj,
        text: aiComments[eventObj.id] || generateFallbackCommentary(eventObj),
        isAI: !!aiComments[eventObj.id],
      });

      if (isLegal && legalBallCount === 6) {
        overNumber++;
        processedEvents.push({
          type: "SUMMARY",
          id: `summary-${selectedInnings}-${overNumber}`,
          over: overNumber,
          runs: overRuns,
          wickets: overWickets,
          totalScore: currentScore,
          totalWickets: currentWickets,
        });
        overRuns = 0;
        overWickets = 0;
        legalBallCount = 0;
      }
    });

    return processedEvents.reverse();
  }, [deliveries, selectedInnings, aiComments]); // Ensure aiComments is a dependency!

  // --- 🤖 GEMINI AI TRIGGER ---
  useEffect(() => {
    if (!timelineData.length) return;

    // Grab the very latest ball bowled
    const latestEvent = timelineData.find((e) => e.type === "BALL");

    // Only ask Gemini for commentary if it's a MAJOR event (4, 6, or Wicket)
    const isMajorEvent =
      latestEvent && (latestEvent.isWicket || latestEvent.runs >= 4);

    if (isMajorEvent && !aiComments[latestEvent.id]) {
      setIsTyping(true);

      // Call your Gemini Utility
      fetchAICommentary({
        ...latestEvent,
        matchSituation: `Innings ${selectedInnings}`,
      })
        .then((aiText: string | null) => {
          // <--- FIXED TYPE HERE
          if (aiText) {
            setAiComments((prev) => ({ ...prev, [latestEvent.id]: aiText }));
          }
          setIsTyping(false);
        })
        .catch((err: any) => {
          console.error("Gemini Commentary Error:", err);
          setIsTyping(false);
        });
    }
  }, [timelineData.length, selectedInnings]);

  // Graceful loading state instead of returning null
  if (!match || Object.keys(match).length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in transition-colors duration-300">
        <div className="w-20 h-20 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse">
          🎙️
        </div>
        <h3 className="font-black text-[var(--text-muted)] uppercase tracking-widest text-lg">
          Live Commentary
        </h3>
        <p className="text-base font-bold text-[var(--text-muted)] opacity-80 mt-2">
          Awaiting match data...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in pb-20 transition-colors duration-300">
      {/* 1. INNINGS TABS */}
      {(match.current_innings === 2 || match.status === "completed") && (
        <div className="flex gap-2 bg-[var(--surface-2)] border border-[var(--border-1)] p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setSelectedInnings(1)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
              selectedInnings === 1
                ? "bg-[var(--surface-1)] shadow-sm text-[var(--accent)] border border-[var(--border-1)]"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            1st Innings
          </button>
          <button
            onClick={() => setSelectedInnings(2)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
              selectedInnings === 2
                ? "bg-[var(--surface-1)] shadow-sm text-[var(--accent)] border border-[var(--border-1)]"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            2nd Innings
          </button>
        </div>
      )}

      {/* 2. STATUS BANNER */}
      {(matchContext.resultText || matchContext.chaseText) && (
        <div className="flex justify-start mb-1 animate-in slide-in-from-top-2 duration-500">
          {matchContext.resultText ? (
            <div className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
              🏆 {matchContext.resultText}
            </div>
          ) : matchContext.chaseText ? (
            <div className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm">
              🎯 {matchContext.chaseText}
            </div>
          ) : null}
        </div>
      )}

      {/* 3. COMMENTARY FEED */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 px-2">
          Ball-by-Ball Feed
        </h3>

        <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] shadow-sm overflow-hidden transition-colors duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border-1)] bg-[var(--surface-2)] flex justify-between items-center">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-sm animate-pulse"></span>
              Live Updates
            </span>
            {isTyping && (
              <span className="text-[9px] text-[var(--accent)] animate-pulse font-black tracking-widest flex items-center gap-1">
                <Mic size={10} /> GEMINI ANALYZING...
              </span>
            )}
          </div>

          {/* Feed Container */}
          <div className="divide-y divide-[var(--border-1)]">
            {timelineData.map((event) => {
              // --- OVER SUMMARY ROW ---
              if (event.type === "SUMMARY") {
                return (
                  <div
                    key={event.id}
                    className="p-5 border-y border-[var(--border-1)] flex justify-between items-center bg-[var(--surface-2)]/50 transition-colors"
                  >
                    <div>
                      <div className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mb-1">
                        Over {event.over} Done
                      </div>
                      <div className="font-black text-base text-[var(--foreground)]">
                        {event.runs} Runs • {event.wickets} Wickets
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-black mb-1 text-[var(--text-muted)]">
                        Score
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-black text-[var(--foreground)] leading-none">
                        {event.totalScore}
                        <span className="text-lg sm:text-xl text-[var(--text-muted)] opacity-70 ml-1">
                          /{event.totalWickets}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // --- INDIVIDUAL BALL ROW ---
              return (
                <div
                  key={event.id}
                  className="p-4 sm:p-5 flex gap-4 sm:gap-5 transition-colors hover:bg-[var(--surface-2)]"
                >
                  {/* Badge */}
                  <div
                    className={`w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center font-black text-xs sm:text-sm border-2 shadow-sm transition-colors ${
                      event.isWicket
                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                        : event.runs >= 6
                          ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--background)] shadow-[var(--accent)]/30"
                          : event.runs >= 4
                            ? "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--foreground)]"
                            : event.extrasType
                              ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                              : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)]"
                    }`}
                  >
                    {getBadgeText(
                      event.val,
                      event.extrasType,
                      event.runs,
                      event.isWicket,
                    )}
                  </div>

                  {/* Text Context */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider truncate text-[var(--foreground)]">
                        {event.bowler}{" "}
                        <span className="text-[var(--text-muted)] opacity-50 mx-1">
                          ➜
                        </span>{" "}
                        {event.batter}
                      </span>
                      {/* Optional AI Badge for generated comments */}
                      {event.isAI && (
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black tracking-widest">
                          AI GENERATED
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm leading-relaxed font-semibold ${event.isWicket ? "text-red-500" : "text-[var(--text-muted)]"}`}
                    >
                      {event.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
