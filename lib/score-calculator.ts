// Define the shape of our Supabase data so Next.js provides autocomplete
export interface Omit<T, K extends keyof T> { } // Just in case, standard TS utility

export interface BallEvent {
  id: string;
  match_id: string;
  inning_no: number;
  over_no: number;
  ball_no: number;
  runs_off_bat: number;
  extras: number;
  extra_type: 'none' | 'wide' | 'noball' | 'bye' | 'legbye';
  is_wicket: boolean;
  wicket_type?: string;
  striker_name?: string;
  bowler_name?: string;
  is_undone: boolean;
  force_legal?: boolean;
}

export const calculateScore = (events: BallEvent[], matchMeta?: any) => {
  const stats = {
    totalRuns: 0,
    totalWickets: 0,
    over: 0,
    overBallCount: 0,
    score: "0/0", // UI Helper: formatted string
    overs: "0.0", // UI Helper: formatted string
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    batsmenStats: {} as Record<string, any>,
    bowlerStats: {} as Record<string, any>,
    striker: matchMeta?.initialStriker || "Player 1",
    nonStriker: matchMeta?.initialNonStriker || "Player 2",
    currentBowler: matchMeta?.initialBowler || "Bowler 1",
    awaitingNewBatsman: false,
    awaitingNewBowler: false,
    lastEventWasWicket: false,
    ballsInCurrentOver: 0,
  };

  const initBat = (name: string) => {
    if (!name) return;
    if (!stats.batsmenStats[name]) {
      stats.batsmenStats[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: null };
    }
  };

  const initBowl = (name: string) => {
    if (!name) return;
    if (!stats.bowlerStats[name]) {
      stats.bowlerStats[name] = { runs: 0, balls: 0, wickets: 0, maidens: 0 };
    }
  };

  // 🔥 INSTANT UNDO FIX: We completely ignore undone balls in the math loop
  const validTimeline = events.filter(ball => !ball.is_undone);

  validTimeline.forEach((ball, index) => {
    const runs = ball.runs_off_bat || 0;
    const isWide = ball.extra_type === 'wide';
    const isNoBall = ball.extra_type === 'noball';
    const isBye = ball.extra_type === 'bye';
    const isLegBye = ball.extra_type === 'legbye';
    const isWicket = ball.is_wicket;
    
    // A ball is legal if it's not a Wide/NB, OR if the local "force_legal" rule is true
    const isLegalBall = (!isWide && !isNoBall) || (ball.force_legal === true);

    // Use the player names recorded EXACTLY at the time this ball was bowled
    const currentStriker = ball.striker_name || stats.striker;
    const currentBowler = ball.bowler_name || stats.currentBowler;

    initBat(currentStriker);
    initBowl(currentBowler);

    // Run Math Logic (Ported exactly from your Firebase app)
    let batterRuns = 0;
    let bowlerRuns = 0;
    let totalBallRuns = 0;

    if (isWide) {
      stats.extras.wides += ball.extras + runs; // Penalty + physical runs on a wide
      bowlerRuns += ball.extras + runs;
      totalBallRuns += ball.extras + runs;
    } else if (isNoBall) {
      stats.extras.noBalls += ball.extras;
      bowlerRuns += ball.extras;
      totalBallRuns += ball.extras;
      
      if (isBye) stats.extras.byes += runs;
      else if (isLegBye) stats.extras.legByes += runs;
      else {
        batterRuns += runs;
        bowlerRuns += runs; 
      }
      totalBallRuns += runs;
    } else {
      if (isBye) stats.extras.byes += runs;
      else if (isLegBye) stats.extras.legByes += runs;
      else {
        batterRuns += runs;
        bowlerRuns += runs;
      }
      totalBallRuns += runs;
    }

    // Update Totals
    stats.totalRuns += totalBallRuns;
    
    if (currentStriker) {
      stats.batsmenStats[currentStriker].runs += batterRuns;
      if (isLegalBall || isNoBall) {
        stats.batsmenStats[currentStriker].balls += 1; // NB counts as ball faced
      }
      if (batterRuns === 4) stats.batsmenStats[currentStriker].fours += 1;
      if (batterRuns === 6) stats.batsmenStats[currentStriker].sixes += 1;
    }
    
    if (currentBowler) {
      stats.bowlerStats[currentBowler].runs += bowlerRuns;
      if (isLegalBall) stats.bowlerStats[currentBowler].balls += 1;
    }

    // Wickets
    if (isWicket) {
      stats.totalWickets += 1;
      if (stats.batsmenStats[currentStriker]) {
        stats.batsmenStats[currentStriker].out = ball.wicket_type || "out";
      }
      // Don't give bowler credit for Run Outs or Retired Hurt
      if (ball.wicket_type !== "Run Out" && ball.wicket_type !== "Retired Hurt" && currentBowler) {
        stats.bowlerStats[currentBowler].wickets += 1;
      }
    }

    // Strike Rotation (Odd physical runs swap the strike)
    const runsForRotation = isWide ? runs : batterRuns; 
    if (runsForRotation % 2 !== 0) {
      const temp = stats.striker;
      stats.striker = stats.nonStriker;
      stats.nonStriker = temp;
    }

    // Over Count & Over End Rotation
    if (isLegalBall) {
      stats.overBallCount += 1;
      if (stats.overBallCount === 6) {
        stats.over += 1;
        stats.overBallCount = 0;

        // Rotate strike on over end IF NO wicket fell
        if (!isWicket) {
          const temp = stats.striker;
          stats.striker = stats.nonStriker;
          stats.nonStriker = temp;
        }
      }
    }

    // UI Flags (Only update these on the very last ball of the array)
    if (index === validTimeline.length - 1) {
      stats.lastEventWasWicket = isWicket;
      stats.ballsInCurrentOver = stats.overBallCount;
      stats.awaitingNewBatsman = isWicket;
      stats.awaitingNewBowler = stats.overBallCount === 0 && stats.over > 0 && isLegalBall;
    }
  });

  // Finally, format the strings exactly how the LiveScoring UI wants to display them!
  stats.score = `${stats.totalRuns}/${stats.totalWickets}`;
  stats.overs = `${stats.over}.${stats.overBallCount}`;

  return stats;
};