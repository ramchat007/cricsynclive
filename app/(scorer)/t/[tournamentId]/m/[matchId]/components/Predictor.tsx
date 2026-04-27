"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Award,
  BarChart2,
  Activity,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchTournamentAnalysis } from "../../../../../../utils/gemini"; // Adjust path as needed!

export default function Predictor({ match, stats }: any) {
  // --- STATES ---
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoadingStandings, setIsLoadingStandings] = useState(true);

  const [proAnalysis, setProAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasAnalyzed = useRef(false);

  // --- 🧠 WIN PROBABILITY ALGORITHM ---
  const winProb = useMemo(() => {
    if (!match || !stats) return { batting: 50, bowling: 50 };
    let t1Prob = 50;
    let t2Prob = 50;

    if (match.current_innings === 2 && stats.targetScore) {
      const crr = parseFloat(stats.runRate) || 0;
      const rrr = parseFloat(stats.rrr) || 0;
      const wickets = stats.currentWickets || 0;
      let chaseProb = 50 + (crr - rrr) * 4 - wickets * 3.5;
      if (stats.remainingRuns <= 0) chaseProb = 100;
      if (stats.remainingBalls <= 0 && stats.remainingRuns > 0) chaseProb = 0;
      t1Prob = Math.min(99, Math.max(1, chaseProb));
      t2Prob = 100 - t1Prob;
    } else if (match.current_innings === 1) {
      const crr = parseFloat(stats.runRate) || 0;
      const wickets = stats.currentWickets || 0;
      t1Prob = Math.min(85, Math.max(15, 50 + (crr - 8.0) * 3 - wickets * 2));
      t2Prob = 100 - t1Prob;
    }
    return { batting: Math.round(t1Prob), bowling: Math.round(t2Prob) };
  }, [match?.current_innings, stats]);

  // --- 📡 FETCH STANDINGS & TRIGGER AI ---
  useEffect(() => {
    if (!match?.tournament_id) return;

    const fetchRealStandings = async () => {
      try {
        setIsLoadingStandings(true);
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .eq("tournament_id", match.tournament_id);

        if (error) throw error;

        if (data) {
          const sortedTeams = data.sort((a, b) => {
            const ptsA = Number(a.points) || 0;
            const ptsB = Number(b.points) || 0;
            if (ptsB !== ptsA) return ptsB - ptsA;
            return (parseFloat(b.nrr) || 0) - (parseFloat(a.nrr) || 0);
          });
          setStandings(sortedTeams);

          // 🤖 TRIGGER GEMINI ONCE STANDINGS LOAD
          if (!hasAnalyzed.current) {
            hasAnalyzed.current = true;
            setIsAnalyzing(true);
            const aiText = await fetchTournamentAnalysis(
              match,
              sortedTeams,
              winProb,
            );
            setProAnalysis(
              aiText ||
                "Tournament implications are heating up as these two sides battle it out for critical points.",
            );
            setIsAnalyzing(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch standings:", err);
      } finally {
        setIsLoadingStandings(false);
      }
    };

    fetchRealStandings();
  }, [match?.tournament_id, match, winProb]);

  if (!match || !stats) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse">
          📊
        </div>
        <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
          Match Predictor
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in pb-10">
      {/* TOP ROW: WIN PREDICTOR & STANDINGS */}
      <div className="flex flex-col xl:flex-row gap-6 w-full">
        {/* LEFT COLUMN: WIN PREDICTOR */}
        <div className="flex-1 space-y-6">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 px-2">
            Live Win Probability
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {match.current_innings === 1
                    ? "1st Innings Projection"
                    : "Run Chase Analysis"}
                </p>
              </div>
            </div>

            <div className="relative h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 flex shadow-inner">
              <div
                className="h-full bg-teal-500 transition-all duration-1000 ease-out flex items-center px-3"
                style={{ width: `${winProb.batting}%` }}
              >
                {winProb.batting > 15 && (
                  <span className="text-[10px] font-black text-white">
                    {winProb.batting}%
                  </span>
                )}
              </div>
              <div
                className="h-full bg-rose-500 transition-all duration-1000 ease-out flex justify-end items-center px-3"
                style={{ width: `${winProb.bowling}%` }}
              >
                {winProb.bowling > 15 && (
                  <span className="text-[10px] font-black text-white">
                    {winProb.bowling}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                {stats.battingTeam?.name || "Batting"}
                <span className="text-xl ml-2">{winProb.batting}%</span>
              </div>
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <span className="text-xl mr-2">{winProb.bowling}%</span>
                {stats.bowlingTeam?.name || "Bowling"}
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800 my-6" />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Current Run Rate
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {stats.runRate}{" "}
                  <Activity size={16} className="text-slate-400" />
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Required Run Rate
                </p>
                <p className="text-2xl font-black text-amber-500 flex items-center gap-2">
                  {match.current_innings === 2 ? stats.rrr : "N/A"}{" "}
                  <BarChart2
                    size={16}
                    className={
                      match.current_innings === 2
                        ? "text-amber-500/50"
                        : "text-slate-400"
                    }
                  />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL POINTS TABLE */}
        <div className="flex-[1.2] space-y-6">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 px-2">
            Tournament Standings
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
                  <Award size={16} />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Group Stage
                </span>
              </div>
              {isLoadingStandings && (
                <Loader2 size={16} className="text-teal-500 animate-spin" />
              )}
            </div>

            <div className="overflow-x-auto custom-scrollbar min-h-[300px]">
              {isLoadingStandings ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                  <Loader2
                    size={32}
                    className="animate-spin mb-4 text-slate-300 dark:text-slate-700"
                  />
                </div>
              ) : standings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No standings data found.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[9px] sm:text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3 sm:p-4 w-12 text-center">#</th>
                      <th className="p-3 sm:p-4">Team</th>
                      <th className="p-3 sm:p-4 text-center">P</th>
                      <th className="p-3 sm:p-4 text-center">W</th>
                      <th className="p-3 sm:p-4 text-center">L</th>
                      <th className="p-3 sm:p-4 text-center">NRR</th>
                      <th className="p-3 sm:p-4 text-center text-teal-600 dark:text-teal-400">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm font-bold">
                    {standings.map((row: any, idx: number) => {
                      const isPlayingMatch =
                        row.id === match.team1_id || row.id === match.team2_id;
                      return (
                        <tr
                          key={row.id || idx}
                          className={`border-b border-slate-50 dark:border-slate-800/50 transition-colors ${isPlayingMatch ? "bg-teal-50/50 dark:bg-teal-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                        >
                          <td className="p-3 sm:p-4 text-center text-slate-400 font-black">
                            {idx + 1}
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-slate-900 dark:text-white font-black ${isPlayingMatch ? "text-teal-700 dark:text-teal-400" : ""}`}
                              >
                                {row.short_name || row.name}
                              </span>
                              {isPlayingMatch && (
                                <span className="text-[8px] bg-teal-500 text-white px-2 py-0.5 rounded-full font-black tracking-widest animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400">
                            {row.played || 0}
                          </td>
                          <td className="p-3 sm:p-4 text-center text-emerald-600 dark:text-emerald-400">
                            {row.won || 0}
                          </td>
                          <td className="p-3 sm:p-4 text-center text-rose-500 dark:text-rose-400">
                            {row.lost || 0}
                          </td>
                          <td className="p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400 font-mono">
                            {Number(row.nrr) > 0
                              ? `+${row.nrr}`
                              : row.nrr || "0.000"}
                          </td>
                          <td className="p-3 sm:p-4 text-center text-teal-600 dark:text-teal-400 font-black text-base">
                            {row.points || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: PRO MATCH ANALYSIS (THE NEW FEATURE!) */}
      <div className="w-full">
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 px-2 mb-3">
          Tournament Impact
        </h3>
        <div className="w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-500/30">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-16 shrink-0 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-400/30">
              <Sparkles className="text-indigo-400 w-8 h-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">
                Gemini Pro Insights
              </h4>
              {isAnalyzing ? (
                <div className="flex items-center justify-center md:justify-start gap-3 text-indigo-200 font-medium">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  Analyzing leaderboard permutations...
                </div>
              ) : (
                <p className="text-sm md:text-base text-indigo-50 font-medium leading-relaxed">
                  "{proAnalysis}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
