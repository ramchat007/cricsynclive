import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { deriveMatchStats } from "../utils/cricketMath";

export function useMatchEngine(tournamentId: string, matchId: string) {
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingBall, setIsSubmittingBall] = useState(false);

  useEffect(() => {
    if (!matchId || matchId === "null") return;
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    const { data: mData } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*)")
      .eq("id", matchId)
      .single();
    if (mData) {
      setMatch(mData);
      const { data: s1 } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", mData.team1_id);
      const { data: s2 } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", mData.team2_id);
      const { data: dls } = await supabase
        .from("deliveries")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (s1) setTeam1Players(s1);
      if (s2) setTeam2Players(s2);
      if (dls) setDeliveries(dls);
    }
    setIsLoading(false);
  };

  const saveTossAndStart = async (
    tossWinnerId: string,
    tossDecision: string,
  ) => {
    const { error } = await supabase
      .from("matches")
      .update({
        status: "live",
        toss_winner_id: tossWinnerId,
        toss_decision: tossDecision,
      })
      .eq("id", matchId);
    if (!error) fetchMatchData();
  };

  const saveOpeners = async (
    setupStriker: string,
    setupNonStriker: string,
    setupBowler: string,
  ) => {
    const { error } = await supabase
      .from("matches")
      .update({
        live_striker_id: setupStriker,
        live_non_striker_id: setupNonStriker,
        live_bowler_id: setupBowler,
      })
      .eq("id", matchId);
    if (!error) fetchMatchData();
  };

  const manualSwapStrike = async () => {
    if (!match) return;
    const newStriker = match.live_non_striker_id;
    const newNonStriker = match.live_striker_id;
    await supabase
      .from("matches")
      .update({
        live_striker_id: newStriker,
        live_non_striker_id: newNonStriker,
      })
      .eq("id", matchId);
    setMatch((prev: any) => ({
      ...prev,
      live_striker_id: newStriker,
      live_non_striker_id: newNonStriker,
    }));
  };

  const recordDelivery = async (
    runsOffBat: number,
    extrasType: string | null = null,
    extrasRuns: number = 0,
    isWicket: boolean = false,
    forceLegal: boolean = false,
    wicketConfig?: {
      playerOutId: string;
      wicketType: string;
      fielderId: string;
    },
  ) => {
    if (isSubmittingBall || !match)
      return { success: false, isOverComplete: false };
    setIsSubmittingBall(true);

    const stats = deriveMatchStats(
      match,
      deliveries,
      team1Players,
      team2Players,
    );
    const validDeliveries = stats?.validDeliveries || 0;
    
    const eTypeLower = (extrasType || "").toLowerCase();
    const isThisBallValid =
      (eTypeLower !== "wide" &&
        eTypeLower !== "wd" &&
        eTypeLower !== "no-ball" &&
        eTypeLower !== "nb" &&
        eTypeLower !== "penalty" &&
        eTypeLower !== "dead-ball") ||
      forceLegal;

    const newDelivery = {
      match_id: matchId,
      innings: match.current_innings,
      over_number: Math.floor(validDeliveries / 6),
      ball_number: (validDeliveries % 6) + 1,
      bowler_id: match.live_bowler_id,
      striker_id: match.live_striker_id,
      non_striker_id: match.live_non_striker_id,
      runs_off_bat: runsOffBat,
      extras_type: extrasType,
      extras_runs: extrasRuns,
      is_wicket: isWicket,
      force_legal_ball: forceLegal,
      player_out_id: isWicket && wicketConfig ? wicketConfig.playerOutId : null,
      wicket_type: isWicket && wicketConfig ? wicketConfig.wicketType : null,
      fielder_id:
        isWicket &&
        wicketConfig &&
        (wicketConfig.wicketType === "caught" ||
          wicketConfig.wicketType === "run-out")
          ? wicketConfig.fielderId
          : null,
    };

    const { data, error } = await supabase
      .from("deliveries")
      .insert(newDelivery)
      .select()
      .single();

    if (!error && data) {
      setDeliveries((prev) => [...prev, data]);

      // 🔥 1. Calculate Physical Runs Ran (Isolating the 1-run penalty for Wides/NB)
      let physicalRunsRan = runsOffBat;
      if (eTypeLower === "wide" || eTypeLower === "wd" || eTypeLower === "no-ball" || eTypeLower === "nb") {
        physicalRunsRan = runsOffBat > 0 ? runsOffBat : Math.max(0, extrasRuns - 1);
      } else if (eTypeLower) {
        physicalRunsRan = extrasRuns;
      }

      let swapStrike = physicalRunsRan % 2 !== 0;

      // 🔥 2. Wicket Logic overrides
      if (isWicket && wicketConfig) {
        // Run outs might have completed runs, keep the swapStrike logic.
        // For catches/bowled/etc, new batsman takes strike under ICC rules.
        if (wicketConfig.wicketType !== "run-out") {
          swapStrike = false; 
        }
      }

      // 🔥 3. End of Over overrides
      if (isThisBallValid && (validDeliveries + 1) % 6 === 0) {
        swapStrike = !swapStrike;
      }

      // Execute Swap
      if (swapStrike) {
        await manualSwapStrike();
      }

      setIsSubmittingBall(false);
      return {
        success: true,
        isOverComplete: isThisBallValid && (validDeliveries + 1) % 6 === 0,
      };
    } else {
      alert("Failed to record ball: " + (error?.message || "Unknown error"));
      setIsSubmittingBall(false);
      return { success: false, isOverComplete: false };
    }
  };

  const changeBowler = async (selectedNewBowlerId: string) => {
    await supabase
      .from("matches")
      .update({ live_bowler_id: selectedNewBowlerId })
      .eq("id", matchId);
    setMatch((prev: any) => ({ ...prev, live_bowler_id: selectedNewBowlerId }));
  };

  const deleteLastBall = async (ballId: string) => {
    if (!deliveries.length) return;
    const lastBall = deliveries[deliveries.length - 1];
    if (ballId !== lastBall.id)
      return alert("You can only undo the most recent ball.");

    const isCrossInnings = lastBall.innings < match.current_innings;
    if (isCrossInnings) {
      if (
        !confirm(
          "This ball is from the 1st Innings. Undoing it will revert the match back to Innings 1. Continue?",
        )
      )
        return;
    } else {
      if (!confirm("Undo last ball?")) return;
    }

    setDeliveries((prev) => prev.slice(0, -1));
    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", ballId);

    if (!error) {
      if (isCrossInnings) {
        await supabase
          .from("matches")
          .update({
            current_innings: 1,
            live_striker_id: lastBall.striker_id,
            live_non_striker_id: lastBall.non_striker_id,
            live_bowler_id: lastBall.bowler_id,
          })
          .eq("id", matchId);
        window.location.reload();
        return;
      }
      const restoredState = {
        live_striker_id: lastBall.striker_id,
        live_non_striker_id: lastBall.non_striker_id,
        live_bowler_id: lastBall.bowler_id,
      };
      await supabase.from("matches").update(restoredState).eq("id", matchId);
      setMatch((prev: any) => ({ ...prev, ...restoredState }));
    } else {
      alert("Failed to undo ball.");
      fetchMatchData();
    }
  };

  const updateBallDetails = async (editingBall: any, updatedFields: any) => {
    const oldRuns = editingBall.runs_off_bat;
    const newRuns =
      updatedFields.runs_off_bat !== undefined
        ? updatedFields.runs_off_bat
        : oldRuns;
    if (oldRuns % 2 !== newRuns % 2)
      return alert(
        "Cannot change even to odd runs (changes strike). Undo instead.",
      );

    const { error } = await supabase
      .from("deliveries")
      .update(updatedFields)
      .eq("id", editingBall.id);
    if (!error)
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === editingBall.id ? { ...d, ...updatedFields } : d,
        ),
      );
  };

  const startSecondInnings = async () => {
    await supabase
      .from("matches")
      .update({
        current_innings: 2,
        live_striker_id: null,
        live_non_striker_id: null,
        live_bowler_id: null,
      })
      .eq("id", matchId);
    window.location.reload();
  };

  const finishMatch = async (
    winnerId: string,
    resultMargin: string,
    momId: string,
    bestBatId: string,
    bestBowlId: string,
  ) => {
    const getInningsTotals = (inningNum: number) => {
      const delivs = deliveries.filter((d: any) => d.innings === inningNum);
      const runs = delivs.reduce(
        (sum, d) => sum + (d.runs_off_bat || 0) + (d.extras_runs || 0),
        0,
      );
      const wickets = delivs.filter((d: any) => d.is_wicket).length;
      const balls = delivs.filter(
        (d: any) => {
          const type = (d.extras_type || "").toLowerCase();
          return (type !== "wide" && type !== "wd" && type !== "no-ball" && type !== "nb" && type !== "penalty" && type !== "dead-ball") || d.force_legal_ball;
        }
      ).length;
      return { runs, wickets, balls };
    };

    const inn1 = getInningsTotals(1);
    const inn2 = getInningsTotals(2);

    const firstBall = deliveries.find((d: any) => d.innings === 1);
    const team1BattedFirst = team1Players.some(
      (p: any) => p.id === firstBall?.striker_id,
    );

    const team1Stats = team1BattedFirst ? inn1 : inn2;
    const team2Stats = team1BattedFirst ? inn2 : inn1;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed",
        live_striker_id: null,
        live_non_striker_id: null,
        live_bowler_id: null,
        match_winner_id: winnerId,
        result_margin: resultMargin,
        player_of_match_id: momId || null,
        best_batsman_id: bestBatId || null,
        best_bowler_id: bestBowlId || null,
        team1_runs: team1Stats.runs,
        team1_wickets: team1Stats.wickets,
        team1_balls: team1Stats.balls,
        team2_runs: team2Stats.runs,
        team2_wickets: team2Stats.wickets,
        team2_balls: team2Stats.balls,
      })
      .eq("id", matchId);

    if (!error) {
      window.location.href = `/t/${tournamentId}/matches`;
    } else {
      alert("Failed to complete match: " + error.message);
    }
  };

  const saveMatchSettings = async (
    oversLimit: number,
    maxOversPerBowler: number,
    targetOverride: number | null,
    calculatedTarget: number | null,
  ) => {
    const updateData: any = {
      overs_count: oversLimit,
      max_overs_per_bowler: maxOversPerBowler,
    };

    if (match.current_innings === 2 && targetOverride !== calculatedTarget) {
      updateData.revised_target = targetOverride;
    }

    const { error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId);

    if (!error) {
      setMatch((prev: any) => ({ ...prev, ...updateData }));
    } else {
      alert("Failed to update settings: " + error.message);
    }
  };

  const updateLivePlayers = async (
    strikerId: string,
    nonStrikerId: string,
    bowlerId: string,
  ) => {
    await supabase
      .from("matches")
      .update({
        live_striker_id: strikerId,
        live_non_striker_id: nonStrikerId,
        live_bowler_id: bowlerId,
      })
      .eq("id", matchId);

    setMatch((prev: any) => ({
      ...prev,
      live_striker_id: strikerId,
      live_non_striker_id: nonStrikerId,
      live_bowler_id: bowlerId,
    }));
  };

  const refreshPlayers = async () => {
    // 1. Fetch the match again to ensure we have the latest IDs
    const { data: currentMatch } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (!currentMatch) return;

    // 2. Now fetch all players for this tournament
    const { data: allPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (allPlayers) {
      // 3. Update the state squads based on the FRESH match data
      setTeam1Players(allPlayers.filter(p => p.team_id === currentMatch.team1_id));
      setTeam2Players(allPlayers.filter(p => p.team_id === currentMatch.team2_id));
    }
  };

  return {
    match,
    setMatch,
    deliveries,
    team1Players,
    team2Players,
    isLoading,
    isSubmittingBall,
    fetchMatchData,
    saveTossAndStart,
    saveOpeners,
    manualSwapStrike,
    recordDelivery,
    changeBowler,
    deleteLastBall,
    updateBallDetails,
    startSecondInnings,
    finishMatch,
    saveMatchSettings,
    updateLivePlayers,
    refreshPlayers
  };
}