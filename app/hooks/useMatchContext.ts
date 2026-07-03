import { useMemo } from "react";

export function useMatchContext(match: any, stats: any) {
  return useMemo(() => {
    // 1. Fallback for loading states
    if (!match || !stats) {
      return {
        crr: "0.00",
        rrr: "0.00",
        proj: "0",
        equation: "LOADING...",
        isChasing: false,
        tossWinnerName: "TBA",
        tossString: "Toss details pending",
      };
    }

    const isChasing = match.current_innings === 2;
    const currentScore = isChasing ? match.team2_score : match.team1_score;
    const totalBalls = stats.validDeliveries || 0;
    const totalMatchBalls = (Number(match.overs_count) || 20) * 6;

    // 2. Toss Logic Setup
    const tossWinnerName =
      match.toss_winner_id === match.team1_id
        ? match.team1?.name || "Team 1"
        : match.team2?.name || "Team 2";

    const tossDecision = match.toss_decision || "bat";
    const tossString = match.toss_winner_id
      ? `${tossWinnerName} won the toss and elected to ${tossDecision}`
      : "Toss not yet decided";

    // 3. Current Run Rate (CRR)
    const crr =
      totalBalls > 0 ? ((currentScore / totalBalls) * 6).toFixed(2) : "0.00";

    let rrr = "0.00";
    let equation = "MATCH IN PROGRESS";
    let proj = "0";
    let scoreContextText = "";

    // 4. The Chasing Logic (Innings 2)
    if (isChasing) {
      const target = (match.team1_score || 0) + 1;
      const runsNeeded = target - currentScore;
      const ballsRemaining = totalMatchBalls - totalBalls;

      const battingName =
        match.toss_winner_id === match.team1_id && match.toss_decision === "bat"
          ? match.team2?.short_name || "Team"
          : match.team1?.short_name || "Opponent";
      const bowlingName =
        battingName === match.team1?.short_name
          ? match.team2?.short_name
          : match.team1?.short_name;

      scoreContextText = `${bowlingName} Bowling`;

      if (runsNeeded <= 0) {
        equation = `${battingName?.toUpperCase()} WON`;
        rrr = "-";
      } else if (ballsRemaining <= 0 || match.status === "completed") {
        equation =
          runsNeeded === 1 && ballsRemaining === 0
            ? "MATCH TIED"
            : `${bowlingName?.toUpperCase()} WON`;
        rrr = "-";
      } else {
        rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
        equation = `NEED ${runsNeeded} RUNS IN ${ballsRemaining} BALLS`;
      }
    }
    // 5. The Setting Target Logic (Innings 1)
    else {
      proj =
        totalBalls > 0
          ? Math.round((currentScore / totalBalls) * totalMatchBalls).toString()
          : "0";
      equation = `PROJ. SCORE: ${proj}`;

      // Broadcast Ticker pro-tip: Show toss info for the first 2 overs, then switch to "X Bowling"
      const bowlingName =
        tossWinnerName === match.team1?.name && tossDecision === "bat"
          ? match.team2?.short_name
          : match.team1?.short_name;

      scoreContextText =
        totalBalls < 12
          ? `${tossWinnerName} won toss, elected to ${tossDecision}`
          : `${bowlingName} Bowling`;
    }

    // Return the ultimate frozen snapshot
    return {
      crr,
      rrr,
      proj,
      equation,
      isChasing,
      tossWinnerName,
      tossString,
      scoreContextText,
    };
  }, [match, stats]);
}
