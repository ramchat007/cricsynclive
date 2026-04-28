"use client";
import React, { useMemo } from "react";
import {
  Trophy,
  Target,
  Activity,
  Star,
  TrendingUp,
  Clock,
  MessageCircle,
  ClipboardList,
} from "lucide-react";

interface PlayerStats {
  name: string;
  runs: number;
  wickets: number;
}

export default function FullscreenPlates({
  type,
  matchData,
  deliveries,
  team1Squad,
  team2Squad,
}: any) {
  if (!matchData) return null;

  const allPlayers = useMemo(
    () => [...team1Squad, ...team2Squad],
    [team1Squad, team2Squad],
  );

  // 1. DYNAMIC OVER SUMMARY ENGINE
  const overInfo = useMemo(() => {
    const currentInn = matchData.current_innings || 1;
    const innBalls = deliveries.filter((d: any) => d.innings === currentInn);
    const lastBall = innBalls[innBalls.length - 1];
    if (!lastBall) return null;

    const bowler = allPlayers.find((p) => p.id === lastBall.bowler_id);
    const bowlerBalls = innBalls.filter(
      (d:any ) =>
        d.bowler_id === lastBall.bowler_id &&
        !["wide", "no-ball"].includes(d.extras_type?.toLowerCase()),
    ).length;

    return {
      num: lastBall.over_number,
      bowlerName: bowler?.full_name || "Bowler",
      bowlerOvers: `${Math.floor(bowlerBalls / 6)}.${bowlerBalls % 6}`,
      balls: innBalls.filter((d:any) => d.over_number === lastBall.over_number),
      commentary: lastBall.ai_commentary,
    };
  }, [deliveries, matchData.current_innings, allPlayers]);

  // 2. MATCH SUMMARY STATS ENGINE
  const summaryStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {};
    deliveries.forEach((d: any) => {
      if (d.striker_id && !stats[d.striker_id])
        stats[d.striker_id] = {
          name:
            allPlayers.find((p) => p.id === d.striker_id)?.full_name ||
            "Batter",
          runs: 0,
          wickets: 0,
        };
      if (d.bowler_id && !stats[d.bowler_id])
        stats[d.bowler_id] = {
          name:
            allPlayers.find((p) => p.id === d.bowler_id)?.full_name || "Bowler",
          runs: 0,
          wickets: 0,
        };
      if (d.striker_id) stats[d.striker_id].runs += Number(d.runs_off_bat) || 0;
      if (
        d.bowler_id &&
        d.is_wicket &&
        !["run out"].includes(d.wicket_type?.toLowerCase())
      )
        stats[d.bowler_id].wickets += 1;
    });
    const arr = Object.values(stats);
    return {
      batter: arr.sort((a, b) => b.runs - a.runs)[0],
      bowler: arr.sort((a, b) => b.wickets - a.wickets)[0],
    };
  }, [deliveries, allPlayers]);

  const glass =
    "bg-slate-950/40 backdrop-blur-3xl border border-white/10 shadow-2xl";
  const tossWinner =
    matchData.toss_winner_id === matchData.team1_id
      ? matchData.team1
      : matchData.team2;
  const tossLoser =
    matchData.toss_winner_id === matchData.team1_id
      ? matchData.team2
      : matchData.team1;

  return (
    <div className="w-full h-full flex items-center justify-center p-20 text-white font-sans">
      {/* --- TOSS REPORT --- */}
      {type === "TOSS_REPORT" && (
        <div
          className={`w-full max-w-5xl p-16 rounded-[4rem] flex flex-col items-center text-center animate-in slide-in-from-bottom-10 ${glass}`}>
          <p className="text-amber-400 font-black uppercase tracking-[0.35em] text-sm">
            Toss Report
          </p>
          <h2 className="text-7xl font-black uppercase tracking-tighter mt-6">
            {tossWinner?.name || "Toss Winner"}
          </h2>
          <p className="text-3xl font-bold text-white/70 mt-4">
            won the toss and elected to{" "}
            <span className="text-cyan-400 uppercase">
              {matchData.toss_decision || "bat"}
            </span>
          </p>
          <div className="mt-14 grid grid-cols-2 gap-8 w-full">
            {[tossWinner, tossLoser].map((team: any, idx: number) => (
              <div
                key={team?.id || idx}
                className="bg-white/5 border border-white/10 rounded-3xl py-10 px-8">
                <p className="text-xs text-white/40 font-black uppercase tracking-widest">
                  {idx === 0 ? "Winner" : "Opponent"}
                </p>
                <p className="text-4xl font-black mt-3 uppercase">
                  {team?.name || "Team"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- INNINGS BREAK --- */}
      {type === "INNINGS_BREAK" && (
        <div
          className={`w-full max-w-6xl p-16 rounded-[4rem] animate-in slide-in-from-bottom-10 ${glass}`}>
          <p className="text-amber-400 font-black uppercase tracking-[0.35em] text-sm text-center">
            Innings Break
          </p>
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <p className="text-white/40 text-sm font-black uppercase tracking-widest">
                1st Innings
              </p>
              <h3 className="text-5xl font-black mt-3">
                {matchData.team1?.name}
              </h3>
              <p className="text-7xl font-black mt-6">
                {matchData.team1_runs || 0}/{matchData.team1_wickets || 0}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <p className="text-white/40 text-sm font-black uppercase tracking-widest">
                Chase Target
              </p>
              <h3 className="text-5xl font-black mt-3">
                {matchData.team2?.name}
              </h3>
              <p className="text-7xl font-black mt-6 text-cyan-400">
                {(Number(matchData.team1_runs) || 0) + 1}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- MATCH RESULT --- */}
      {type === "MATCH_RESULT" && (
        <div
          className={`w-full max-w-6xl p-16 rounded-[4rem] animate-in zoom-in-95 ${glass}`}>
          <p className="text-amber-400 font-black uppercase tracking-[0.35em] text-sm text-center">
            Result
          </p>
          <h2 className="text-7xl font-black uppercase text-center mt-6">
            {matchData.match_result || "Result Pending"}
          </h2>
          <div className="grid grid-cols-2 gap-10 mt-12">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <p className="text-white/40 uppercase text-sm font-black">
                {matchData.team1?.name}
              </p>
              <p className="text-6xl font-black mt-4">
                {matchData.team1_runs || 0}/{matchData.team1_wickets || 0}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <p className="text-white/40 uppercase text-sm font-black">
                {matchData.team2?.name}
              </p>
              <p className="text-6xl font-black mt-4">
                {matchData.team2_runs || 0}/{matchData.team2_wickets || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- OVER SUMMARY --- */}
      {type === "OVER_SUMMARY" && overInfo && (
        <div
          className={`w-full max-w-6xl p-16 rounded-[4rem] flex flex-col items-center animate-in slide-in-from-bottom-10 ${glass}`}>
          <div className="flex justify-between items-end w-full mb-12">
            <div>
              <p className="text-amber-400 font-black uppercase text-sm mb-2">
                Over {overInfo.num} Summary
              </p>
              <h2 className="text-7xl font-black uppercase tracking-tighter">
                {overInfo.bowlerName}
              </h2>
              <span className="bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-xs font-black border border-amber-500/20 mt-4 inline-block">
                Spell: {overInfo.bowlerOvers} Overs
              </span>
            </div>
            <div className="text-right">
              <p className="text-white/40 font-black text-sm mb-2">Score</p>
              <h2 className="text-8xl font-black tracking-tighter">
                {matchData.current_innings === 1
                  ? matchData.team1_runs
                  : matchData.team2_runs}
                /
                {matchData.current_innings === 1
                  ? matchData.team1_wickets
                  : matchData.team2_wickets}
              </h2>
            </div>
          </div>
          <div className="flex gap-6 py-12 border-y border-white/10 w-full justify-center">
            {overInfo.balls.map((b: any, i: number) => (
              <div
                key={i}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black border-2 ${b.is_wicket ? "bg-rose-600 border-rose-400" : b.runs_off_bat === 6 ? "bg-amber-500 border-amber-300 text-slate-900" : b.runs_off_bat === 4 ? "bg-teal-500 border-teal-300 text-slate-900" : "bg-white/10 border-white/20"}`}>
                {b.is_wicket ? "W" : b.runs_off_bat}
              </div>
            ))}
          </div>
          {overInfo.commentary && (
            <div className="mt-12 flex gap-8 items-start bg-white/5 p-10 rounded-[3rem] w-full border border-white/5">
              <MessageCircle className="text-teal-400 shrink-0" size={48} />
              <p className="text-3xl font-medium italic leading-relaxed text-slate-200">
                "{overInfo.commentary}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* --- MATCH SUMMARY --- */}
      {type === "MATCH_SUMMARY" && (
        <div className="w-full h-full grid grid-cols-12 gap-10 animate-in zoom-in-95 duration-500">
          <div className="col-span-12 space-y-8">
            <div className={`p-16 rounded-[4rem] ${glass}`}>
              <div className="flex items-center gap-6 mb-10">
                <ClipboardList className="text-amber-400" size={48} />
                <h2 className="text-amber-400 font-black text-2xl uppercase tracking-[0.4em]">
                  Match Report
                </h2>
              </div>
              <h1 className="text-9xl font-black uppercase tracking-tighter italic mb-12 drop-shadow-2xl">
                {matchData.match_result || "Match in Progress"}
              </h1>
              <div className="grid grid-cols-2 gap-20 pt-12 border-t border-white/10">
                <div>
                  <p className="text-white/40 font-black text-sm uppercase mb-2">
                    {matchData.team1?.name}
                  </p>
                  <p className="text-8xl font-black">
                    {matchData.team1_runs}/{matchData.team1_wickets}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 font-black text-sm uppercase mb-2">
                    {matchData.team2?.name}
                  </p>
                  <p className="text-8xl font-black">
                    {matchData.team2_runs}/{matchData.team2_wickets}
                  </p>
                </div>
              </div>
            </div>
            <div
              className={`p-12 rounded-[4rem] grid grid-cols-2 gap-10 ${glass}`}>
              <div className="flex items-center gap-10">
                <Star className="text-amber-400" size={64} />
                <div>
                  <p className="text-amber-400 font-black text-sm uppercase">
                    Top Batter
                  </p>
                  <h3 className="text-5xl font-black uppercase">
                    {summaryStats.batter?.name}
                  </h3>
                  <p className="text-3xl font-bold text-white/50">
                    {summaryStats.batter?.runs} Runs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-10 border-l border-white/10 pl-16">
                <Target className="text-rose-500" size={64} />
                <div>
                  <p className="text-rose-500 font-black text-sm uppercase">
                    Top Bowler
                  </p>
                  <h3 className="text-5xl font-black uppercase">
                    {summaryStats.bowler?.name}
                  </h3>
                  <p className="text-3xl font-bold text-white/50">
                    {summaryStats.bowler?.wickets} Wickets
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PLAYING XI --- */}
      {type === "PLAYING_XI" && (
        <div className="w-full h-full grid grid-cols-2 gap-12">
          {[
            { n: matchData.team1?.name, s: team1Squad },
            { n: matchData.team2?.name, s: team2Squad },
          ].map((t, i) => (
            <div key={i} className={`rounded-[4rem] p-16 ${glass}`}>
              <h3 className="text-teal-400 font-black uppercase text-2xl mb-12 border-b border-white/10 pb-6">
                {t.n} Lineup
              </h3>
              <div className="space-y-4">
                {t.s.slice(0, 11).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-4xl font-black uppercase tracking-tighter">
                    <span>
                      <span className="text-white/20 mr-6 font-mono">
                        {idx + 1}
                      </span>{" "}
                      {p.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
