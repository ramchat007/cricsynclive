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
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3">
        {/* Match Stage & Innings Badge */}
        <div className="inline-block bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            Innings {match?.current_innings || 1}
          </p>
        </div>

        {/* VS Banner with Batting Team Highlight */}
        <div className="flex items-center justify-center gap-3 text-sm sm:text-lg font-black uppercase tracking-tight">
          <span
            className={`transition-colors ${isTeam1Batting ? "text-teal-500 drop-shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
          >
            {team1Name}{" "}
            {isTeam1Batting && <span className="text-teal-500 ml-1">🏏</span>}
          </span>

          <span className="text-slate-300 dark:text-slate-600 text-xs sm:text-sm font-bold">
            VS
          </span>

          <span
            className={`transition-colors ${!isTeam1Batting ? "text-teal-500 drop-shadow-sm" : "text-slate-600 dark:text-slate-300"}`}
          >
            {!isTeam1Batting && <span className="text-teal-500 mr-1">🏏</span>}{" "}
            {team2Name}
          </span>
        </div>
      </div>

      {/* 2ND INNINGS: TARGET & RRR */}
      {match?.current_innings === 2 && (
        <div className="bg-teal-500 p-4 sm:p-6 rounded-[2rem] sm:rounded-3xl shadow-lg shadow-teal-500/20 text-white flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 sm:gap-4">
          <div>
            <p className="text-xs sm:text-sm font-black text-teal-100 uppercase tracking-widest mb-1">
              Target: {targetScore}
            </p>
            <p className="text-xl sm:text-3xl font-black">
              Need {remainingRuns} off {remainingBalls}
            </p>
          </div>
          <div className="bg-teal-600 px-4 py-2 sm:px-5 sm:py-3 rounded-2xl border border-teal-400/30">
            <p className="text-[10px] sm:text-xs font-black text-teal-200 uppercase tracking-widest mb-1">
              Required RR
            </p>
            <p className="text-xl sm:text-2xl font-black">{rrr}</p>
          </div>
        </div>
      )}

      {/* MAIN SCOREBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: MAIN SCORE (Takes 2/3 width on desktop) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-3 sm:p-8 rounded-[2rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <p className="text-xs sm:text-base font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
            {battingTeam?.name} Batting
          </p>

          {/* TABLET FONT FIX: Notice how it goes sm:text-8xl -> md:text-7xl -> lg:text-8xl */}
          <h1 className="text-7xl sm:text-8xl md:text-7xl lg:text-8xl xl:text-[9rem] font-black text-slate-900 dark:text-white leading-none tracking-tighter">
            {currentScore}
            <span className="text-4xl sm:text-5xl  text-slate-400">
              /{currentWickets}
            </span>
          </h1>

          <div className="mt-4 sm:mt-6 text-xs sm:text-base font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 inline-block px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
            Extras:{" "}
            <span className="text-slate-900 dark:text-white mr-1 sm:mr-2 text-base sm:text-lg font-black">
              {extras?.total || 0}
            </span>
            <span className="text-[10px] sm:text-sm font-medium text-slate-400">
              (W {extras?.w || 0}, NB {extras?.nb || 0}, B {extras?.b || 0}, LB{" "}
              {extras?.lb || 0}
              {extras?.p > 0 ? `, P ${extras.p}` : ""})
            </span>
          </div>
        </div>

        {/* RIGHT: STATS STACK */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center flex-1">
            <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
              Overs
            </p>
            {/* TABLET FONT FIX: Scaling down to md:text-5xl for iPad Portrait mode */}
            <button
              onClick={openSettings}
              className="group flex items-end gap-1 sm:gap-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white hover:opacity-80 transition-opacity leading-none"
            >
              {currentOvers}
              <span className="text-xs sm:text-xl md:text-lg lg:text-xl font-bold text-slate-400 group-hover:text-teal-500 transition-colors mb-1 sm:mb-2">
                / {match?.overs_count}{" "}
                <span className="hidden sm:inline">⚙️</span>
              </span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center flex-1">
            <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
              Current RR
            </p>
            {/* TABLET FONT FIX: Scaling down to md:text-5xl */}
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
              {runRate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
