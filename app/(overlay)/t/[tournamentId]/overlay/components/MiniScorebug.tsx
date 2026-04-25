import React from "react";

export default function MiniScorebug({ matchData, deliveries = [] }: any) {
  if (!matchData) return null;

  // Simple runs calculation
  const runs = deliveries.reduce((acc: number, d: any) => acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0), 0);
  const wickets = deliveries.filter((d: any) => d.is_wicket).length;
  const legalBalls = deliveries.filter((d: any) => d.extras_type !== "wd" && d.extras_type !== "nb").length;
  const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

  const battingTeam = matchData.current_innings === 1 ? matchData.team1?.short_name : matchData.team2?.short_name;

  return (
    <div className="bg-slate-900 border-[3px] border-white/20 rounded-xl overflow-hidden flex shadow-2xl" style={{ animation: "slide-in 0.5s ease-out forwards" }}>
      <div className="bg-blue-600 px-4 py-2 flex items-center justify-center font-black text-white uppercase tracking-widest text-lg">
        {battingTeam || "BAT"}
      </div>
      <div className="px-6 py-2 bg-slate-900 flex items-center gap-4">
        <span className="text-white font-mono font-black text-3xl leading-none">{runs}<span className="text-xl text-white/70">/{wickets}</span></span>
        <span className="text-amber-400 font-bold text-sm bg-amber-400/10 px-2 py-1 rounded">({overs})</span>
      </div>
    </div>
  );
}