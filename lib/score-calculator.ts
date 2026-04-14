export const calculateScore = (events: any[]) => {
  // We only care about events that aren't "undone"
  const activeEvents = events.filter(e => !e.is_undone);

  const totalRuns = activeEvents.reduce((acc, e) => acc + e.runs_off_bat + e.extras, 0);
  const totalWickets = activeEvents.filter(e => e.is_wicket).length;
  
  // Calculate Overs
  const validBalls = activeEvents.filter(e => e.extra_type !== 'wide' && e.extra_type !== 'noball').length;
  const overs = Math.floor(validBalls / 6);
  const balls = validBalls % 6;

  return {
    score: `${totalRuns}/${totalWickets}`,
    overs: `${overs}.${balls}`,
    totalRuns,
    totalWickets
  };
};