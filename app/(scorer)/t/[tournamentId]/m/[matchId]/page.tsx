"use client";
import AdBanner from "../../../../../components/AdBanner";
import { useEffect, useState, useRef, use, useContext } from "react";
import { TournamentContext } from "@/app/(scorer)/t/[tournamentId]/(hub)/layout";
import { useMatchContext } from "../../../../../hooks/useMatchContext";
// import { fetchAICommentary } from "../../../../../utils/gemini";
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
  Trash2,
} from "lucide-react";

// SUB-COMPONENTS
import Scoreboard from "./components/Scoreboard";
import ActivePlayers from "./components/ActivePlayers";
import RecentBalls from "./components/RecentBalls";
import FullScorecard from "./components/FullScorecard";
import Commentary from "./components/Commentary";
import Predictor from "./components/Predictor";
import Squads from "./components/Squads";
import Info from "./components/Info";

import { Mic, MicOff } from "lucide-react";
import {
  useVoiceScorer,
  VoiceCommand,
} from "../../../../../hooks/useVoiceScorer";
import VoiceConfirmationToast from "./components/VoiceConfirmationToast";

// IMPORT ENGINE & MATH
import { useMatchEngine } from "../../../../../hooks/useMatchEngine";
import { supabase } from "@/lib/supabase";
import {
  deriveMatchStats,
  getPlayerMatchStats,
} from "../../../../../utils/cricketMath";
import Keypad from "./components/Keypad";
import VoiceManualModal from "./components/VoiceManualModal";

