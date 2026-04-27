import React from "react";

export default function Partnership({ matchData, deliveries = [] }: any) {
  if (!matchData) return null;

  // Calculate partnership since last wicket
  const currentInningsBalls = deliveries.filter(
    (d: any) => d.innings === matchData.current_innings,
  );
  let runs = 0;
  let balls = 0;

  for (let i = currentInningsBalls.length - 1; i >= 0; i--) {
    const ball = currentInningsBalls[i];
    runs += (Number(ball.runs_off_bat) || 0) + (Number(ball.extras_runs) || 0);
    if (ball.extras_type !== "wd") balls++;
    if (ball.is_wicket) break;
  }

  return (
    <div
      className="bg-slate-900 border-t-[3px] border-emerald-500 px-8 py-3 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex items-center gap-6"
      style={{ animation: "fade-in 0.4s ease-out forwards" }}
    >
      <span className="text-emerald-400 font-black uppercase tracking-widest text-xs">
        Current Partnership
      </span>
      <span className="font-mono text-white font-black text-3xl">
        {runs}{" "}
        <span className="text-lg text-white/50 font-sans tracking-widest">
          RUNS
        </span>
      </span>
      <span className="font-mono text-white/80 font-bold text-xl">
        {balls}{" "}
        <span className="text-sm text-white/40 font-sans tracking-widest">
          BALLS
        </span>
      </span>
    </div>
  );
}
