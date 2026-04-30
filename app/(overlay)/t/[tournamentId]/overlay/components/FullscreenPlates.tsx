"use client";
import React, { useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Target,
  Star,
  MessageCircle,
  ClipboardList,
  Award,
  ListOrdered,
} from "lucide-react";
import { getBroadcastTheme } from "@/lib/themes";

export default function FullscreenPlates({
  type,
  matchData,
  deliveries,
  team1Squad,
  team2Squad,
  tournamentId,
  themeId,
  config,
}: any) {
  const [standings, setStandings] = useState<any[]>([]);

  // --------------------------------------------------------
  // NEW: DYNAMIC POINTS TABLE CALCULATOR
  // --------------------------------------------------------
  useEffect(() => {
    if (type !== "POINTS_TABLE" || !tournamentId) return;

    const fetchStandings = async () => {
      // Fetch all teams and completed matches for this tournament
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", tournamentId);
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "completed");

      if (teams && matches) {
        let table = teams.map((t) => ({
          ...t,
          played: 0,
          won: 0,
          lost: 0,
          nr: 0,
          pts: 0,
          runsFor: 0,
          ballsFor: 0,
          runsAgainst: 0,
          ballsAgainst: 0,
          nrr: 0,
        }));

        matches.forEach((m) => {
          const t1 = table.find((t) => t.id === m.team1_id);
          const t2 = table.find((t) => t.id === m.team2_id);
          if (!t1 || !t2) return;

          t1.played += 1;
          t2.played += 1;

          if (m.match_winner_id === m.team1_id) {
            t1.won += 1;
            t1.pts += 2;
            t2.lost += 1;
          } else if (m.match_winner_id === m.team2_id) {
            t2.won += 1;
            t2.pts += 2;
            t1.lost += 1;
          } else {
            t1.nr += 1;
            t2.nr += 1;
            t1.pts += 1;
            t2.pts += 1;
          } // Tie or Abandoned

          t1.runsFor += m.team1_runs || 0;
          t1.ballsFor += m.team1_balls || 0;
          t1.runsAgainst += m.team2_runs || 0;
          t1.ballsAgainst += m.team2_balls || 0;

          t2.runsFor += m.team2_runs || 0;
          t2.ballsFor += m.team2_balls || 0;
          t2.runsAgainst += m.team1_runs || 0;
          t2.ballsAgainst += m.team1_balls || 0;
        });

        // Calculate NRR
        table.forEach((t) => {
          const oversFor = t.ballsFor / 6;
          const oversAgainst = t.ballsAgainst / 6;
          const rateFor = oversFor > 0 ? t.runsFor / oversFor : 0;
          const rateAgainst =
            oversAgainst > 0 ? t.runsAgainst / oversAgainst : 0;
          t.nrr = rateFor - rateAgainst;
        });

        // Sort by Points, then NRR
        table.sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);
        setStandings(table);
      }
    };
    fetchStandings();
  }, [type, tournamentId]);

  const allPlayers = useMemo(
    () => [...(team1Squad || []), ...(team2Squad || [])],
    [team1Squad, team2Squad],
  );

  const theme = getBroadcastTheme(themeId);
  const glass =
    "bg-slate-950/90 backdrop-blur-3xl border border-white/10 shadow-2xl";

  const formatOvers = (balls: number) =>
    `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;

  const overInfo = useMemo(() => {
    const currentInn = matchData?.current_innings || 1;
    const innBalls = (deliveries || []).filter(
      (d: any) => d.innings === currentInn,
    );
    const lastBall = innBalls[innBalls.length - 1];
    if (!lastBall) return null;

    const bowler = allPlayers.find((p) => p.id === lastBall.bowler_id);
    const bowlerBalls = innBalls.filter(
      (d: any) =>
        d.bowler_id === lastBall.bowler_id &&
        !["wide", "no-ball"].includes(d.extras_type?.toLowerCase()),
    ).length;

    return {
      num: lastBall.over_number,
      bowlerName: bowler?.full_name || "Bowler",
      bowlerOvers: formatOvers(bowlerBalls),
      balls: innBalls.filter(
        (d: any) => d.over_number === lastBall.over_number,
      ),
      commentary: lastBall.ai_commentary,
    };
  }, [deliveries, matchData?.current_innings, allPlayers]);

  const getInningsStats = (inningNumber: number) => {
    const innBalls = (deliveries || []).filter(
      (d: any) => Number(d.innings) === inningNumber,
    );
    const batStats: any = {};
    const bowlStats: any = {};

    innBalls.forEach((d: any) => {
      if (d.striker_id) {
        if (!batStats[d.striker_id])
          batStats[d.striker_id] = {
            name:
              allPlayers.find((p) => p.id === d.striker_id)?.full_name ||
              "Batter",
            runs: 0,
            balls: 0,
          };
        batStats[d.striker_id].runs += Number(d.runs_off_bat) || 0;
        if (!["wd", "wide"].includes(d.extras_type?.toLowerCase()))
          batStats[d.striker_id].balls += 1;
      }
      if (d.bowler_id) {
        if (!bowlStats[d.bowler_id])
          bowlStats[d.bowler_id] = {
            name:
              allPlayers.find((p) => p.id === d.bowler_id)?.full_name ||
              "Bowler",
            runs: 0,
            wickets: 0,
            balls: 0,
          };
        bowlStats[d.bowler_id].runs +=
          (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0);
        if (d.is_wicket && !["run out"].includes(d.wicket_type?.toLowerCase()))
          bowlStats[d.bowler_id].wickets += 1;
        if (
          !["wd", "wide", "nb", "no-ball"].includes(
            d.extras_type?.toLowerCase(),
          )
        )
          bowlStats[d.bowler_id].balls += 1;
      }
    });

    return {
      topBatters: Object.values(batStats)
        .sort((a: any, b: any) => b.runs - a.runs)
        .slice(0, 3),
      topBowlers: Object.values(bowlStats)
        .sort((a: any, b: any) => b.wickets - a.wickets || a.runs - b.runs)
        .slice(0, 3),
    };
  };

  const inn1Stats = useMemo(() => getInningsStats(1), [deliveries, allPlayers]);
  const inn2Stats = useMemo(() => getInningsStats(2), [deliveries, allPlayers]);

  let finalMatchResult = matchData?.match_result;
  if (!finalMatchResult || finalMatchResult.toLowerCase() === "completed") {
    if (matchData?.match_winner_id && matchData?.result_margin) {
      const winnerName =
        matchData.match_winner_id === matchData.team1_id
          ? matchData.team1?.name
          : matchData.team2?.name;
      finalMatchResult = `${winnerName} WON BY ${matchData.result_margin}`;
    } else if (matchData?.is_abandoned) {
      finalMatchResult = "Match Abandoned";
    } else {
      finalMatchResult = "Match Concluded";
    }
  }

  const pomPlayer = matchData
    ? allPlayers.find((p) => p.id === matchData.player_of_match_id)
    : null;
  const tossWinner =
    matchData?.toss_winner_id === matchData?.team1_id
      ? matchData?.team1
      : matchData?.team2;
  const tossLoser =
    matchData?.toss_winner_id === matchData?.team1_id
      ? matchData?.team2
      : matchData?.team1;

  if (!matchData && type !== "POINTS_TABLE") return null;

  return (
    <div
      className="w-full h-full flex items-center justify-center p-12 text-white font-sans overflow-hidden"
      style={{ color: theme.tokens.text }}>
      {/* --- NEW: POINTS TABLE STANDINGS --- */}
      {type === "POINTS_TABLE" && (
        <div
          className={`w-full max-w-[1200px] p-12 rounded-[3rem] flex flex-col animate-in zoom-in-95 duration-500 ${glass}`}>
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
            <ListOrdered className="text-amber-400" size={40} />
            <h2 className="text-amber-400 font-black text-3xl uppercase tracking-[0.3em]">
              Tournament Standings
            </h2>
          </div>

          <div className="w-full bg-black/40 rounded-2xl overflow-hidden border border-white/10">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-white/5 border-b border-white/10 text-xs font-black uppercase tracking-widest text-white/50">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Team</div>
              <div className="col-span-1 text-center">P</div>
              <div className="col-span-1 text-center">W</div>
              <div className="col-span-1 text-center">L</div>
              <div className="col-span-1 text-center text-amber-400">PTS</div>
              <div className="col-span-2 text-right">NRR</div>
            </div>

            {/* Data Rows */}
            <div className="flex flex-col">
              {standings.map((team, idx) => (
                <div
                  key={team.id}
                  className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5 items-center bg-gradient-to-r hover:bg-white/5 transition-colors">
                  <div className="col-span-1 font-mono text-xl font-bold text-white/30">
                    {idx + 1}
                  </div>
                  <div className="col-span-5 flex items-center gap-4">
                    <img
                      src={team.logo_url || "/default-logo.png"}
                      className="w-10 h-10 object-contain drop-shadow-md"
                      alt="logo"
                    />
                    <span className="font-black text-xl uppercase tracking-tight truncate">
                      {team.name}
                    </span>
                  </div>
                  <div className="col-span-1 text-center font-bold text-lg">
                    {team.played}
                  </div>
                  <div className="col-span-1 text-center font-bold text-lg text-emerald-400">
                    {team.won}
                  </div>
                  <div className="col-span-1 text-center font-bold text-lg text-rose-400">
                    {team.lost}
                  </div>
                  <div className="col-span-1 text-center font-black text-2xl text-amber-400">
                    {team.pts}
                  </div>
                  <div className="col-span-2 text-right font-mono text-lg font-bold text-cyan-400">
                    {team.nrr > 0 ? "+" : ""}
                    {team.nrr.toFixed(3)}
                  </div>
                </div>
              ))}
              {standings.length === 0 && (
                <div className="p-12 text-center text-white/40 font-bold uppercase tracking-widest">
                  Calculating Standings...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TOSS REPORT --- */}
      {type === "TOSS_REPORT" && (
        <div
          className={`w-full max-w-5xl p-16 rounded-[4rem] flex flex-col items-center text-center animate-in slide-in-from-bottom-10 ${glass}`}>
          <p
            className="font-black uppercase tracking-[0.35em] text-sm"
            style={{ color: theme.tokens.warning }}>
            Toss Report
          </p>
          <h2 className="text-7xl font-black uppercase tracking-tighter mt-6">
            {tossWinner?.name || "Toss Winner"}
          </h2>
          <p className="text-3xl font-bold text-white/70 mt-4">
            won the toss and elected to{" "}
            <span className="uppercase" style={{ color: theme.tokens.accent }}>
              {matchData?.toss_decision || "bat"}
            </span>
          </p>
        </div>
      )}

      {/* --- INNINGS BREAK --- */}
      {type === "INNINGS_BREAK" && (
        <div
          className={`w-full max-w-6xl p-16 rounded-[4rem] animate-in slide-in-from-bottom-10 ${glass}`}>
          <p
            className="font-black uppercase tracking-[0.35em] text-sm text-center"
            style={{ color: theme.tokens.warning }}>
            Innings Break
          </p>
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <p className="text-white/40 text-sm font-black uppercase tracking-widest">
                1st Innings
              </p>
              <h3 className="text-5xl font-black mt-3">
                {matchData?.team1?.name}
              </h3>
              <p className="text-7xl font-black mt-6">
                {matchData?.team1_runs || 0}/{matchData?.team1_wickets || 0}
                <span className="text-3xl text-white/50 ml-4">
                  ({formatOvers(matchData?.team1_balls)})
                </span>
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10">
              <p className="text-white/40 text-sm font-black uppercase tracking-widest">
                Chase Target
              </p>
              <h3 className="text-5xl font-black mt-3">
                {matchData?.team2?.name}
              </h3>
              <p
                className="text-7xl font-black mt-6"
                style={{ color: theme.tokens.accent }}>
                {(Number(matchData?.team1_runs) || 0) + 1}
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
                {matchData?.current_innings === 1
                  ? matchData?.team1_runs
                  : matchData?.team2_runs}
                /
                {matchData?.current_innings === 1
                  ? matchData?.team1_wickets
                  : matchData?.team2_wickets}
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
        </div>
      )}

      {/* --- MATCH SUMMARY --- */}
      {type === "MATCH_SUMMARY" && (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
          <div
            className={`w-full max-w-[1400px] p-12 rounded-[3rem] flex flex-col ${glass}`}>
            <div className="text-center pb-8 border-b border-white/10 mb-8">
              <p className="text-white/50 font-black tracking-[0.3em] uppercase text-sm mb-3">
                Final Match Summary
              </p>
              <h1
                className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic px-4"
                style={{
                  color: theme.tokens.warning,
                  textShadow: `0 0 20px ${theme.tokens.warning}40`,
                }}>
                {finalMatchResult}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col border border-white/10 rounded-3xl bg-black/20 p-8">
                <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-6">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-white/90">
                    {matchData?.team1?.name}
                  </h3>
                  <div className="text-right">
                    <h2 className="text-5xl font-black leading-none">
                      {matchData?.team1_runs || 0}
                      <span className="text-3xl text-white/60">
                        /{matchData?.team1_wickets || 0}
                      </span>
                    </h2>
                    <p className="text-lg font-bold text-white/40 mt-1">
                      {formatOvers(matchData?.team1_balls)} Overs
                    </p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  {inn1Stats.topBatters.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                      <span className="font-bold text-lg">{b.name}</span>
                      <span className="font-black text-xl">
                        {b.runs}{" "}
                        <span className="text-sm font-normal text-white/50">
                          ({b.balls})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
                  {inn1Stats.topBowlers.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                      <span className="font-bold text-lg">{b.name}</span>
                      <span className="font-black text-xl text-teal-400">
                        {b.wickets}-{b.runs}{" "}
                        <span className="text-sm font-normal text-white/50">
                          ({formatOvers(b.balls)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col border border-white/10 rounded-3xl bg-black/20 p-8">
                <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-6">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-white/90">
                    {matchData?.team2?.name}
                  </h3>
                  <div className="text-right">
                    <h2 className="text-5xl font-black leading-none">
                      {matchData?.team2_runs || 0}
                      <span className="text-3xl text-white/60">
                        /{matchData?.team2_wickets || 0}
                      </span>
                    </h2>
                    <p className="text-lg font-bold text-white/40 mt-1">
                      {formatOvers(matchData?.team2_balls)} Overs
                    </p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  {inn2Stats.topBatters.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                      <span className="font-bold text-lg">{b.name}</span>
                      <span className="font-black text-xl">
                        {b.runs}{" "}
                        <span className="text-sm font-normal text-white/50">
                          ({b.balls})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
                  {inn2Stats.topBowlers.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                      <span className="font-bold text-lg">{b.name}</span>
                      <span className="font-black text-xl text-teal-400">
                        {b.wickets}-{b.runs}{" "}
                        <span className="text-sm font-normal text-white/50">
                          ({formatOvers(b.balls)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {pomPlayer && (
              <div className="mt-8 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Award className="text-amber-400" size={40} />
                  <div>
                    <p className="text-amber-400 font-black uppercase tracking-widest text-xs mb-1">
                      Player of the Match
                    </p>
                    <p className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
                      {pomPlayer.full_name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PLAYING XI --- */}
      {type === "PLAYING_XI" && (
        <div className="w-full h-full grid grid-cols-2 gap-12">
          {[
            { n: matchData?.team1?.name, s: team1Squad },
            { n: matchData?.team2?.name, s: team2Squad },
          ].map((t, i) => (
            <div key={i} className={`rounded-[4rem] p-16 ${glass}`}>
              <h3 className="text-teal-400 font-black uppercase text-2xl mb-12 border-b border-white/10 pb-6">
                {t.n} Lineup
              </h3>
              <div className="space-y-4">
                {(t.s || []).slice(0, 11).map((p: any, idx: number) => (
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

      {/* --- NEW: YOUTUBE LIVE QUIZ --- */}
      {type === "LIVE_QUIZ" && config?.quizData && (
        <div
          className={`w-full max-w-[1200px] p-16 rounded-[4rem] flex flex-col items-center animate-in zoom-in-95 duration-500 ${glass}`}>
          <div className="bg-red-600/20 border border-red-500/50 px-8 py-3 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(220,38,38,0.3)] mb-12">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="font-black uppercase tracking-[0.4em] text-red-400 text-lg">
              YouTube Live Trivia
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-black text-center leading-tight mb-16 tracking-tight text-white drop-shadow-lg">
            {config.quizData.question}
          </h2>

          <div className="grid grid-cols-2 gap-8 w-full px-8">
            {(config.quizData.options || []).map((opt: string, i: number) => (
              <div
                key={i}
                className="bg-gradient-to-r from-white/10 to-transparent border border-white/20 p-8 rounded-3xl text-3xl font-bold flex items-center gap-8 shadow-xl">
                <span className="text-amber-400 font-black text-5xl opacity-80">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-white drop-shadow-md">{opt}</span>
              </div>
            ))}
          </div>

          <p className="mt-16 text-white/40 font-black uppercase tracking-[0.3em] text-xl animate-pulse">
            Comment your answer in the live chat!
          </p>
        </div>
      )}
    </div>
  );
}