export default function UnifiedLiveMatchPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const { tournamentId, matchId } = use(params);

  // 🔒 --- AUTHENTICATION STATE --- 🔒
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const engine = useMatchEngine(tournamentId, matchId);

  const { tournament } = useContext(TournamentContext);

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
    "penalty-add" | "penalty-minus" | "dead-ball" | "end-innings" | "abandon-match"
  >("penalty-add");
  const [customRuns, setCustomRuns] = useState(5);

  const [activeTab, setActiveTab] = useState("summary");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id as any);
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1].id as any);
      }
    }
  };

  const [pendingVoice, setPendingVoice] = useState<{
    command: VoiceCommand;
    text: string;
  } | null>(null);

  const { isListening, toggleListening } = useVoiceScorer(
    (command, rawText) => {
      // Added showMoreModal and showSettingsModal so it doesn't trigger if they are fixing a penalty!
      if (
        !engine.isSubmittingBall &&
        !showExtrasModal &&
        !showWicketModal &&
        !showMoreModal &&
        !showSettingsModal
      ) {
        setPendingVoice({ command, text: rawText });
      }
    },
  );

  const handleVoiceAccept = async () => {
    if (!pendingVoice) return;

    const { command } = pendingVoice;

    // Act exactly like a manual button click
    if (command.type === "runs") {
      handleRecordBall(command.value);
    } else if (command.type === "extra") {
      setPendingExtraType(command.value as any);
      setShowExtrasModal(true);
    } else if (command.type === "out") {
      setPlayerOutId(engine.match!.live_striker_id);
      setShowWicketModal(true);
    } else if (command.type === "undo") {
      // 🔥 FIX: Grab the last delivery ID to delete
      const lastDelivery = engine.deliveries[engine.deliveries.length - 1];

      if (!lastDelivery) {
        alert("No deliveries to undo.");
      } else if (window.confirm("Undo the last delivery?")) {
        await engine.deleteLastBall(lastDelivery.id); // Pass the ID here!
      }
    }

    setPendingVoice(null); // Clear the toast
  };

  // -------------------------

  // --- UPDATE YOUR KEYPAD PROPS ---
  // If the user manually taps the keypad while a voice toast is active, kill the voice toast instantly.
  const handleManualAction = () => {
    if (pendingVoice) setPendingVoice(null);
  };

  const [showPostMatchModal, setShowPostMatchModal] = useState(false);
  const [momId, setMomId] = useState("");
  const [bestBatsmanId, setBestBatsmanId] = useState("");
  const [bestBowlerId, setBestBowlerId] = useState("");
  const [strictMom, setStrictMom] = useState(true);

  const [showQuickAddPlayer, setShowQuickAddPlayer] = useState(false);
  const [quickAddRole, setQuickAddRole] = useState<"batter" | "bowler">(
    "batter",
  );

  // 🔍 --- SEARCH & SHARE STATES --- 🔍
  const [newPlayerName, setNewPlayerName] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [completedRuns, setCompletedRuns] = useState(0);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [abandonReason, setAbandonReason] = useState("No Result (Rain / Bad Light)");
  const [customResultText, setCustomResultText] = useState("");
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null); // null = No Result / Points Split

  // 🔒 --- AUTHENTICATION CHECKER --- 🔒
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // 1. Unauthenticated users are strictly blocked
        if (!session) {
          setIsAuthorized(false);
          return;
        }

        const MASTER_ADMIN_UUID = "32ada1b0-2c20-4283-9d14-cb862a73a06b";
        const isMasterAdmin = session.user.id === MASTER_ADMIN_UUID;

        // 2. Handle Quick Match Logic cleanly in one place
        if (tournamentId === "QUICK_MATCH" || tournamentId === "00000000-0000-0000-0000-000000000000") {
          if (engine.match) {
            const isCreator = session.user.id === engine.match.created_by;
            // 🌟 Master Admin overrides Quick Match lock
            setIsAuthorized(isCreator || isMasterAdmin);
          }
          return;
        }

        // 2. REGULAR TOURNAMENT MATCHES
        const { data: tData } = await supabase.from("tournaments").select("owner_id").eq("id", tournamentId).single();
        const { data: pData } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();

        // 🌟 Master Admin overrides normal roles
        const isSuperAdmin = pData?.role === "super_admin" || isMasterAdmin;
        const isTournamentOwner = tData?.owner_id === session.user.id;
        const isAssignedScorer = pData?.role === "scorer" || pData?.role === "admin";

        setIsAuthorized(isSuperAdmin || isTournamentOwner || isAssignedScorer);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [tournamentId, engine.match?.created_by]); // 💡 Optimized dependency to track the exact property safely

  const stats = deriveMatchStats(
    engine.match,
    engine.deliveries,
    engine.team1Players,
    engine.team2Players,
  );

  const isCompleted = engine.match?.status === "completed";

  const ctx = useMatchContext(engine.match, stats);

  // 🔗 --- SHARE SCORECARD LOGIC --- 🔗
  const handleShareMatch = async () => {
    setIsSharing(true);

    // 1. Safely extract names using ctx
    const t1Name = ctx?.team1Name || engine.match?.team1?.name || engine.match?.team1?.short_name || "Team 1";
    const t2Name = ctx?.team2Name || engine.match?.team2?.name || engine.match?.team2?.short_name || "Team 2";
    
    // 2. Extract match context
    const tossString = ctx?.tossString || "";
    const tournamentName = ctx?.tournamentName ? `🏆 ${ctx.tournamentName}` : "";
    const equation = ctx?.equation ? `📈 ${ctx.equation}` : "";
    const crr = ctx?.crr ? `CRR: ${ctx.crr}` : "";

    // 3. Get the live score (Using your existing stats object!)
    const currentRuns = stats?.currentScore ?? stats?.currentScore ?? engine.match?.current_score ?? 0;
    const currentWickets = stats?.currentWickets ?? stats?.currentWickets ?? engine.match?.current_wickets ?? 0;
    const currentOvers = stats?.currentOvers ?? stats?.currentOvers ?? engine.match?.current_overs ?? 0;
    
    // Figure out who is batting based on the context text
    const battingTeamStr = ctx?.scoreContextText?.includes("Bowling") 
      ? (ctx.scoreContextText.startsWith(ctx.team2ShortName) ? t1Name : t2Name) 
      : "Score";

    // 4. Build the dynamic share text formatting for WhatsApp
    const shareText = `🏏 LIVE NOW on CricSyncLive!
    ${tournamentName}

    ${tossString}

    ⚔️ ${t1Name} vs ${t2Name}
    📊 ${battingTeamStr}: ${currentRuns}/${currentWickets} in ${currentOvers} Overs
    ${equation} ${crr ? `| ${crr}` : ""}

👉 To view the Live Scoreboard click here!`;

    const url = window.location.href;

    const shareData = {
      title: "CricSyncLive Match Update",
      text: shareText,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${url}`);
        alert("Match link & details copied!"); // Replace with your Toast library if you use one
      }
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSmartEndInnings = async () => {
    if (!window.confirm("Are you sure you want to end this innings?")) return;

    if (engine.match!.current_innings === 1) {
      // 1. Let the engine officially transition the match to Innings 2
      await engine.startSecondInnings();

      // 2. Fetch fresh data so the UI reflects the change immediately
      await engine.fetchMatchData();
    } else {
      // If it's the 2nd innings, end the match completely
      setShowPostMatchModal(true);
    }

    setShowMoreModal(false);
  };
  const handleUndoEndInnings = async () => {
    if (
      !window.confirm(
        "Undo End Innings? This will set the match back to 1st Innings."
      )
    )
      return;

    // 1. Get the very last delivery of the 1st innings securely
    const inn1Deliveries = engine.deliveries.filter((d: any) => d.innings === 1);
    const lastDelivery = inn1Deliveries[inn1Deliveries.length - 1];

    // 2. Prepare the match update payload
    const matchUpdatePayload: any = {
      current_innings: 1, // Revert to Innings 1
    };

    // 3. Extract the players from that last ball to restore them to the crease!
    if (lastDelivery) {
      matchUpdatePayload.live_striker_id = lastDelivery.striker_id;
      matchUpdatePayload.live_non_striker_id = lastDelivery.non_striker_id;
      matchUpdatePayload.live_bowler_id = lastDelivery.bowler_id;
    }

    try {
      // 4. Update the match to restore the innings AND the players simultaneously
      const { error } = await supabase
        .from("matches")
        .update(matchUpdatePayload)
        .eq("id", engine.match?.id);

      if (error) {
        console.error("Supabase Update Error Details:", error.message);
        alert(`Failed to Undo: ${error.message}`);
        return;
      }

      // 5. Ask if they ALSO want to delete that last delivery (if it was a mistake)
      if (lastDelivery) {
        if (window.confirm("Do you also want to delete the last delivery of the 1st Innings?")) {
          await engine.deleteLastBall(lastDelivery.id);
        }
      }

      // 6. Refresh the UI
      await engine.fetchMatchData();
      setShowMoreModal(false);
      alert("Successfully reverted to 1st Innings!");
    } catch (err) {
      console.error("Unexpected Undo Error:", err);
    }
  };
  const handleForceAbandonMatch = async () => {
    if (!engine.match?.id) return;

    const finalResultMargin = customResultText.trim()
      ? customResultText.trim()
      : abandonReason;

    const confirmMsg = `Are you sure you want to officially end this match as:\n"${finalResultMargin}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Update the match status in Supabase
      const { error } = await supabase
        .from("matches")
        .update({
          status: "completed",
          result_margin: finalResultMargin,
          winner_id: selectedWinnerId, // null for No Result, or a specific team ID if awarded
        })
        .eq("id", engine.match.id);

      if (error) throw error;

      // 2. Refresh local state & close modal
      await engine.fetchMatchData();
      setShowMoreModal(false);
      alert("Match has been officially closed!");
    } catch (err: any) {
      console.error("Failed to abandon match:", err);
      alert("Failed to update match: " + err.message);
    }
  };
  const handleDeleteMatch = async () => {
    if (
      window.confirm("Are you sure you want to permanently delete this match?")
    ) {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (!error) {
        window.location.href = "/"; // Go back to home
      } else {
        alert("Failed to delete match: " + error.message);
      }
    }
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

        const getSlangCommentary = (latestBall: any) => {
          // If dictionary doesn't exist at all, return a basic string
          if (!COMMENTARY_SLANGS) return "Good delivery.";

          const runs = Number(latestBall.runs_off_bat || 0);
          const isWicket = latestBall.is_wicket;

          try {
            if (isWicket && COMMENTARY_SLANGS.wickets?.length > 0) {
              return COMMENTARY_SLANGS.wickets[
                Math.floor(Math.random() * COMMENTARY_SLANGS.wickets.length)
              ];
            } else if (runs === 6 && COMMENTARY_SLANGS.sixes?.length > 0) {
              return COMMENTARY_SLANGS.sixes[
                Math.floor(Math.random() * COMMENTARY_SLANGS.sixes.length)
              ];
            } else if (runs === 4 && COMMENTARY_SLANGS.fours?.length > 0) {
              return COMMENTARY_SLANGS.fours[
                Math.floor(Math.random() * COMMENTARY_SLANGS.fours.length)
              ];
            } else if (COMMENTARY_SLANGS.general?.length > 0) {
              return COMMENTARY_SLANGS.general[
                Math.floor(Math.random() * COMMENTARY_SLANGS.general.length)
              ];
            }
          } catch (e) {
            console.warn("Commentary fallback triggered", e);
          }

          // Ultimate fallback if nothing matches or arrays are empty
          return `Ball bowled. ${runs} runs scored.`;
        };
        let finalCommentaryText = getSlangCommentary(latestBall);

        // if (isMajorEvent) {
        //   const ballContext = {
        //     bowler: bowlerName,
        //     batter: batterName,
        //     runs: latestBall.runs_off_bat,
        //     isWicket: latestBall.is_wicket,
        //     extras: latestBall.extras_type,
        //     matchSituation: `Innings ${engine.match!.current_innings}`,
        //   };
        //   finalCommentaryText = (await fetchAICommentary(ballContext)) || "";
        // }

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
    if (!tournamentId || tournamentId === "QUICK_MATCH") return;

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

  // 🔍 --- LIVE GLOBAL SEARCH AUTOCOMPLETE --- 🔍
  useEffect(() => {
    const searchGlobalPlayers = async () => {
      if (!newPlayerName.trim() || newPlayerName.length < 2) {
        setGlobalSearchResults([]);
        return;
      }
      setIsSearchingGlobal(true);

      const { data } = await supabase
        .from("players")
        .select("full_name, id")
        .ilike("full_name", `%${newPlayerName.trim()}%`)
        .limit(6);

      if (data) {
        // Remove duplicate names so the dropdown looks clean
        const uniquePlayers = data.filter(
          (v, i, a) => a.findIndex((t) => t.full_name === v.full_name) === i,
        );
        setGlobalSearchResults(uniquePlayers);
      }
      setIsSearchingGlobal(false);
    };

    // Debounce the search so it doesn't spam your database
    const debounceTimer = setTimeout(searchGlobalPlayers, 300);
    return () => clearTimeout(debounceTimer);
  }, [newPlayerName]);

  useEffect(() => {
    if (stats?.isInningsOver || isCompleted) {
      setShowBowlerModal(false);
      setShowWicketModal(false);
      setShowExtrasModal(false);
      setShowMoreModal(false);
    }
  }, [stats?.isInningsOver, isCompleted, showBowlerModal]);

  // 🏏 --- BULLETPROOF QUICK ADD LOGIC --- 🏏
  const handleQuickAddPlayer = async (
    nameOverride?: string | React.MouseEvent,
  ) => {
    // If called via the dropdown list, it passes a string. If called via the main button, it passes an Event.
    const isOverride = typeof nameOverride === "string";
    const nameToSearch = isOverride ? nameOverride : newPlayerName;

    if (!nameToSearch || !nameToSearch.trim() || !engine.match || !stats)
      return;

    const normalizedName = nameToSearch.trim();
    const targetTeamId =
      quickAddRole === "batter" ? stats.battingTeam?.id : stats.bowlingTeam?.id;

    if (!targetTeamId) {
      alert("Error: Team data is missing. Please refresh.");
      return;
    }

    // 🚨 THE FIX: Convert "QUICK_MATCH" to null so Postgres doesn't crash on the UUID constraint
    const dbTournamentId = tournamentId === "QUICK_MATCH" ? null : tournamentId;

    // 1. Check if the player is ALREADY on this exact team
    const { data: teamMatch } = await supabase
      .from("players")
      .select("id")
      .eq("full_name", normalizedName)
      .eq("team_id", targetTeamId)
      .maybeSingle();

    let finalPlayerId = "";

    if (teamMatch) {
      // Player is already on the team. Just select them!
      finalPlayerId = teamMatch.id;
    } else {
      // 2. Insert directly into THIS team.
      const { data: newP, error } = await supabase
        .from("players")
        .insert({
          full_name: normalizedName,
          team_id: targetTeamId,
          tournament_id: dbTournamentId, // <-- Using the safe ID here
          role: quickAddRole,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        alert("Error adding player: " + error.message);
        return;
      }
      finalPlayerId = newP.id;
    }

    // 3. REFRESH ENGINE SO THEY APPEAR IN THE ARRAY
    await engine.refreshPlayers();
    // 4. AUTO-ASSIGN TO DROPDOWNS
    const isPreMatch = !engine.match?.live_striker_id && !isCompleted;
    if (isPreMatch) {
      if (quickAddRole === "batter") {
        if (!setupStriker) setSetupStriker(finalPlayerId);
        else if (!setupNonStriker) setSetupNonStriker(finalPlayerId);
      } else {
        setSetupBowler(finalPlayerId);
      }
    } else {
      if (quickAddRole === "batter") setNewBatsmanId(finalPlayerId);
      else setSelectedNewBowlerId(finalPlayerId);
    }

    setNewPlayerName("");
    setGlobalSearchResults([]);
    setShowQuickAddPlayer(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRecordBall = async (runs: number) => {
    const res = await engine.recordDelivery(runs);
    if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);
  };

  const submitExtra = async () => {
    if (!pendingExtraType) return;

    let runsOffBat = 0;
    let extraRuns = extraAdditionalRuns;

    // CRITICAL FIX: Route the runs to the correct columns
    if (pendingExtraType === "no-ball") {
      runsOffBat = extraAdditionalRuns; // The runs off the bat go to the striker
      extraRuns = 1; // The 1 penalty run goes to extras
    } else if (pendingExtraType === "wide") {
      runsOffBat = 0; // Wides cannot be hit with the bat
      extraRuns = extraAdditionalRuns + 1; // Penalty + any byes run
    } else {
      // Byes / Leg Byes
      runsOffBat = 0;
      extraRuns = extraAdditionalRuns;
    }

    const res = await engine.recordDelivery(
      runsOffBat,
      pendingExtraType,
      extraRuns,
      false,
    );

    if (res?.isOverComplete) setTimeout(() => setShowBowlerModal(true), 500);

    setShowExtrasModal(false);
    setPendingExtraType(null);
    setExtraAdditionalRuns(0);
  };

  const submitWicket = async () => {
    // 1. Detect if this is the last available wicket
    const availableBatsmen = stats?.battingSquad.filter(
      (p) =>
        p.id !== engine.match!.live_striker_id &&
        p.id !== engine.match!.live_non_striker_id &&
        !stats.dismissedPlayerIds.includes(p.id),
    );
    const isLastWicket = availableBatsmen?.length === 0;

    // 2. Bypass new batsman validation if it's the last wicket
    if (!isLastWicket && !newBatsmanId) return alert("Select new batsman");
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
      if (isLastWicket) {
        // THE FIX: If All Out, remove the dismissed player from the pitch by setting them to null
        const nextStriker =
          playerOutId === engine.match.live_striker_id
            ? null
            : engine.match.live_striker_id;
        const nextNonStriker =
          playerOutId === engine.match.live_non_striker_id
            ? null
            : engine.match.live_non_striker_id;
        await engine.updateLivePlayers(
          nextStriker,
          nextNonStriker,
          engine.match.live_bowler_id,
        );
      } else {
        // Normal logic for swapping in the new batsman
        let nextStriker =
          playerOutId === engine.match.live_striker_id
            ? newBatsmanId
            : engine.match.live_striker_id;
        let nextNonStriker =
          playerOutId === engine.match.live_non_striker_id
            ? newBatsmanId
            : engine.match.live_non_striker_id;

        let swapStrike = false;
        if (wicketType === "run-out" && (eRuns + runsOffBat) % 2 !== 0)
          swapStrike = true;
        if (res.isOverComplete) swapStrike = !swapStrike;

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
        if (res?.isOverComplete)
          setTimeout(() => setShowBowlerModal(true), 500);
      }
    }

    setShowWicketModal(false);
    setNewBatsmanId("");
    setFielderId("");
    setWicketHasExtra(false);
    setWicketExtraRuns(0);
    setForceLegalBall(false);
    setCompletedRuns(0);
  };

  // 🚨 FIXED: Bulletproof logic to handle Custom Actions WITHOUT false strike rotations
  const submitMoreAction = async () => {
    // Preserve the original batsmen layout so we can undo unwanted automatic rotations
    const originalStriker = engine.match!.live_striker_id;
    const originalNonStriker = engine.match!.live_non_striker_id;
    const currentBowler = engine.match!.live_bowler_id;

    let res;
    if (moreActionType === "dead-ball") {
      res = await engine.recordDelivery(0, "dead-ball", 0);
    } else if (moreActionType === "penalty-add") {
      res = await engine.recordDelivery(0, "penalty", Math.abs(customRuns));
    } else if (moreActionType === "penalty-minus") {
      res = await engine.recordDelivery(0, "penalty", -Math.abs(customRuns));
    } else {
      res = await engine.recordDelivery(customRuns, null, 0);
    }

    // Force the strikers to stay strictly exactly where they are if it's a penalty or dead ball
    if (moreActionType.includes("penalty") || moreActionType === "dead-ball") {
      await engine.updateLivePlayers(
        originalStriker,
        originalNonStriker,
        currentBowler,
      );
    }

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
      <div className="bg-[var(--surface-1)] p-10 rounded-2xl border border-[var(--border-1)] text-center max-w-md w-full shadow-2xl animate-in zoom-in-95">
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
          href={
            tournamentId === "QUICK_MATCH" ? "/" : `/t/${tournamentId}/matches`
          }
          className="flex items-center gap-2 text-[var(--text-muted)] font-bold mb-8 hover:text-[var(--accent)] w-max"
        >
          <ArrowLeft size={16} />{" "}
          {tournamentId === "QUICK_MATCH" ? "Exit Match" : "Back to Schedule"}
        </Link>
        <div className="max-w-2xl mx-auto bg-[var(--surface-1)] rounded-sm p-8 shadow-sm border border-[var(--border-1)] animate-in zoom-in-95">
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
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat p-2 mb-2 border border-[var(--border-1)]"
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
            <span className="text-[13px] sm:text-xs font-black text-[var(--text-muted)] bg-[var(--surface-2)] px-2 sm:px-3 py-1 rounded-full border border-[var(--border-1)]">
              VS
            </span>
            <div className="text-center w-28 sm:w-32">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat p-2 mb-2 border border-[var(--border-1)]"
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
                  {engine.match.team1?.name}
                </button>
                <button
                  onClick={() => setTossWinnerId(engine.match!.team2_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 transition-colors ${tossWinnerId === engine.match!.team2_id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
                >
                  {engine.match.team2?.name}
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
        <div className="max-w-2xl mx-auto bg-[var(--surface-1)] rounded-sm p-8 shadow-sm border border-[var(--border-1)] mt-10 animate-in zoom-in-95">
          <h2 className="text-2xl font-black uppercase tracking-widest text-center mb-2">
            {engine.match.current_innings === 1
              ? "First Innings Setup"
              : "Second Innings Chase"}
          </h2>
          <p className="text-center text-[var(--text-muted)] font-bold mb-8 text-lg">
            {stats.battingTeam?.name} is Batting
          </p>
          <div className="space-y-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border-1)]">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                Select Batsmen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-black tracking-widest uppercase text-[var(--text-muted)] block mb-2">
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
                  <label className="text-[13px] font-black tracking-widest uppercase text-[var(--text-muted)] block mb-2">
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
            <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border-1)]">
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

          {/* 🔍 QUICK ADD MODAL WITH LIVE SEARCH (INJECTED FOR PRE-MATCH ACCESSIBILITY) 🔍 */}
          {showQuickAddPlayer && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-2xl h-[50vh] p-8 shadow-2xl border border-[var(--border-1)] animate-in zoom-in-95 flex flex-col">
                <h2 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
                  <Search className="text-[var(--accent)]" size={20} /> Quick
                  Add Player
                </h2>
                <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
                  Search Global Database
                </p>

                <div className="relative mb-6">
                  <input
                    autoFocus
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Type a name (e.g. Virat...)"
                    className="w-full bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-1)] rounded-xl p-4 text-lg font-bold outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                  />

                  {/* LIVE SEARCH RESULTS DROPDOWN */}
                  {newPlayerName.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl shadow-xl overflow-hidden z-50">
                      {isSearchingGlobal ? (
                        <div className="p-4 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
                          Searching...
                        </div>
                      ) : globalSearchResults.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto custom-scrollbar">
                          {globalSearchResults.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAddPlayer(p.full_name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)] border-b border-[var(--border-1)] last:border-0 transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[var(--foreground)] text-left">
                                {p.full_name}
                              </span>
                              <span className="bg-[var(--accent)] text-[var(--background)] px-3 py-1.5 rounded-lg text-[13px] font-black uppercase shadow-sm whitespace-nowrap">
                                + Select
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[var(--text-muted)] text-xs font-bold">
                          No exact match. Click below to create as new player!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-auto">
                  <button
                    onClick={() => {
                      setShowQuickAddPlayer(false);
                      setNewPlayerName("");
                      setGlobalSearchResults([]);
                    }}
                    className="flex-1 py-4 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] transition-colors rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleQuickAddPlayer()}
                    disabled={!newPlayerName.trim()}
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity font-black uppercase py-4 rounded-xl shadow-lg"
                  >
                    Create New
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TAB DEFINITIONS ---
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "scorecard", label: "Full Scorecard" },
    { id: "commentary", label: "Commentary" },
    { id: "predictor", label: "Win Predictor" },
    { id: "squads", label: "Squads" },
    { id: "info", label: "Match Info" },
  ];

  // --- 5. MAIN JSX (CLEAN UNIFIED WEB LAYOUT) ---
  return (
    <div
      className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] p-2 md:p-6 font-sans relative overflow-hidden lg:overflow-visible transition-colors duration-300 ${
        /* Apply heavy bottom padding on Mobile when Keypad is active */
        isAuthorized && !isCompleted ? "pb-[250px] lg:pb-10" : "pb-10"
      }`}
    >
      {/* HEADER & TOP NAVIGATION - "THE COMMAND STRIP" */}
      <div className="max-w-[1400px] mx-auto mb-4 md:mb-6 mt-1 md:mt-2 animate-in fade-in">
        <div className="bg-[var(--surface-1)]/90 backdrop-blur-md border border-[var(--border-1)] rounded-xl p-3 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
          {/* LEFT: BACK BUTTON & MATCH DETAILS */}
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto min-w-0">
            <button
              onClick={() =>
                (window.location.href = `/t/${tournamentId}/matches`)
              }
              className="w-10 h-10 md:w-11 md:h-11 shrink-0 bg-[var(--surface-2)] rounded-full flex items-center justify-center shadow-inner border border-[var(--border-1)] hover:scale-105 active:scale-95 transition-all hover:bg-[var(--border-1)] text-[var(--foreground)]"
              aria-label="Back to matches"
            >
              <ArrowLeft size={18} className="md:w-5 md:h-5" />
            </button>

            <div className="flex-1 min-w-0">
              {/* Broadcast-style Badges */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] md:text-[13px] uppercase font-black text-[var(--accent)] tracking-widest bg-[var(--accent)]/10 px-2 py-0.5 rounded-md truncate !md:truncate max-w-[250px] md:max-w-[400px] border border-[var(--accent)]/20">
                  {ctx.tournamentName}
                </span>
                <span className="text-[9px] md:text-[13px] uppercase font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-1)] shrink-0">
                  {isCompleted
                    ? "Ended"
                    : engine.match?.current_innings === 1
                      ? "1st Innings"
                      : "2nd Innings"}
                </span>
              </div>

              <h1 className="text-base md:text-2xl font-black leading-tight truncate">
                {ctx.team1Name}{" "}
                <span className="text-[var(--text-muted)] text-sm md:text-xl font-bold mx-0.5 md:mx-1">
                  vs
                </span>{" "}
                {ctx.team2Name}
              </h1>

              <p className="text-[13px] md:text-xs text-[var(--text-muted)] mt-0.5 md:mt-1 truncate flex items-center gap-1.5 font-bold">
                <span className="text-red-400">📍</span> {ctx.venue}
                <span className="text-[var(--border-1)]">|</span>
                {ctx.oversCount} Overs
              </p>
            </div>
          </div>

          {/* RIGHT: ACTION BUTTONS */}
          <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-[var(--border-1)] md:border-none shrink-0 justify-between md:justify-end">
            <div className="flex items-center gap-2">
              {isAuthorized && (
                <span className="hidden md:flex bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-2 rounded-xl text-[13px] font-black uppercase tracking-widest items-center gap-1.5 shadow-sm">
                  <Settings size={14} /> Admin
                </span>
              )}

              {isAuthorized && (
                <button
                  onClick={handleDeleteMatch}
                  className="flex items-center justify-center gap-1.5 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-2 rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}

              <button
                onClick={handleShareMatch}
                className="flex items-center justify-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border-1)] px-3 py-2 rounded-xl text-[13px] font-black uppercase tracking-widest hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all shadow-sm active:scale-95"
              >
                {isSharing ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Share2 size={14} />
                )}
                <span>{isSharing ? "Copied" : "Share"}</span>
              </button>
            </div>

            {/* Voice Scoring Toggle (Separated slightly for focus) */}
            {isAuthorized && !isCompleted && (
              <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-[var(--border-1)]">
                <button
                  onClick={toggleListening}
                  title={
                    isListening ? "Stop Voice Scoring" : "Start Voice Scoring"
                  }
                  className={`flex items-center justify-center gap-2 px-3 py-2 md:w-auto md:h-auto rounded-xl font-black text-[13px] uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-red-600"
                      : "bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  {isListening ? <Mic size={14} /> : <MicOff size={14} />}
                  <span className="hidden sm:inline">
                    {isListening ? "Listening" : "Voice"}
                  </span>
                </button>
                <VoiceManualModal />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MASTER GRID CONTAINER --- */}
      <div
        className={`max-w-[1400px] mx-auto flex gap-6 lg:gap-8 relative animate-in fade-in ${
          isCompleted ? "flex-col lg:flex-row" : "flex-col-reverse lg:flex-row"
        }`}
      >
        {/* --- LEFT COLUMN: DYNAMIC CONTEXT (AWARDS OR SCORING KEYPAD) --- */}
        <div className="flex-1 flex flex-col gap-6 lg:max-w-[360px] xl:max-w-[420px] w-full shrink-0">
          {isCompleted ? (
            /* 🏆 COMPLETED: MATCH RESULT & AWARDS WIDGET 🏆 */
            <div className="bg-gradient-to-b from-yellow-500/15 via-[var(--surface-1)] to-[var(--surface-1)] rounded-sm p-1 border border-yellow-500/30 text-center relative shadow-lg lg:sticky lg:top-24">
              <div className="bg-[var(--surface-1)]/50 rounded-[1.8rem] p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 blur-3xl rounded-full mix-blend-screen" />

                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 text-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-5 text-4xl shadow-[0_0_30px_rgba(234,179,8,0.3)] border-4 border-[var(--surface-1)] relative z-10">
                  🏆
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 text-[var(--foreground)] relative z-10">
                  Match Result
                </h2>
                <p className="text-sm md:text-base font-black text-yellow-500 uppercase tracking-widest mb-8 relative z-10 leading-snug">
                  {engine.match.result_margin || "Processing..."}
                </p>

                <div className="flex flex-col gap-3 text-left mb-6 relative z-10">
                  {/* Hero Stat Strip */}
                  <div className="flex items-center gap-4 bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-1)] hover:border-yellow-500/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                      ⭐
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        Player of the Match
                      </p>
                      <p className="font-bold text-[var(--foreground)] truncate">
                        {engine.team1Players
                          .concat(engine.team2Players)
                          .find(
                            (p) => p.id === engine.match!.player_of_match_id,
                          )?.full_name || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-1)] hover:border-[var(--accent)]/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                      🏏
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        Best Batsman
                      </p>
                      <p className="font-bold text-[var(--foreground)] truncate">
                        {engine.team1Players
                          .concat(engine.team2Players)
                          .find((p) => p.id === engine.match!.best_batsman_id)
                          ?.full_name || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--border-1)] hover:border-[var(--accent)]/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                      ⚾
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        Best Bowler
                      </p>
                      <p className="font-bold text-[var(--foreground)] truncate">
                        {engine.team1Players
                          .concat(engine.team2Players)
                          .find((p) => p.id === engine.match!.best_bowler_id)
                          ?.full_name || "TBD"}
                      </p>
                    </div>
                  </div>
                </div>

                {isAuthorized && (
                  <button
                    onClick={() => setShowPostMatchModal(true)}
                    className="w-full relative z-10 bg-yellow-500 text-[var(--background)] font-black uppercase tracking-widest text-xs py-3.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md"
                  >
                    Edit Awards
                  </button>
                )}
              </div>
            </div>
          ) : isAuthorized ? (
            /* 🔴 LIVE (ADMIN): SCORING KEYPAD PANEL 🔴 */
            <div className="flex flex-col gap-4 md:gap-6 w-full">
              <div className="order-2 lg:order-1">
                <RecentBalls
                  deliveries={engine.deliveries}
                  currentOvers={stats.currentOvers}
                  setEditingBall={setEditingBall}
                  deleteLastBall={engine.deleteLastBall}
                  isAuthorized={isAuthorized}
                />
              </div>
              <Keypad
                engine={engine}
                handleRecordBall={handleRecordBall}
                setMoreActionType={(type) => setMoreActionType(type as any)}
                setShowMoreModal={setShowMoreModal}
                setPendingExtraType={setPendingExtraType}
                setShowExtrasModal={setShowExtrasModal}
                setPlayerOutId={setPlayerOutId}
                setShowWicketModal={setShowWicketModal}
                onManualInteraction={handleManualAction}
              />
            </div>
          ) : (
            /* 📺 LIVE (PUBLIC): BROADCAST WIDGET 📺 */
            <div className="flex flex-col gap-6 w-full lg:sticky lg:top-24">
              <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-sm p-5 shadow-sm">
                {/* Sleek Toss Indicator */}
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-[var(--border-1)]">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
                      Toss Result
                    </span>
                    <span className="font-bold text-[var(--foreground)] text-sm">
                      {ctx.tossWinnerName || "TBD"}
                    </span>
                  </div>
                  <div className="bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)] text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                    Elected to {engine.match.toss_decision || "..."}
                  </div>
                </div>

                {/* Broadcast Run Rates Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--surface-2)] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-[13px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
                      Current RR
                    </p>
                    <p className="text-2xl font-black text-[var(--foreground)]">
                      {ctx.crr || "0.00"}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-4 flex flex-col items-center justify-center text-center ${engine.match.current_innings === 2 && parseFloat(ctx.rrr) > 10 ? "bg-red-500/10 border border-red-500/20" : "bg-[var(--surface-2)]"}`}
                  >
                    <p
                      className={`text-[13px] font-black uppercase tracking-widest mb-0.5 ${engine.match.current_innings === 2 && parseFloat(ctx.rrr) > 10 ? "text-red-500" : "text-[var(--text-muted)]"}`}
                    >
                      {engine.match.current_innings === 2
                        ? "Required RR"
                        : "Proj. Score"}
                    </p>
                    <p
                      className={`text-2xl font-black ${engine.match.current_innings === 2 && parseFloat(ctx.rrr) > 10 ? "text-red-500" : "text-[var(--accent)]"}`}
                    >
                      {ctx.isChasing ? `${ctx.rrr}` : `${ctx.proj}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: MAIN CONTENT (De-boxed & Clean) --- */}
        <div className="flex-1 w-full z-10 relative flex flex-col min-w-0">
          {/* ✨ STICKY SWIPEABLE TAB BAR ✨ */}
          <div className="sticky top-[60px] md:top-[64px] z-30 bg-[var(--background)]/90 backdrop-blur-md pb-4 pt-2 -mx-2 px-2 sm:mx-0 sm:px-0">
            <div className="flex overflow-x-auto gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory touch-pan-x">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-full text-[12px] sm:text-xs md:text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 snap-start touch-manipulation border ${
                    activeTab === tab.id
                      ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-md"
                      : "bg-[var(--surface-1)] text-[var(--text-muted)] border-[var(--border-1)] hover:border-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab && (
            <div className="min-h-[60vh] md:min-h-[500px] w-full overflow-hidden pt-2">
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                {/* SUMMARY TAB */}
                {activeTab === "summary" && (
                  <div className="flex flex-col md:flex-row gap-4 flex-wrap">
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
                      currentOverDeliveries={stats.currentOverDeliveries}
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
                )}

                {/* OTHER TABS */}
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
                {activeTab === "squads" && (
                  <Squads
                    match={engine.match}
                    team1Players={engine.team1Players}
                    team2Players={engine.team2Players}
                  />
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
          )}
        </div>
      </div>

      {/* Dynamic SEO Paragraph for AdSense */}
      <div className="max-w-[1400px] m-auto">
        {/* Clean AdSense Text Block pulling straight from the context */}
        <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-5 mt-4 rounded-xl mb-6 text-[var(--text-muted)] text-sm leading-relaxed">
          <h2 className="sr-only">Live Match Details and Updates</h2>
          <p>
            Welcome to the live digital scorecard for the highly anticipated
            match between <strong>{ctx.team1Name}</strong> and{" "}
            <strong>{ctx.team2Name}</strong>, officially part of the{" "}
            <strong>{ctx.tournamentName}</strong>. The toss was won by{" "}
            <strong>{ctx.tossWinnerName}</strong>, who elected to{" "}
            <strong>{ctx.tossDecision}</strong> first. This broadcast-grade
            scoring page, powered by CricSyncLive, provides real-time
            ball-by-ball updates, live striker strike rates, bowling economy
            metrics, and comprehensive fall of wicket data. Whether you are
            tracking fantasy points or following local heroes, stay tuned as the
            innings progresses at <strong>{ctx.venue}</strong>.
          </p>
        </div>
      </div>

      {/* --- ADMIN MODALS (ONLY RENDER IF AUTHORIZED) --- */}
      {isAuthorized && !isCompleted && !stats?.isInningsOver && (
        <>
          {showBowlerModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
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
                          className={`flex items-center justify-between p-5 rounded-xl border-2 font-bold text-lg transition-colors ${selectedNewBowlerId === p.id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-1)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"}`}
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
                    className="w-full mt-6 bg-[var(--foreground)] text-[var(--background)] font-black py-5 rounded-xl disabled:opacity-30 text-lg hover:opacity-90 transition-opacity"
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
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-red-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                          className={`flex-1 p-4 rounded-xl border-2 font-bold text-sm transition-colors ${playerOutId === id ? "border-red-500 bg-red-500/10 text-red-500" : "border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
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
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                  {stats.battingSquad.filter(
                    (p) =>
                      p.id !== engine.match!.live_striker_id &&
                      p.id !== engine.match!.live_non_striker_id &&
                      !stats.dismissedPlayerIds.includes(p.id),
                  ).length === 0 ? (
                    <div className="mt-6 bg-red-500/10 p-5 rounded-xl border border-red-500/30 text-center animate-in zoom-in-95">
                      <p className="text-red-500 font-black uppercase tracking-widest text-lg">
                        ⚠️ All Out!
                      </p>
                      <p className="text-[var(--text-muted)] text-xs font-bold mt-1">
                        This is the final wicket. No batsmen remaining.
                      </p>
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
                  ) : (
                    <div>
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
                        Incoming Batsman
                      </label>
                      <select
                        value={newBatsmanId}
                        onChange={(e) => setNewBatsmanId(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                  )}
                  <hr className="border-[var(--border-1)]" />
                  <div className="bg-orange-500/10 p-5 rounded-xl border border-orange-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id="wicketExtra"
                        checked={wicketHasExtra}
                        onChange={(e) => {
                          setWicketHasExtra(e.target.checked);
                          if (e.target.checked) {
                            setForceLegalBall(true);
                          } else {
                            setForceLegalBall(false);
                          }
                        }}
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
                              className={`flex-1 py-3 text-[13px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${wicketExtraType === ext ? "bg-orange-500 text-white border-orange-500" : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"}`}
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
                      className="flex-1 py-5 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-xl text-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitWicket}
                      disabled={
                        engine.isSubmittingBall ||
                        // Only disable if it is NOT the last wicket AND no batsman is selected
                        (stats.battingSquad.filter(
                          (p) =>
                            p.id !== engine.match!.live_striker_id &&
                            p.id !== engine.match!.live_non_striker_id &&
                            !stats.dismissedPlayerIds.includes(p.id),
                        ).length > 0 &&
                          !newBatsmanId)
                      }
                      className="flex-[2] bg-red-500 hover:bg-red-600 text-white font-black uppercase py-5 rounded-xl disabled:opacity-50 text-lg tracking-widest transition-colors shadow-lg shadow-red-500/20"
                    >
                      {stats.battingSquad.filter(
                        (p) =>
                          p.id !== engine.match!.live_striker_id &&
                          p.id !== engine.match!.live_non_striker_id &&
                          !stats.dismissedPlayerIds.includes(p.id),
                      ).length === 0
                        ? "Confirm All Out"
                        : "Confirm OUT"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showExtrasModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-orange-500/30 shadow-2xl animate-in zoom-in-95">
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
                    className="flex-1 py-5 font-bold text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--foreground)] rounded-xl text-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitExtra}
                    className="flex-[2] bg-[var(--foreground)] hover:opacity-80 transition-opacity text-[var(--background)] font-black uppercase py-5 rounded-xl px-6 text-lg tracking-widest"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingBall && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl">
                <h2 className="text-2xl font-black uppercase mb-6 text-center text-[var(--foreground)]">
                  Correct Delivery
                </h2>
                <div className="space-y-8">
                  <button
                    onClick={() => setEditingBall(null)}
                    className="w-full py-5 font-bold text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--foreground)] rounded-xl text-lg transition-colors"
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
                    <p className="text-red-400 font-bold text-lg mb-10 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                      Target was {stats.targetScore}.{" "}
                      {stats.battingTeam?.short_name} lost by{" "}
                      {stats.targetScore! - 1 - stats.currentScore} runs.
                    </p>
                  )}
                {engine.match!.current_innings === 1 ? (
                  <button
                    onClick={engine.startSecondInnings}
                    className="w-full bg-[var(--accent)] text-[var(--background)] font-black py-6 rounded-xl text-2xl mt-4 hover:opacity-90 transition-opacity shadow-lg"
                  >
                    START 2ND INNINGS
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPostMatchModal(true)}
                    className="w-full bg-yellow-500 text-white font-black py-6 rounded-xl text-2xl mt-4 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    POST-MATCH AWARDS 🏆
                  </button>
                )}
              </div>
            </div>
          )}

          {/* --- EDIT LIVE PLAYERS MODAL --- */}
          {showEditPlayersModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--foreground)] text-center mb-8">
                  Edit Live Players
                </h2>

                <div className="space-y-8 mb-8">
                  {/* --- BATSMEN SECTION --- */}
                  <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border-1)]">
                    <h3 className="text-[13px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                      Current Batsmen
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[13px] font-black text-[var(--text-muted)] uppercase mb-2 block">
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
                          className="w-full p-3.5 bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
                        >
                          <option value="">Select...</option>
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
                        <label className="text-[13px] font-black text-[var(--text-muted)] uppercase mb-2 block">
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
                          className="w-full p-3.5 bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
                        >
                          <option value="">Select...</option>
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

                      {/* NEW: QUICK ADD BATTER BUTTON */}
                      <button
                        onClick={() => {
                          setQuickAddRole("batter");
                          setShowQuickAddPlayer(true);
                        }}
                        className="w-full py-3 mt-2 border-2 border-dashed border-[var(--border-1)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl text-[13px] font-black uppercase transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus size={14} /> Add Extra Batter
                      </button>
                    </div>
                  </div>

                  {/* --- BOWLER SECTION --- */}
                  <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border-1)]">
                    <h3 className="text-[13px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                      Current Bowler
                    </h3>
                    <select
                      value={engine.match!.live_bowler_id || ""}
                      onChange={(e) =>
                        engine.setMatch({
                          ...engine.match!,
                          live_bowler_id: e.target.value,
                        })
                      }
                      className="w-full p-3.5 bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] mb-4"
                    >
                      <option value="">Select...</option>
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

                    {/* NEW: QUICK ADD BOWLER BUTTON */}
                    <button
                      onClick={() => {
                        setQuickAddRole("bowler");
                        setShowQuickAddPlayer(true);
                      }}
                      className="w-full py-3 border-2 border-dashed border-[var(--border-1)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl text-[13px] font-black uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus size={14} /> Add Extra Bowler
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowEditPlayersModal(false);
                      engine.fetchMatchData();
                    }}
                    className="flex-1 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] py-5 rounded-xl text-base transition-colors"
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
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 font-black uppercase tracking-widest py-5 rounded-xl text-base transition-opacity shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSettingsModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
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
                      <p className="text-[13px] text-center font-bold text-[var(--text-muted)] mt-4 uppercase">
                        Adjust target based on DLS or Local Rules
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-5 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-xl transition-colors text-lg"
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
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 font-black uppercase py-5 rounded-xl text-lg tracking-widest transition-opacity shadow-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- MORE ACTIONS MODAL --- */}
          {showMoreModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-6 md:p-8 border border-[var(--border-1)] shadow-2xl animate-in zoom-in-95">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-center mb-6 text-[var(--foreground)]">
                  More Actions
                </h2>
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">
                      Action Type
                    </label>

                    {/* 🔥 COMPACT GRID LAYOUT 🔥 */}
                    <div className="space-y-3">
                      {/* Row 1: Penalty (+ and -) Side by Side */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setMoreActionType("penalty-add");
                            setCustomRuns(1);
                          }}
                          className={`py-3 px-4 text-[13px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === "penalty-add" ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)]"}`}
                        >
                          Penalty (+)
                        </button>
                        <button
                          onClick={() => {
                            setMoreActionType("penalty-minus");
                            setCustomRuns(1);
                          }}
                          className={`py-3 px-4 text-[13px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === "penalty-minus" ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)]"}`}
                        >
                          Penalty (-)
                        </button>
                      </div>

                      {/* Row 2: Dead Ball & End Innings */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setMoreActionType("dead-ball")}
                          className={`py-3 px-4 text-[13px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === "dead-ball" ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)]"}`}
                        >
                          Dead Ball
                        </button>
                        <button
                          onClick={() => setMoreActionType("end-innings")}
                          className={`py-3 px-4 text-[13px] sm:text-xs font-bold rounded-xl border-2 uppercase transition-colors ${moreActionType === "end-innings" ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--border-1)]"}`}
                        >
                          End Innings ⏹️
                        </button>
                      </div>

                      {/* Row 3: Force End / Abandon Match */}
                      <div className="pt-2">
                        <button
                          onClick={() => setMoreActionType("abandon-match")}
                          className={`w-full py-3 px-4 text-[13px] sm:text-xs font-black rounded-xl border-2 uppercase transition-colors flex items-center justify-center gap-2 ${moreActionType === "abandon-match" ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40"}`}
                        >
                          Force End / Abandon Match 🌧️
                        </button>
                      </div>
                      
                      {/* Revert Innings Button */}
                      {engine.match?.current_innings === 2 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                          <button
                            onClick={handleUndoEndInnings}
                            className="w-full py-3 px-4 text-xs font-black rounded-xl border-2 uppercase transition-colors bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center gap-2 shadow-sm"
                          >
                            ⚠️ Revert to 1st Innings
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. PENALTY RUNS INPUT UI */}
                  {(moreActionType === "penalty-add" || moreActionType === "penalty-minus") && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block text-center">
                        Penalty Runs
                      </label>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setCustomRuns(Math.max(1, customRuns - 1))}
                          className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-black text-2xl hover:bg-[var(--border-1)] transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={customRuns}
                          onChange={(e) => setCustomRuns(Math.max(1, parseInt(e.target.value) || 0))}
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

                  {/* 2. END INNINGS UI */}
                  {moreActionType === "end-innings" && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl animate-in fade-in slide-in-from-top-2 text-center">
                      <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest mb-2">
                        {engine.match!.current_innings === 1 ? "Start 2nd Innings" : "End Match"}
                      </h3>
                      {engine.match!.current_innings === 1 ? (
                        <p className="text-[13px] text-[var(--text-muted)] font-bold">
                          The target will be automatically calculated based on the 1st innings score plus any penalty runs.
                        </p>
                      ) : (
                        <p className="text-[13px] sm:text-xs text-[var(--text-muted)] font-bold">
                          This will finalize the match and take you to the awards screen.
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. ABANDON MATCH UI */}
                  {moreActionType === "abandon-match" && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 space-y-4 text-left">
                      <div>
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                          Outcome Reason
                        </label>
                        <select
                          value={abandonReason}
                          onChange={(e) => setAbandonReason(e.target.value)}
                          className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] p-2.5 rounded-lg font-bold text-[13px] focus:outline-none focus:border-red-500"
                        >
                          <option value="Match Abandoned due to Rain (No Result)">Rain / Abandoned (No Result)</option>
                          <option value="Match Called Off due to Bad Light">Bad Light</option>
                          <option value="Match Tied (DLS Method)">Tied (DLS Method)</option>
                          <option value="Match Forfeited">Match Forfeited</option>
                          <option value="Custom Result">Custom Reason...</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                          Custom Result Message
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Team 1 won by 12 runs (DLS)"
                          value={customResultText}
                          onChange={(e) => setCustomResultText(e.target.value)}
                          className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] p-2.5 rounded-lg font-medium text-[13px] focus:outline-none focus:border-red-500 placeholder:opacity-40"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                          Award Victory To
                        </label>
                        <select
                          value={selectedWinnerId || ""}
                          onChange={(e) => setSelectedWinnerId(e.target.value || null)}
                          className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] p-2.5 rounded-lg font-bold text-[13px] focus:outline-none focus:border-red-500"
                        >
                          <option value="">No Winner (Points Shared)</option>
                          <option value={engine.match?.team1_id}>{engine.match?.team1?.name || "Team 1"}</option>
                          <option value={engine.match?.team2_id}>{engine.match?.team2?.name || "Team 2"}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER BUTTONS */}
                <div className="flex gap-3 md:gap-4">
                  <button
                    onClick={() => setShowMoreModal(false)}
                    className="flex-1 py-4 md:py-5 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-xl transition-colors text-sm md:text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      moreActionType === "end-innings"
                        ? handleSmartEndInnings
                        : moreActionType === "abandon-match"
                        ? handleForceAbandonMatch
                        : submitMoreAction
                    }
                    disabled={engine.isSubmittingBall}
                    className={`flex-[2] text-[var(--background)] font-black uppercase py-4 md:py-5 rounded-xl transition-opacity disabled:opacity-50 text-[13px] sm:text-lg tracking-widest shadow-md ${
                      moreActionType === "end-innings"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : moreActionType === "abandon-match"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-[var(--foreground)] hover:opacity-80"
                    }`}
                  >
                    {moreActionType === "end-innings"
                      ? "Confirm End"
                      : moreActionType === "abandon-match"
                      ? "Abandon Match"
                      : "Submit Action"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🔍 QUICK ADD MODAL WITH LIVE SEARCH (NOW PLACED AT THE VERY BOTTOM OF THE ADMIN BLOCK) 🔍 */}
          {showQuickAddPlayer && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-2xl h-[50vh] p-8 shadow-2xl border border-[var(--border-1)] animate-in zoom-in-95 flex flex-col">
                <h2 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
                  <Search className="text-[var(--accent)]" size={20} /> Quick
                  Add Player
                </h2>
                <p className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
                  Search Global Database
                </p>

                <div className="relative mb-6">
                  <input
                    autoFocus
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Type a name (e.g. Virat...)"
                    className="w-full bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-1)] rounded-xl p-4 text-lg font-bold outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                  />

                  {/* LIVE SEARCH RESULTS DROPDOWN */}
                  {newPlayerName.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl shadow-xl overflow-hidden z-50">
                      {isSearchingGlobal ? (
                        <div className="p-4 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
                          Searching...
                        </div>
                      ) : globalSearchResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                          {globalSearchResults.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAddPlayer(p.full_name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)] border-b border-[var(--border-1)] last:border-0 transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[var(--foreground)] text-left">
                                {p.full_name}
                              </span>
                              <span className="bg-[var(--accent)] text-[var(--background)] px-3 py-1.5 rounded-lg text-[13px] font-black uppercase shadow-sm whitespace-nowrap">
                                + Select
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[var(--text-muted)] text-xs font-bold">
                          No exact match. Click below to create as new player!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-auto">
                  <button
                    onClick={() => {
                      setShowQuickAddPlayer(false);
                      setNewPlayerName("");
                      setGlobalSearchResults([]);
                    }}
                    className="flex-1 py-4 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] transition-colors rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleQuickAddPlayer()}
                    disabled={!newPlayerName.trim()}
                    className="flex-[2] bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity font-black uppercase py-4 rounded-xl shadow-lg"
                  >
                    Create New
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
          <div className="bg-[var(--surface-1)] rounded-2xl w-full max-w-md p-8 border border-yellow-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--foreground)] text-center mb-2">
              Final Details
            </h2>

            <div className="bg-[var(--surface-2)] p-4 rounded-xl text-center mb-6 border border-[var(--border-1)]">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                Match Result
              </p>
              <p className="font-black text-[var(--accent)] text-lg leading-tight">
                {stats.currentScore >= stats.targetScore!
                  ? `${stats.battingTeam?.name} won by ${stats.battingSquad.length - 1 - stats.currentWickets} wickets`
                  : `${stats.bowlingTeam?.name} won by ${stats.targetScore! - 1 - stats.currentScore} runs`}
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30 mb-6">
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
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-base font-bold text-[var(--foreground)] outline-none"
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
                  className="flex-1 py-4 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                {/* <button
                  onClick={async () => {
                    await engine.updateMatchAwards(
                      momId,
                      bestBatsmanId,
                      bestBowlerId,
                    );
                    setShowPostMatchModal(false);
                  }}
                  className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-[var(--background)] font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-yellow-500/20 transition-colors"
                >
                  Save Awards
                </button> */}
                <button
                  onClick={async () => {
                    // 1. Calculate the exact winner and text margin based on your current stats
                    const isChasingTeamWin =
                      stats.currentScore >= stats.targetScore!;
                    const winnerId = isChasingTeamWin
                      ? stats.battingTeam?.id
                      : stats.bowlingTeam?.id;
                    const resultMargin = isChasingTeamWin
                      ? `${stats.battingTeam?.name} won by ${stats.battingSquad.length - 1 - stats.currentWickets} wickets`
                      : `${stats.bowlingTeam?.name} won by ${stats.targetScore! - 1 - stats.currentScore} runs`;

                    // 2. Call your PERFECT finishMatch function instead of updateMatchAwards
                    await engine.finishMatch(
                      winnerId,
                      resultMargin,
                      momId,
                      bestBatsmanId,
                      bestBowlerId,
                    );

                    setShowPostMatchModal(false);
                  }}
                  className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-[var(--background)] font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-yellow-500/20 transition-colors"
                >
                  Finish Match & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingVoice && (
        <VoiceConfirmationToast
          commandText={pendingVoice.text}
          onAccept={handleVoiceAccept}
          onCancel={() => setPendingVoice(null)}
          durationMs={3000}
        />
      )}
    </div>
  );
}
