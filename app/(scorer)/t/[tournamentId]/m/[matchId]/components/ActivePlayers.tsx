export default function ActivePlayers({
  battingSquad = [],
  bowlingSquad = [],
  match,
  manualSwapStrike,
  strikerRuns,
  strikerBalls,
  nonStrikerRuns,
  nonStrikerBalls,
  bowlerOvers,
  bowlerRuns,
  bowlerWickets,
  setShowEditPlayersModal, // NEW PROP
}: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
      {/* BATSMEN */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={manualSwapStrike}
              className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold uppercase hover:bg-teal-500 hover:text-white transition-colors">
              🔄 Swap
            </button>
            <button
              onClick={() => setShowEditPlayersModal(true)}
              className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold uppercase hover:bg-blue-500 hover:text-white transition-colors">
              ✏️ Edit
            </button>
          </div>
          <div className="flex gap-4 text-[10px] font-black text-slate-400">
            <span className="w-8 text-right">R</span>
            <span className="w-8 text-right">B</span>
          </div>
        </div>

        <div className="font-bold text-sm space-y-2">
          <div className="flex justify-between items-center text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/10 p-2 rounded-lg">
            <span className="truncate pr-2">
              ▶{" "}
              {battingSquad?.find((p: any) => p.id === match?.live_striker_id)
                ?.full_name || "Striker"}
            </span>
            <div className="flex gap-4">
              <span className="w-8 text-right">{strikerRuns}</span>
              <span className="w-8 text-right">({strikerBalls})</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-slate-500 p-2">
            <span className="pl-4 truncate pr-2">
              {battingSquad?.find(
                (p: any) => p.id === match?.live_non_striker_id,
              )?.full_name || "Non-Striker"}
            </span>
            <div className="flex gap-4">
              <span className="w-8 text-right">{nonStrikerRuns}</span>
              <span className="w-8 text-right">({nonStrikerBalls})</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOWLER */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Bowler
          </p>
          <button
            onClick={() => setShowEditPlayersModal(true)}
            className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold uppercase hover:bg-blue-500 hover:text-white transition-colors">
            ✏️ Edit
          </button>
        </div>

        <div className="flex justify-between items-center font-bold text-sm bg-slate-50 dark:bg-black p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="truncate pr-2 text-slate-900 dark:text-white">
            ⚾{" "}
            {bowlingSquad?.find((p: any) => p.id === match?.live_bowler_id)
              ?.full_name || "Bowler"}
          </span>
          <span className="shrink-0 text-slate-600 dark:text-slate-400">
            {bowlerOvers} - {bowlerRuns} -{" "}
            <span className="text-teal-500">{bowlerWickets}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
