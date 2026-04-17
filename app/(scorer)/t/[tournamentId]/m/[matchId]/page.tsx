"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Settings, RotateCcw, Square } from "lucide-react";

// SUB-COMPONENTS
import Scoreboard from "./components/Scoreboard";
import ActivePlayers from "./components/ActivePlayers";
import RecentBalls from "./components/RecentBalls";
import FullScorecard from "./components/FullScorecard";

// IMPORT ENGINE & MATH
import { useMatchEngine } from "../../../../../hooks/useMatchEngine";
import { supabase } from "@/lib/supabase";
import {
  deriveMatchStats,
  getPlayerMatchStats,
} from "../../../../../utils/cricketMath";

export default function LiveScorerPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const { tournamentId, matchId } = use(params);
  const engine = useMatchEngine(tournamentId, matchId);

  // Setup States
  const [tossWinnerId, setTossWinnerId] = useState("");
  const [tossDecision, setTossDecision] = useState("bat");
  const [setupStriker, setSetupStriker] = useState("");
  const [setupNonStriker, setSetupNonStriker] = useState("");
  const [setupBowler, setSetupBowler] = useState("");

  // Modal States
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [selectedNewBowlerId, setSelectedNewBowlerId] = useState("");

  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState("bowled");
  const [playerOutId, setPlayerOutId] = useState("");
  const [newBatsmanId, setNewBatsmanId] = useState("");
  const [fielderId, setFielderId] = useState("");
  const [wicketHasExtra, setWicketHasExtra] = useState(false);
  const [wicketExtraType, setWicketExtraType] = useState<
    "wide" | "no-ball" | "bye" | "leg-bye"
  >("wide");
  const [wicketExtraRuns, setWicketExtraRuns] = useState(0);
  const [forceLegalBall, setForceLegalBall] = useState(false);

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState<
    "wide" | "no-ball" | "bye" | "leg-bye" | null
  >(null);
  const [extraAdditionalRuns, setExtraAdditionalRuns] = useState(0);

  const [editingBall, setEditingBall] = useState<any>(null);
  const [showEditPlayersModal, setShowEditPlayersModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempOversLimit, setTempOversLimit] = useState<number>(0);
  const [tempTargetScore, setTempTargetScore] = useState<number | null>(null);
  const [tempMaxOversPerBowler, setTempMaxOversPerBowler] = useState<number>(0); // <-- ADD THIS

  const [showMoreModal, setShowMoreModal] = useState(false);
  const [moreActionType, setMoreActionType] = useState<
    "penalty" | "bye" | "leg-bye" | "dead-ball" | "custom"
  >("penalty");
  const [customRuns, setCustomRuns] = useState(5);

  const [activeTab, setActiveTab] = useState<
    "scoreboard" | "scorecard" | "commentary" | "predictor" | "info"
  >("scoreboard");

  const [showPostMatchModal, setShowPostMatchModal] = useState(false);
  const [momId, setMomId] = useState("");
  const [bestBatsmanId, setBestBatsmanId] = useState("");
  const [bestBowlerId, setBestBowlerId] = useState("");
  const [strictMom, setStrictMom] = useState(true);

  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  const stats = deriveMatchStats(
    engine.match,
    engine.deliveries,
    engine.team1Players,
    engine.team2Players,
  );

  useEffect(() => {
    if (engine.match) {
      setTempOversLimit(engine.match.overs_count || 0);
      setTempTargetScore(stats?.targetScore || null);
    }
  }, [engine.match, stats?.targetScore]);

  // --- AUTO-MVP CALCULATION ---
  useEffect(() => {
    if (showPostMatchModal && stats) {
      // 1. Calculate points for everyone
      const allPlayers = [...engine.team1Players, ...engine.team2Players].map(
        (p) => {
          const pStats = getPlayerMatchStats(p.id, engine.deliveries);
          return { ...p, ...pStats };
        },
      );

      // 2. Best Batsman (Most Runs)
      const bestBat = [...allPlayers].sort((a, b) => b.runs - a.runs)[0];
      if (bestBat && bestBat.runs > 0) setBestBatsmanId(bestBat.id);

      // 3. Best Bowler (Most Wickets, tie-breaker: MVP points)
      const bestBowl = [...allPlayers].sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return b.points - a.points;
      })[0];
      if (bestBowl && bestBowl.wickets > 0) setBestBowlerId(bestBowl.id);

      // 4. MOM Logic (Respecting the Strict Winner Rule)
      const winningTeamId =
        stats.currentScore >= stats.targetScore!
          ? stats.battingTeam?.id
          : stats.bowlingTeam?.id;

      let momCandidates = allPlayers;
      if (strictMom && winningTeamId) {
        momCandidates = allPlayers.filter((p) => p.team_id === winningTeamId);
      }

      const mom = [...momCandidates].sort((a, b) => b.points - a.points)[0];
      if (mom && mom.points > 0) setMomId(mom.id);
    }
  }, [showPostMatchModal, strictMom, stats]); // Runs automatically if they toggle the checkbox!

  useEffect(() => {
    if (engine.match) {
      setTempOversLimit(engine.match.overs_count || 0);
      setTempMaxOversPerBowler(
        engine.match.max_overs_per_bowler ||
          Math.ceil((engine.match.overs_count || 20) / 5),
      ); // Default to 1/5th of total overs
      setTempTargetScore(stats?.targetScore || null);
    }
  }, [engine.match, stats?.targetScore]);

  const handleQuickAddPlayer = async () => {
    if (!newPlayerName.trim()) return;

    const battingTeamId =
      engine.match.current_innings === 1
        ? engine.match.team1_id
        : engine.match.team2_id;

    const { data, error } = await supabase
      .from("players")
      .insert({
        full_name: newPlayerName.trim(),
        team_id: battingTeamId,
        tournament_id: tournamentId,
      })
      .select()
      .single();

    if (!error) {
      // Refresh the engine's player list so the new player shows up in dropdowns
      await engine.refreshPlayers();
      setNewPlayerName("");
      setShowQuickAddPlayer(false);
    } else {
      alert("Error adding player: " + error.message);
    }
  };

  const handleRecordBall = async (runs: number) => {
    const res = await engine.recordDelivery(runs);
    if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);
  };

  const submitExtra = async () => {
    if (!pendingExtraType) return;
    let totalExtraRuns = extraAdditionalRuns;
    if (pendingExtraType === "wide" || pendingExtraType === "no-ball")
      totalExtraRuns += 1;

    const res = await engine.recordDelivery(
      0,
      pendingExtraType,
      totalExtraRuns,
      false,
    );
    if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);

    setShowExtrasModal(false);
    setPendingExtraType(null);
    setExtraAdditionalRuns(0);
  };

  const submitWicket = async () => {
    if (!newBatsmanId) return alert("Select new batsman");
    if ((wicketType === "caught" || wicketType === "run-out") && !fielderId)
      return alert("Select the fielder");

    let eType = null,
      eRuns = 0;
    if (wicketHasExtra) {
      eType = wicketExtraType;
      eRuns = wicketExtraRuns;
      if (eType === "wide" || eType === "no-ball") eRuns += 1;
    }

    const res = await engine.recordDelivery(
      0,
      eType,
      eRuns,
      true,
      forceLegalBall,
      { playerOutId, wicketType, fielderId },
    );

    if (res?.success) {
      // 1. Substitute the dismissed player with the new batsman exactly where they stood
      let nextStriker =
        playerOutId === engine.match.live_striker_id
          ? newBatsmanId
          : engine.match.live_striker_id;
      let nextNonStriker =
        playerOutId === engine.match.live_non_striker_id
          ? newBatsmanId
          : engine.match.live_non_striker_id;

      // 2. ICC Modern Rule: Crossed batsmen don't change strike on a catch.
      // Only Run Outs with odd runs change the strike.
      let swapStrike = false;
      if (wicketType === "run-out" && eRuns % 2 !== 0) {
        swapStrike = true;
      }

      // 3. End of Over overrides everything (they swap ends)
      if (res.isOverComplete) {
        swapStrike = !swapStrike;
      }

      // 4. Apply the final calculated swap
      if (swapStrike) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }

      // 5. Save to database
      await engine.updateLivePlayers(
        nextStriker,
        nextNonStriker,
        engine.match.live_bowler_id,
      );

      if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);
    }

    setShowWicketModal(false);
    setNewBatsmanId("");
    setFielderId("");
    setWicketHasExtra(false);
    setWicketExtraRuns(0);
    setForceLegalBall(false);
  };

  const submitMoreAction = async () => {
    let res;
    if (moreActionType === "dead-ball")
      res = await engine.recordDelivery(0, "dead-ball", 0);
    else if (moreActionType === "penalty")
      res = await engine.recordDelivery(0, "penalty", customRuns);
    else res = await engine.recordDelivery(customRuns, null, 0);

    if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);
    setShowMoreModal(false);
    setCustomRuns(5);
  };

  // --- EARLY RETURNS ---
  if (matchId === "null" || !matchId)
    return (
      <div className="p-20 text-center text-slate-500 font-bold text-lg">
        Initializing Match...
      </div>
    );
  if (engine.isLoading || !stats)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 text-xl animate-pulse">
        LOADING MATCH...
      </div>
    );
  if (!engine.match)
    return (
      <div className="p-20 text-center text-slate-500 font-bold text-lg">
        Match not found.
      </div>
    );

  // --- EARLY RETURNS ---
  if (matchId === "null" || !matchId)
    return (
      <div className="p-20 text-center text-slate-500 font-bold text-lg">
        Initializing Match...
      </div>
    );
  if (engine.isLoading || !stats)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 text-xl animate-pulse">
        LOADING MATCH...
      </div>
    );
  if (!engine.match)
    return (
      <div className="p-20 text-center text-slate-500 font-bold text-lg">
        Match not found.
      </div>
    );

  // THE FIX: Catch completed matches immediately!
  // THE FIX: Catch completed matches and show a beautiful Match Summary + Scorecard
  if (engine.match.status === "completed") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-900 dark:text-white pb-20">
        <div className="max-w-[1400px] mx-auto">
          {/* Header & Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() =>
                (window.location.href = `/t/${tournamentId}/matches`)
              }
              className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-black text-2xl uppercase tracking-tight leading-none">
                Match Summary
              </h1>
              <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mt-1">
                {engine.match.team1?.short_name} vs{" "}
                {engine.match.team2?.short_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT COLUMN: Match Result & Awards */}
            <div className="lg:w-1/3 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-center sticky top-6">
                <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border border-yellow-500/30">
                  🏆
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                  Match Completed
                </h2>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-8 leading-tight">
                  {engine.match.result_margin || "Result processing..."}
                </p>

                <div className="flex flex-col gap-4 text-left mb-8">
                  <div className="bg-slate-50 dark:bg-black p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Player of the Match
                    </p>
                    <p className="font-black text-lg">
                      {engine.team1Players
                        .concat(engine.team2Players)
                        .find((p) => p.id === engine.match.player_of_match_id)
                        ?.full_name || "TBD"}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-black p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Best Batsman
                    </p>
                    <p className="font-black text-lg">
                      {engine.team1Players
                        .concat(engine.team2Players)
                        .find((p) => p.id === engine.match.best_batsman_id)
                        ?.full_name || "TBD"}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-black p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Best Bowler
                    </p>
                    <p className="font-black text-lg">
                      {engine.team1Players
                        .concat(engine.team2Players)
                        .find((p) => p.id === engine.match.best_bowler_id)
                        ?.full_name || "TBD"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    (window.location.href = `/t/${tournamentId}/matches`)
                  }
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase py-4 rounded-xl hover:opacity-80 transition-opacity">
                  Return to Matches
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Full Scorecard */}
            <div className="lg:w-2/3">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <FullScorecard
                  deliveries={engine.deliveries}
                  battingSquad={stats.battingSquad}
                  bowlingSquad={stats.bowlingSquad}
                  match={engine.match}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!engine.match.toss_winner_id)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
        <Link
          href={`/t/${tournamentId}/matches`}
          className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-teal-500 w-max">
          <ArrowLeft size={16} /> Back to Schedule
        </Link>
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center mb-10 text-center">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mb-4">
              <Coins size={32} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-widest">
              Pre-Match Setup
            </h1>
          </div>
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="text-center w-32">
              <div
                className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 bg-contain bg-center p-2 mb-2"
                style={{
                  backgroundImage: engine.match.team1?.logo_url
                    ? `url(${engine.match.team1.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-sm">
                {engine.match.team1?.short_name}
              </p>
            </div>
            <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              VS
            </span>
            <div className="text-center w-32">
              <div
                className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 bg-contain bg-center p-2 mb-2"
                style={{
                  backgroundImage: engine.match.team2?.logo_url
                    ? `url(${engine.match.team2.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-sm">
                {engine.match.team2?.short_name}
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">
                Who won the toss?
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setTossWinnerId(engine.match.team1_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === engine.match.team1_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}>
                  {engine.match.team1?.name}
                </button>
                <button
                  onClick={() => setTossWinnerId(engine.match.team2_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === engine.match.team2_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}>
                  {engine.match.team2?.name}
                </button>
              </div>
            </div>
            {tossWinnerId && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">
                  Decision
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTossDecision("bat")}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossDecision === "bat" ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-slate-500"}`}>
                    Elected to Bat
                  </button>
                  <button
                    onClick={() => setTossDecision("bowl")}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossDecision === "bowl" ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-slate-500"}`}>
                    Elected to Bowl
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() =>
                engine.saveTossAndStart(tossWinnerId, tossDecision)
              }
              disabled={!tossWinnerId}
              className="w-full mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 font-black uppercase py-4 rounded-xl">
              Start Match
            </button>
          </div>
        </div>
      </div>
    );

  if (!engine.match.live_striker_id)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800 mt-10">
          <h2 className="text-2xl font-black uppercase tracking-widest text-center mb-2">
            {engine.match.current_innings === 1
              ? "First Innings Setup"
              : "Second Innings Chase"}
          </h2>
          <p className="text-center text-slate-500 font-bold mb-8 text-lg">
            {stats.battingTeam?.name} is Batting
          </p>
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-black p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Select Batsmen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-500 block mb-2">
                    Striker
                  </label>
                  <select
                    value={setupStriker}
                    onChange={(e) => setSetupStriker(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold">
                    <option value="">Select...</option>
                    {stats.battingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 block mb-2">
                    Non-Striker
                  </label>
                  <select
                    value={setupNonStriker}
                    onChange={(e) => setSetupNonStriker(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold">
                    <option value="">Select...</option>
                    {stats.battingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-black p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Select Bowler
              </h3>
              <select
                value={setupBowler}
                onChange={(e) => setSetupBowler(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold">
                <option value="">Select...</option>
                {stats.bowlingSquad
                  .filter((p) => p.id !== engine.match.live_bowler_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={() =>
                engine.saveOpeners(setupStriker, setupNonStriker, setupBowler)
              }
              className="w-full bg-teal-600 text-white font-black text-lg uppercase tracking-widest py-5 rounded-xl">
              Play Ball
            </button>
          </div>
        </div>
      </div>
    );

  // --- 5. MAIN JSX (CLEAN WEB LAYOUT) ---
  return (
    // Note the pb-[320px] on mobile! This allows the user to scroll to the very bottom of the page without the floating keypad covering it.
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-2 md:p-6 pb-[220px] lg:pb-6 font-sans text-slate-900 dark:text-white">
      {/* HEADER & TOP NAVIGATION */}
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-6 px-2 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              (window.location.href = `/t/${tournamentId}/matches`)
            }
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg md:text-2xl uppercase tracking-tight leading-none">
              {engine.match?.team1?.short_name} vs{" "}
              {engine.match?.team2?.short_name}
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-teal-500 uppercase tracking-widest mt-1">
              {engine.match?.current_innings === 1
                ? "1st Innings"
                : "2nd Innings Chase"}
            </p>
          </div>
        </div>

        {/* <div className="flex gap-2 sm:gap-4">
          <button
            onClick={() => engine.deleteLastBall()}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-red-100 dark:bg-red-900/20 text-red-600 font-bold rounded-xl text-[10px] sm:text-sm uppercase tracking-wider hover:bg-red-200 transition-colors">
            <RotateCcw size={16} className="hidden sm:block" /> Undo
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-100 transition-colors">
            <Settings size={20} />
          </button>
        </div> */}
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-[1400px] mx-auto flex flex-col-reverse lg:flex-row gap-4">
        {/* LEFT COLUMN: THE SCORE, PITCH & FLOATING KEYPAD */}
        <div className="flex-1 flex flex-col gap-4 lg:max-w-[50%] xl:max-w-[45%] w-full">
          <ActivePlayers
            battingSquad={stats.battingSquad}
            bowlingSquad={stats.bowlingSquad}
            match={engine.match}
            manualSwapStrike={engine.manualSwapStrike}
            strikerRuns={stats.strikerRuns}
            strikerBalls={stats.strikerBalls}
            nonStrikerRuns={stats.nonStrikerRuns}
            nonStrikerBalls={stats.nonStrikerBalls}
            bowlerOvers={stats.bowlerOvers}
            bowlerRuns={stats.bowlerRuns}
            bowlerWickets={stats.bowlerWickets}
            setShowEditPlayersModal={setShowEditPlayersModal}
            currentOverDeliveries={stats.currentOverDeliveries}
          />

          {/* THE MAGIC FLOATING KEYPAD */}
          {/* On mobile: fixed to the bottom and floating above content. On desktop: snapping back into the grid as a static card. */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] lg:static lg:bg-white lg:dark:bg-slate-900 lg:p-6 lg:rounded-3xl lg:border lg:shadow-sm lg:backdrop-blur-none">
            <h3 className="hidden lg:block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
              Record Next Ball
            </h3>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
              {[0, 1, 2, 3].map((runs) => (
                <button
                  key={runs}
                  onClick={() => handleRecordBall(runs)}
                  disabled={engine.isSubmittingBall}
                  className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 lg:border-none dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95">
                  {runs}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
              <button
                onClick={() => handleRecordBall(4)}
                disabled={engine.isSubmittingBall}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 lg:border-none dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95">
                4
              </button>
              <button
                onClick={() => handleRecordBall(6)}
                disabled={engine.isSubmittingBall}
                className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-95">
                6
              </button>
              <button
                onClick={() => setShowMoreModal(true)}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 lg:border-none dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-black text-[11px] sm:text-sm uppercase py-3 rounded-2xl transition-all active:scale-95">
                ... More Actions
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to end this innings manually?",
                    )
                  ) {
                    engine.match.current_innings === 1
                      ? engine.startSecondInnings()
                      : setShowPostMatchModal(true);
                  }
                }}
                className="items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl border border-orange-200 dark:border-orange-800/30">
                <Square size={20} className="mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  End Innings
                </span>
              </button>
            </div>

            <hr className="border-slate-200 dark:border-slate-800 mb-3 sm:mb-6" />

            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setPendingExtraType("wide");
                  setShowExtrasModal(true);
                }}
                className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 border border-orange-200 dark:border-orange-500/20 text-orange-600 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all">
                WD
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("no-ball");
                  setShowExtrasModal(true);
                }}
                className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 border border-orange-200 dark:border-orange-500/20 text-orange-600 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all">
                NB
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("leg-bye");
                  setShowExtrasModal(true);
                }}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 hover:bg-slate-200 border border-slate-200 lg:border-none dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all">
                LB
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("bye");
                  setShowExtrasModal(true);
                }}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 hover:bg-slate-200 border border-slate-200 lg:border-none dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all">
                B
              </button>
              <button
                onClick={() => {
                  setPlayerOutId(engine.match.live_striker_id);
                  setShowWicketModal(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                OUT
              </button>
            </div>
          </div>

          <RecentBalls
            deliveries={engine.deliveries}
            currentOvers={stats.currentOvers}
            setEditingBall={setEditingBall}
            deleteLastBall={engine.deleteLastBall}
          />
        </div>

        {/* RIGHT COLUMN: TABS & SCORECARD */}
        <div className="flex-1 w-full lg:max-w-[50%] xl:max-w-[55%]">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800 p-2 gap-2 hide-scrollbar">
              {[
                { id: "scoreboard", label: "Scoreboard" },
                { id: "scorecard", label: "Full Scorecard" },
                { id: "commentary", label: "Commentary" },
                { id: "predictor", label: "Win Predictor" },
                { id: "info", label: "Match Info" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3 rounded-xl text-sm font-black uppercase whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 min-h-[400px]">
              {activeTab === "scoreboard" && (
                <Scoreboard
                  battingTeam={stats.battingTeam}
                  currentScore={stats.currentScore}
                  currentWickets={stats.currentWickets}
                  currentOvers={stats.currentOvers}
                  match={engine.match}
                  runRate={stats.runRate}
                  targetScore={stats.targetScore}
                  rrr={stats.rrr}
                  remainingRuns={stats.remainingRuns}
                  remainingBalls={stats.remainingBalls}
                  openSettings={() => setShowSettingsModal(true)}
                  extras={stats.extrasBreakdown}
                />
              )}
              {activeTab === "scorecard" && (
                <FullScorecard
                  deliveries={engine.deliveries}
                  battingSquad={stats.battingSquad}
                  bowlingSquad={stats.bowlingSquad}
                  match={engine.match}
                />
              )}
              {/* Placeholders */}
              {activeTab === "commentary" && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                    🎙️
                  </div>
                  <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
                    Live Commentary
                  </h3>
                  <p className="text-base font-bold text-slate-500 mt-2">
                    Ball-by-ball feed coming soon...
                  </p>
                </div>
              )}
              {activeTab === "predictor" && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                    📊
                  </div>
                  <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
                    Team Analysis
                  </h3>
                  <p className="text-base font-bold text-slate-500 mt-2">
                    Win probability and wagon wheels coming soon...
                  </p>
                </div>
              )}
              {activeTab === "info" && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                    ℹ️
                  </div>
                  <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
                    Match Information
                  </h3>
                  <p className="text-base font-bold text-slate-500 mt-2">
                    Toss, Umpires, and Ground info coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ALL YOUR MODALS REMAIN EXACTLY THE SAME BELOW THIS LINE --- */}
      {/* 1. NEW BOWLER MODAL */}
      {showBowlerModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8">
              Over Completed!
            </h2>
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Available Bowlers
              </label>
              <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
                {stats.bowlingSquad
                  .filter((p) => p.id !== engine.match.live_bowler_id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedNewBowlerId(p.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 font-bold text-lg ${selectedNewBowlerId === p.id ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" : "border-slate-100 dark:border-slate-800"}`}>
                      <span>{p.full_name}</span>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => {
                  engine.changeBowler(selectedNewBowlerId);
                  setShowBowlerModal(false);
                  setSelectedNewBowlerId("");
                }}
                disabled={!selectedNewBowlerId}
                className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl disabled:opacity-30 text-lg">
                Confirm Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ULTIMATE WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-red-200 dark:border-red-900/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-6 text-red-600 dark:text-red-500">
              Wicket Fall!
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Who is out?
                </label>
                <div className="flex gap-3">
                  {[
                    engine.match.live_striker_id,
                    engine.match.live_non_striker_id,
                  ].map((id) => (
                    <button
                      key={id}
                      onClick={() => setPlayerOutId(id)}
                      className={`flex-1 p-4 rounded-2xl border-2 font-bold text-sm ${playerOutId === id ? "border-red-500 bg-red-50 dark:bg-red-900/10 text-red-600" : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"}`}>
                      {stats.battingSquad.find((p) => p.id === id)?.full_name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Dismissal Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="run-out">Run Out</option>
                  <option value="stumped">Stumped</option>
                </select>
              </div>
              {(wicketType === "caught" || wicketType === "run-out") && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Fielder Involved
                  </label>
                  <select
                    value={fielderId}
                    onChange={(e) => setFielderId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                    <option value="">Select Fielder...</option>
                    {stats.bowlingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Incoming Batsman
                </label>
                <select
                  value={newBatsmanId}
                  onChange={(e) => setNewBatsmanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                  <option value="">Select New Batsman...</option>
                  {stats.battingSquad
                    .filter(
                      (p) =>
                        p.id !== engine.match.live_striker_id &&
                        p.id !== engine.match.live_non_striker_id &&
                        !stats.dismissedPlayerIds.includes(p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </select>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowQuickAddPlayer(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl text-xs font-black uppercase">
                    + Add Extra Player to Squad
                  </button>
                </div>
              </div>
              <hr className="border-slate-100 dark:border-slate-800" />
              <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    id="wicketExtra"
                    checked={wicketHasExtra}
                    onChange={(e) => setWicketHasExtra(e.target.checked)}
                    className="w-5 h-5 accent-orange-500 rounded"
                  />
                  <label
                    htmlFor="wicketExtra"
                    className="text-sm font-black text-orange-600 uppercase">
                    Wicket on an Extra?
                  </label>
                </div>
                {wicketHasExtra && (
                  <div className="mt-5 space-y-5 animate-in fade-in">
                    <div className="flex gap-2">
                      {["wide", "no-ball", "bye", "leg-bye"].map((ext) => (
                        <button
                          key={ext}
                          onClick={() => {
                            setWicketExtraType(ext as any);
                            setForceLegalBall(false);
                          }}
                          className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 uppercase ${wicketExtraType === ext ? "bg-orange-500 text-white border-orange-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                          {ext.replace("-", " ")}
                        </button>
                      ))}
                    </div>
                    {(wicketExtraType === "wide" ||
                      wicketExtraType === "no-ball") && (
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          id="forceLegal"
                          checked={forceLegalBall}
                          onChange={(e) => setForceLegalBall(e.target.checked)}
                          className="w-5 h-5 accent-teal-500"
                        />
                        <label
                          htmlFor="forceLegal"
                          className="text-sm font-bold text-slate-600 dark:text-slate-400">
                          Count this as a legal delivery?
                        </label>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                        Additional Runs Run?
                      </p>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((num) => (
                          <button
                            key={num}
                            onClick={() => setWicketExtraRuns(num)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 ${wicketExtraRuns === num ? "bg-orange-500 text-white border-orange-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                            +{num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowWicketModal(false)}
                  className="flex-1 py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg">
                  Cancel
                </button>
                <button
                  onClick={submitWicket}
                  disabled={!newBatsmanId || engine.isSubmittingBall}
                  className="flex-[2] bg-red-600 text-white font-black uppercase py-5 rounded-2xl disabled:opacity-50 text-lg tracking-widest">
                  Confirm OUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXTRAS MODAL */}
      {showExtrasModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-orange-200 dark:border-orange-900/30 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase text-center mb-6 text-slate-900 dark:text-white">
              Record {pendingExtraType}
            </h2>
            <p className="text-center text-base font-bold text-slate-500 mb-6">
              Any additional runs taken?
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
              {[0, 1, 2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setExtraAdditionalRuns(num)}
                  className={`py-5 rounded-xl font-black text-2xl transition-all ${extraAdditionalRuns === num ? "bg-orange-500 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                  {num}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowExtrasModal(false)}
                className="flex-1 py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg">
                Cancel
              </button>
              <button
                onClick={submitExtra}
                className="flex-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase py-5 rounded-2xl px-6 text-lg tracking-widest">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EDIT BALL MODAL */}
      {editingBall && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border shadow-2xl">
            <h2 className="text-2xl font-black uppercase mb-6 text-center text-slate-900 dark:text-white">
              Correct Delivery
            </h2>
            <div className="space-y-8">
              {/* <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-3 text-center">
                  Runs off Bat
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[0, 2, 4, 6].map((r) => (
                    <button
                      key={r}
                      onClick={async () => {
                        await engine.updateBallDetails(editingBall, {
                          runs_off_bat: r,
                        });
                        setEditingBall(null);
                      }}
                      className={`py-5 rounded-2xl font-black text-2xl ${editingBall.runs_off_bat === r ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4 font-medium text-center">
                  Note: Only even runs can be edited here to prevent
                  strike-rotation bugs.
                </p>
              </div> */}
              <button
                onClick={() => setEditingBall(null)}
                className="w-full py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INNINGS OVER MODAL */}
      {stats.isInningsOver && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full">
            <div className="w-24 h-24 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl border border-teal-500/30">
              🏁
            </div>
            <h2 className="text-5xl font-black text-white uppercase mb-4 tracking-tight">
              {stats.isTargetReached
                ? "Target Reached!"
                : stats.isAllOut
                  ? "All Out!"
                  : "Innings Over!"}
            </h2>
            <p className="text-slate-300 font-bold text-xl mb-6">
              {stats.battingTeam?.name} finished at{" "}
              <span className="text-white text-2xl">
                {stats.currentScore}/{stats.currentWickets}
              </span>{" "}
              in {stats.currentOvers} overs.
            </p>
            {engine.match.current_innings === 2 && !stats.isTargetReached && (
              <p className="text-red-400 font-bold text-lg mb-10 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                Target was {stats.targetScore}. {stats.battingTeam?.short_name}{" "}
                lost by {stats.targetScore! - 1 - stats.currentScore} runs.
              </p>
            )}
            {engine.match.current_innings === 1 ? (
              <button
                onClick={engine.startSecondInnings}
                className="w-full bg-teal-500 text-white font-black py-6 rounded-2xl text-2xl mt-4 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20">
                START 2ND INNINGS
              </button>
            ) : (
              <button
                onClick={() => setShowPostMatchModal(true)} // <-- THIS IS THE FIX! Opens the awards modal.
                className="w-full bg-yellow-500 text-white font-black py-6 rounded-2xl text-2xl mt-4 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20">
                POST-MATCH AWARDS 🏆
              </button>
            )}
          </div>
        </div>
      )}

      {/* ON-SCREEN EDIT PLAYERS MODAL */}
      {showEditPlayersModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8">
              Edit Live Players
            </h2>
            <div className="space-y-6 mb-8">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Striker
                </label>
                <select
                  value={engine.match.live_striker_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match,
                      live_striker_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base">
                  {stats.battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Non-Striker
                </label>
                <select
                  value={engine.match.live_non_striker_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match,
                      live_non_striker_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base">
                  {stats.battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Bowler
                </label>
                <select
                  value={engine.match.live_bowler_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match,
                      live_bowler_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base">
                  {stats.bowlingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowEditPlayersModal(false);
                  engine.fetchMatchData();
                }}
                className="flex-1 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 py-5 rounded-2xl text-lg">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await engine.updateLivePlayers(
                    engine.match.live_striker_id,
                    engine.match.live_non_striker_id,
                    engine.match.live_bowler_id,
                  );
                  setShowEditPlayersModal(false);
                }}
                className="flex-[2] bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl text-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8">
              Match Settings
            </h2>
            <div className="space-y-8 mb-10">
              {/* TOTAL OVERS */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">
                  Total Overs per Innings
                </label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() =>
                      setTempOversLimit(Math.max(1, tempOversLimit - 1))
                    }
                    className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 transition-colors">
                    -
                  </button>
                  <span className="text-5xl font-black w-24 text-center">
                    {tempOversLimit}
                  </span>
                  <button
                    onClick={() => setTempOversLimit(tempOversLimit + 1)}
                    className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 transition-colors">
                    +
                  </button>
                </div>
              </div>

              {/* MAX OVERS PER BOWLER */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">
                  Max Overs per Bowler
                </label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() =>
                      setTempMaxOversPerBowler(
                        Math.max(1, tempMaxOversPerBowler - 1),
                      )
                    }
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-xl hover:bg-slate-200 transition-colors">
                    -
                  </button>
                  <span className="text-3xl font-black w-16 text-center">
                    {tempMaxOversPerBowler}
                  </span>
                  <button
                    onClick={() =>
                      setTempMaxOversPerBowler(tempMaxOversPerBowler + 1)
                    }
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-xl hover:bg-slate-200 transition-colors">
                    +
                  </button>
                </div>
              </div>

              {/* REVISED TARGET (DLS) */}
              {engine.match.current_innings === 2 && (
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 block text-center">
                    Revised Target (Rain Rule)
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() =>
                        setTempTargetScore((tempTargetScore || 0) - 1)
                      }
                      className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-2xl">
                      -
                    </button>
                    <span className="text-4xl font-black w-24 text-center text-orange-600">
                      {tempTargetScore}
                    </span>
                    <button
                      onClick={() =>
                        setTempTargetScore((tempTargetScore || 0) + 1)
                      }
                      className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-2xl">
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-center font-bold text-slate-400 mt-4 uppercase">
                    Adjust target based on DLS or Local Rules
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg">
                Cancel
              </button>
              <button
                onClick={() => {
                  // NOTE: You will need to update `engine.saveMatchSettings` in your hooks file to accept this new parameter!
                  engine.saveMatchSettings(
                    tempOversLimit,
                    tempMaxOversPerBowler, // New parameter
                    tempTargetScore,
                    stats?.targetScore,
                  );
                  setShowSettingsModal(false);
                }}
                className="flex-[2] bg-teal-500 hover:bg-teal-600 text-white font-black uppercase py-5 rounded-2xl text-lg tracking-widest">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MORE ACTIONS MODAL */}
      {showMoreModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8">
              More Actions
            </h2>
            <div className="space-y-8 mb-10">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "custom", label: "Custom Runs" },
                    { id: "penalty", label: "Penalty Runs" },
                    { id: "dead-ball", label: "Dead Ball" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setMoreActionType(type.id as any);
                        setCustomRuns(type.id === "penalty" ? 5 : 5);
                      }}
                      className={`py-4 text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === type.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              {moreActionType !== "dead-ball" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">
                    Number of Runs
                  </label>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setCustomRuns(Math.max(1, customRuns - 1))}
                      className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 dark:hover:bg-slate-700">
                      -
                    </button>
                    <input
                      type="number"
                      value={customRuns}
                      onChange={(e) =>
                        setCustomRuns(
                          Math.max(1, parseInt(e.target.value) || 0),
                        )
                      }
                      className="text-5xl font-black w-24 text-center bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none"
                    />
                    <button
                      onClick={() => setCustomRuns(customRuns + 1)}
                      className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 dark:hover:bg-slate-700">
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowMoreModal(false)}
                className="flex-1 py-5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-lg">
                Cancel
              </button>
              <button
                onClick={submitMoreAction}
                disabled={engine.isSubmittingBall}
                className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase py-5 rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 text-lg">
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-MATCH AWARDS MODAL */}
      {showPostMatchModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-yellow-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-2">
              Final Details
            </h2>

            {/* Auto-Calculated Result Text */}
            <div className="bg-slate-50 dark:bg-black p-4 rounded-2xl text-center mb-6 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Match Result
              </p>
              <p className="font-black text-teal-600 dark:text-teal-400">
                {stats.currentScore >= stats.targetScore!
                  ? `${stats.battingTeam?.name} won by ${stats.battingSquad.length - 1 - stats.currentWickets} wickets`
                  : `${stats.bowlingTeam?.name} won by ${stats.targetScore! - 1 - stats.currentScore} runs`}
              </p>
            </div>

            {/* NEW: Strict MOM Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 mb-6">
              <input
                type="checkbox"
                id="strictMom"
                checked={strictMom}
                onChange={(e) => setStrictMom(e.target.checked)}
                className="w-5 h-5 accent-yellow-500 rounded"
              />
              <label
                htmlFor="strictMom"
                className="text-xs font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest leading-tight">
                MOM must be from the winning team
              </label>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mb-2 block">
                  🏆 Player of the Match
                </label>
                <select
                  value={momId}
                  onChange={(e) => setMomId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                  <option value="">Select Player...</option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} (
                      {p.team_id === engine.match.team1_id
                        ? engine.match.team1?.short_name
                        : engine.match.team2?.short_name}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  🏏 Best Batsman
                </label>
                <select
                  value={bestBatsmanId}
                  onChange={(e) => setBestBatsmanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                  <option value="">Select Player...</option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  ⚾ Best Bowler
                </label>
                <select
                  value={bestBowlerId}
                  onChange={(e) => setBestBowlerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold">
                  <option value="">Select Player...</option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowPostMatchModal(false)}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const margin =
                      stats.currentScore >= stats.targetScore!
                        ? `${stats.battingTeam?.name} won by ${stats.battingSquad.length - 1 - stats.currentWickets} wickets`
                        : `${stats.bowlingTeam?.name} won by ${stats.targetScore! - 1 - stats.currentScore} runs`;
                    const winnerId =
                      stats.currentScore >= stats.targetScore!
                        ? stats.battingTeam?.id
                        : stats.bowlingTeam?.id;

                    await engine.finishMatch(
                      winnerId,
                      margin,
                      momId,
                      bestBatsmanId,
                      bestBowlerId,
                    );
                  }}
                  className="flex-[2] bg-yellow-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-yellow-500/20">
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickAddPlayer && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">
              Quick Add Player
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
              Adding to {stats.battingTeam?.name}
            </p>

            <input
              autoFocus
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter Full Name"
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-lg font-bold outline-none mb-6"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowQuickAddPlayer(false)}
                className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                Cancel
              </button>
              <button
                onClick={handleQuickAddPlayer}
                className="flex-[2] bg-teal-500 text-white font-black uppercase py-4 rounded-2xl">
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
