"use client";
import { useState } from "react";

export default function FullScorecard({
  deliveries,
  battingSquad,
  bowlingSquad,
  match,
}: any) {
  // 1. Setup local state to toggle between innings
  const [selectedInnings, setSelectedInnings] = useState(
    match?.current_innings || 1,
  );

  if (!match) return null;

  // 2. Identify the correct squad for the selected tab
  const isCurrentInnings = selectedInnings === match.current_innings;
  const activeBattingSquad = isCurrentInnings ? battingSquad : bowlingSquad;
  const activeBowlingSquad = isCurrentInnings ? bowlingSquad : battingSquad;

  const inningsDelivs = deliveries.filter(
    (d: any) => d.innings === selectedInnings,
  );

  // 3a. Chronological Batting Order Logic
  const battingOrderIds: string[] = [];
  inningsDelivs.forEach((d: any) => {
    if (!battingOrderIds.includes(d.striker_id))
      battingOrderIds.push(d.striker_id);
    if (!battingOrderIds.includes(d.non_striker_id))
      battingOrderIds.push(d.non_striker_id);
  });

  if (isCurrentInnings) {
    if (
      match.live_striker_id &&
      !battingOrderIds.includes(match.live_striker_id)
    )
      battingOrderIds.push(match.live_striker_id);
    if (
      match.live_non_striker_id &&
      !battingOrderIds.includes(match.live_non_striker_id)
    )
      battingOrderIds.push(match.live_non_striker_id);
  }

  // 3b. Chronological Bowling Order Logic
  const bowlingOrderIds: string[] = [];
  inningsDelivs.forEach((d: any) => {
    if (d.bowler_id && !bowlingOrderIds.includes(d.bowler_id))
      bowlingOrderIds.push(d.bowler_id);
  });

  if (isCurrentInnings) {
    if (match.live_bowler_id && !bowlingOrderIds.includes(match.live_bowler_id))
      bowlingOrderIds.push(match.live_bowler_id);
  }

  const formatDismissal = (dismissal: any) => {
    if (!dismissal) return "not out";
    const bowler =
      activeBowlingSquad.find((b: any) => b.id === dismissal.bowler_id)
        ?.full_name || "Unknown";
    const fielder =
      activeBowlingSquad.find((f: any) => f.id === dismissal.fielder_id)
        ?.full_name || "Unknown";

    switch (dismissal.wicket_type) {
      case "bowled":
        return `b ${bowler}`;
      case "caught":
        return `c ${fielder} b ${bowler}`;
      case "lbw":
        return `lbw b ${bowler}`;
      case "run-out":
        return dismissal.fielder_id ? `run out (${fielder})` : `run out`;
      case "stumped":
        return `st ${fielder} b ${bowler}`;
      default:
        return dismissal.wicket_type;
    }
  };

  const getBattingStats = (squad: any[]) => {
    const activeBatsmen = squad
      .map((player: any) => {
        const playerBalls = inningsDelivs.filter(
          (d: any) => d.striker_id === player.id,
        );
        const runs = playerBalls.reduce(
          (sum: number, d: any) => sum + (d.runs_off_bat || 0),
          0,
        );
        const balls = playerBalls.filter(
          (d: any) => d.extras_type !== "wide",
        ).length;
        const fours = playerBalls.filter(
          (d: any) => d.runs_off_bat === 4,
        ).length;
        const sixes = playerBalls.filter(
          (d: any) => d.runs_off_bat === 6,
        ).length;
        const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";

        const dismissal = inningsDelivs.find(
          (d: any) => d.is_wicket && d.player_out_id === player.id,
        );

        return {
          ...player,
          runs,
          balls,
          fours,
          sixes,
          sr,
          isOut: !!dismissal,
          dismissalText: formatDismissal(dismissal),
          facedAWide: playerBalls.length > 0,
        };
      })
      .filter(
        (p: any) =>
          p.balls > 0 ||
          p.isOut ||
          p.facedAWide ||
          (isCurrentInnings &&
            (p.id === match.live_striker_id ||
              p.id === match.live_non_striker_id)),
      );

    return activeBatsmen.sort((a, b) => {
      const idxA = battingOrderIds.indexOf(a.id);
      const idxB = battingOrderIds.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  };

  const getBowlingStats = (squad: any[]) => {
    const activeBowlers = squad
      .map((player: any) => {
        const playerDelivs = inningsDelivs.filter(
          (d: any) => d.bowler_id === player.id,
        );
        const totalBalls = playerDelivs.filter(
          (d: any) =>
            (d.extras_type !== "wide" &&
              d.extras_type !== "no-ball" &&
              d.extras_type !== "penalty" &&
              d.extras_type !== "dead-ball") ||
            d.force_legal_ball,
        ).length;
        const runs = playerDelivs
          .filter(
            (d: any) =>
              d.extras_type !== "bye" &&
              d.extras_type !== "leg-bye" &&
              d.extras_type !== "penalty",
          )
          .reduce(
            (sum: number, d: any) =>
              sum + (d.runs_off_bat || 0) + (d.extras_runs || 0),
            0,
          );
        const wickets = playerDelivs.filter(
          (d: any) => d.is_wicket && d.wicket_type !== "run-out",
        ).length;
        const econ =
          totalBalls > 0 ? (runs / (totalBalls / 6) || 0).toFixed(2) : "0.00";
        const overs = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

        return {
          ...player,
          overs,
          runs,
          wickets,
          econ,
          totalBalls,
          hasBowled: playerDelivs.length > 0,
        };
      })
      .filter(
        (p: any) =>
          p.totalBalls > 0 ||
          p.hasBowled ||
          (isCurrentInnings && p.id === match.live_bowler_id),
      );

    return activeBowlers.sort((a, b) => {
      const idxA = bowlingOrderIds.indexOf(a.id);
      const idxB = bowlingOrderIds.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  };

  const batsmen = getBattingStats(activeBattingSquad);
  const yetToBat = activeBattingSquad.filter(
    (player: any) => !batsmen.some((b: any) => b.id === player.id),
  );

  const bowlers = getBowlingStats(activeBowlingSquad);
  const yetToBowl = activeBowlingSquad.filter(
    (player: any) => !bowlers.some((b: any) => b.id === player.id),
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. INNINGS TABS */}
      {(match.current_innings === 2 || match.status === "completed") && (
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setSelectedInnings(1)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${selectedInnings === 1 ? "bg-white dark:bg-slate-900 shadow text-teal-600 dark:text-teal-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            1st Innings
          </button>
          <button
            onClick={() => setSelectedInnings(2)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${selectedInnings === 2 ? "bg-white dark:bg-slate-900 shadow text-teal-600 dark:text-teal-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            2nd Innings
          </button>
        </div>
      )}

      {/* 2. BATTING SCORECARD */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-3 sm:mb-4 px-2">
          Batting Scorecard
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] sm:text-[10px] uppercase font-black text-slate-400">
                  <th className="p-3 sm:p-4">Batsman</th>
                  <th className="p-3 sm:p-4 text-center">R</th>
                  <th className="p-3 sm:p-4 text-center">B</th>
                  <th className="p-3 sm:p-4 text-center">4s</th>
                  <th className="p-3 sm:p-4 text-center">6s</th>
                  <th className="p-3 sm:p-4 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm font-bold">
                {batsmen.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 dark:border-slate-800/50">
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <p className="text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-xs">
                          {p.full_name}
                          <span className="text-teal-500 ml-1">
                            {isCurrentInnings && p.id === match.live_striker_id
                              ? "*"
                              : ""}
                          </span>
                        </p>
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate max-w-[150px] sm:max-w-xs">
                        {p.dismissalText}
                      </p>
                    </td>
                    <td className="p-3 sm:p-4 text-center font-black text-slate-900 dark:text-white">
                      {p.runs}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400">
                      {p.balls}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400">
                      {p.fours}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400">
                      {p.sixes}
                    </td>
                    <td className="p-3 sm:p-4 text-right text-teal-600 dark:text-teal-400">
                      {p.sr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* YET TO BAT SECTION */}
          {yetToBat.length > 0 && (
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-start">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 mt-0.5">
                Yet to bat:
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                {yetToBat.map((p: any) => p.full_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOWLING FIGURES */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-3 sm:mb-4 px-2">
          Bowling Figures
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] sm:text-[10px] uppercase font-black text-slate-400">
                  <th className="p-3 sm:p-4">Bowler</th>
                  <th className="p-3 sm:p-4 text-center">O</th>
                  <th className="p-3 sm:p-4 text-center">M</th>
                  <th className="p-3 sm:p-4 text-center">R</th>
                  <th className="p-3 sm:p-4 text-center">W</th>
                  <th className="p-3 sm:p-4 text-right">Econ</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm font-bold">
                {bowlers.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 dark:border-slate-800/50">
                    <td className="p-3 sm:p-4 text-slate-900 dark:text-white flex items-center gap-2 truncate max-w-[120px] sm:max-w-xs">
                      {p.full_name}
                      {isCurrentInnings && p.id === match.live_bowler_id && (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 shrink-0"></span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-slate-600 dark:text-slate-300">
                      {p.overs}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-slate-400">0</td>
                    <td className="p-3 sm:p-4 text-center text-slate-600 dark:text-slate-300">
                      {p.runs}
                    </td>
                    <td className="p-3 sm:p-4 text-center font-black text-red-500">
                      {p.wickets}
                    </td>
                    <td className="p-3 sm:p-4 text-right text-slate-500 dark:text-slate-400">
                      {p.econ}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* YET TO BOWL SECTION */}
          {yetToBowl.length > 0 && (
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-start">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 mt-0.5">
                Yet to bowl:
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                {yetToBowl.map((p: any) => p.full_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
