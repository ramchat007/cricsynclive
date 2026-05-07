"use client";

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
      "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-1)]";

    if (d.is_wicket) {
      label = "W";
      bgClass = "bg-red-500 text-white shadow-sm shadow-red-500/30";
    } else if (d.extras_type) {
      if (d.extras_type === "wide") {
        // extras_runs already includes the 1-run penalty from the DB
        label = `${d.extras_runs}wd`;
        bgClass =
          "bg-orange-500/10 text-orange-500 border border-orange-500/20";
      } else if (d.extras_type === "no-ball") {
        // No-Ball total includes runs off bat + the penalty
        const totalNbRuns = (d.runs_off_bat || 0) + (d.extras_runs || 0);
        label = `${totalNbRuns}nb`;
        bgClass =
          "bg-orange-500/10 text-orange-500 border border-orange-500/20";
      } else if (d.extras_type === "bye") {
        label = `${d.extras_runs}b`;
        bgClass =
          "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-1)]";
      } else if (d.extras_type === "leg-bye") {
        label = `${d.extras_runs}lb`;
        bgClass =
          "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-1)]";
      } else if (d.extras_type === "penalty") {
        label = `${d.extras_runs}p`;
        bgClass =
          "bg-purple-500/10 text-purple-500 border border-purple-500/20";
      }
    } else {
      if (d.runs_off_bat === 4) {
        bgClass = "bg-blue-500 text-white shadow-sm shadow-blue-500/30";
      } else if (d.runs_off_bat === 6) {
        // Massive hits inherit your tournament's custom accent color!
        bgClass =
          "bg-[var(--accent)] text-[var(--background)] shadow-sm shadow-[var(--accent)]/30";
      } else if (d.runs_off_bat === 0) {
        label = "•"; // Clean dot ball styling
      }
    }

    return (
      <div
        key={d.id || index}
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-black uppercase tracking-tighter shrink-0 transition-colors ${bgClass}`}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
      {/* BATSMEN */}
      <div className="bg-[var(--surface-1)] p-3 rounded-[2rem] border border-[var(--border-1)] shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={manualSwapStrike}
              className="text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-1 rounded font-bold uppercase hover:bg-[var(--accent)] hover:text-[var(--background)] transition-colors"
            >
              🔄 Swap
            </button>
            <button
              onClick={() => setShowEditPlayersModal(true)}
              className="text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-1 rounded font-bold uppercase hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="flex gap-4 text-[10px] font-black text-[var(--text-muted)]">
            <span className="w-8 text-right">R</span>
            <span className="w-8 text-right">B</span>
          </div>
        </div>

        <div className="font-bold text-sm space-y-2">
          <div className="flex justify-between items-center text-[var(--accent)] bg-[var(--accent)]/10 p-2 rounded-lg">
            <span className="truncate pr-2">
              ▶{" "}
              {battingSquad?.find((p: any) => p.id === match?.live_striker_id)
                ?.full_name || "Striker"}
            </span>
            <div className="flex gap-4">
              <span className="w-8 text-right">{strikerRuns}</span>
              <span className="w-8 text-right font-medium opacity-80">
                ({strikerBalls})
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-[var(--text-muted)] p-2">
            <span className="pl-4 truncate pr-2">
              {battingSquad?.find(
                (p: any) => p.id === match?.live_non_striker_id,
              )?.full_name || "Non-Striker"}
            </span>
            <div className="flex gap-4">
              <span className="w-8 text-right">{nonStrikerRuns}</span>
              <span className="w-8 text-right font-medium opacity-80">
                ({nonStrikerBalls})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOWLER CARD */}
      <div className="bg-[var(--surface-1)] p-3 rounded-[2rem] border border-[var(--border-1)] shadow-sm relative flex flex-col justify-between">
        {/* Header & Edit Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">
            Bowler
          </p>
          <button
            onClick={() => setShowEditPlayersModal(true)}
            className="text-[12px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-1 rounded font-bold uppercase hover:bg-[var(--accent)] hover:text-[var(--background)] transition-colors"
          >
            ✏️ Edit
          </button>
        </div>

        {/* Name & Stats Row */}
        <div className="flex justify-between items-center font-bold text-sm bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border-1)] mb-4">
          <span className="truncate pr-2 text-[var(--foreground)] flex items-center gap-2">
            ⚾{" "}
            {bowlingSquad?.find((p: any) => p.id === match?.live_bowler_id)
              ?.full_name || "Bowler"}
          </span>
          <span className="shrink-0 text-[var(--text-muted)]">
            {bowlerOvers} - {bowlerRuns} -{" "}
            <span className="text-[var(--accent)] font-black">
              {bowlerWickets}
            </span>
          </span>
        </div>

        {/* THIS OVER TIMELINE */}
        <div>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 pl-1">
            This Over
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {currentOverDeliveries && currentOverDeliveries.length > 0 ? (
              currentOverDeliveries.map((d: any, i: number) => renderBall(d, i))
            ) : (
              <p className="text-xs font-bold text-[var(--text-muted)] italic pl-1">
                Starting new over...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
