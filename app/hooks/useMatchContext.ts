import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useMatchContext(match: any, stats: any) {
  // 1. Let the hook manage its own state for the tournament name
  const [tournamentName, setTournamentName] = useState("Community Cricket League");

  // 2. The hook will automatically fetch the name itself!
  useEffect(() => {
    const fetchTournamentName = async () => {
      // If we have a match and it has a tournament_id, ask Supabase for the name
      if (match?.tournament_id) {
        const { data } = await supabase
          .from("tournaments")
          .select("name")
          .eq("id", match.tournament_id)
          .single();

        if (data?.name) {
          setTournamentName(data.name);
        }
      }
    };

    fetchTournamentName();
  }, [match?.tournament_id]); // Only re-run this if the tournament ID changes

  // 3. Do all the calculations using the fetched name
  return useMemo(() => {
    if (!match || !stats) {
      return {
        crr: "0.00",
        rrr: "0.00",
        proj: "0",
        equation: "LOADING...",
        isChasing: false,
        tossWinnerName: "TBA",
        tossDecision: "play",
        tossString: "Toss details pending",
        scoreContextText: "Loading match data...",
        team1Name: "Team 1",
        team2Name: "Team 2",
        team1ShortName: "T1",
        team2ShortName: "T2",
        tournamentName: "Loading...", // Shows while fetching
        venue: "Main Ground",
        oversCount: 20,
        currentInnings: 1,
        matchStatus: "live",
        team1Score: 0,
        team2Score: 0,
      };
    }

    const team1Name = match.team1?.name || "Team 1";
    const team2Name = match.team2?.name || "Team 2";
    const team1ShortName = match.team1?.short_name || "T1";
    const team2ShortName = match.team2?.short_name || "T2";
    const venue = match.venue || "the main ground";
    const oversCount = Number(match.overs_count) || 20;
    const currentInnings = match.current_innings || 1;
    const matchStatus = match.status || "live";
    const team1Score = match.team1_score || 0;
    const team2Score = match.team2_score || 0;

    const isChasing = currentInnings === 2;
    const currentScore = isChasing ? team2Score : team1Score;
    const totalBalls = stats.validDeliveries || 0;
    const totalMatchBalls = oversCount * 6;

    const tossWinnerName =
      match.toss_winner_id === match.team1_id
        ? team1Name
        : match.toss_winner_id === match.team2_id
        ? team2Name
        : "TBA";

    const tossDecision = match.toss_decision || "bat";
    const tossString = match.toss_winner_id
      ? `${tossWinnerName} won the toss and elected to ${tossDecision}`
      : "Toss not yet decided";

    const crr = totalBalls > 0 ? ((currentScore / totalBalls) * 6).toFixed(2) : "0.00";

    let rrr = "0.00";
    let equation = "MATCH IN PROGRESS";
    let proj = "0";
    let scoreContextText = "";

    if (isChasing) {
      const target = team1Score + 1;
      const runsNeeded = target - currentScore;
      const ballsRemaining = totalMatchBalls - totalBalls;

      const battingName =
        match.toss_winner_id === match.team1_id && tossDecision === "bat"
          ? team2ShortName
          : team1ShortName;
      const bowlingName =
        battingName === team1ShortName ? team2ShortName : team1ShortName;

      scoreContextText = `${bowlingName} Bowling`;

      if (runsNeeded <= 0) {
        equation = `${battingName.toUpperCase()} WON`;
        rrr = "-";
      } else if (ballsRemaining <= 0 || matchStatus === "completed") {
        equation = runsNeeded === 1 && ballsRemaining === 0 ? "MATCH TIED" : `${bowlingName.toUpperCase()} WON`;
        rrr = "-";
      } else {
        rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
        equation = `NEED ${runsNeeded} RUNS IN ${ballsRemaining} BALLS`;
      }
    } else {
      proj = totalBalls > 0 ? Math.round((currentScore / totalBalls) * totalMatchBalls).toString() : "0";
      equation = `PROJ. SCORE: ${proj}`;

      const bowlingName =
        tossWinnerName === team1Name && tossDecision === "bat"
          ? team2ShortName
          : team1ShortName;

      scoreContextText = totalBalls < 12 ? `${tossWinnerName} won toss, elected to ${tossDecision}` : `${bowlingName} Bowling`;
    }

    return {
      crr,
      rrr,
      proj,
      equation,
      isChasing,
      tossWinnerName,
      tossDecision,
      tossString,
      scoreContextText,
      team1Name,
      team2Name,
      team1ShortName,
      team2ShortName,
      tournamentName, // <--- Now it returns the state from the hook!
      venue,
      oversCount,
      currentInnings,
      matchStatus,
      team1Score,
      team2Score,
    };
  }, [match, stats, tournamentName]); // <-- Added tournamentName to dependencies so it updates when fetched
}