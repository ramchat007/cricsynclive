"use client";

export default function RecentBalls({
  deliveries = [],
  currentOvers,
  setEditingBall,
  deleteLastBall,
  isAuthorized,
}: any) {
  return (
    <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm transition-colors duration-300">
      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
        Recent Balls (Over {currentOvers})
      </p>
      <div className="flex flex-wrap gap-2">
        {/* SAFEGUARD: Ensure deliveries is an array before spreading/reversing */}
        {[...(deliveries || [])]
          .reverse()
          .slice(0, 12)
          .map((d, i) => (
            <div key={d.id} className="relative group">
              <button
                // onClick={() => setEditingBall(d)}
                className={`w-10 h-10 rounded-full font-black text-xs border-2 transition-all hover:scale-110 
                ${
                  d.is_wicket
                    ? "bg-red-500 border-red-600 text-white shadow-sm shadow-red-500/30"
                    : d.runs_off_bat >= 4
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--background)] shadow-sm shadow-[var(--accent)]/30"
                      : d.extras_type
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                        : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--foreground)] hover:bg-[var(--border-1)]"
                }`}>
                {d.is_wicket
                  ? "W"
                  : d.extras_type
                    ? `${d.extras_runs}${d.extras_type[0]}`
                    : d.runs_off_bat}
              </button>

              {/* DELETE LATEST BALL BUTTON */}
              {i === 0 && isAuthorized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLastBall(d.id);
                  }}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center border-2 border-[var(--surface-1)] shadow-lg hover:scale-110 transition-transform">
                  ✕
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
