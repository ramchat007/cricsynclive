export function deriveMatchStats(
  match: any,
  deliveries: any[],
  team1Players: any[],
  team2Players: any[],
) {
  if (!match) return null;

  // Isolate deliveries for the CURRENT innings
  const currentInningsDeliveries = deliveries.filter(
    (d) => d.innings === match.current_innings,
  );
  const firstInningsDeliveries = deliveries.filter((d) => d.innings === 1);

  const validDeliveries = currentInningsDeliveries.filter(
    (d) =>
      (d.extras_type !== "wide" &&
        d.extras_type !== "no-ball" &&
        d.extras_type !== "penalty" &&
        d.extras_type !== "dead-ball") ||
      d.force_legal_ball,
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

  const currentOverIndex = Math.floor(validDeliveries / 6);
  const currentOverDeliveries = currentInningsDeliveries.filter(
    (d) =>
      d.over_number === currentOverIndex &&
      d.bowler_id === match.live_bowler_id,
  );

  // EXTRAS BREAKDOWN
  const totalWides = currentInningsDeliveries
    .filter((d) => d.extras_type === "wide")
    .reduce((sum, d) => sum + (d.extras_runs || 0), 0);
  const totalNoBalls = currentInningsDeliveries
    .filter((d) => d.extras_type === "no-ball")
    .reduce((sum, d) => sum + (d.extras_runs || 0), 0);
  const totalByes = currentInningsDeliveries
    .filter((d) => d.extras_type === "bye")
    .reduce((sum, d) => sum + (d.extras_runs || 0), 0);
  const totalLegByes = currentInningsDeliveries
    .filter((d) => d.extras_type === "leg-bye")
    .reduce((sum, d) => sum + (d.extras_runs || 0), 0);
  const totalPenalties = currentInningsDeliveries
    .filter((d) => d.extras_type === "penalty")
    .reduce((sum, d) => sum + (d.extras_runs || 0), 0);

  const extrasBreakdown = {
    w: totalWides,
    nb: totalNoBalls,
    b: totalByes,
    lb: totalLegByes,
    p: totalPenalties,
    total:
      totalWides + totalNoBalls + totalByes + totalLegByes + totalPenalties,
  };

  // 2ND INNINGS TARGET LOGIC
  const targetScore =
    match.current_innings === 2
      ? firstInningsDeliveries.reduce(
          (total, d) => total + (d.runs_off_bat || 0) + (d.extras_runs || 0),
          0,
        ) + 1
      : null;

  const isTargetReached = targetScore ? currentScore >= targetScore : false;
  const remainingRuns = targetScore ? targetScore - currentScore : 0;
  const maxBalls = match.overs_count ? match.overs_count * 6 : 0;
  const remainingBalls = maxBalls - validDeliveries;
  const rrr =
    match.current_innings === 2 && remainingBalls > 0
      ? ((remainingRuns / remainingBalls) * 6).toFixed(2)
      : "0.00";

  // TEAMS & SQUADS
  const isTeam1Batting =
    (match.toss_winner_id === match.team1_id &&
      match.toss_decision === "bat") ||
    (match.toss_winner_id === match.team2_id && match.toss_decision === "bowl");
  const actualIsTeam1Batting =
    match.current_innings === 2 ? !isTeam1Batting : isTeam1Batting;

  const battingTeam = actualIsTeam1Batting ? match.team1 : match.team2;
  const bowlingTeam = actualIsTeam1Batting ? match.team2 : match.team1;
  const battingSquad = actualIsTeam1Batting ? team1Players : team2Players;
  const bowlingSquad = actualIsTeam1Batting ? team2Players : team1Players;

  // INNINGS OVER TRIGGERS
  const isAllOut =
    battingSquad.length > 0 && currentWickets >= battingSquad.length - 1;
  const isOversComplete = match.overs_count
    ? validDeliveries >= match.overs_count * 6
    : false;
  const isInningsOver = isAllOut || isOversComplete || isTargetReached;

  // PLAYER LIVE STATS
  const strikerRuns = currentInningsDeliveries
    .filter((d) => d.striker_id === match.live_striker_id)
    .reduce((sum, d) => sum + (d.runs_off_bat || 0), 0);
  const strikerBalls = currentInningsDeliveries.filter(
    (d) => d.striker_id === match.live_striker_id && d.extras_type !== "wide",
  ).length;
  const nonStrikerRuns = currentInningsDeliveries
    .filter((d) => d.striker_id === match.live_non_striker_id)
    .reduce((sum, d) => sum + (d.runs_off_bat || 0), 0);
  const nonStrikerBalls = currentInningsDeliveries.filter(
    (d) =>
      d.striker_id === match.live_non_striker_id && d.extras_type !== "wide",
  ).length;

  const bowlerDelivs = currentInningsDeliveries.filter(
    (d) => d.bowler_id === match.live_bowler_id,
  );
  const bowlerValidBalls = bowlerDelivs.filter(
    (d) =>
      (d.extras_type !== "wide" &&
        d.extras_type !== "no-ball" &&
        d.extras_type !== "penalty" &&
        d.extras_type !== "dead-ball") ||
      d.force_legal_ball,
  ).length;
  const bowlerOvers = `${Math.floor(bowlerValidBalls / 6)}.${bowlerValidBalls % 6}`;
  const bowlerRuns = bowlerDelivs
    .filter(
      (d) =>
        d.extras_type !== "bye" &&
        d.extras_type !== "leg-bye" &&
        d.extras_type !== "penalty",
    )
    .reduce((sum, d) => sum + (d.runs_off_bat || 0) + (d.extras_runs || 0), 0);
  const bowlerWickets = bowlerDelivs.filter(
    (d) => d.is_wicket && d.wicket_type !== "run-out",
  ).length;

  const dismissedPlayerIds = currentInningsDeliveries
    .filter((d) => d.is_wicket && d.player_out_id)
    .map((d) => d.player_out_id);

  return {
    currentInningsDeliveries,
    validDeliveries,
    currentOvers,
    currentScore,
    currentWickets,
    runRate,
    currentOverDeliveries,
    extrasBreakdown,
    targetScore,
    isTargetReached,
    remainingRuns,
    maxBalls,
    remainingBalls,
    rrr,
    battingTeam,
    bowlingTeam,
    battingSquad,
    bowlingSquad,
    isAllOut,
    isOversComplete,
    isInningsOver,
    strikerRuns,
    strikerBalls,
    nonStrikerRuns,
    nonStrikerBalls,
    bowlerOvers,
    bowlerRuns,
    bowlerWickets,
    dismissedPlayerIds,
  };
}

// Add this to the bottom of utils/cricketMath.ts
export function getPlayerMatchStats(playerId: string, deliveries: any[]) {
  // 1. Batting Stats
  const batDelivs = deliveries.filter((d: any) => d.striker_id === playerId);
  const runs = batDelivs.reduce(
    (sum: number, d: any) => sum + (d.runs_off_bat || 0),
    0,
  );
  const fours = batDelivs.filter((d: any) => d.runs_off_bat === 4).length;
  const sixes = batDelivs.filter((d: any) => d.runs_off_bat === 6).length;

  // 2. Bowling Stats
  const bowlDelivs = deliveries.filter((d: any) => d.bowler_id === playerId);
  const wickets = bowlDelivs.filter(
    (d: any) => d.is_wicket && d.wicket_type !== "run-out",
  ).length;
  const dots = bowlDelivs.filter(
    (d: any) => d.runs_off_bat === 0 && !d.extras_type,
  ).length;

  // 3. Fielding Stats
  const catches = deliveries.filter(
    (d: any) => d.fielder_id === playerId && d.wicket_type === "caught",
  ).length;
  const runouts = deliveries.filter(
    (d: any) => d.fielder_id === playerId && d.wicket_type === "run-out",
  ).length;
  const stumpings = deliveries.filter(
    (d: any) => d.fielder_id === playerId && d.wicket_type === "stumped",
  ).length;

  // 4. Calculate Standard Fantasy/MVP Points
  let points = runs + fours + sixes * 2;
  if (runs >= 50) points += 25;
  if (runs >= 100) points += 50;

  points += wickets * 25 + dots;
  if (wickets >= 3) points += 25;
  if (wickets >= 5) points += 50;

  points += catches * 10 + stumpings * 10 + runouts * 15;

  return { runs, wickets, points };
}

export function generateTournamentStandings(
  teams: any[],
  completedMatches: any[],
) {
  // 1. Initialize the standings table for every team
  const standings = teams.map((team) => ({
    ...team,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    points: 0,
    runsScored: 0,
    oversFaced: 0,
    runsConceded: 0,
    oversBowled: 0,
    nrr: 0.0,
  }));

  // Helper to safely add decimal overs
  const ballsToOvers = (balls: number) => balls / 6;

  // 2. Crunch the numbers for every completed match
  completedMatches.forEach((match) => {
    if (match.status !== "completed" || match.is_abandoned) return;

    const t1 = standings.find((t) => t.id === match.team1_id);
    const t2 = standings.find((t) => t.id === match.team2_id);
    if (!t1 || !t2) return;

    // Determine max overs (for the All-Out rule)
    const maxOvers = match.overs_count || 20;

    // Calculate actual overs used for NRR
    // If a team is all out, they are penalized by dividing by the FULL quota of overs
    const t1OversFaced =
      match.team1_wickets === 10 ? maxOvers : ballsToOvers(match.team1_balls);
    const t2OversFaced =
      match.team2_wickets === 10 ? maxOvers : ballsToOvers(match.team2_balls);

    // Add stats to Team 1
    t1.played += 1;
    t1.runsScored += match.team1_runs;
    t1.oversFaced += t1OversFaced;
    t1.runsConceded += match.team2_runs;
    t1.oversBowled += t2OversFaced;

    // Add stats to Team 2
    t2.played += 1;
    t2.runsScored += match.team2_runs;
    t2.oversFaced += t2OversFaced;
    t2.runsConceded += match.team1_runs;
    t2.oversBowled += t1OversFaced;

    // Distribute Points
    if (match.match_winner_id === match.team1_id) {
      t1.won += 1;
      t1.points += 2;
      t2.lost += 1;
    } else if (match.match_winner_id === match.team2_id) {
      t2.won += 1;
      t2.points += 2;
      t1.lost += 1;
    } else {
      // Tie or No Result
      t1.tied += 1;
      t1.points += 1;
      t2.tied += 1;
      t2.points += 1;
    }
  });

  // 3. Calculate Final NRR and Sort
  return standings
    .map((team) => {
      const scoredRate =
        team.oversFaced > 0 ? team.runsScored / team.oversFaced : 0;
      const concededRate =
        team.oversBowled > 0 ? team.runsConceded / team.oversBowled : 0;
      const nrr = scoredRate - concededRate;

      return { ...team, nrr: parseFloat(nrr.toFixed(3)) };
    })
    .sort((a, b) => {
      // Primary Sort: Points. Secondary Sort: NRR.
      if (b.points !== a.points) return b.points - a.points;
      return b.nrr - a.nrr;
    });
}

export function generateTournamentLeaderboards(
  players: any[],
  deliveries: any[],
) {
  return players.map((player) => {
    // 1. Batting Aggregation
    const batDelivs = deliveries.filter((d) => d.striker_id === player.id);
    const runs = batDelivs.reduce((sum, d) => sum + (d.runs_off_bat || 0), 0);
    const balls = batDelivs.filter((d) => d.extras_type !== "wide").length;
    const fours = batDelivs.filter((d) => d.runs_off_bat === 4).length;
    const sixes = batDelivs.filter((d) => d.runs_off_bat === 6).length;
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";

    // 2. Bowling Aggregation
    const bowlDelivs = deliveries.filter((d) => d.bowler_id === player.id);
    const wickets = bowlDelivs.filter(
      (d) => d.is_wicket && d.wicket_type !== "run-out",
    ).length;
    const validBalls = bowlDelivs.filter(
      (d) =>
        (d.extras_type !== "wide" &&
          d.extras_type !== "no-ball" &&
          d.extras_type !== "penalty" &&
          d.extras_type !== "dead-ball") ||
        d.force_legal_ball,
    ).length;
    const runsConceded = bowlDelivs
      .filter(
        (d) =>
          d.extras_type !== "bye" &&
          d.extras_type !== "leg-bye" &&
          d.extras_type !== "penalty",
      )
      .reduce(
        (sum, d) => sum + (d.runs_off_bat || 0) + (d.extras_runs || 0),
        0,
      );
    const econ =
      validBalls > 0 ? (runsConceded / (validBalls / 6)).toFixed(2) : "0.00";
    const overs = `${Math.floor(validBalls / 6)}.${validBalls % 6}`;

    // 3. MVP Points (Cumulative)
    let points = runs + fours + sixes * 2 + wickets * 25;
    const dots = bowlDelivs.filter(
      (d: any) => d.runs_off_bat === 0 && !d.extras_type,
    ).length;
    points += dots;

    const catches = deliveries.filter(
      (d: any) => d.fielder_id === player.id && d.wicket_type === "caught",
    ).length;
    const runouts = deliveries.filter(
      (d: any) => d.fielder_id === player.id && d.wicket_type === "run-out",
    ).length;
    points += catches * 10 + runouts * 15;

    return {
      ...player,
      runs,
      balls,
      fours,
      sixes,
      sr,
      wickets,
      overs,
      econ,
      runsConceded,
      points,
      teamName: player.teams?.short_name || "UNK",
    };
  });
}
