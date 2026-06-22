"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatchEngine } from "../../../hooks/useMatchEngine";
import { deriveMatchStats } from "../../../utils/cricketMath";
import {
  ArrowLeft,
  Users,
  Settings,
  Activity,
  Undo2,
  ChevronDown,
  Check,
} from "lucide-react";

export default function QuickScorerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matchId } = use(params);
  const router = useRouter();

  // We pass "QUICK_MATCH" as a bypass flag for the tournament requirement
  const engine = useMatchEngine("QUICK_MATCH", matchId);

  // Derive all active state
  const stats = deriveMatchStats(
    engine.match,
    engine.deliveries,
    engine.team1Players,
    engine.team2Players,
  );

  // If loading, show spinner
  if (engine.isLoading || !stats || !engine.match) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-slate-500">
        <Activity className="animate-spin text-red-500 mb-4" size={40} />
        <p className="uppercase tracking-widest text-xs">
          Loading Scorer Pad...
        </p>
      </div>
    );
  }

  // Helper function to safely record runs
  const tapRuns = async (runs: number) => {
    // Vibrate phone if supported (awesome feedback for scorers)
    if (navigator.vibrate) navigator.vibrate(50);
    await engine.recordDelivery(runs, null, 0, false, false);
  };

  const undoLastBall = async () => {
    if (!engine.deliveries.length) return;
    const lastBall = engine.deliveries[engine.deliveries.length - 1];
    if (confirm("Undo last ball?")) {
      await engine.deleteLastBall(lastBall.id);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden selection:bg-red-500 selection:text-white">
      {/* --- TOP 15%: THE CONTEXT HEADER --- */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 shadow-lg z-10 flex flex-col gap-3">
        {/* Match Header Row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-black uppercase tracking-tight text-lg leading-none">
              <span className="text-red-500">LIVE</span> SCORING
            </h1>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">
            <Settings size={18} />
          </button>
        </div>

        {/* Big Score Board */}
        <div className="flex justify-between items-end px-1">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
              {stats.battingTeam?.name || "Team A"} Batting
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none">
                {stats.currentScore}-{stats.currentWickets}
              </span>
              <span className="text-xl font-bold text-slate-400 leading-none pb-1">
                ({stats.currentOvers})
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
              CRR
            </p>
            <span className="text-2xl font-black text-emerald-400 leading-none">
              {stats.runRate}
            </span>
          </div>
        </div>
      </header>

      {/* --- MIDDLE 20%: THE OVER TIMELINE & PLAYERS --- */}
      <div className="bg-slate-950 flex-1 min-h-0 flex flex-col p-4 border-b border-slate-900">
        {/* Over Timeline (Shows: 1 | W | 4 | 0) */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              This Over
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {stats.currentOverDeliveries?.length > 0 ? (
              stats.currentOverDeliveries.map((ball: any, idx: number) => {
                const isBoundary = ball.runs_off_bat >= 4;
                const isWicket = ball.is_wicket;
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-black text-sm
                    ${
                      isWicket
                        ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : isBoundary
                          ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                    }
                  `}
                  >
                    {isWicket
                      ? "W"
                      : ball.runs_off_bat || ball.extras_runs || 0}
                  </div>
                );
              })
            ) : (
              <div className="text-xs font-bold text-slate-600 italic py-2">
                Waiting for first delivery...
              </div>
            )}
          </div>
        </div>

        {/* Mini Player Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-4 shrink-0 shadow-inner">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
              <Users size={10} /> Striker
            </p>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white truncate max-w-[80px]">
                {engine.team1Players
                  .concat(engine.team2Players)
                  .find((p) => p.id === engine.match.live_striker_id)
                  ?.full_name || "Striker"}
              </span>
              <span className="font-black text-sm text-amber-400">
                {stats.strikerRuns}{" "}
                <span className="text-[10px] text-slate-500 font-bold">
                  ({stats.strikerBalls})
                </span>
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Bowler
            </p>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white truncate max-w-[80px]">
                {engine.team1Players
                  .concat(engine.team2Players)
                  .find((p) => p.id === engine.match.live_bowler_id)
                  ?.full_name || "Bowler"}
              </span>
              <span className="font-black text-sm">
                {stats.bowlerWickets}-{stats.bowlerRuns}{" "}
                <span className="text-[10px] text-slate-500 font-bold">
                  ({stats.bowlerOvers})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM 50%: MASSIVE TOUCH GRID --- */}
      <div className="h-[45vh] bg-slate-950 p-2 shrink-0">
        <div className="grid grid-cols-4 grid-rows-5 gap-2 h-full">
          {/* Main Scoring Buttons */}
          {[0, 1, 2, 3].map((runs) => (
            <button
              key={runs}
              onClick={() => tapRuns(runs)}
              disabled={engine.isSubmittingBall}
              className="col-span-1 row-span-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl flex items-center justify-center font-black text-3xl transition-colors disabled:opacity-50"
            >
              {runs === 0 ? <span className="text-slate-400">0</span> : runs}
            </button>
          ))}

          {/* Boundaries */}
          <button
            onClick={() => tapRuns(4)}
            disabled={engine.isSubmittingBall}
            className="col-span-2 row-span-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl flex items-center justify-center font-black text-4xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all"
          >
            4
          </button>
          <button
            onClick={() => tapRuns(6)}
            disabled={engine.isSubmittingBall}
            className="col-span-2 row-span-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-2xl flex items-center justify-center font-black text-4xl shadow-[0_0_20px_rgba(147,51,234,0.2)] transition-all"
          >
            6
          </button>

          {/* Extras Row */}
          <button className="col-span-1 row-span-1 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs uppercase text-orange-400 active:bg-slate-800">
            Wide
          </button>
          <button className="col-span-1 row-span-1 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs uppercase text-orange-400 active:bg-slate-800">
            No Ball
          </button>
          <button className="col-span-1 row-span-1 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs uppercase text-slate-400 active:bg-slate-800">
            Leg Bye
          </button>
          <button className="col-span-1 row-span-1 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs uppercase text-slate-400 active:bg-slate-800">
            Bye
          </button>

          {/* Critical Row: Undo & Wicket */}
          <button
            onClick={undoLastBall}
            className="col-span-1 row-span-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-widest active:bg-amber-500/20 transition-colors"
          >
            <Undo2 size={16} className="mb-0.5" /> Undo
          </button>

          <button
            disabled={engine.isSubmittingBall}
            className="col-span-3 row-span-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl flex items-center justify-center font-black text-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all"
          >
            OUT
          </button>
        </div>
      </div>
    </div>
  );
}
