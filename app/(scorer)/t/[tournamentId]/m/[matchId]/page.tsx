"use client";
import { useEffect, useState, use, useRef } from "react";
import { fetchAICommentary } from "../../../../../utils/gemini";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Settings,
  RotateCcw,
  Square,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// SUB-COMPONENTS
import Scoreboard from "./components/Scoreboard";
import ActivePlayers from "./components/ActivePlayers";
import RecentBalls from "./components/RecentBalls";
import FullScorecard from "./components/FullScorecard";
import Commentary from "./components/Commentary";
import Predictor from "./components/Predictor";
import Info from "./components/Info";

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
  const [tempMaxOversPerBowler, setTempMaxOversPerBowler] = useState<number>(0);

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

  // Dynamic Add Player States
  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false);
  const [quickAddRole, setQuickAddRole] = useState<"batter" | "bowler">(
    "batter",
  );
  const [newPlayerName, setNewPlayerName] = useState("");

  const [completedRuns, setCompletedRuns] = useState(0);
  const [isScoringPanelOpen, setIsScoringPanelOpen] = useState(true);

  const stats = deriveMatchStats(
    engine.match,
    engine.deliveries,
    engine.team1Players,
    engine.team2Players,
  );

  // 🏏 --- PREDEFINED SLANGS DICTIONARY --- 🏏
  const COMMENTARY_SLANGS: any = {
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

  const getFallbackCommentary = (
    ball: {
      runs_off_bat: any;
      is_wicket: any;
      extras_type: any;
      wicket_type: any;
    },
    batterName: string,
    bowlerName: string,
  ) => {
    let msg = "";
    const batter = batterName.split(" ").pop();
    const bowler = bowlerName.split(" ").pop();
    const runs = Number(ball.runs_off_bat) || 0;
    const isWicket = ball.is_wicket;
    const eTypeCode = (ball.extras_type || "").toLowerCase();

    const getRandom = (cat: string) =>
      COMMENTARY_SLANGS[cat][
        Math.floor(Math.random() * COMMENTARY_SLANGS[cat].length)
      ];

    if (isWicket) {
      msg = getRandom("WICKET")
        .replace("{bowler}", bowler)
        .replace("{batter}", batter)
        .replace("{dismissal}", (ball.wicket_type || "OUT").toUpperCase());
      if (runs > 0) msg += ` Batters completed ${runs} run(s).`;
      return msg;
    }
    if (eTypeCode === "nb" || eTypeCode === "no-ball") {
      msg = getRandom("NO_BALL").replace("{bowler}", bowler);
      if (runs > 0) msg += ` Plus they scramble for ${runs} off the bat!`;
      return msg;
    }
    if (eTypeCode === "wd" || eTypeCode === "wide")
      return getRandom("WIDE").replace("{bowler}", bowler);
    if (runs === 6) return getRandom("SIX").replace("{batter}", batter);
    if (runs === 4) return getRandom("FOUR").replace("{batter}", batter);
    if (runs === 0)
      return getRandom("DOT")
        .replace("{batter}", batter)
        .replace("{bowler}", bowler);

    return getRandom("RUNS")
      .replace("{batter}", batter)
      .replace("{runs}", runs);
  };

  // 🤖 --- HYBRID COMMENTARY BACKGROUND WATCHER --- 🤖
  const processingBalls = useRef(new Set());

  useEffect(() => {
    if (!engine.deliveries || engine.deliveries.length === 0 || !stats) return;

    const latestBall = engine.deliveries[engine.deliveries.length - 1];

    if (latestBall.ai_commentary || processingBalls.current.has(latestBall.id))
      return;

    processingBalls.current.add(latestBall.id);

    const generateAndSaveCommentary = async () => {
      try {
        const batterName =
          stats.battingSquad.find((p) => p.id === latestBall.striker_id)
            ?.full_name || "Batter";
        const bowlerName =
          stats.bowlingSquad.find((p) => p.id === latestBall.bowler_id)
            ?.full_name || "Bowler";

        const isMajorEvent =
          latestBall.is_wicket || Number(latestBall.runs_off_bat) >= 4;
        let finalCommentaryText = "";

        if (isMajorEvent) {
          const ballContext = {
            bowler: bowlerName,
            batter: batterName,
            runs: latestBall.runs_off_bat,
            isWicket: latestBall.is_wicket,
            extras: latestBall.extras_type,
            matchSituation: `Innings ${engine.match.current_innings}`,
          };
          finalCommentaryText = (await fetchAICommentary(ballContext)) || "";
        }

        if (!finalCommentaryText) {
          finalCommentaryText = getFallbackCommentary(
            latestBall,
            batterName,
            bowlerName,
          );
        }

        if (finalCommentaryText) {
          await supabase
            .from("deliveries")
            .update({ ai_commentary: finalCommentaryText })
            .eq("id", latestBall.id);
        }
      } catch (err) {
        console.error("Failed to save commentary:", err);
        processingBalls.current.delete(latestBall.id);
      }
    };

    generateAndSaveCommentary();
  }, [engine.deliveries, stats, engine.match?.current_innings]);

  // --- AUTO-MVP CALCULATION ---
  useEffect(() => {
    if (showPostMatchModal && stats && engine.match) {
      const allPlayers = [...engine.team1Players, ...engine.team2Players].map(
        (p) => {
          const pStats = getPlayerMatchStats(p.id, engine.deliveries);
          return { ...p, ...pStats };
        },
      );

      const bestBat = [...allPlayers].sort((a, b) => b.runs - a.runs)[0];
      if (bestBat && bestBat.runs > 0) setBestBatsmanId(bestBat.id);

      const bestBowl = [...allPlayers].sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return b.points - a.points;
      })[0];
      if (bestBowl && bestBowl.wickets > 0) setBestBowlerId(bestBowl.id);

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
  }, [showPostMatchModal, strictMom, stats]);

  useEffect(() => {
    if (engine.match) {
      setTempOversLimit(engine.match.overs_count || 0);
      setTempMaxOversPerBowler(
        engine.match.max_overs_per_bowler ||
          Math.ceil((engine.match.overs_count || 20) / 5),
      );
      setTempTargetScore(stats?.targetScore || null);
    }
  }, [engine.match, stats?.targetScore]);

  useEffect(() => {
    if (!tournamentId) return;

    const playerSyncSub = supabase
      .channel(`player_sync_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("Real-time trigger: New player added to tournament!");
          engine.refreshPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerSyncSub);
    };
  }, [tournamentId]);

  const handleQuickAddPlayer = async () => {
    if (!newPlayerName.trim() || !engine.match || !stats) return;

    const normalizedName = newPlayerName.trim();
    const targetTeamId =
      quickAddRole === "batter" ? stats.battingTeam?.id : stats.bowlingTeam?.id;

    if (!targetTeamId) {
      alert("Error: Team data is missing. Please refresh.");
      return;
    }

    // 1. SMART DUPLICATE CHECK: Does this name already exist in this tournament?
    // (We use .limit(1) just in case your database already has duplicates in it from testing)
    const { data: existingPlayers, error: searchError } = await supabase
      .from("players")
      .select("id, full_name, team_id")
      .ilike("full_name", normalizedName)
      .eq("tournament_id", tournamentId)
      .limit(1);

    const existingPlayer = existingPlayers?.[0];

    if (existingPlayer) {
      // 2. SCENARIO A: They already exist on THIS team!
      if (existingPlayer.team_id === targetTeamId) {
        alert(
          `"${existingPlayer.full_name}" is already on the roster! Auto-selecting them now.`,
        );

        // Auto-select them in the dropdown
        if (quickAddRole === "batter") {
          setNewBatsmanId(existingPlayer.id);
        } else {
          setSelectedNewBowlerId(existingPlayer.id);
        }

        setNewPlayerName("");
        setShowQuickAddPlayer(false);
        return; // Stop here, do not create a duplicate!
      }
      // 3. SCENARIO B: They exist on a DIFFERENT team!
      else {
        alert(
          `WARNING: "${existingPlayer.full_name}" is already registered to another team in this tournament!`,
        );
        return; // Block the creation
      }
    }

    // 4. SCENARIO C: Player is completely new. Insert them safely.
    console.log(`Adding new ${quickAddRole} to Team ID: ${targetTeamId}`);

    const { data, error } = await supabase
      .from("players")
      .insert({
        full_name: normalizedName,
        team_id: targetTeamId,
        tournament_id: tournamentId,
        role: quickAddRole,
        status: "active",
      })
      .select()
      .single();

    if (!error && data) {
      await engine.fetchMatchData();

      if (quickAddRole === "batter") {
        setNewBatsmanId(data.id);
      } else {
        setSelectedNewBowlerId(data.id);
      }

      setNewPlayerName("");
      setShowQuickAddPlayer(false);
    } else {
      alert("Error: " + error?.message);
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

    // Pass completed runs to engine if it was a run-out!
    const runsOffBat = wicketType === "run-out" ? completedRuns : 0;

    const res = await engine.recordDelivery(
      runsOffBat,
      eType,
      eRuns,
      true,
      forceLegalBall,
      { playerOutId, wicketType, fielderId },
    );

    if (res?.success && engine.match) {
      let nextStriker =
        playerOutId === engine.match.live_striker_id
          ? newBatsmanId
          : engine.match.live_striker_id;
      let nextNonStriker =
        playerOutId === engine.match.live_non_striker_id
          ? newBatsmanId
          : engine.match.live_non_striker_id;

      let swapStrike = false;
      if (wicketType === "run-out" && (eRuns + runsOffBat) % 2 !== 0) {
        swapStrike = true;
      }

      if (res.isOverComplete) {
        swapStrike = !swapStrike;
      }

      if (swapStrike) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }

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
    setCompletedRuns(0);
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
              className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform"
            >
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
                        .find((p) => p.id === engine.match!.player_of_match_id)
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
                        .find((p) => p.id === engine.match!.best_batsman_id)
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
                        .find((p) => p.id === engine.match!.best_bowler_id)
                        ?.full_name || "TBD"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    (window.location.href = `/t/${tournamentId}/matches`)
                  }
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase py-4 rounded-xl hover:opacity-80 transition-opacity"
                >
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
          className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-teal-500 w-max"
        >
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
                  onClick={() => setTossWinnerId(engine.match!.team1_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === engine.match.team1_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}
                >
                  {engine.match.team1?.name}
                </button>
                <button
                  onClick={() => setTossWinnerId(engine.match!.team2_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === engine.match.team2_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}
                >
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
                    className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossDecision === "bat" ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-slate-500"}`}
                  >
                    Elected to Bat
                  </button>
                  <button
                    onClick={() => setTossDecision("bowl")}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossDecision === "bowl" ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-slate-500"}`}
                  >
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
              className="w-full mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 font-black uppercase py-4 rounded-xl"
            >
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
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold"
                  >
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
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold"
                  >
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-bold"
              >
                <option value="">Select...</option>
                {stats.bowlingSquad
                  .filter((p) => p.id !== engine.match!.live_bowler_id)
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
              className="w-full bg-teal-600 text-white font-black text-lg uppercase tracking-widest py-5 rounded-xl"
            >
              Play Ball
            </button>
          </div>
        </div>
      </div>
    );

  // --- 5. MAIN JSX (CLEAN WEB LAYOUT) ---
  return (
    // Note the pb-[320px] on mobile! This allows the user to scroll to the very bottom of the page without the floating keypad covering it.
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-2 md:p-6 pb-[280px] lg:pb-6 font-sans text-slate-900 dark:text-white relative overflow-hidden lg:overflow-visible">
      {/* HEADER & TOP NAVIGATION */}
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-6 px-2 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              (window.location.href = `/t/${tournamentId}/matches`)
            }
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg md:text-2xl uppercase tracking-tight leading-none">
              {engine.match?.team1?.name} vs {engine.match?.team2?.name}
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-teal-500 uppercase tracking-widest mt-1">
              {engine.match?.current_innings === 1
                ? "1st Innings"
                : "2nd Innings Chase"}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-[1400px] mx-auto flex flex-col-reverse lg:flex-row gap-4 relative">
        {/* LEFT COLUMN: THE SCORE, PITCH & FLOATING KEYPAD */}
        <div className="flex-1 flex flex-col gap-4 lg:max-w-[50%] xl:max-w-[40%] w-full">
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
          {/* Notice translate-y-full pushes it exactly down, leaving the top tab visible */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] lg:static lg:bg-white lg:dark:bg-slate-900 lg:p-6 lg:rounded-3xl lg:border lg:shadow-sm lg:backdrop-blur-none transition-transform duration-300 ease-in-out ${
              isScoringPanelOpen
                ? "translate-y-0"
                : "translate-y-full lg:translate-y-0"
            }`}
          >
            <h3 className="hidden lg:block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
              Record Next Ball
            </h3>
            <button
              onClick={() => setIsScoringPanelOpen(!isScoringPanelOpen)}
              className="lg:hidden absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-b-0 rounded-t-2xl px-6 py-2 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] text-slate-500 h-10 flex items-center justify-center"
            >
              {isScoringPanelOpen ? (
                <ChevronDown size={24} />
              ) : (
                <div className="flex items-center gap-2">
                  <ChevronUp size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Score Ball
                  </span>
                </div>
              )}
            </button>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3 pb-safe">
              {[0, 1, 2, 3].map((runs) => (
                <button
                  key={runs}
                  onClick={() => handleRecordBall(runs)}
                  disabled={engine.isSubmittingBall}
                  className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95"
                >
                  {runs}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
              <button
                onClick={() => handleRecordBall(4)}
                disabled={engine.isSubmittingBall}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95"
              >
                4
              </button>
              <button
                onClick={() => handleRecordBall(6)}
                disabled={engine.isSubmittingBall}
                className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-95"
              >
                6
              </button>
              <button
                onClick={() => setShowMoreModal(true)}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-black text-[11px] sm:text-sm uppercase py-3 rounded-2xl transition-all active:scale-95"
              >
                ... More
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to end this innings manually?",
                    )
                  ) {
                    engine.match!.current_innings === 1
                      ? engine.startSecondInnings()
                      : setShowPostMatchModal(true);
                  }
                }}
                className="items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl border border-orange-200 dark:border-orange-800/30"
              >
                <Square size={20} className="mb-1 mx-auto" />
                <span className="text-[10px] font-black uppercase tracking-widest block text-center mt-1">
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
                className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 border border-orange-200 dark:border-orange-500/20 text-orange-600 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
              >
                WD
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("no-ball");
                  setShowExtrasModal(true);
                }}
                className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 border border-orange-200 dark:border-orange-500/20 text-orange-600 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
              >
                NB
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("leg-bye");
                  setShowExtrasModal(true);
                }}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
              >
                LB
              </button>
              <button
                onClick={() => {
                  setPendingExtraType("bye");
                  setShowExtrasModal(true);
                }}
                className="bg-white dark:bg-slate-800 lg:bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
              >
                B
              </button>
              <button
                onClick={() => {
                  setPlayerOutId(engine.match!.live_striker_id);
                  setShowWicketModal(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
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
        <div className="flex-1 w-full lg:max-w-[50%] xl:max-w-[60%] z-10 relative">
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
                  className={`px-5 py-3 rounded-xl text-sm font-black uppercase whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                >
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
              {activeTab === "commentary" && (
                <Commentary
                  match={engine.match}
                  deliveries={engine.deliveries}
                  battingSquad={stats.battingSquad}
                  bowlingSquad={stats.bowlingSquad}
                />
              )}
              {activeTab === "predictor" && (
                <Predictor match={engine.match} stats={stats} />
              )}
              {activeTab === "info" && (
                <Info
                  match={engine.match}
                  team1Players={engine.team1Players}
                  team2Players={engine.team2Players}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
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
                  .filter((p) => p.id !== engine.match!.live_bowler_id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedNewBowlerId(p.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 font-bold text-lg ${selectedNewBowlerId === p.id ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" : "border-slate-100 dark:border-slate-800"}`}
                    >
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
                className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl disabled:opacity-30 text-lg"
              >
                Confirm Bowler
              </button>
              <button
                onClick={() => {
                  setQuickAddRole("bowler");
                  setShowQuickAddPlayer(true);
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 border-dashed rounded-xl py-3 font-bold transition-colors"
              >
                <UserPlus size={18} />
                Quick Add Bowler
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
                    engine.match!.live_striker_id,
                    engine.match!.live_non_striker_id,
                  ].map((id) => (
                    <button
                      key={id}
                      onClick={() => setPlayerOutId(id)}
                      className={`flex-1 p-4 rounded-2xl border-2 font-bold text-sm ${playerOutId === id ? "border-red-500 bg-red-50 dark:bg-red-900/10 text-red-600" : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"}`}
                    >
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
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                >
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
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                  >
                    <option value="">Select Fielder...</option>
                    {stats.bowlingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {wicketType === "run-out" && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">
                    Runs completed before wicket?
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((runs) => (
                      <button
                        key={runs}
                        type="button"
                        onClick={() => setCompletedRuns(runs)}
                        className={`flex-1 py-2 rounded-lg font-black text-lg transition-all ${
                          completedRuns === runs
                            ? "bg-teal-600 text-white shadow-md"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {runs}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Incoming Batsman
                </label>
                <select
                  value={newBatsmanId}
                  onChange={(e) => setNewBatsmanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                >
                  <option value="">Select New Batsman...</option>
                  {stats.battingSquad
                    .filter(
                      (p) =>
                        p.id !== engine.match!.live_striker_id &&
                        p.id !== engine.match!.live_non_striker_id &&
                        !stats.dismissedPlayerIds.includes(p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </select>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setQuickAddRole("batter");
                      setShowQuickAddPlayer(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-500 rounded-xl text-xs font-black uppercase transition-colors"
                  >
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
                    className="text-sm font-black text-orange-600 uppercase"
                  >
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
                          className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 uppercase ${wicketExtraType === ext ? "bg-orange-500 text-white border-orange-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}
                        >
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
                          className="text-sm font-bold text-slate-600 dark:text-slate-400"
                        >
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
                            className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 ${wicketExtraRuns === num ? "bg-orange-500 text-white border-orange-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}
                          >
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
                  className="flex-1 py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitWicket}
                  disabled={!newBatsmanId || engine.isSubmittingBall}
                  className="flex-[2] bg-red-600 hover:bg-red-500 text-white font-black uppercase py-5 rounded-2xl disabled:opacity-50 text-lg tracking-widest transition-colors"
                >
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
                  className={`py-5 rounded-xl font-black text-2xl transition-all ${extraAdditionalRuns === num ? "bg-orange-500 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowExtrasModal(false)}
                className="flex-1 py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitExtra}
                className="flex-[2] bg-slate-900 dark:bg-white hover:opacity-80 transition-opacity text-white dark:text-slate-900 font-black uppercase py-5 rounded-2xl px-6 text-lg tracking-widest"
              >
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
              <button
                onClick={() => setEditingBall(null)}
                className="w-full py-5 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg"
              >
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
            {engine.match!.current_innings === 2 && !stats.isTargetReached && (
              <p className="text-red-400 font-bold text-lg mb-10 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                Target was {stats.targetScore}. {stats.battingTeam?.short_name}{" "}
                lost by {stats.targetScore! - 1 - stats.currentScore} runs.
              </p>
            )}
            {engine.match!.current_innings === 1 ? (
              <button
                onClick={engine.startSecondInnings}
                className="w-full bg-teal-500 text-white font-black py-6 rounded-2xl text-2xl mt-4 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
              >
                START 2ND INNINGS
              </button>
            ) : (
              <button
                onClick={() => setShowPostMatchModal(true)}
                className="w-full bg-yellow-500 text-white font-black py-6 rounded-2xl text-2xl mt-4 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
              >
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
                  value={engine.match!.live_striker_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match!,
                      live_striker_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base"
                >
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
                  value={engine.match!.live_non_striker_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match!,
                      live_non_striker_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base"
                >
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
                  value={engine.match!.live_bowler_id || ""}
                  onChange={(e) =>
                    engine.setMatch({
                      ...engine.match!,
                      live_bowler_id: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base"
                >
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
                className="flex-1 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 py-5 rounded-2xl text-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await engine.updateLivePlayers(
                    engine.match!.live_striker_id,
                    engine.match!.live_non_striker_id,
                    engine.match!.live_bowler_id,
                  );
                  setShowEditPlayersModal(false);
                }}
                className="flex-[2] bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl text-lg"
              >
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
                    className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-5xl font-black w-24 text-center">
                    {tempOversLimit}
                  </span>
                  <button
                    onClick={() => setTempOversLimit(tempOversLimit + 1)}
                    className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 transition-colors"
                  >
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
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-xl hover:bg-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-3xl font-black w-16 text-center">
                    {tempMaxOversPerBowler}
                  </span>
                  <button
                    onClick={() =>
                      setTempMaxOversPerBowler(tempMaxOversPerBowler + 1)
                    }
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-xl hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* REVISED TARGET (DLS) */}
              {engine.match!.current_innings === 2 && (
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 block text-center">
                    Revised Target (Rain Rule)
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() =>
                        setTempTargetScore((tempTargetScore || 0) - 1)
                      }
                      className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-2xl"
                    >
                      -
                    </button>
                    <span className="text-4xl font-black w-24 text-center text-orange-600">
                      {tempTargetScore}
                    </span>
                    <button
                      onClick={() =>
                        setTempTargetScore((tempTargetScore || 0) + 1)
                      }
                      className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-2xl"
                    >
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
                className="flex-1 py-5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl text-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  engine.saveMatchSettings(
                    tempOversLimit,
                    tempMaxOversPerBowler,
                    tempTargetScore,
                    stats?.targetScore,
                  );
                  setShowSettingsModal(false);
                }}
                className="flex-[2] bg-teal-500 hover:bg-teal-600 text-white font-black uppercase py-5 rounded-2xl text-lg tracking-widest"
              >
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
                      className={`py-4 text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === type.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"}`}
                    >
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
                      className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
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
                      className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-2xl hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowMoreModal(false)}
                className="flex-1 py-5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitMoreAction}
                disabled={engine.isSubmittingBall}
                className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase py-5 rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 text-lg"
              >
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
                className="text-xs font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest leading-tight"
              >
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
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                >
                  <option value="">Select Player...</option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} (
                      {p.team_id === engine.match!.team1_id
                        ? engine.match!.team1?.short_name
                        : engine.match!.team2?.short_name}
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
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                >
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
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-bold"
                >
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
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl"
                >
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
                  className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-yellow-500/20 transition-colors"
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL QUICK ADD PLAYER MODAL */}
      {showQuickAddPlayer && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">
              Quick Add {quickAddRole === "batter" ? "Batter" : "Bowler"}
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
              Adding to{" "}
              {quickAddRole === "batter"
                ? stats.battingTeam?.name
                : stats.bowlingTeam?.name}
            </p>

            <input
              autoFocus
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter Full Name"
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-lg font-bold outline-none mb-6 focus:border-teal-500 transition-colors"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowQuickAddPlayer(false)}
                className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors rounded-2xl"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddPlayer}
                disabled={!newPlayerName.trim()}
                className="flex-[2] bg-teal-500 hover:bg-teal-400 disabled:opacity-50 transition-colors text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-teal-500/20"
              >
                Add {quickAddRole === "batter" ? "Batter" : "Bowler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
