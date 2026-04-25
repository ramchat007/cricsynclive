import React from "react";

export default function FullscreenPlates({
  type,
  matchData,
  tournamentId,
}: {
  type: string;
  matchData: any;
  tournamentId: string;
}) {
  if (!matchData) return null;

  return (
    <div className="w-full h-full flex items-center justify-center p-24">
      {/* 1. TOSS REPORT */}
      {type === "TOSS_REPORT" && (
        <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl p-12 flex flex-col items-center shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <h2 className="text-emerald-400 font-black text-4xl uppercase tracking-[0.3em] mb-12">
            Toss Report
          </h2>
          <div className="text-white text-6xl font-black text-center uppercase leading-tight">
            {matchData.team1_id === matchData.toss_winner_id
              ? matchData.team1?.name
              : matchData.team2?.name}{" "}
            <br />
            <span className="text-slate-400 text-4xl mt-4 block">
              elected to{" "}
              <span className="text-amber-400">
                {matchData.toss_decision || "Bat"}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 2. MATCH RESULT */}
      {type === "MATCH_RESULT" && (
        <div className="w-full max-w-6xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/30 rounded-3xl p-16 flex flex-col items-center text-center">
          <h2 className="text-amber-400 font-black text-3xl uppercase tracking-[0.4em] mb-12">
            Match Result
          </h2>
          <div className="text-white text-7xl font-black uppercase leading-tight drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]">
            {matchData.match_result || "Match Ended"}
          </div>
        </div>
      )}

      {/* Add INNINGS_BREAK, PLAYING_XI, OVER_SUMMARY blocks here as you build them out! */}
      {["PLAYING_XI", "INNINGS_BREAK", "OVER_SUMMARY"].includes(type) && (
        <div className="text-center">
          <h2 className="text-white font-black text-5xl uppercase tracking-[0.2em] mb-6">
            {type.replace("_", " ")}
          </h2>
          <p className="text-slate-400 text-2xl font-bold uppercase tracking-widest">
            Graphic component coming soon...
          </p>
        </div>
      )}
    </div>
  );
}
