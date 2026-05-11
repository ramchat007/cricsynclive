"use client";

export default function Scoreboard({
  battingTeam,
  currentScore,
  currentWickets,
  currentOvers,
  match,
  runRate,
  targetScore,
  rrr,
  remainingRuns,
  remainingBalls,
  openSettings,
  isAuthorized,
  extras,
  deliveries = [], // 🔥 NEW: Raw deliveries to calculate top performers
  team1Players = [], // 🔥 NEW: Player names
  team2Players = [], // 🔥 NEW: Player names
}: any) {
  // Safe fallbacks for team names
  const team1Name = match?.team1?.short_name || match?.team1?.name || "Team 1";
  const team2Name = match?.team2?.short_name || match?.team2?.name || "Team 2";
  const isTeam1Batting = battingTeam?.id === match?.team1_id;

  const isCompleted = match?.status === "completed";
  const isSecondInnings = match?.current_innings === 2 || isCompleted;

  // --- 🧠 1st INNINGS SUMMARY MATH ---
  const inn1Dels = deliveries.filter((d: any) => d.innings === 1);
  const inn2Dels = deliveries.filter((d: any) => d.innings === 2);

  const inn1Wickets = inn1Dels.filter((d: any) => d.is_wicket).length;
  const inn1LegalBalls = inn1Dels.filter(
    (d: any) =>
      !["wide", "wd", "no-ball", "nb"].includes(d.extras_type?.toLowerCase()),
  ).length;
  const inn1Overs = `${Math.floor(inn1LegalBalls / 6)}.${inn1LegalBalls % 6}`;

  // --- 🏆 TOP PERFORMERS ENGINE ---
  const allPlayers = [...team1Players, ...team2Players];

  const getTopPerformers = (inningDeliveries: any[]) => {
    const batters: Record<string, any> = {};
    const bowlers: Record<string, any> = {};

    inningDeliveries.forEach((d) => {
      // Batters Math
      if (!batters[d.striker_id])
        batters[d.striker_id] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      batters[d.striker_id].runs += Number(d.runs_off_bat || 0);
      if (!["wide", "wd"].includes(d.extras_type?.toLowerCase())) {
        batters[d.striker_id].balls += 1;
      }
      if (Number(d.runs_off_bat) === 4) batters[d.striker_id].fours += 1;
      if (Number(d.runs_off_bat) === 6) batters[d.striker_id].sixes += 1;

      // Bowlers Math
      if (!bowlers[d.bowler_id])
        bowlers[d.bowler_id] = { runs: 0, wickets: 0, balls: 0 };
      const runOut = d.is_wicket && d.wicket_type === "run-out";
      if (d.is_wicket && !runOut && d.wicket_type !== "retired-hurt") {
        bowlers[d.bowler_id].wickets += 1;
      }
      const eType = d.extras_type?.toLowerCase();
      const isWideOrNb = ["wide", "wd", "no-ball", "nb"].includes(eType);

      let runsConceded = Number(d.runs_off_bat || 0);
      if (isWideOrNb) runsConceded += Number(d.extras_runs || 1);
      bowlers[d.bowler_id].runs += runsConceded;

      if (!isWideOrNb) bowlers[d.bowler_id].balls += 1;
    });

    const topBatters = Object.entries(batters)
      .map(([id, stats]) => ({
        name: allPlayers.find((p) => p.id === id)?.full_name || "Unknown",
        ...stats,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3); // Take Top 3

    const topBowlers = Object.entries(bowlers)
      .map(([id, stats]) => ({
        name: allPlayers.find((p) => p.id === id)?.full_name || "Unknown",
        ...stats,
        overs: `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`,
      }))
      .sort((a, b) =>
        b.wickets !== a.wickets ? b.wickets - a.wickets : a.runs - b.runs,
      )
      .slice(0, 3); // Take Top 3

    return { topBatters, topBowlers };
  };

  const inn1Top = getTopPerformers(inn1Dels);
  const inn2Top = getTopPerformers(inn2Dels);

  // Helper UI component for performers list
  const PerformersList = ({ title, batters, bowlers }: any) => (
    <div className="bg-[var(--surface-2)] p-4 sm:p-5 rounded-[1.5rem] border border-[var(--border-1)] flex-1">
      <h3 className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest mb-4 pb-2 border-b border-[var(--border-1)]">
        {title}
      </h3>

      <div className="space-y-4">
        {/* Batters */}
        {batters.length > 0 && (
          <div>
            <div className="flex justify-between text-[9px] sm:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest mb-2 px-1">
              <span>Batter</span>
              <span className="flex gap-3 sm:gap-4 w-24 sm:w-28 justify-end">
                <span>R</span>
                <span>B</span>
                <span>SR</span>
              </span>
            </div>
            <div className="space-y-1">
              {batters.map((b: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[var(--surface-1)] px-3 py-2 rounded-lg text-xs font-bold">
                  <span className="truncate pr-2 text-[var(--foreground)]">
                    {b.name}
                  </span>
                  <div className="flex gap-3 sm:gap-4 w-24 sm:w-28 justify-end text-right">
                    <span className="w-6 text-[var(--accent)]">{b.runs}</span>
                    <span className="w-6 text-[var(--text-muted)]">
                      {b.balls}
                    </span>
                    <span className="w-8 text-[var(--text-muted)]">
                      {(b.balls > 0 ? (b.runs / b.balls) * 100 : 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bowlers */}
        {bowlers.length > 0 && (
          <div className="pt-2">
            <div className="flex justify-between text-[9px] sm:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest mb-2 px-1">
              <span>Bowler</span>
              <span className="flex gap-3 sm:gap-4 w-24 sm:w-28 justify-end">
                <span>O</span>
                <span>R</span>
                <span>W</span>
              </span>
            </div>
            <div className="space-y-1">
              {bowlers.map((b: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[var(--surface-1)] px-3 py-2 rounded-lg text-xs font-bold">
                  <span className="truncate pr-2 text-[var(--foreground)]">
                    {b.name}
                  </span>
                  <div className="flex gap-3 sm:gap-4 w-24 sm:w-28 justify-end text-right">
                    <span className="w-6 text-[var(--text-muted)]">
                      {b.overs}
                    </span>
                    <span className="w-6 text-[var(--text-muted)]">
                      {b.runs}
                    </span>
                    <span className="w-8 text-rose-500">{b.wickets}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {batters.length === 0 && bowlers.length === 0 && (
          <p className="text-xs font-bold text-[var(--text-muted)] text-center py-4">
            Awaiting action...
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      {/* 1. MATCHUP HEADER */}
      <div className="bg-[var(--surface-1)] p-3 sm:p-4 rounded-[1.5rem] sm:rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 transition-colors">
        <div className="inline-block bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)]">
          <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            {isCompleted
              ? "Final Result"
              : `Innings ${match?.current_innings || 1}`}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm sm:text-lg font-black uppercase tracking-tight">
          <span
            className={`transition-colors ${!isCompleted && isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--foreground)]"}`}>
            {team1Name}{" "}
            {!isCompleted && isTeam1Batting && (
              <span className="text-[var(--accent)] ml-1">🏏</span>
            )}
          </span>
          <span className="text-[var(--text-muted)] opacity-50 text-xs sm:text-sm font-bold">
            VS
          </span>
          <span
            className={`transition-colors ${!isCompleted && !isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--foreground)]"}`}>
            {!isCompleted && !isTeam1Batting && (
              <span className="text-[var(--accent)] mr-1">🏏</span>
            )}{" "}
            {team2Name}
          </span>
        </div>
      </div>

      {/* 2. CHASE MATH OR FINAL RESULT BANNER */}
      {isCompleted ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-[1.5rem] text-center shadow-inner">
          <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">
            Match Result
          </p>
          <p className="text-lg sm:text-xl font-black text-yellow-500">
            {match.result_margin || "Match Finished"}
          </p>
        </div>
      ) : isSecondInnings ? (
        <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[1.5rem] p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded inline-block mb-1">
              Target: {targetScore}
            </p>
            <p className="text-sm font-bold text-[var(--foreground)]">
              Need {remainingRuns} off {remainingBalls}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
              Required RR
            </p>
            <p className="text-lg font-black text-[var(--foreground)]">{rrr}</p>
          </div>
        </div>
      ) : null}

      {/* 3. MAIN SCOREBOARD GRID */}
      <div
        className={`grid grid-cols-1 gap-4 ${isSecondInnings ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {/* INNINGS 1 SCORE (Now fully populated with Overs & Wickets) */}
        {isSecondInnings && (
          <div className="bg-[var(--surface-2)] p-4 sm:p-6 rounded-[2rem] border border-[var(--border-1)] shadow-inner flex flex-col justify-center items-center text-center opacity-70 hover:opacity-100 transition-opacity relative">
            <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
              1st Innings • {isTeam1Batting ? team2Name : team1Name}
            </p>
            <h2 className="text-5xl sm:text-6xl font-black text-[var(--foreground)] leading-none tracking-tighter">
              {targetScore ? targetScore - 1 : "0"}
              <span className="text-3xl sm:text-4xl text-[var(--text-muted)] opacity-70">
                /{inn1Wickets}
              </span>
            </h2>
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-1)] px-3 py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
                Overs:{" "}
                <span className="text-[var(--foreground)] ml-1 text-xs">
                  {inn1Overs}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE / 2nd INNINGS SCORE */}
        <div
          className={`${!isSecondInnings ? "md:col-span-2" : ""} bg-[var(--surface-1)] p-4 sm:p-6 rounded-[2rem] sm:rounded-3xl border ${isCompleted ? "border-[var(--border-1)]" : "border-[var(--accent)]/50 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]"} flex flex-col justify-center items-center text-center transition-colors relative overflow-hidden`}>
          {!isCompleted && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          )}
          <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 relative z-10">
            {isSecondInnings ? "2nd Innings" : "1st Innings"} •{" "}
            {battingTeam?.short_name || battingTeam?.name}
          </p>
          <h1
            className={`text-6xl sm:text-7xl lg:text-8xl font-black text-[var(--foreground)] leading-none tracking-tighter relative z-10 ${isCompleted ? "opacity-80" : ""}`}>
            {currentScore}
            <span className="text-3xl sm:text-4xl text-[var(--text-muted)] opacity-70">
              /{currentWickets}
            </span>
          </h1>
          <div className="mt-4 flex items-center justify-center gap-3 relative z-10">
            <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
              Overs:{" "}
              <span className="text-[var(--foreground)] ml-1 text-sm">
                {currentOvers}
              </span>
            </div>
            {isSecondInnings && (
              <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)] uppercase tracking-widest">
                CRR:{" "}
                <span className="text-[var(--foreground)] ml-1 text-sm">
                  {runRate}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT METRICS STACK (Only shows during 1st Innings) */}
        {!isSecondInnings && (
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <div className="bg-[var(--surface-1)] p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-[10px] sm:text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 sm:mb-2">
                Overs
              </p>
              <button
                onClick={openSettings}
                disabled={!isAuthorized || isCompleted}
                className={`group flex items-end gap-1 sm:gap-2 text-3xl sm:text-4xl font-black text-[var(--foreground)] leading-none ${isAuthorized && !isCompleted ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}>
                {currentOvers}
                <span className="text-xs sm:text-xl font-bold text-[var(--text-muted)] transition-colors mb-1 sm:mb-2">
                  / {match?.overs_count}{" "}
                  {isAuthorized && !isCompleted && (
                    <span className="hidden sm:inline group-hover:text-[var(--accent)]">
                      ⚙️
                    </span>
                  )}
                </span>
              </button>
            </div>
            <div className="bg-[var(--surface-1)] p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
              <p className="text-[10px] sm:text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 sm:mb-2">
                Current RR
              </p>
              <p className="text-3xl sm:text-4xl font-black text-[var(--foreground)] leading-none">
                {runRate}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* EXTRAS FOOTER */}
      <div className="text-center text-[10px] sm:text-xs font-bold text-[var(--text-muted)] mt-2">
        Extras:{" "}
        <span className="text-[var(--foreground)] ml-1 mr-2 text-sm sm:text-base font-black">
          {extras?.total || 0}
        </span>
        <span className="opacity-70 uppercase tracking-widest">
          (W {extras?.w || 0} • NB {extras?.nb || 0} • B {extras?.b || 0} • LB{" "}
          {extras?.lb || 0} {extras?.p > 0 ? `• P ${extras.p}` : ""})
        </span>
      </div>

      {/* 4. NEW: SIDE-BY-SIDE TOP PERFORMERS */}
      {isSecondInnings && (
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <PerformersList
            title="1st Innings Top Performers"
            batters={inn1Top.topBatters}
            bowlers={inn1Top.topBowlers}
          />
          <PerformersList
            title="2nd Innings Top Performers"
            batters={inn2Top.topBatters}
            bowlers={inn2Top.topBowlers}
          />
        </div>
      )}
    </div>
  );
}
