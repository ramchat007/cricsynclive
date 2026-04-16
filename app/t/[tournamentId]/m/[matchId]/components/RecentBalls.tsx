export default function RecentBalls({
  deliveries = [],
  currentOvers,
  setEditingBall,
  deleteLastBall,
}: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase mb-4">
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
                onClick={() => setEditingBall(d)}
                className={`w-10 h-10 rounded-full font-black text-xs border-2 transition-all hover:scale-110 
                ${
                  d.is_wicket
                    ? "bg-red-500 border-red-600 text-white"
                    : d.runs_off_bat >= 4
                      ? "bg-teal-500 border-teal-600 text-white"
                      : d.extras_type
                        ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 text-orange-600"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                }`}>
                {d.is_wicket
                  ? "W"
                  : d.extras_type
                    ? `${d.extras_runs}${d.extras_type[0]}`
                    : d.runs_off_bat}
              </button>
              {i === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLastBall(d.id);
                  }}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                  ✕
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
