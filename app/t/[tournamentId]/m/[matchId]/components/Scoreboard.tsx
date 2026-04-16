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
}: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        {/* SCORE SECTION */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {battingTeam?.short_name} Batting
          </p>
          <h1 className="text-6xl font-black text-slate-900 dark:text-white leading-none">
            {currentScore}
            <span className="text-3xl text-slate-400">/{currentWickets}</span>
          </h1>
        </div>

        {/* STATS SECTION */}
        <div className="flex gap-8 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Overs
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {currentOvers}{" "}
              <span className="text-sm text-slate-400">
                / {match?.overs_count}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              CRR
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {runRate}
            </p>
          </div>

          {/* 2ND INNINGS: TARGET & RRR */}
          {match?.current_innings === 2 && (
            <div className="bg-teal-50 dark:bg-teal-900/10 p-3 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">
                Target: {targetScore}
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Need{" "}
                <span className="font-black text-teal-600">
                  {remainingRuns}
                </span>{" "}
                off{" "}
                <span className="font-black text-teal-600">
                  {remainingBalls}
                </span>
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase">
                RRR: {rrr}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
