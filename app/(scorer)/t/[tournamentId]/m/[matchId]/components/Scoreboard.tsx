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
  extras,
}: any) {
  // Safe fallbacks for team names
  const team1Name = match?.team1?.name || "Team 1";
  const team2Name = match?.team2?.name || "Team 2";
  const isTeam1Batting =
    battingTeam?.id === match?.team1_id || battingTeam?.name === team1Name;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. NEW MATCHUP HEADER */}
      <div className="bg-[var(--surface-1)] p-3 sm:p-4 rounded-[1.5rem] sm:rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 transition-colors">
        {/* Match Stage & Innings Badge */}
        <div className="inline-block bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)]">
          <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            Innings {match?.current_innings || 1}
          </p>
        </div>

        {/* VS Banner with Batting Team Highlight */}
        <div className="flex items-center justify-center gap-3 text-sm sm:text-lg font-black uppercase tracking-tight">
          <span
            className={`transition-colors ${isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            {team1Name}{" "}
            {isTeam1Batting && (
              <span className="text-[var(--accent)] ml-1">🏏</span>
            )}
          </span>

          <span className="text-[var(--text-muted)] opacity-50 text-xs sm:text-sm font-bold">
            VS
          </span>

          <span
            className={`transition-colors ${!isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            {!isTeam1Batting && (
              <span className="text-[var(--accent)] mr-1">🏏</span>
            )}{" "}
            {team2Name}
          </span>
        </div>
      </div>

      {/* 2ND INNINGS: TARGET & RRR */}
      {match?.current_innings === 2 && (
        <div className="bg-[var(--accent)] p-4 sm:p-6 rounded-[2rem] sm:rounded-3xl shadow-lg shadow-[var(--accent)]/20 text-[var(--background)] flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 sm:gap-4 transition-colors">
          <div>
            <p className="text-xs sm:text-sm font-black opacity-80 uppercase tracking-widest mb-1">
              Target: {targetScore}
            </p>
            <p className="text-xl sm:text-3xl font-black">
              Need {remainingRuns} off {remainingBalls}
            </p>
          </div>
          <div className="bg-[var(--foreground)]/10 px-4 py-2 sm:px-5 sm:py-3 rounded-2xl border border-[var(--background)]/20 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs font-black opacity-90 uppercase tracking-widest mb-1">
              Required RR
            </p>
            <p className="text-xl sm:text-2xl font-black">{rrr}</p>
          </div>
        </div>
      )}

      {/* MAIN SCOREBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: MAIN SCORE (Takes 2/3 width on desktop) */}
        <div className="md:col-span-2 bg-[var(--surface-1)] p-3 sm:p-8 rounded-[2rem] sm:rounded-3xl border border-[var(--border-1)] shadow-sm flex flex-col justify-center items-center md:items-start text-center md:text-left transition-colors">
          <p className="text-xs sm:text-base font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 sm:mb-2">
            {battingTeam?.name} Batting
          </p>

          {/* TABLET FONT FIX: Notice how it goes sm:text-8xl -> md:text-7xl -> lg:text-8xl */}
          <h1 className="text-7xl sm:text-8xl md:text-7xl lg:text-8xl xl:text-[9rem] font-black text-[var(--foreground)] leading-none tracking-tighter">
            {currentScore}
            <span className="text-4xl sm:text-5xl text-[var(--text-muted)] opacity-70">
              /{currentWickets}
            </span>
          </h1>

          <div className="mt-4 sm:mt-6 text-xs sm:text-base font-bold text-[var(--text-muted)] bg-[var(--surface-2)] inline-block px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-[var(--border-1)]">
            Extras:{" "}
            <span className="text-[var(--foreground)] mr-1 sm:mr-2 text-base sm:text-lg font-black">
              {extras?.total || 0}
            </span>
            <span className="text-[10px] sm:text-sm font-medium opacity-80">
              (W {extras?.w || 0}, NB {extras?.nb || 0}, B {extras?.b || 0}, LB{" "}
              {extras?.lb || 0}
              {extras?.p > 0 ? `, P ${extras.p}` : ""})
            </span>
          </div>
        </div>

        {/* RIGHT: STATS STACK */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <div className="bg-[var(--surface-1)] p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
            <p className="text-[10px] sm:text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 sm:mb-2">
              Overs
            </p>
            {/* TABLET FONT FIX: Scaling down to md:text-5xl for iPad Portrait mode */}
            <button
              onClick={openSettings}
              className="group flex items-end gap-1 sm:gap-2 text-3xl sm:text-4xl font-black text-[var(--foreground)] hover:opacity-80 transition-opacity leading-none"
            >
              {currentOvers}
              <span className="text-xs sm:text-xl md:text-lg lg:text-xl font-bold text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-1 sm:mb-2">
                / {match?.overs_count}{" "}
                <span className="hidden sm:inline">⚙️</span>
              </span>
            </button>
          </div>

          <div className="bg-[var(--surface-1)] p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-[var(--border-1)] shadow-sm flex flex-col items-center justify-center flex-1 transition-colors">
            <p className="text-[10px] sm:text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 sm:mb-2">
              Current RR
            </p>
            {/* TABLET FONT FIX: Scaling down to md:text-5xl */}
            <p className="text-3xl sm:text-4xl font-black text-[var(--foreground)] leading-none">
              {runRate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
