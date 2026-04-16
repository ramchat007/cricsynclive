"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";

// IMPORT SUB-COMPONENTS
import Scoreboard from "./components/Scoreboard";
import ActivePlayers from "./components/ActivePlayers";
import RecentBalls from "./components/RecentBalls";

export default function LiveScorerPage({
  params,
}: {
  params: Promise<{ tournamentId: string; matchId: string }>;
}) {
  const { tournamentId, matchId } = use(params);

  // --- 1. ALL STATES ---
  const [match, setMatch] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingBall, setIsSubmittingBall] = useState(false);

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

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState<
    "wide" | "no-ball" | "bye" | "leg-bye" | null
  >(null);
  const [extraAdditionalRuns, setExtraAdditionalRuns] = useState(0);

  const [editingBall, setEditingBall] = useState<any>(null);
  const [showEditPlayersModal, setShowEditPlayersModal] = useState(false);

  // --- 2. CORE MATH ENGINE ---
  // Isolate deliveries for the CURRENT innings
  const currentInningsDeliveries = deliveries.filter(
    (d) => d.innings === match?.current_innings,
  );
  const firstInningsDeliveries = deliveries.filter((d) => d.innings === 1);

  const validDeliveries = currentInningsDeliveries.filter(
    (d) => d.extras_type !== "wide" && d.extras_type !== "no-ball",
  ).length;
  const currentOvers = `${Math.floor(validDeliveries / 6)}.${validDeliveries % 6}`;
  const currentScore = currentInningsDeliveries.reduce(
    (total, d) => total + (d.runs_off_bat || 0) + (d.extras_runs || 0),
    0,
  );
  const currentWickets = currentInningsDeliveries.filter(
    (d) => d.is_wicket,
  ).length;
  const runRate =
    validDeliveries === 0
      ? "0.00"
      : (currentScore / (validDeliveries / 6) || 0).toFixed(2);

  // 2nd Innings Target Logic
  const targetScore =
    match?.current_innings === 2
      ? firstInningsDeliveries.reduce(
          (total, d) => total + (d.runs_off_bat || 0) + (d.extras_runs || 0),
          0,
        ) + 1
      : null;
  const isTargetReached = targetScore ? currentScore >= targetScore : false;
  const remainingRuns = targetScore ? targetScore - currentScore : 0;
  const maxBalls = match?.overs_count ? match.overs_count * 6 : 0;
  const remainingBalls = maxBalls - validDeliveries;
  const rrr =
    match?.current_innings === 2 && remainingBalls > 0
      ? ((remainingRuns / remainingBalls) * 6).toFixed(2)
      : "0.00";

  const isTeam1Batting = match
    ? (match.toss_winner_id === match.team1_id &&
        match.toss_decision === "bat") ||
      (match.toss_winner_id === match.team2_id &&
        match.toss_decision === "bowl")
    : false;

  // Flip teams for 2nd Innings
  const actualIsTeam1Batting =
    match?.current_innings === 2 ? !isTeam1Batting : isTeam1Batting;

  const battingTeam = actualIsTeam1Batting ? match?.team1 : match?.team2;
  const bowlingTeam = actualIsTeam1Batting ? match?.team2 : match?.team1;
  const battingSquad = actualIsTeam1Batting ? team1Players : team2Players;
  const bowlingSquad = actualIsTeam1Batting ? team2Players : team1Players;

  // INNINGS OVER TRIGGERS
  const isAllOut =
    battingSquad.length > 0 && currentWickets >= battingSquad.length - 1;
  const isOversComplete = match?.overs_count
    ? validDeliveries >= match.overs_count * 6
    : false;
  const isInningsOver = isAllOut || isOversComplete || isTargetReached; // Added Target Reached!

  // Player Stats (Also filtered by current innings)
  const strikerRuns = currentInningsDeliveries
    .filter((d) => d.striker_id === match?.live_striker_id)
    .reduce((sum, d) => sum + (d.runs_off_bat || 0), 0);
  const strikerBalls = currentInningsDeliveries.filter(
    (d) => d.striker_id === match?.live_striker_id && d.extras_type !== "wide",
  ).length;
  const nonStrikerRuns = currentInningsDeliveries
    .filter((d) => d.striker_id === match?.live_non_striker_id)
    .reduce((sum, d) => sum + (d.runs_off_bat || 0), 0);
  const nonStrikerBalls = currentInningsDeliveries.filter(
    (d) =>
      d.striker_id === match?.live_non_striker_id && d.extras_type !== "wide",
  ).length;

  const bowlerDelivs = currentInningsDeliveries.filter(
    (d) => d.bowler_id === match?.live_bowler_id,
  );
  const bowlerValidBalls = bowlerDelivs.filter(
    (d) => d.extras_type !== "wide" && d.extras_type !== "no-ball",
  ).length;
  const bowlerOvers = `${Math.floor(bowlerValidBalls / 6)}.${bowlerValidBalls % 6}`;
  const bowlerRuns = bowlerDelivs
    .filter((d) => d.extras_type !== "bye" && d.extras_type !== "leg-bye")
    .reduce((sum, d) => sum + (d.runs_off_bat || 0) + (d.extras_runs || 0), 0);
  const bowlerWickets = bowlerDelivs.filter((d) => d.is_wicket).length;

  // --- 3. LOGIC FUNCTIONS ---
  useEffect(() => {
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

  const saveTossAndStart = async () => {
    if (!tossWinnerId) return alert("Please select who won the toss.");
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

  const saveOpeners = async () => {
    if (!setupStriker || !setupNonStriker || !setupBowler)
      return alert("Select all 3 players.");
    if (setupStriker === setupNonStriker)
      return alert("Striker and Non-Striker cannot be the same.");
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
  ) => {
    if (isSubmittingBall) return;
    setIsSubmittingBall(true);

    const isThisBallValid = extrasType !== "wide" && extrasType !== "no-ball";
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
      player_out_id: isWicket ? playerOutId : null,
    };

    // THE FIX: Add .select().single() to immediately retrieve the generated ID from Supabase
    const { data, error } = await supabase
      .from("deliveries")
      .insert(newDelivery)
      .select()
      .single();

    if (!error && data) {
      // Push the REAL database object (which now has data.id) into the UI timeline
      setDeliveries((prev) => [...prev, data]);

      let swapStrike = runsOffBat === 1 || runsOffBat === 3;
      if (isThisBallValid && (validDeliveries + 1) % 6 === 0)
        swapStrike = !swapStrike;
      if (swapStrike) await manualSwapStrike();
      if (isThisBallValid && (validDeliveries + 1) % 6 === 0)
        setTimeout(() => setShowBowlerModal(true), 500);
    } else {
      alert("Failed to record ball: " + (error?.message || "Unknown error"));
    }

    setIsSubmittingBall(false);
  };

  const submitExtra = async () => {
    if (!pendingExtraType) return;
    let totalExtraRuns = extraAdditionalRuns;
    if (pendingExtraType === "wide" || pendingExtraType === "no-ball")
      totalExtraRuns += 1;
    await recordDelivery(0, pendingExtraType, totalExtraRuns, false);
    if (extraAdditionalRuns === 1 || extraAdditionalRuns === 3)
      await manualSwapStrike();
    setShowExtrasModal(false);
    setPendingExtraType(null);
    setExtraAdditionalRuns(0);
  };

  const submitWicket = async () => {
    if (!newBatsmanId) return alert("Select new batsman");
    setIsSubmittingBall(true);
    await recordDelivery(0, null, 0, true);
    const isStrikerOut = playerOutId === match.live_striker_id;
    const upd = {
      live_striker_id: isStrikerOut ? newBatsmanId : match.live_striker_id,
      live_non_striker_id: isStrikerOut
        ? match.live_non_striker_id
        : newBatsmanId,
    };
    await supabase.from("matches").update(upd).eq("id", matchId);
    setMatch((prev: any) => ({ ...prev, ...upd }));
    setShowWicketModal(false);
    setNewBatsmanId("");
    setIsSubmittingBall(false);
  };

  const changeBowler = async () => {
    if (!selectedNewBowlerId) return;
    await supabase
      .from("matches")
      .update({ live_bowler_id: selectedNewBowlerId })
      .eq("id", matchId);
    setMatch((prev: any) => ({ ...prev, live_bowler_id: selectedNewBowlerId }));
    setShowBowlerModal(false);
    setSelectedNewBowlerId("");
  };

  const deleteLastBall = async (ballId: string) => {
    if (!deliveries.length) return;
    const lastBall = deliveries[deliveries.length - 1];
    if (ballId !== lastBall.id)
      return alert("You can only undo the most recent ball.");

    // CROSS-INNINGS UNDO FIX
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

    // Optimistically update the UI timeline
    setDeliveries((prev) => prev.slice(0, -1));

    // Delete from Database
    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", ballId);

    if (!error) {
      if (isCrossInnings) {
        // Revert match back to Innings 1
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

      // --- THE ULTIMATE UNDO FIX ---
      // Instead of manually calculating swaps, we restore the EXACT players
      // who were on the field before this ball happened.
      const restoredState = {
        live_striker_id: lastBall.striker_id,
        live_non_striker_id: lastBall.non_striker_id,
        live_bowler_id: lastBall.bowler_id,
      };

      await supabase.from("matches").update(restoredState).eq("id", matchId);
      setMatch((prev: any) => ({ ...prev, ...restoredState }));
    } else {
      // If DB fails, revert the timeline back to reality
      fetchMatchData();
    }
  };

  const updateBallDetails = async (updatedFields: any) => {
    if (!editingBall) return;
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
    if (!error) {
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === editingBall.id ? { ...d, ...updatedFields } : d,
        ),
      );
      setEditingBall(null);
    }
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

  const finishMatch = async () => {
    // You can optionally calculate and save the result string here if your DB has a 'result' column
    const { error } = await supabase
      .from("matches")
      .update({
        status: "completed",
        live_striker_id: null,
        live_non_striker_id: null,
        live_bowler_id: null,
      })
      .eq("id", matchId);

    if (!error) {
      window.location.href = `/t/${tournamentId}/matches`;
    } else {
      alert("Failed to complete match: " + error.message);
    }
  };

  // --- 4. EARLY RETURNS (Loading, Toss, Openers) ---
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">
        LOADING MATCH...
      </div>
    );
  if (!match) return <div>Match not found.</div>;

  if (!match.toss_winner_id)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
        <Link
          href={`/t/${tournamentId}/matches`}
          className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-teal-500 w-max">
          <ArrowLeft size={16} /> Back to Schedule
        </Link>
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl">
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
                  backgroundImage: match.team1?.logo_url
                    ? `url(${match.team1.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-sm">{match.team1?.short_name}</p>
            </div>
            <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              VS
            </span>
            <div className="text-center w-32">
              <div
                className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 bg-contain bg-center p-2 mb-2"
                style={{
                  backgroundImage: match.team2?.logo_url
                    ? `url(${match.team2.logo_url})`
                    : "none",
                }}
              />
              <p className="font-black text-sm">{match.team2?.short_name}</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">
                Who won the toss?
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setTossWinnerId(match.team1_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === match.team1_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}>
                  {match.team1?.name}
                </button>
                <button
                  onClick={() => setTossWinnerId(match.team2_id)}
                  className={`flex-1 py-4 rounded-xl font-bold border-2 ${tossWinnerId === match.team2_id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200 text-slate-500"}`}>
                  {match.team2?.name}
                </button>
              </div>
            </div>
            {tossWinnerId && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">
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
              onClick={saveTossAndStart}
              disabled={!tossWinnerId}
              className="w-full mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 font-black uppercase py-4 rounded-xl">
              Start Match
            </button>
          </div>
        </div>
      </div>
    );

  if (!match.live_striker_id)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl mt-10">
          <h2 className="text-2xl font-black uppercase tracking-widest text-center mb-2">
            {match.current_innings === 1
              ? "First Innings Setup"
              : "Second Innings Chase"}
          </h2>
          <p className="text-center text-slate-500 font-bold mb-8">
            {battingTeam?.name} is Batting
          </p>
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-black p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Select Batsmen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Striker
                  </label>
                  <select
                    value={setupStriker}
                    onChange={(e) => setSetupStriker(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option value="">Select...</option>
                    {battingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Non-Striker
                  </label>
                  <select
                    value={setupNonStriker}
                    onChange={(e) => setSetupNonStriker(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                    <option value="">Select...</option>
                    {battingSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-black p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Select Bowler
              </h3>
              <select
                value={setupBowler}
                onChange={(e) => setSetupBowler(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="">Select...</option>
                {bowlingSquad.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveOpeners}
              className="w-full bg-teal-600 text-white font-black uppercase tracking-widest py-4 rounded-xl">
              Play Ball
            </button>
          </div>
        </div>
      </div>
    );

  // --- 5. MAIN JSX (SCORING DASHBOARD) ---
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans pb-20">
      {/* Navbar */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <Link
          href={`/t/${tournamentId}/matches`}
          className="text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-teal-500">
            Innings {match.current_innings}
          </p>
          <p className="text-sm font-bold">
            {match.team1?.short_name} vs {match.team2?.short_name}
          </p>
        </div>
        <div className="w-6" />
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* EXTERNAL COMPONENTS */}
        <Scoreboard
          battingTeam={battingTeam}
          currentScore={currentScore}
          currentWickets={currentWickets}
          currentOvers={currentOvers}
          match={match}
          runRate={runRate}
          targetScore={targetScore}
          rrr={rrr}
          remainingRuns={remainingRuns}
          remainingBalls={remainingBalls} // NEW PROPS
        />

        <ActivePlayers
          battingSquad={battingSquad}
          bowlingSquad={bowlingSquad}
          match={match}
          manualSwapStrike={manualSwapStrike}
          strikerRuns={strikerRuns}
          strikerBalls={strikerBalls}
          nonStrikerRuns={nonStrikerRuns}
          nonStrikerBalls={nonStrikerBalls}
          bowlerOvers={bowlerOvers}
          bowlerRuns={bowlerRuns}
          bowlerWickets={bowlerWickets}
          setShowEditPlayersModal={setShowEditPlayersModal} // NEW PROP
        />

        {/* SCORING CONTROLS */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-slate-200 dark:border-slate-800 mt-6">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[0, 1, 2, 3].map((runs) => (
              <button
                key={runs}
                onClick={() => recordDelivery(runs)}
                disabled={isSubmittingBall}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl py-6 rounded-2xl transition-colors">
                {runs}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => recordDelivery(4)}
              disabled={isSubmittingBall}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 text-slate-900 dark:text-white font-black text-2xl py-6 rounded-2xl transition-colors">
              4
            </button>
            <button
              onClick={() => recordDelivery(6)}
              disabled={isSubmittingBall}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-black text-2xl py-6 rounded-2xl transition-colors shadow-lg shadow-teal-500/20">
              6
            </button>
            <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 font-black text-sm uppercase py-6 rounded-2xl col-span-2">
              ... More
            </button>
          </div>
          <hr className="border-slate-100 dark:border-slate-800 mb-4" />
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => {
                setPendingExtraType("wide");
                setShowExtrasModal(true);
              }}
              className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 text-orange-600 font-black text-sm uppercase py-4 rounded-xl">
              WD
            </button>
            <button
              onClick={() => {
                setPendingExtraType("no-ball");
                setShowExtrasModal(true);
              }}
              className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 text-orange-600 font-black text-sm uppercase py-4 rounded-xl">
              NB
            </button>
            <button
              onClick={() => {
                setPendingExtraType("leg-bye");
                setShowExtrasModal(true);
              }}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 font-black text-sm uppercase py-4 rounded-xl">
              LB
            </button>
            <button
              onClick={() => {
                setPendingExtraType("bye");
                setShowExtrasModal(true);
              }}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 font-black text-sm uppercase py-4 rounded-xl">
              B
            </button>
            <button
              onClick={() => {
                setPlayerOutId(match.live_striker_id);
                setShowWicketModal(true);
              }}
              className="bg-red-500 hover:bg-red-400 text-white font-black text-sm uppercase py-4 rounded-xl shadow-lg shadow-red-500/20">
              OUT
            </button>
          </div>
        </div>

        {/* RECENT BALLS COMPONENT */}
        <RecentBalls
          deliveries={deliveries}
          currentOvers={currentOvers}
          setEditingBall={setEditingBall}
          deleteLastBall={deleteLastBall}
        />
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Available Bowlers
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {bowlingSquad
                  .filter((p) => p.id !== match.live_bowler_id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedNewBowlerId(p.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 font-bold ${selectedNewBowlerId === p.id ? "border-teal-500 bg-teal-50" : "border-slate-100"}`}>
                      <span>{p.full_name}</span>
                    </button>
                  ))}
              </div>
              <button
                onClick={changeBowler}
                disabled={!selectedNewBowlerId}
                className="w-full mt-6 bg-slate-900 text-white font-black py-5 rounded-2xl disabled:opacity-30">
                Confirm Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. WICKET MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-red-200 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-6">
              Wicket Fall!
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Who is out?
                </label>
                <div className="flex gap-2">
                  {[match.live_striker_id, match.live_non_striker_id].map(
                    (id) => (
                      <button
                        key={id}
                        onClick={() => setPlayerOutId(id)}
                        className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs ${playerOutId === id ? "border-red-500 bg-red-50 text-red-600" : "border-slate-100 text-slate-500"}`}>
                        {battingSquad.find((p) => p.id === id)?.full_name}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Dismissal Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border rounded-xl p-3 text-sm font-bold">
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="run-out">Run Out</option>
                  <option value="stumped">Stumped</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Incoming Batsman
                </label>
                <select
                  value={newBatsmanId}
                  onChange={(e) => setNewBatsmanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border rounded-xl p-3 text-sm font-bold">
                  <option value="">Select New Batsman...</option>
                  {battingSquad
                    .filter(
                      (p) =>
                        p.id !== match.live_striker_id &&
                        p.id !== match.live_non_striker_id,
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowWicketModal(false)}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl">
                  Cancel
                </button>
                <button
                  onClick={submitWicket}
                  disabled={!newBatsmanId || isSubmittingBall}
                  className="flex-[2] bg-red-600 text-white font-black uppercase py-4 rounded-2xl disabled:opacity-50">
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
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border border-orange-200 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase text-center mb-6">
              Record {pendingExtraType}
            </h2>
            <div className="grid grid-cols-5 gap-2 mb-8">
              {[0, 1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setExtraAdditionalRuns(num)}
                  className={`py-4 rounded-xl font-black text-xl transition-all ${extraAdditionalRuns === num ? "bg-orange-500 text-white shadow-lg" : "bg-slate-100 text-slate-500"}`}>
                  {num}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100">
              <input
                type="checkbox"
                id="wicketOnExtra"
                onChange={(e) => {
                  if (e.target.checked) {
                    submitExtra();
                    setShowWicketModal(true);
                  }
                }}
              />
              <label
                htmlFor="wicketOnExtra"
                className="text-xs font-bold text-red-600 uppercase">
                Wicket on this extra?
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExtrasModal(false)}
                className="flex-1 py-4 font-bold text-slate-500">
                Cancel
              </button>
              <button
                onClick={submitExtra}
                className="flex-2 bg-slate-900 text-white font-black uppercase py-4 rounded-xl">
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
            <h2 className="text-xl font-black uppercase mb-6 text-center">
              Correct Delivery
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">
                  Runs off Bat
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 2, 4, 6].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateBallDetails({ runs_off_bat: r })}
                      className={`py-3 rounded-xl font-bold ${editingBall.runs_off_bat === r ? "bg-teal-500 text-white" : "bg-slate-100"}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-2 italic text-center">
                  Note: Only even runs can be edited here.
                </p>
              </div>
              <button
                onClick={() => setEditingBall(null)}
                className="w-full py-4 font-bold text-slate-500 bg-slate-100 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INNINGS OVER MODAL */}
      {isInningsOver && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 bg-teal-500/20 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              🏁
            </div>

            <h2 className="text-4xl font-black text-white uppercase mb-2">
              {isTargetReached
                ? "TARGET REACHED!"
                : isAllOut
                  ? "ALL OUT!"
                  : "INNINGS OVER!"}
            </h2>

            <p className="text-slate-400 font-bold mb-4">
              {battingTeam?.name} finished at{" "}
              <span className="text-white">
                {currentScore}/{currentWickets}
              </span>{" "}
              in {currentOvers} overs.
            </p>

            {/* Display Target Info during the chase */}
            {match.current_innings === 2 && !isTargetReached && (
              <p className="text-red-400 font-bold mb-8">
                Target was {targetScore}. {battingTeam?.short_name} lost by{" "}
                {targetScore! - 1 - currentScore} runs.
              </p>
            )}

            {match.current_innings === 1 ? (
              <button
                onClick={startSecondInnings}
                className="w-full bg-teal-500 text-white font-black py-5 rounded-2xl text-xl mt-4 hover:bg-teal-400 transition-colors">
                START 2ND INNINGS
              </button>
            ) : (
              <button
                onClick={finishMatch}
                className="w-full bg-white text-slate-900 hover:bg-slate-200 transition-colors font-black py-5 rounded-2xl text-xl mt-4">
                MATCH COMPLETED
              </button>
            )}
          </div>
        </div>
      )}

      {/* ON-SCREEN EDIT PLAYERS MODAL */}
      {showEditPlayersModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 border shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-center mb-6">
              Edit Live Players
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                  Striker
                </label>
                <select
                  value={match.live_striker_id || ""}
                  onChange={(e) =>
                    setMatch({ ...match, live_striker_id: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-black border rounded-xl font-bold text-sm">
                  {battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                  Non-Striker
                </label>
                <select
                  value={match.live_non_striker_id || ""}
                  onChange={(e) =>
                    setMatch({ ...match, live_non_striker_id: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-black border rounded-xl font-bold text-sm">
                  {battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                  Bowler
                </label>
                <select
                  value={match.live_bowler_id || ""}
                  onChange={(e) =>
                    setMatch({ ...match, live_bowler_id: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-black border rounded-xl font-bold text-sm">
                  {bowlingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase
                  .from("matches")
                  .update({
                    live_striker_id: match.live_striker_id,
                    live_non_striker_id: match.live_non_striker_id,
                    live_bowler_id: match.live_bowler_id,
                  })
                  .eq("id", matchId);
                setShowEditPlayersModal(false);
              }}
              className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl mb-3">
              Save Changes
            </button>
            <button
              onClick={() => {
                setShowEditPlayersModal(false);
                fetchMatchData(); /* revert to DB state on cancel */
              }}
              className="w-full font-bold text-slate-500 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
