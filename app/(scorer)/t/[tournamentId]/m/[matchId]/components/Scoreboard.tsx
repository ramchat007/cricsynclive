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
  return (
    <div className="flex flex-col gap-6">
      {/* SCORE SECTION */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          {battingTeam?.short_name} Batting
        </p>
        <h1 className="text-7xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
          {currentScore}
          <span className="text-4xl text-slate-400">/{currentWickets}</span>
        </h1>

        <div className="mt-4 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 inline-block px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
          Extras:{" "}
          <span className="text-slate-900 dark:text-white mr-1">
            {extras?.total || 0}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            (W {extras?.w || 0}, NB {extras?.nb || 0}, B {extras?.b || 0}, LB{" "}
            {extras?.lb || 0}
            {extras?.p > 0 ? `, P ${extras.p}` : ""})
          </span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Overs
          </p>
          <button
            onClick={openSettings}
            className="group flex items-center gap-2 text-4xl font-black text-slate-900 dark:text-white hover:opacity-80 transition-opacity">
            {currentOvers}{" "}
            <span className="text-sm text-slate-400 group-hover:text-teal-500">
              / {match?.overs_count}
            </span>
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Run Rate
          </p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">
            {runRate}
          </p>
        </div>
      </div>

      {/* 2ND INNINGS: TARGET & RRR */}
      {match?.current_innings === 2 && (
        <div className="bg-teal-500 p-6 rounded-3xl shadow-lg shadow-teal-500/20 text-white text-center">
          <p className="text-xs font-black text-teal-100 uppercase tracking-widest mb-1">
            Target: {targetScore}
          </p>
          <p className="text-xl font-black">
            Need {remainingRuns} off {remainingBalls}
          </p>
          <p className="text-sm font-bold text-teal-100 mt-2 uppercase tracking-widest">
            Required RR: {rrr}
          </p>
        </div>
      )}
    </div>
  );
}
