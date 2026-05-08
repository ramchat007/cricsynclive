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
  User,
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
  // DYNAMIC POINTS TABLE CALCULATOR
  // --------------------------------------------------------
  useEffect(() => {
    if (type !== "POINTS_TABLE" || !tournamentId) return;

    const fetchStandings = async () => {
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
          }

          t1.runsFor += m.team1_runs || 0;
          t1.ballsFor += m.team1_balls || 0;
          t1.runsAgainst += m.team2_runs || 0;
          t1.ballsAgainst += m.team2_balls || 0;

          t2.runsFor += m.team2_runs || 0;
          t2.ballsFor += m.team2_balls || 0;
          t2.runsAgainst += m.team1_runs || 0;
          t2.ballsAgainst += m.team1_balls || 0;
        });

        table.forEach((t) => {
          const oversFor = t.ballsFor / 6;
          const oversAgainst = t.ballsAgainst / 6;
          const rateFor = oversFor > 0 ? t.runsFor / oversFor : 0;
          const rateAgainst =
            oversAgainst > 0 ? t.runsAgainst / oversAgainst : 0;
          t.nrr = rateFor - rateAgainst;
        });

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
    "bg-slate-950/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]";

  const formatOvers = (balls: number) =>
    `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;

  // --------------------------------------------------------
  // 🔥 DYNAMIC TEAM RESOLVER & COLORS 🔥
  // --------------------------------------------------------
  const team1WonToss = matchData?.toss_winner_id === matchData?.team1_id;
  const choseToBat = matchData?.toss_decision?.toLowerCase() === "bat";
  const team1BattedFirst = choseToBat ? team1WonToss : !team1WonToss;

  // Accurately map the Teams to their Innings
  const firstInningsTeam = team1BattedFirst
    ? matchData?.team1
    : matchData?.team2;
  const secondInningsTeam = team1BattedFirst
    ? matchData?.team2
    : matchData?.team1;

  // Accurately map dynamic colors!
  const t1Color = matchData?.team1?.primary_color || theme.tokens.accent;
  const t2Color = matchData?.team2?.primary_color || theme.tokens.accent;
  const firstInningsColor = team1BattedFirst ? t1Color : t2Color;
  const secondInningsColor = team1BattedFirst ? t2Color : t1Color;

  const tossWinnerColor = team1WonToss ? t1Color : t2Color;

  // Accurately map the Database Runs to their Innings
  const firstRuns = team1BattedFirst
    ? matchData?.team1_runs
    : matchData?.team2_runs;
  const firstWickets = team1BattedFirst
    ? matchData?.team1_wickets
    : matchData?.team2_wickets;
  const firstBalls = team1BattedFirst
    ? matchData?.team1_balls
    : matchData?.team2_balls;

  const secondRuns = team1BattedFirst
    ? matchData?.team2_runs
    : matchData?.team1_runs;
  const secondWickets = team1BattedFirst
    ? matchData?.team2_wickets
    : matchData?.team1_wickets;
  const secondBalls = team1BattedFirst
    ? matchData?.team2_balls
    : matchData?.team1_balls;
  // --------------------------------------------------------

  const overInfo = useMemo(() => {
    const currentInn = matchData?.current_innings || 1;
    const innBalls = (deliveries || []).filter(
      (d: any) => d.innings === currentInn,
    );
    const lastBall = innBalls[innBalls.length - 1];
    if (!lastBall) return null;

    const bowler = allPlayers.find((p) => p.id === lastBall.bowler_id);
    const bowlerTeamColor =
      currentInn === 1 ? secondInningsColor : firstInningsColor;

    const bowlerBalls = innBalls.filter(
      (d: any) =>
        d.bowler_id === lastBall.bowler_id &&
        !["wd", "wide", "nb", "no-ball"].includes(d.extras_type?.toLowerCase()),
    ).length;

    return {
      num: lastBall.over_number,
      bowlerName: bowler?.full_name || "Bowler",
      bowlerOvers: formatOvers(bowlerBalls),
      color: bowlerTeamColor,
      balls: innBalls.filter(
        (d: any) => d.over_number === lastBall.over_number,
      ),
      commentary: lastBall.ai_commentary,
    };
  }, [
    deliveries,
    matchData?.current_innings,
    allPlayers,
    firstInningsColor,
    secondInningsColor,
  ]);

  // Added Photo URL Extraction to Stats!
  const getInningsStats = (inningNumber: number) => {
    const innBalls = (deliveries || []).filter(
      (d: any) => Number(d.innings) === inningNumber,
    );
    const batStats: any = {};
    const bowlStats: any = {};

    innBalls.forEach((d: any) => {
      if (d.striker_id) {
        const player = allPlayers.find((p) => p.id === d.striker_id);
        if (!batStats[d.striker_id]) {
          batStats[d.striker_id] = {
            name: player?.full_name || "Batter",
            photo: player?.photo_url || null,
            runs: 0,
            balls: 0,
          };
        }
        batStats[d.striker_id].runs += Number(d.runs_off_bat) || 0;
        if (!["wd", "wide"].includes(d.extras_type?.toLowerCase()))
          batStats[d.striker_id].balls += 1;
      }
      if (d.bowler_id) {
        const player = allPlayers.find((p) => p.id === d.bowler_id);
        if (!bowlStats[d.bowler_id]) {
          bowlStats[d.bowler_id] = {
            name: player?.full_name || "Bowler",
            photo: player?.photo_url || null,
            runs: 0,
            wickets: 0,
            balls: 0,
          };
        }
        bowlStats[d.bowler_id].runs +=
          (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0);
        if (
          d.is_wicket &&
          !["run out", "run-out"].includes(d.wicket_type?.toLowerCase())
        )
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
  let winnerColor = theme.tokens.warning;

  // 1. Check if the match is still actively being played
  if (matchData?.status === "live") {
    finalMatchResult = "Match In Progress";
  }
  // 2. Otherwise, calculate the final completion state
  else if (
    !finalMatchResult ||
    finalMatchResult.toLowerCase() === "completed" ||
    matchData?.status === "completed"
  ) {
    if (matchData?.match_winner_id && matchData?.result_margin) {
      const winnerName =
        matchData.match_winner_id === matchData.team1_id
          ? matchData.team1?.name
          : matchData.team2?.name;

      winnerColor =
        matchData.match_winner_id === matchData.team1_id ? t1Color : t2Color;
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

  if (!matchData && type !== "POINTS_TABLE") return null;

  return (
    <div
      className="w-full h-full flex items-center justify-center p-12 text-white font-sans overflow-hidden"
      style={{ color: theme.tokens.text }}>
      {/* --- POINTS TABLE STANDINGS --- */}
      {type === "POINTS_TABLE" && (
        <div
          className={`w-full max-w-[1200px] p-12 rounded-[3rem] flex flex-col animate-in zoom-in-95 duration-500 ${glass}`}>
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
            <ListOrdered className="text-amber-400" size={40} />
            <h2 className="text-amber-400 font-black text-4xl uppercase tracking-[0.3em] drop-shadow-md">
              Tournament Standings
            </h2>
          </div>

          <div className="w-full bg-black/40 rounded-2xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-white/5 border-b border-white/10 text-sm font-black uppercase tracking-widest text-white/50">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Team</div>
              <div className="col-span-1 text-center">P</div>
              <div className="col-span-1 text-center">W</div>
              <div className="col-span-1 text-center">L</div>
              <div className="col-span-1 text-center text-amber-400">PTS</div>
              <div className="col-span-2 text-right">NRR</div>
            </div>

            <div className="flex flex-col">
              {standings.map((team, idx) => (
                <div
                  key={team.id}
                  className="grid grid-cols-12 gap-4 px-8 py-6 border-b border-white/5 items-center bg-gradient-to-r hover:bg-white/5 transition-colors">
                  <div className="col-span-1 font-mono text-2xl font-bold text-white/40">
                    {idx + 1}
                  </div>
                  <div className="col-span-5 flex items-center gap-5">
                    <img
                      src={team.logo_url || "/default-logo.png"}
                      className="w-12 h-12 object-contain drop-shadow-md"
                      alt="logo"
                    />
                    <span className="font-black text-2xl uppercase tracking-tight truncate drop-shadow-md">
                      {team.name}
                    </span>
                  </div>
                  <div className="col-span-1 text-center font-bold text-2xl">
                    {team.played}
                  </div>
                  <div className="col-span-1 text-center font-bold text-2xl text-emerald-400">
                    {team.won}
                  </div>
                  <div className="col-span-1 text-center font-bold text-2xl text-rose-400">
                    {team.lost}
                  </div>
                  <div className="col-span-1 text-center font-black text-3xl text-amber-400">
                    {team.pts}
                  </div>
                  <div className="col-span-2 text-right font-mono text-2xl font-bold text-cyan-400">
                    {team.nrr > 0 ? "+" : ""}
                    {team.nrr.toFixed(3)}
                  </div>
                </div>
              ))}
              {standings.length === 0 && (
                <div className="p-16 text-center text-white/40 font-bold text-xl uppercase tracking-widest">
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
          className={`w-full max-w-5xl p-20 rounded-[4rem] flex flex-col items-center text-center animate-in slide-in-from-bottom-10 border-b-8 ${glass}`}
          style={{ borderBottomColor: tossWinnerColor }}>
          <p
            className="font-black uppercase tracking-[0.35em] text-xl mb-4"
            style={{ color: tossWinnerColor }}>
            Toss Report
          </p>
          <h2 className="text-8xl font-black uppercase tracking-tighter mt-6 drop-shadow-xl text-white">
            {tossWinner?.name || "Toss Winner"}
          </h2>
          <p className="text-4xl font-bold text-white/80 mt-8 leading-relaxed">
            won the toss and elected to <br />
            <span
              className="uppercase text-6xl font-black inline-block mt-4 px-8 py-2 bg-white/10 rounded-2xl"
              style={{ color: tossWinnerColor }}>
              {matchData?.toss_decision || "bat"}
            </span>
          </p>
        </div>
      )}

      {/* --- INNINGS BREAK --- */}
      {type === "INNINGS_BREAK" && (
        <div
          className={`w-full max-w-[1400px] p-20 rounded-[4rem] animate-in slide-in-from-bottom-10 ${glass}`}>
          <p
            className="font-black uppercase tracking-[0.35em] text-xl text-center mb-12 drop-shadow-md"
            style={{ color: theme.tokens.warning }}>
            Innings Break
          </p>
          <div className="grid grid-cols-2 gap-16 mt-8">
            {/* 1st Innings Box */}
            <div
              className="bg-black/30 border-t-8 border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden"
              style={{ borderTopColor: firstInningsColor }}>
              <div
                className="absolute top-0 right-0 w-64 h-64 opacity-20 blur-3xl rounded-full pointer-events-none"
                style={{ backgroundColor: firstInningsColor }}
              />
              <div className="relative z-10">
                <p className="text-white/50 text-lg font-black uppercase tracking-widest">
                  1st Innings
                </p>
                <h3 className="text-6xl font-black mt-4 drop-shadow-lg truncate">
                  {firstInningsTeam?.name}
                </h3>
                <p className="text-8xl font-black mt-8 tracking-tighter drop-shadow-xl">
                  {firstRuns || 0}
                  <span className="text-6xl text-white/50">
                    /{firstWickets || 0}
                  </span>
                  <span className="text-4xl text-white/40 ml-6 font-bold tracking-normal">
                    ({formatOvers(firstBalls)})
                  </span>
                </p>
              </div>
            </div>

            {/* Chase Target Box */}
            <div
              className="bg-black/30 border-t-8 border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden"
              style={{ borderTopColor: secondInningsColor }}>
              <div
                className="absolute top-0 right-0 w-64 h-64 opacity-20 blur-3xl rounded-full pointer-events-none"
                style={{ backgroundColor: secondInningsColor }}
              />
              <div className="relative z-10">
                <p className="text-white/50 text-lg font-black uppercase tracking-widest">
                  Chase Target
                </p>
                <h3 className="text-6xl font-black mt-4 drop-shadow-lg truncate">
                  {secondInningsTeam?.name}
                </h3>
                <p
                  className="text-9xl font-black mt-8 tracking-tighter drop-shadow-xl"
                  style={{ color: secondInningsColor }}>
                  {(Number(firstRuns) || 0) + 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- OVER SUMMARY --- */}
      {type === "OVER_SUMMARY" && overInfo && (
        <div
          className={`w-full max-w-6xl p-20 rounded-[4rem] flex flex-col items-center animate-in slide-in-from-bottom-10 border-l-8 ${glass}`}
          style={{ borderLeftColor: overInfo.color }}>
          <div className="flex justify-between items-end w-full mb-16">
            <div>
              <p
                className="font-black uppercase text-xl mb-4 tracking-[0.2em]"
                style={{ color: overInfo.color }}>
                Over {overInfo.num} Summary
              </p>
              <h2 className="text-8xl font-black uppercase tracking-tighter drop-shadow-lg text-white">
                {overInfo.bowlerName}
              </h2>
              <span className="bg-white/10 text-white px-6 py-2 rounded-full text-lg font-black border border-white/20 mt-6 inline-block shadow-sm">
                Spell: {overInfo.bowlerOvers} Overs
              </span>
            </div>
            <div className="text-right">
              <p className="text-white/50 font-black text-xl mb-4 tracking-widest uppercase">
                Score
              </p>
              <h2 className="text-9xl font-black tracking-tighter drop-shadow-xl leading-none">
                {matchData?.current_innings === 1
                  ? firstRuns || 0
                  : secondRuns || 0}
                <span className="text-white/50 text-7xl">
                  /
                  {matchData?.current_innings === 1
                    ? firstWickets || 0
                    : secondWickets || 0}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex gap-6 py-12 border-y border-white/10 w-full justify-center">
            {overInfo.balls.map((b: any, i: number) => (
              <div
                key={i}
                className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-black border-[3px] shadow-lg ${b.is_wicket ? "bg-rose-600 border-rose-400 text-white" : b.runs_off_bat === 6 ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--background)]" : b.runs_off_bat === 4 ? "bg-cyan-500 border-cyan-300 text-slate-900" : "bg-white/10 border-white/20 text-white"}`}>
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
            className={`w-full max-w-[1600px] p-16 rounded-[4rem] flex flex-col ${glass}`}>
            <div className="text-center pb-10 border-b border-white/10 mb-10">
              <p className="text-white/50 font-black tracking-[0.3em] uppercase text-xl mb-4">
                Final Match Summary
              </p>
              <h1
                className="text-6xl md:text-7xl font-black uppercase tracking-tighter italic px-4 drop-shadow-2xl"
                style={{
                  color: winnerColor,
                  textShadow: `0 0 30px ${winnerColor}60`,
                }}>
                {finalMatchResult}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-16">
              {/* 1st Innings Box */}
              <div
                className="flex flex-col border-t-8 border-white/10 rounded-[2.5rem] bg-black/40 p-10 shadow-2xl relative overflow-hidden"
                style={{ borderTopColor: firstInningsColor }}>
                <div
                  className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-3xl rounded-full pointer-events-none"
                  style={{ backgroundColor: firstInningsColor }}
                />

                <div className="flex justify-between items-end border-b border-white/10 pb-8 mb-8 relative z-10">
                  <h3 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-md truncate max-w-[60%]">
                    {firstInningsTeam?.name}
                  </h3>
                  <div className="text-right shrink-0">
                    <h2 className="text-7xl font-black leading-none drop-shadow-lg">
                      {firstRuns || 0}
                      <span className="text-5xl text-white/50">
                        /{firstWickets || 0}
                      </span>
                    </h2>
                    <p className="text-2xl font-bold text-white/50 mt-2 tracking-widest">
                      {formatOvers(firstBalls)} OVERS
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 relative z-10">
                  {inn1Stats.topBatters.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl border-l-4 shadow-sm"
                      style={{ borderLeftColor: firstInningsColor }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-black/50 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
                          {b.photo ? (
                            <img
                              src={b.photo}
                              className="w-full h-full object-cover"
                              alt={b.name}
                            />
                          ) : (
                            <User className="text-white/50 p-2 w-full h-full" />
                          )}
                        </div>
                        <span className="font-bold text-2xl drop-shadow-sm truncate max-w-[250px]">
                          {b.name}
                        </span>
                      </div>
                      <span className="font-black text-3xl tabular-nums drop-shadow-sm">
                        {b.runs}{" "}
                        <span className="text-lg font-bold text-white/50 ml-1">
                          ({b.balls})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-8 border-t border-white/10 mt-auto relative z-10">
                  {inn1Stats.topBowlers.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl border-l-4 shadow-sm"
                      style={{ borderLeftColor: secondInningsColor }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-black/50 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
                          {b.photo ? (
                            <img
                              src={b.photo}
                              className="w-full h-full object-cover"
                              alt={b.name}
                            />
                          ) : (
                            <User className="text-white/50 p-2 w-full h-full" />
                          )}
                        </div>
                        <span className="font-bold text-2xl drop-shadow-sm truncate max-w-[250px]">
                          {b.name}
                        </span>
                      </div>
                      <span className="font-black text-3xl tabular-nums drop-shadow-sm text-cyan-400">
                        {b.wickets}-{b.runs}{" "}
                        <span className="text-lg font-bold text-white/50 ml-1">
                          ({formatOvers(b.balls)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2nd Innings Box */}
              <div
                className="flex flex-col border-t-8 border-white/10 rounded-[2.5rem] bg-black/40 p-10 shadow-2xl relative overflow-hidden"
                style={{ borderTopColor: secondInningsColor }}>
                <div
                  className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-3xl rounded-full pointer-events-none"
                  style={{ backgroundColor: secondInningsColor }}
                />

                <div className="flex justify-between items-end border-b border-white/10 pb-8 mb-8 relative z-10">
                  <h3 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-md truncate max-w-[60%]">
                    {secondInningsTeam?.name}
                  </h3>
                  <div className="text-right shrink-0">
                    <h2 className="text-7xl font-black leading-none drop-shadow-lg">
                      {secondRuns || 0}
                      <span className="text-5xl text-white/50">
                        /{secondWickets || 0}
                      </span>
                    </h2>
                    <p className="text-2xl font-bold text-white/50 mt-2 tracking-widest">
                      {formatOvers(secondBalls)} OVERS
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 relative z-10">
                  {inn2Stats.topBatters.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl border-l-4 shadow-sm"
                      style={{ borderLeftColor: secondInningsColor }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-black/50 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
                          {b.photo ? (
                            <img
                              src={b.photo}
                              className="w-full h-full object-cover"
                              alt={b.name}
                            />
                          ) : (
                            <User className="text-white/50 p-2 w-full h-full" />
                          )}
                        </div>
                        <span className="font-bold text-2xl drop-shadow-sm truncate max-w-[250px]">
                          {b.name}
                        </span>
                      </div>
                      <span className="font-black text-3xl tabular-nums drop-shadow-sm">
                        {b.runs}{" "}
                        <span className="text-lg font-bold text-white/50 ml-1">
                          ({b.balls})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-8 border-t border-white/10 mt-auto relative z-10">
                  {inn2Stats.topBowlers.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl border-l-4 shadow-sm"
                      style={{ borderLeftColor: firstInningsColor }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-black/50 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
                          {b.photo ? (
                            <img
                              src={b.photo}
                              className="w-full h-full object-cover"
                              alt={b.name}
                            />
                          ) : (
                            <User className="text-white/50 p-2 w-full h-full" />
                          )}
                        </div>
                        <span className="font-bold text-2xl drop-shadow-sm truncate max-w-[250px]">
                          {b.name}
                        </span>
                      </div>
                      <span className="font-black text-3xl tabular-nums drop-shadow-sm text-cyan-400">
                        {b.wickets}-{b.runs}{" "}
                        <span className="text-lg font-bold text-white/50 ml-1">
                          ({formatOvers(b.balls)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* POM Badge */}
            {pomPlayer && (
              <div className="mt-12 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 p-8 rounded-full flex items-center gap-8 shadow-xl w-max mx-auto px-16">
                <Award className="text-amber-400 drop-shadow-lg" size={60} />
                <div>
                  <p className="text-amber-400 font-black uppercase tracking-[0.3em] text-lg mb-1">
                    Player of the Match
                  </p>
                  <p className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-xl">
                    {pomPlayer.full_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PLAYING XI --- */}
      {type === "PLAYING_XI" && (
        <div className="w-full h-full grid grid-cols-2 gap-16 p-10">
          {[
            { n: matchData?.team1?.name, s: team1Squad, c: t1Color },
            { n: matchData?.team2?.name, s: team2Squad, c: t2Color },
          ].map((t, i) => (
            <div
              key={i}
              className={`rounded-[4rem] p-20 border-t-8 shadow-2xl ${glass}`}
              style={{ borderTopColor: t.c }}>
              <h3
                className="font-black uppercase text-5xl mb-16 border-b border-white/10 pb-8 tracking-tight drop-shadow-md"
                style={{ color: t.c }}>
                {t.n} Lineup
              </h3>
              <div className="space-y-6">
                {(t.s || []).slice(0, 11).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-start items-center text-4xl font-black uppercase tracking-tighter drop-shadow-md">
                    <span className="text-white/30 mr-8 font-mono w-16 text-right shrink-0">
                      {idx + 1}
                    </span>{" "}
                    <span className="truncate">{p.full_name}</span>
                    {p.is_icon && (
                      <Star
                        className="ml-4 text-amber-500 fill-amber-500 shrink-0"
                        size={24}
                      />
                    )}
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
          className={`w-full max-w-[1400px] p-20 rounded-[4rem] flex flex-col items-center animate-in zoom-in-95 duration-500 border border-red-500/20 shadow-[0_0_100px_rgba(220,38,38,0.2)] ${glass}`}>
          <div className="bg-red-600/20 border border-red-500/50 px-10 py-4 rounded-full flex items-center gap-5 shadow-[0_0_30px_rgba(220,38,38,0.3)] mb-16">
            <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse shadow-lg" />
            <span className="font-black uppercase tracking-[0.4em] text-red-400 text-2xl drop-shadow-md">
              {config.youtubeChannelName || ""} Live Trivia
            </span>
          </div>

          <h2 className="text-6xl md:text-7xl font-black text-center leading-tight mb-20 tracking-tight text-white drop-shadow-xl px-10">
            {config.quizData.question}
          </h2>

          <div className="grid grid-cols-2 gap-10 w-full px-12">
            {(config.quizData.options || []).map((opt: string, i: number) => (
              <div
                key={i}
                className="bg-gradient-to-r from-white/10 to-transparent border border-white/20 p-10 rounded-[2.5rem] text-4xl font-bold flex items-center gap-10 shadow-2xl backdrop-blur-md">
                <span className="text-amber-400 font-black text-6xl opacity-90 drop-shadow-md">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-white drop-shadow-lg truncate">
                  {opt}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-20 text-white/50 font-black uppercase tracking-[0.4em] text-3xl animate-pulse drop-shadow-md">
            Comment your answer in the live chat!
          </p>
        </div>
      )}
    </div>
  );
}
