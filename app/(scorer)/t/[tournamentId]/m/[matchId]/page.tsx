"use client";
import { useEffect, useState, useRef, use } from "react";
import { fetchAICommentary } from "../../../../../utils/gemini";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Settings,
  Square,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Activity,
  Radio,
  Share2,
  Check,
  Search,
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

export default function UnifiedLiveMatchPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const { tournamentId, matchId } = use(params);

  // 🔒 --- AUTHENTICATION STATE --- 🔒
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

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
    "scorecard" | "commentary" | "predictor" | "info" | null
  >(null);

  const [showPostMatchModal, setShowPostMatchModal] = useState(false);
  const [momId, setMomId] = useState("");
  const [bestBatsmanId, setBestBatsmanId] = useState("");
  const [bestBowlerId, setBestBowlerId] = useState("");
  const [strictMom, setStrictMom] = useState(true);

  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false);
  const [quickAddRole, setQuickAddRole] = useState<"batter" | "bowler">(
    "batter",
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const [completedRuns, setCompletedRuns] = useState(0);
  const [isScoringPanelOpen, setIsScoringPanelOpen] = useState(true);

  // 🔒 --- AUTHENTICATION CHECKER --- 🔒
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setIsAuthorized(false);
          return;
        }

        const { data: tData } = await supabase
          .from("tournaments")
          .select("owner_id")
          .eq("id", tournamentId)
          .single();

        const { data: pData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const isSuperAdmin = pData?.role === "super_admin";
        const isTournamentOwner = tData?.owner_id === session.user.id;
        const isAssignedScorer =
          pData?.role === "scorer" || pData?.role === "admin";

        if (isSuperAdmin || isTournamentOwner || isAssignedScorer) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [tournamentId]);

  const stats = deriveMatchStats(
    engine.match,
    engine.deliveries,
    engine.team1Players,
    engine.team2Players,
  );

  const isCompleted = engine.match?.status === "completed";

  // 🔗 --- SHARE SCORECARD LOGIC --- 🔗
  const handleShareMatch = async () => {
    const url = window.location.href;
    setIsSharing(true);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Live Cricket: ${engine.match?.team1_name} vs ${engine.match?.team2_name}`,
          text: `Watch live scoring on CricSync! Current Score: ${stats?.currentScore}/${stats?.currentWickets}`,
          url: url,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(url);
    }
    setTimeout(() => setIsSharing(false), 2000);
  };

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

  const processingBalls = useRef(new Set());

  useEffect(() => {
    if (
      !isAuthorized ||
      !engine.deliveries ||
      engine.deliveries.length === 0 ||
      !stats
    )
      return;

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
            matchSituation: `Innings ${engine.match!.current_innings}`,
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
  }, [engine.deliveries, stats, engine.match?.current_innings, isAuthorized]);

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

    // Helper to dynamically assign the player ID depending on where we are
    const assignPlayerToContext = (playerId: string) => {
      const isPreMatchSetup = !engine.match?.live_striker_id && !isCompleted;
      if (isPreMatchSetup) {
        if (quickAddRole === "batter") {
          if (!setupStriker) setSetupStriker(playerId);
          else if (!setupNonStriker) setSetupNonStriker(playerId);
        } else {
          setSetupBowler(playerId);
        }
      } else {
        if (quickAddRole === "batter") {
          setNewBatsmanId(playerId);
        } else {
          setSelectedNewBowlerId(playerId);
        }
      }
    };

    // 1. GLOBAL SEARCH: Check if this player exists anywhere in the platform
    const { data: globalMatch } = await supabase
      .from("players")
      .select("*")
      .ilike("full_name", normalizedName)
      .limit(1);

    const existingGlobalPlayer = globalMatch?.[0];

    let finalPlayerId = "";

    if (existingGlobalPlayer) {
      // Check if they are already in THIS tournament
      const { data: localMatch } = await supabase
        .from("players")
        .select("id")
        .eq("full_name", existingGlobalPlayer.full_name)
        .eq("tournament_id", tournamentId)
        .maybeSingle();

      if (localMatch) {
        finalPlayerId = localMatch.id;
      } else {
        // Clone global player into this tournament
        const { data: newP, error } = await supabase
          .from("players")
          .insert({
            full_name: existingGlobalPlayer.full_name,
            team_id: targetTeamId,
            tournament_id: tournamentId,
            role: quickAddRole,
            status: "active",
          })
          .select()
          .single();
        if (error)
          return alert("Failed to add global player: " + error.message);
        finalPlayerId = newP.id;
      }
    } else {
      // 2. CREATE NEW: Standard insert
      const { data: newP, error } = await supabase
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
      if (error) return alert("Error: " + error.message);
      finalPlayerId = newP.id;
    }

    // 3. REFRESH ENGINE & SYNC UI
    await engine.refreshPlayers();
    await engine.fetchMatchData();

    // 4. AUTO-ASSIGN
    assignPlayerToContext(finalPlayerId);

    setNewPlayerName("");
    setShowQuickAddPlayer(false);
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

  // 🛡️ --- EXHAUSTIVE TYPE GUARD --- 🛡️
  if (isAuthorized === null || engine.isLoading || !stats || !engine.match) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center font-black text-[var(--text-muted)]">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={40}
        />
        <p className="uppercase tracking-widest text-xs">
          Loading Match Engine...
        </p>
      </div>
    );
  }

  const PublicWaitingScreen = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle: string;
  }) => (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 flex flex-col items-center justify-center font-sans">
      <div className="bg-[var(--surface-1)] p-10 rounded-[2.5rem] border border-[var(--border-1)] text-center max-w-md w-full shadow-2xl animate-in zoom-in-95">
        <Radio
          className="animate-pulse text-[var(--accent)] mx-auto mb-6"
          size={48}
        />
        <h2 className="text-2xl font-black uppercase tracking-widest mb-3 text-[var(--foreground)]">
          {title}
        </h2>
        <p className="text-[var(--text-muted)] font-bold mb-8">{subtitle}</p>
        <Link
          href={`/t/${tournamentId}/matches`}
          className="block w-full bg-[var(--surface-2)] py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[var(--border-1)] transition-colors text-[var(--foreground)]"
        >
          Return to Matches
        </Link>
      </div>
    </div>
  );

  // PRE-MATCH SETUP TOSS
  if (!engine.match.toss_winner_id) {
    if (!isAuthorized) {
      return (
        <PublicWaitingScreen
          title="Match Starting Soon"
          subtitle="Waiting for the scorer to do the toss..."
        />
      );
    }

    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 font-sans transition-colors duration-300">
        <Link
          href={`/t/${tournamentId}/matches`}
          className="flex items-center gap-2 text-[var(--text-muted)] font-bold mb-8 hover:text-[var(--accent)] w-max"
        >
          <ArrowLeft size={16} /> Back to Schedule
        </Link>
        <div className="max-w-2xl mx-auto bg-[var(--surface-1)] rounded-[2rem] p-8 shadow-sm border border-[var(--border-1)] animate-in zoom-in-95">
          <div className="flex flex-col items-center justify-center mb-10 text-center">
            <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mb-4">
              <Coins size={32} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-[var(--foreground)]">
              Pre-Match Setup
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
            <div className="text-center w-28 sm:w-32">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat p-2 mb-2 border border-[var(--border-1)]"
                style={{
                  backgroundImage: engine.match.team1?.logo_url
                    ? `url(${engine.match.team1.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-xs sm:text-sm text-[var(--foreground)] truncate">
                {engine.match.team1?.short_name}
              </p>
            </div>
            <span className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] bg-[var(--surface-2)] px-2 sm:px-3 py-1 rounded-full border border-[var(--border-1)]">
              VS
            </span>
            <div className="text-center w-28 sm:w-32">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat p-2 mb-2 border border-[var(--border-1)]"
                style={{
                  backgroundImage: engine.match.team2?.logo_url
                    ? `url(${engine.match.team2.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-xs sm:text-sm text-[var(--foreground)] truncate">
                {engine.match.team2?.short_name}
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase ml-1 mb-2 block">
                Who won the toss?
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setTossWinnerId(engine.match!.team1_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-colors ${tossWinnerId === engine.match!.team1_id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                >
                  {engine.match!.team1_name}
                </button>
                <button
                  onClick={() => setTossWinnerId(engine.match!.team2_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-colors ${tossWinnerId === engine.match!.team2_id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                >
                  {engine.match!.team2_name}
                </button>
              </div>
            </div>
            {tossWinnerId && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase ml-1 mb-2 block">
                  Decision
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTossDecision("bat")}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-colors ${tossDecision === "bat" ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--background)]" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                  >
                    Elected to Bat
                  </button>
                  <button
                    onClick={() => setTossDecision("bowl")}
                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-colors ${tossDecision === "bowl" ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--background)]" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
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
              className="w-full mt-8 bg-[var(--foreground)] text-[var(--background)] disabled:opacity-50 font-black uppercase py-4 rounded-xl transition-opacity hover:opacity-90"
            >
              Start Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PRE-MATCH SETUP BATSMEN/BOWLER
  if (!engine.match.live_striker_id && !isCompleted) {
    if (!isAuthorized) {
      return (
        <PublicWaitingScreen
          title="Toss Completed"
          subtitle={`${stats.battingTeam?.name} will bat first. Waiting for openers to take the field...`}
        />
      );
    }

    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 font-sans transition-colors duration-300">
        <div className="max-w-2xl mx-auto bg-[var(--surface-1)] rounded-[2rem] p-8 shadow-sm border border-[var(--border-1)] mt-10 animate-in zoom-in-95">
          <h2 className="text-2xl font-black uppercase tracking-widest text-center mb-2">
            {engine.match.current_innings === 1
              ? "First Innings Setup"
              : "Second Innings Chase"}
          </h2>
          <p className="text-center text-[var(--text-muted)] font-bold mb-8 text-lg">
            {stats.battingTeam?.name} is Batting
          </p>
          <div className="space-y-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border-1)]">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                Select Batsmen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] block mb-2">
                    Striker
                  </label>
                  <select
                    value={setupStriker}
                    onChange={(e) => setSetupStriker(e.target.value)}
                    className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl p-4 text-base font-bold outline-none focus:border-[var(--accent)]"
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
                  <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] block mb-2">
                    Non-Striker
                  </label>
                  <select
                    value={setupNonStriker}
                    onChange={(e) => setSetupNonStriker(e.target.value)}
                    className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl p-4 text-base font-bold outline-none focus:border-[var(--accent)]"
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
              <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                <button
                  onClick={() => {
                    setQuickAddRole("batter");
                    setShowQuickAddPlayer(true);
                  }}
                  className="w-full py-3 border-2 border-dashed border-[var(--border-1)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl text-xs font-black uppercase transition-colors"
                >
                  + Add Extra Batter to Squad
                </button>
              </div>
            </div>
            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border-1)]">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                Select Bowler
              </h3>
              <select
                value={setupBowler}
                onChange={(e) => setSetupBowler(e.target.value)}
                className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl p-4 text-base font-bold outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select...</option>
                {stats.bowlingSquad.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                <button
                  onClick={() => {
                    setQuickAddRole("bowler");
                    setShowQuickAddPlayer(true);
                  }}
                  className="w-full py-3 border-2 border-dashed border-[var(--border-1)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl text-xs font-black uppercase transition-colors"
                >
                  + Add Extra Bowler to Squad
                </button>
              </div>
            </div>
            <button
              onClick={() =>
                engine.saveOpeners(setupStriker, setupNonStriker, setupBowler)
              }
              className="w-full bg-[var(--accent)] text-[var(--background)] font-black text-lg uppercase tracking-widest py-5 rounded-xl hover:opacity-90 transition-opacity active:scale-95 shadow-lg"
            >
              Play Ball
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TAB DEFINITIONS ---
  const tabs = [
    { id: "scorecard", label: "Full Scorecard" },
    { id: "commentary", label: "Commentary" },
    { id: "predictor", label: "Win Predictor" },
    { id: "info", label: "Match Info" },
  ];

  // --- 5. MAIN JSX (CLEAN UNIFIED WEB LAYOUT) ---
  return (
    <div
      className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] p-2 md:p-6 font-sans relative overflow-hidden lg:overflow-visible transition-colors duration-300 ${
        /* Only apply heavy bottom padding on Mobile when Keypad is active */
        isAuthorized && !isCompleted ? "pb-[320px] lg:pb-10" : "pb-10"
      }`}
    >
      {/* HEADER & TOP NAVIGATION */}
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-6 px-2 mt-2 animate-in fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              (window.location.href = `/t/${tournamentId}/matches`)
            }
            className="w-12 h-12 bg-[var(--surface-1)] rounded-full flex items-center justify-center shadow-sm border border-[var(--border-1)] hover:scale-105 transition-all hover:bg-[var(--surface-2)] text-[var(--foreground)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg md:text-2xl uppercase tracking-tight leading-none text-[var(--foreground)]">
              {engine.match?.team1_name} vs {engine.match?.team2_name}
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-[var(--accent)] uppercase tracking-widest mt-1">
              {isCompleted
                ? "Match Completed"
                : engine.match?.current_innings === 1
                  ? "1st Innings"
                  : "2nd Innings Chase"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShareMatch}
            className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-1)] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm"
          >
            {isSharing ? (
              <Check size={14} className="text-emerald-500" />
            ) : (
              <Share2 size={14} />
            )}
            {isSharing ? "Link Copied" : "Share Scorecard"}
          </button>
          {isAuthorized && (
            <span className="hidden md:flex bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest items-center gap-2">
              <Settings size={12} /> Admin Mode
            </span>
          )}
        </div>
      </div>

      {/* --- MASTER GRID CONTAINER --- */}
      <div
        className={`max-w-[1400px] mx-auto flex gap-6 relative animate-in fade-in ${
          isCompleted ? "flex-col lg:flex-row" : "flex-col-reverse lg:flex-row"
        }`}
      >
        {/* --- LEFT COLUMN: DYNAMIC CONTEXT (AWARDS OR SCORING KEYPAD) --- */}
        <div className="flex-1 flex flex-col gap-6 lg:max-w-[350px] xl:max-w-[400px] w-full shrink-0">
          {isCompleted ? (
            /* COMPLETED: MATCH RESULT & AWARDS WIDGET */
            <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-[2.5rem] p-6 sm:p-8 border border-yellow-500/20 text-center relative overflow-hidden lg:sticky lg:top-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full"></div>
              <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border border-yellow-500/30">
                🏆
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-[var(--foreground)] relative z-10">
                Match Result
              </h2>
              <p className="text-xl font-bold text-yellow-500 uppercase tracking-widest mb-8 relative z-10">
                {engine.match.result_margin || "Processing..."}
              </p>

              <div className="flex flex-col gap-4 text-left mb-8 relative z-10">
                <div className="bg-[var(--surface-1)] p-5 rounded-2xl border border-[var(--border-1)] shadow-sm">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                    Player of the Match
                  </p>
                  <p className="font-black text-lg text-[var(--foreground)]">
                    {engine.team1Players
                      .concat(engine.team2Players)
                      .find((p) => p.id === engine.match!.player_of_match_id)
                      ?.full_name || "TBD"}
                  </p>
                </div>
                <div className="bg-[var(--surface-1)] p-5 rounded-2xl border border-[var(--border-1)] shadow-sm">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                    Best Batsman
                  </p>
                  <p className="font-black text-lg text-[var(--foreground)]">
                    {engine.team1Players
                      .concat(engine.team2Players)
                      .find((p) => p.id === engine.match!.best_batsman_id)
                      ?.full_name || "TBD"}
                  </p>
                </div>
                <div className="bg-[var(--surface-1)] p-5 rounded-2xl border border-[var(--border-1)] shadow-sm">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                    Best Bowler
                  </p>
                  <p className="font-black text-lg text-[var(--foreground)]">
                    {engine.team1Players
                      .concat(engine.team2Players)
                      .find((p) => p.id === engine.match!.best_bowler_id)
                      ?.full_name || "TBD"}
                  </p>
                </div>
              </div>

              {isAuthorized && (
                <button
                  onClick={() => setShowPostMatchModal(true)}
                  className="w-full relative z-10 bg-yellow-500 text-[var(--background)] font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                >
                  Edit Awards 🏆
                </button>
              )}
            </div>
          ) : isAuthorized ? (
            /* LIVE (ADMIN): SCORING KEYPAD PANEL */
            <div className="flex flex-col gap-6 w-full lg:max-w-[100%]">
              {/* Admin Recent Balls (Sits BEHIND the keypad on mobile, BELOW it on desktop) */}
              <div className="order-2 lg:order-2">
                <RecentBalls
                  deliveries={engine.deliveries}
                  currentOvers={stats.currentOvers}
                  setEditingBall={setEditingBall}
                  deleteLastBall={engine.deleteLastBall}
                  isAuthorized={isAuthorized}
                />
              </div>

              {/* Responsive Keypad wrapper (Fixed bottom sheet on mobile, static on desktop) */}
              <div
                className={`order-1 lg:order-1 fixed bottom-0 left-0 right-0 z-[100] bg-[var(--surface-1)]/95 backdrop-blur-xl border-t border-[var(--border-1)] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 transition-transform duration-300 ease-in-out ${
                  isScoringPanelOpen
                    ? "translate-y-0"
                    : "translate-y-[calc(100%-60px)] lg:translate-y-0"
                }`}
              >
                {/* Mobile Bottom-Sheet Drag Handle (Always visible when closed) */}
                <div
                  className="w-full h-[60px] flex flex-col items-center justify-center lg:hidden cursor-pointer border-b border-[var(--border-1)] bg-[var(--surface-1)] rounded-t-[2rem]"
                  onClick={() => setIsScoringPanelOpen(!isScoringPanelOpen)}
                >
                  <div className="w-12 h-1.5 bg-[var(--border-1)] rounded-full mb-1"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                    {isScoringPanelOpen ? (
                      <>
                        <ChevronDown size={14} /> Swipe down to hide
                      </>
                    ) : (
                      <>
                        <ChevronUp size={14} /> Swipe up to score
                      </>
                    )}
                  </span>
                </div>

                {/* The actual scrolling content of the keypad */}
                <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[85vh] overflow-y-auto custom-scrollbar lg:p-0 lg:max-h-none lg:overflow-visible">
                  <div className="lg:bg-[var(--surface-1)] lg:p-6 lg:rounded-[2.5rem] lg:border lg:border-[var(--border-1)] lg:shadow-sm mt-3 lg:mt-0">
                    <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 ml-1">
                      Record Next Ball
                    </h3>

                    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                      {[0, 1, 2, 3].map((runs) => (
                        <button
                          key={runs}
                          onClick={() => handleRecordBall(runs)}
                          disabled={engine.isSubmittingBall}
                          className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] disabled:opacity-50 text-[var(--foreground)] font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95"
                        >
                          {runs}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
                      <button
                        onClick={() => handleRecordBall(4)}
                        disabled={engine.isSubmittingBall}
                        className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] disabled:opacity-50 text-[var(--foreground)] font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all active:scale-95"
                      >
                        4
                      </button>
                      <button
                        onClick={() => handleRecordBall(6)}
                        disabled={engine.isSubmittingBall}
                        className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--background)] font-black text-2xl sm:text-2xl py-3 rounded-2xl transition-all shadow-lg active:scale-95"
                      >
                        6
                      </button>
                      <button
                        onClick={() => setShowMoreModal(true)}
                        className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] text-[var(--text-muted)] font-black text-[11px] sm:text-sm uppercase py-3 rounded-2xl transition-all active:scale-95"
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
                        className="items-center justify-center p-4 bg-orange-500/10 text-orange-600 rounded-2xl border border-orange-500/30 hover:bg-orange-500/20 transition-colors"
                      >
                        <Square size={20} className="mb-1 mx-auto" />
                        <span className="text-[10px] font-black uppercase tracking-widest block text-center mt-1">
                          End Innings
                        </span>
                      </button>
                    </div>

                    <hr className="border-[var(--border-1)] mb-3 sm:mb-6" />

                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setPendingExtraType("wide");
                          setShowExtrasModal(true);
                        }}
                        className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-500 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
                      >
                        WD
                      </button>
                      <button
                        onClick={() => {
                          setPendingExtraType("no-ball");
                          setShowExtrasModal(true);
                        }}
                        className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-500 font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
                      >
                        NB
                      </button>
                      <button
                        onClick={() => {
                          setPendingExtraType("leg-bye");
                          setShowExtrasModal(true);
                        }}
                        className="bg-[var(--surface-2)] hover:bg-[var(--border-1)] border border-[var(--border-1)] text-[var(--text-muted)] font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
                      >
                        LB
                      </button>
                      <button
                        onClick={() => {
                          setPendingExtraType("bye");
                          setShowExtrasModal(true);
                        }}
                        className="bg-[var(--surface-2)] hover:bg-[var(--border-1)] border border-[var(--border-1)] text-[var(--text-muted)] font-black text-xs sm:text-base uppercase py-4 sm:py-5 rounded-xl active:scale-95 transition-all"
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
                </div>
              </div>
            </div>
          ) : (
            /* LIVE (PUBLIC): EMPTY LEFT COLUMN. */
            <div className="hidden"></div>
          )}
        </div>

        {/* --- RIGHT COLUMN: MAIN CONTENT (Fixed Top + Tabs) --- */}
        <div className="flex-1 w-full z-10 relative flex flex-col gap-6 min-w-0">
          {/* 1. FIXED TOP WIDGETS (Always visible regardless of tabs) */}
          <div className="flex flex-col gap-4">
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
              isAuthorized={isAuthorized}
              openSettings={
                isAuthorized && !isCompleted
                  ? () => setShowSettingsModal(true)
                  : undefined
              }
              extras={stats.extrasBreakdown}
              deliveries={engine.deliveries}
              team1Players={engine.team1Players}
              team2Players={engine.team2Players}
            />

            {!isCompleted && (
              <ActivePlayers
                battingSquad={stats.battingSquad}
                bowlingSquad={stats.bowlingSquad}
                match={engine.match}
                manualSwapStrike={
                  isAuthorized ? engine.manualSwapStrike : undefined
                }
                strikerRuns={stats.strikerRuns}
                strikerBalls={stats.strikerBalls}
                nonStrikerRuns={stats.nonStrikerRuns}
                nonStrikerBalls={stats.nonStrikerBalls}
                bowlerOvers={stats.bowlerOvers}
                bowlerRuns={stats.bowlerRuns}
                bowlerWickets={stats.bowlerWickets}
                setShowEditPlayersModal={
                  isAuthorized ? setShowEditPlayersModal : undefined
                }
                currentOverDeliveries={stats.currentOverDeliveries}
                isAuthorized={isAuthorized}
              />
            )}

            {!isCompleted && !isAuthorized && (
              <RecentBalls
                deliveries={engine.deliveries}
                currentOvers={stats.currentOvers}
              />
            )}
          </div>

          {/* 2. TABS & CONTENT */}
          <div className="bg-[var(--surface-1)] rounded-3xl border border-[var(--border-1)] shadow-sm overflow-hidden mb-6">
            <div className="flex overflow-x-auto border-b border-[var(--border-1)] p-2 gap-2 hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(activeTab === tab.id ? null : (tab.id as any))
                  }
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black uppercase whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.id
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id ? (
                    <ChevronUp size={14} className="ml-1" />
                  ) : (
                    <ChevronDown size={14} className="ml-1 opacity-50" />
                  )}
                </button>
              ))}
            </div>

            {/* ONLY RENDER CONTENT IF A TAB IS ACTIVE */}
            {activeTab && (
              <div className="p-4 sm:p-6 min-h-[400px]">
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
            )}
          </div>
        </div>
      </div>

      {/* --- ADMIN MODALS (ONLY RENDER IF AUTHORIZED) --- */}
      {isAuthorized && !isCompleted && (
        <>
          {showBowlerModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8 text-[var(--foreground)]">
                  Over Completed!
                </h2>
                <div className="space-y-4">
                  <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Available Bowlers
                  </label>
                  <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
                    {stats.bowlingSquad
                      .filter((p) => p.id !== engine.match!.live_bowler_id)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedNewBowlerId(p.id)}
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 font-bold text-lg transition-colors ${selectedNewBowlerId === p.id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-1)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"}`}
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
                    className="w-full mt-6 bg-[var(--foreground)] text-[var(--background)] font-black py-5 rounded-2xl disabled:opacity-30 text-lg hover:opacity-90 transition-opacity"
                  >
                    Confirm Bowler
                  </button>
                  <button
                    onClick={() => {
                      setQuickAddRole("bowler");
                      setShowQuickAddPlayer(true);
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 border-dashed rounded-xl py-3 font-bold transition-colors"
                  >
                    <UserPlus size={18} /> Quick Add Bowler
                  </button>
                </div>
              </div>
            </div>
          )}

          {showWicketModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-red-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-6 text-red-500">
                  Wicket Fall!
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
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
                          className={`flex-1 p-4 rounded-2xl border-2 font-bold text-sm transition-colors ${playerOutId === id ? "border-red-500 bg-red-500/10 text-red-500" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                        >
                          {
                            stats.battingSquad.find((p) => p.id === id)
                              ?.full_name
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                      Dismissal Type
                    </label>
                    <select
                      value={wicketType}
                      onChange={(e) => setWicketType(e.target.value)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                    >
                      <option className="bg-[var(--surface-1)]" value="bowled">
                        Bowled
                      </option>
                      <option className="bg-[var(--surface-1)]" value="caught">
                        Caught
                      </option>
                      <option className="bg-[var(--surface-1)]" value="lbw">
                        LBW
                      </option>
                      <option className="bg-[var(--surface-1)]" value="run-out">
                        Run Out
                      </option>
                      <option className="bg-[var(--surface-1)]" value="stumped">
                        Stumped
                      </option>
                    </select>
                  </div>
                  {(wicketType === "caught" || wicketType === "run-out") && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                        Fielder Involved
                      </label>
                      <select
                        value={fielderId}
                        onChange={(e) => setFielderId(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                      >
                        <option className="bg-[var(--surface-1)]" value="">
                          Select Fielder...
                        </option>
                        {stats.bowlingSquad.map((p) => (
                          <option
                            className="bg-[var(--surface-1)]"
                            key={p.id}
                            value={p.id}
                          >
                            {p.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {wicketType === "run-out" && (
                    <div className="mt-4 p-4 bg-[var(--surface-2)] rounded-xl animate-in fade-in slide-in-from-top-2 border border-[var(--border-1)]">
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">
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
                                ? "bg-[var(--accent)] text-[var(--background)] shadow-md border-[var(--accent)] border"
                                : "bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)]"
                            }`}
                          >
                            {runs}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                      Incoming Batsman
                    </label>
                    <select
                      value={newBatsmanId}
                      onChange={(e) => setNewBatsmanId(e.target.value)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                    >
                      <option className="bg-[var(--surface-1)]" value="">
                        Select New Batsman...
                      </option>
                      {stats.battingSquad
                        .filter(
                          (p) =>
                            p.id !== engine.match!.live_striker_id &&
                            p.id !== engine.match!.live_non_striker_id &&
                            !stats.dismissedPlayerIds.includes(p.id),
                        )
                        .map((p) => (
                          <option
                            className="bg-[var(--surface-1)]"
                            key={p.id}
                            value={p.id}
                          >
                            {p.full_name}
                          </option>
                        ))}
                    </select>
                    <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                      <button
                        onClick={() => {
                          setQuickAddRole("batter");
                          setShowQuickAddPlayer(true);
                        }}
                        className="w-full py-3 border-2 border-dashed border-[var(--border-1)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl text-xs font-black uppercase transition-colors"
                      >
                        + Add Extra Player to Squad
                      </button>
                    </div>
                  </div>
                  <hr className="border-[var(--border-1)]" />
                  <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/30">
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
                        className="text-sm font-black text-orange-500 uppercase cursor-pointer"
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
                              className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${wicketExtraType === ext ? "bg-orange-500 text-white border-orange-500" : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                            >
                              {ext.replace("-", " ")}
                            </button>
                          ))}
                        </div>
                        {(wicketExtraType === "wide" ||
                          wicketExtraType === "no-ball") && (
                          <div className="flex items-center gap-3 p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--border-1)]">
                            <input
                              type="checkbox"
                              id="forceLegal"
                              checked={forceLegalBall}
                              onChange={(e) =>
                                setForceLegalBall(e.target.checked)
                              }
                              className="w-5 h-5 accent-[var(--accent)]"
                            />
                            <label
                              htmlFor="forceLegal"
                              className="text-sm font-bold text-[var(--text-muted)] cursor-pointer"
                            >
                              Count this as a legal delivery?
                            </label>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                            Additional Runs Run?
                          </p>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map((num) => (
                              <button
                                key={num}
                                onClick={() => setWicketExtraRuns(num)}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-colors ${wicketExtraRuns === num ? "bg-orange-500 text-white border-orange-500" : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
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
                      className="flex-1 py-5 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-2xl text-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitWicket}
                      disabled={!newBatsmanId || engine.isSubmittingBall}
                      className="flex-[2] bg-red-500 hover:bg-red-600 text-white font-black uppercase py-5 rounded-2xl disabled:opacity-50 text-lg tracking-widest transition-colors shadow-lg shadow-red-500/20"
                    >
                      Confirm OUT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showExtrasModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-orange-500/30 shadow-2xl animate-in zoom-in-95">
                <h2 className="text-3xl font-black uppercase text-center mb-6 text-[var(--foreground)]">
                  Record {pendingExtraType}
                </h2>
                <p className="text-center text-base font-bold text-[var(--text-muted)] mb-6">
                  Any additional runs taken?
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                  {[0, 1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setExtraAdditionalRuns(num)}
                      className={`py-5 rounded-xl font-black text-2xl transition-all ${extraAdditionalRuns === num ? "bg-orange-500 text-white shadow-lg" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border-1)] hover:text-[var(--foreground)]"}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowExtrasModal(false)}
                    className="flex-1 py-5 font-bold text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--foreground)] rounded-2xl text-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitExtra}
                    className="flex-[2] bg-[var(--foreground)] hover:opacity-80 transition-opacity text-[var(--background)] font-black uppercase py-5 rounded-2xl px-6 text-lg tracking-widest"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingBall && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl">
                <h2 className="text-2xl font-black uppercase mb-6 text-center text-[var(--foreground)]">
                  Correct Delivery
                </h2>
                <div className="space-y-8">
                  <button
                    onClick={() => setEditingBall(null)}
                    className="w-full py-5 font-bold text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--foreground)] rounded-2xl text-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {stats.isInningsOver && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full animate-in zoom-in-95">
                <div className="w-24 h-24 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-8 text-5xl border border-[var(--accent)]/30">
                  🏁
                </div>
                <h2 className="text-5xl font-black text-white uppercase mb-4 tracking-tight">
                  {stats.isTargetReached
                    ? "Target Reached!"
                    : stats.isAllOut
                      ? "All Out!"
                      : "Innings Over!"}
                </h2>
                <p className="text-white/70 font-bold text-xl mb-6">
                  {stats.battingTeam?.name} finished at{" "}
                  <span className="text-white text-2xl">
                    {stats.currentScore}/{stats.currentWickets}
                  </span>{" "}
                  in {stats.currentOvers} overs.
                </p>
                {engine.match!.current_innings === 2 &&
                  !stats.isTargetReached && (
                    <p className="text-red-400 font-bold text-lg mb-10 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                      Target was {stats.targetScore}.{" "}
                      {stats.battingTeam?.short_name} lost by{" "}
                      {stats.targetScore! - 1 - stats.currentScore} runs.
                    </p>
                  )}
                {engine.match!.current_innings === 1 ? (
                  <button
                    onClick={engine.startSecondInnings}
                    className="w-full bg-[var(--accent)] text-[var(--background)] font-black py-6 rounded-2xl text-2xl mt-4 hover:opacity-90 transition-opacity shadow-lg"
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

          {showEditPlayersModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--foreground)] text-center mb-8">
                  Edit Live Players
                </h2>
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
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
                      className="w-full p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] rounded-2xl font-bold text-base outline-none focus:border-[var(--accent)]"
                    >
                      {stats.battingSquad.map((p) => (
                        <option
                          className="bg-[var(--surface-1)]"
                          key={p.id}
                          value={p.id}
                        >
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
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
                      className="w-full p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] rounded-2xl font-bold text-base outline-none focus:border-[var(--accent)]"
                    >
                      {stats.battingSquad.map((p) => (
                        <option
                          className="bg-[var(--surface-1)]"
                          key={p.id}
                          value={p.id}
                        >
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
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
                      className="w-full p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] rounded-2xl font-bold text-base outline-none focus:border-[var(--accent)]"
                    >
                      {stats.bowlingSquad.map((p) => (
                        <option
                          className="bg-[var(--surface-1)]"
                          key={p.id}
                          value={p.id}
                        >
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
                    className="flex-1 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] py-5 rounded-2xl text-lg transition-colors"
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
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 font-black uppercase tracking-widest py-5 rounded-2xl text-lg transition-opacity"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSettingsModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8 text-[var(--foreground)]">
                  Match Settings
                </h2>
                <div className="space-y-8 mb-10">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block text-center">
                      Total Overs per Innings
                    </label>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() =>
                          setTempOversLimit(Math.max(1, tempOversLimit - 1))
                        }
                        className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-2xl hover:bg-[var(--border-1)] transition-colors"
                      >
                        -
                      </button>
                      <span className="text-5xl font-black w-24 text-center text-[var(--foreground)]">
                        {tempOversLimit}
                      </span>
                      <button
                        onClick={() => setTempOversLimit(tempOversLimit + 1)}
                        className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-2xl hover:bg-[var(--border-1)] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-[var(--border-1)]">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block text-center">
                      Max Overs per Bowler
                    </label>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() =>
                          setTempMaxOversPerBowler(
                            Math.max(1, tempMaxOversPerBowler - 1),
                          )
                        }
                        className="w-12 h-12 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-xl hover:bg-[var(--border-1)] transition-colors"
                      >
                        -
                      </button>
                      <span className="text-3xl font-black w-16 text-center text-[var(--foreground)]">
                        {tempMaxOversPerBowler}
                      </span>
                      <button
                        onClick={() =>
                          setTempMaxOversPerBowler(tempMaxOversPerBowler + 1)
                        }
                        className="w-12 h-12 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-xl hover:bg-[var(--border-1)] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {engine.match!.current_innings === 2 && (
                    <div className="pt-8 border-t border-[var(--border-1)] animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 block text-center">
                        Revised Target (Rain Rule)
                      </label>
                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={() =>
                            setTempTargetScore((tempTargetScore || 0) - 1)
                          }
                          className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 font-black text-2xl"
                        >
                          -
                        </button>
                        <span className="text-4xl font-black w-24 text-center text-orange-500">
                          {tempTargetScore}
                        </span>
                        <button
                          onClick={() =>
                            setTempTargetScore((tempTargetScore || 0) + 1)
                          }
                          className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 font-black text-2xl"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-center font-bold text-[var(--text-muted)] mt-4 uppercase">
                        Adjust target based on DLS or Local Rules
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-5 font-bold text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--foreground)] rounded-2xl text-lg transition-colors"
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
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 font-black uppercase py-5 rounded-2xl text-lg tracking-widest transition-opacity shadow-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMoreModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-8 text-[var(--foreground)]">
                  More Actions
                </h2>
                <div className="space-y-8 mb-10">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">
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
                          className={`py-4 text-[10px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === type.id ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)]"}`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {moreActionType !== "dead-ball" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block text-center">
                        Number of Runs
                      </label>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() =>
                            setCustomRuns(Math.max(1, customRuns - 1))
                          }
                          className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-2xl hover:bg-[var(--border-1)] transition-colors"
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
                          className="text-5xl font-black w-24 text-center text-[var(--foreground)] bg-transparent border-b-2 border-[var(--border-1)] focus:border-[var(--accent)] outline-none"
                        />
                        <button
                          onClick={() => setCustomRuns(customRuns + 1)}
                          className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-2xl hover:bg-[var(--border-1)] transition-colors"
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
                    className="flex-1 py-5 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-2xl transition-colors text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitMoreAction}
                    disabled={engine.isSubmittingBall}
                    className="flex-[2] bg-[var(--foreground)] text-[var(--background)] font-black uppercase py-5 rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 text-lg"
                  >
                    Submit Action
                  </button>
                </div>
              </div>
            </div>
          )}

          {showQuickAddPlayer && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-[var(--border-1)] animate-in zoom-in-95">
                <h2 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
                  <Search className="text-[var(--accent)]" size={20} /> Quick
                  Add Player
                </h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
                  Searching global database...
                </p>

                <input
                  autoFocus
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Full Name (e.g. MS Dhoni)"
                  className="w-full bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-1)] rounded-2xl p-4 text-lg font-bold outline-none mb-6 focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                />

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowQuickAddPlayer(false)}
                    className="flex-1 py-4 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] transition-colors rounded-2xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickAddPlayer}
                    disabled={!newPlayerName.trim()}
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity font-black uppercase py-4 rounded-2xl shadow-lg"
                  >
                    Add to Match
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🔥 MOVED OUTSIDE: Post-Match Awards Modal (Must render even if match is completed!) 🔥 */}
      {isAuthorized && showPostMatchModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--surface-1)] rounded-[2.5rem] w-full max-w-md p-8 border border-yellow-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--foreground)] text-center mb-2">
              Final Details
            </h2>

            <div className="bg-[var(--surface-2)] p-4 rounded-2xl text-center mb-6 border border-[var(--border-1)]">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                Match Result
              </p>
              <p className="font-black text-[var(--accent)] text-lg leading-tight">
                {stats.currentScore >= stats.targetScore!
                  ? `${stats.battingTeam?.name} won by ${stats.battingSquad.length - 1 - stats.currentWickets} wickets`
                  : `${stats.bowlingTeam?.name} won by ${stats.targetScore! - 1 - stats.currentScore} runs`}
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/30 mb-6">
              <input
                type="checkbox"
                id="strictMom"
                checked={strictMom}
                onChange={(e) => setStrictMom(e.target.checked)}
                className="w-5 h-5 accent-yellow-500 rounded"
              />
              <label
                htmlFor="strictMom"
                className="text-xs font-black text-yellow-500 uppercase tracking-widest leading-tight cursor-pointer"
              >
                MOM must be from the winning team
              </label>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-2 block">
                  🏆 Player of the Match
                </label>
                <select
                  value={momId}
                  onChange={(e) => setMomId(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                >
                  <option className="bg-[var(--surface-1)]" value="">
                    Select Player...
                  </option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option
                      className="bg-[var(--surface-1)]"
                      key={p.id}
                      value={p.id}
                    >
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
                <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                  🏏 Best Batsman
                </label>
                <select
                  value={bestBatsmanId}
                  onChange={(e) => setBestBatsmanId(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                >
                  <option className="bg-[var(--surface-1)]" value="">
                    Select Player...
                  </option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option
                      className="bg-[var(--surface-1)]"
                      key={p.id}
                      value={p.id}
                    >
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                  ⚾ Best Bowler
                </label>
                <select
                  value={bestBowlerId}
                  onChange={(e) => setBestBowlerId(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
                >
                  <option className="bg-[var(--surface-1)]" value="">
                    Select Player...
                  </option>
                  {[...engine.team1Players, ...engine.team2Players].map((p) => (
                    <option
                      className="bg-[var(--surface-1)]"
                      key={p.id}
                      value={p.id}
                    >
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowPostMatchModal(false)}
                  className="flex-1 py-4 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await engine.updateMatchAwards(
                      momId,
                      bestBatsmanId,
                      bestBowlerId,
                    );
                    setShowPostMatchModal(false);
                  }}
                  className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-[var(--background)] font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-yellow-500/20 transition-colors"
                >
                  Save Awards
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
