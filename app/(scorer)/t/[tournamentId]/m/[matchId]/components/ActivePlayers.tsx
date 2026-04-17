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
  currentOverDeliveries,
}: any) {
  // Helper to style the timeline balls
  const renderBall = (d: any, index: number) => {
    let label = d.runs_off_bat?.toString() || "0";
    let bgClass =
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

    if (d.is_wicket) {
      label = "W";
      bgClass = "bg-red-500 text-white shadow-sm shadow-red-500/30";
    } else if (d.extras_type) {
      if (d.extras_type === "wide") {
        // extras_runs already includes the 1-run penalty from the DB
        label = `${d.extras_runs}wd`;
        bgClass = "bg-orange-100 dark:bg-orange-900/30 text-orange-600";
      } else if (d.extras_type === "no-ball") {
        // No-Ball total includes runs off bat + the penalty
        const totalNbRuns = (d.runs_off_bat || 0) + (d.extras_runs || 0);
        label = `${totalNbRuns}nb`;
        bgClass = "bg-orange-100 dark:bg-orange-900/30 text-orange-600";
      } else if (d.extras_type === "bye") {
        label = `${d.extras_runs}b`;
        bgClass = "bg-slate-200 dark:bg-slate-700 text-slate-500";
      } else if (d.extras_type === "leg-bye") {
        label = `${d.extras_runs}lb`;
        bgClass = "bg-slate-200 dark:bg-slate-700 text-slate-500";
      } else if (d.extras_type === "penalty") {
        label = `${d.extras_runs}p`;
        bgClass = "bg-purple-100 dark:bg-purple-900/30 text-purple-600";
      }
    } else {
      if (d.runs_off_bat === 4) {
        bgClass = "bg-blue-500 text-white shadow-sm shadow-blue-500/30";
      } else if (d.runs_off_bat === 6) {
        bgClass = "bg-teal-500 text-white shadow-sm shadow-teal-500/30";
      } else if (d.runs_off_bat === 0) {
        label = "•"; // Clean dot ball styling
      }
    }

    return (
      <div
        key={d.id || index}
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-black uppercase tracking-tighter shrink-0 ${bgClass}`}>
        {label}
      </div>
    );
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
      {/* BATSMEN */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative">
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

      {/* BOWLER CARD */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative flex flex-col justify-between">
        {/* Header & Edit Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Bowler
          </p>
          <button
            onClick={() => setShowEditPlayersModal(true)}
            className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold uppercase hover:bg-teal-500 hover:text-white transition-colors">
            ✏️ Edit
          </button>
        </div>

        {/* Name & Stats Row */}
        <div className="flex justify-between items-center font-bold text-sm bg-slate-50 dark:bg-black p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
          <span className="truncate pr-2 text-slate-900 dark:text-white flex items-center gap-2">
            ⚾{" "}
            {bowlingSquad?.find((p: any) => p.id === match?.live_bowler_id)
              ?.full_name || "Bowler"}
          </span>
          <span className="shrink-0 text-slate-600 dark:text-slate-400">
            {bowlerOvers} - {bowlerRuns} -{" "}
            <span className="text-teal-500 font-black">{bowlerWickets}</span>
          </span>
        </div>

        {/* NEW: THIS OVER TIMELINE */}
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            This Over
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {currentOverDeliveries && currentOverDeliveries.length > 0 ? (
              currentOverDeliveries.map((d: any, i: number) => renderBall(d, i))
            ) : (
              <p className="text-xs font-bold text-slate-400 italic">
                Starting new over...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
