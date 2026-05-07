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

  // --- TEAM IDENTIFICATION LOGIC ---
  // Figure out who actually batted first using either the delivery data (most accurate) or toss data
  const t1Short = match?.team1?.short_name || match?.team1?.name || "Team 1";
  const t2Short = match?.team2?.short_name || match?.team2?.name || "Team 2";
  const t1Full = match?.team1?.name || "Team 1";
  const t2Full = match?.team2?.name || "Team 2";

  let actualT1BattedFirst = true;
  const allInn1Delivs = deliveries.filter((d: any) => d.innings === 1);

  if (
    allInn1Delivs.length > 0 &&
    (allInn1Delivs[0].batting_team_id || allInn1Delivs[0].team_id)
  ) {
    const firstTeamId =
      allInn1Delivs[0].batting_team_id || allInn1Delivs[0].team_id;
    actualT1BattedFirst = firstTeamId === match?.team1_id;
  } else {
    const choseBat = String(match?.toss_decision || "")
      .toLowerCase()
      .includes("bat");
    const t1Won = match?.toss_winner_id === match?.team1_id;
    actualT1BattedFirst = choseBat ? t1Won : !t1Won;
  }

  // Set the names for the Tabs
  const inn1TeamName = actualT1BattedFirst ? t1Short : t2Short;
  const inn2TeamName = actualT1BattedFirst ? t2Short : t1Short;

  // Set the flag for the VS Banner highlight
  const isTeam1Batting =
    selectedInnings === 1 ? actualT1BattedFirst : !actualT1BattedFirst;
  // ---------------------------------

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
    <div className="space-y-6 animate-in fade-in transition-colors duration-300">
      {/* 0. MATCHUP HEADER (Dynamic Highlighting based on Tab) */}
      <div className="bg-[var(--surface-1)] p-3 sm:p-4 rounded-[1.5rem] sm:rounded-2xl border border-[var(--border-1)] shadow-sm flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 transition-colors">
        {/* Match Stage & Innings Badge */}
        <div className="inline-block bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border-1)]">
          <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
            {match?.stage || "Match"} <span className="mx-1 opacity-50">•</span>{" "}
            Innings {selectedInnings}
          </p>
        </div>

        {/* VS Banner with Batting Team Highlight */}
        <div className="flex items-center justify-center gap-3 text-sm sm:text-lg font-black uppercase tracking-tight">
          <span
            className={`transition-colors ${isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            {t1Full}{" "}
            {isTeam1Batting && (
              <span className="text-[var(--accent)] ml-1">🏏</span>
            )}
          </span>

          <span className="text-[var(--text-muted)] opacity-50 text-xs sm:text-sm font-bold">
            VS
          </span>

          <span
            className={`transition-colors ${!isTeam1Batting ? "text-[var(--accent)] drop-shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            {!isTeam1Batting && (
              <span className="text-[var(--accent)] mr-1">🏏</span>
            )}{" "}
            {t2Full}
          </span>
        </div>
      </div>

      {/* 1. INNINGS TABS WITH TEAM NAMES */}
      {(match.current_innings === 2 || match.status === "completed") && (
        <div className="flex gap-2 bg-[var(--surface-2)] border border-[var(--border-1)] p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setSelectedInnings(1)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
              selectedInnings === 1
                ? "bg-[var(--surface-1)] shadow text-[var(--accent)] border border-[var(--border-1)]"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {inn1TeamName}{" "}
            <span className="opacity-50 text-[10px]">(1st Inn)</span>
          </button>
          <button
            onClick={() => setSelectedInnings(2)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
              selectedInnings === 2
                ? "bg-[var(--surface-1)] shadow text-[var(--accent)] border border-[var(--border-1)]"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {inn2TeamName}{" "}
            <span className="opacity-50 text-[10px]">(2nd Inn)</span>
          </button>
        </div>
      )}

      {/* 2. BATTING SCORECARD */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 sm:mb-4 px-2">
          Batting Scorecard
        </h3>
        <div className="bg-[var(--surface-1)] rounded-3xl border border-[var(--border-1)] overflow-hidden transition-colors">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[9px] sm:text-[10px] uppercase font-black text-[var(--text-muted)]">
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
                    className="border-t border-[var(--border-1)] transition-colors"
                  >
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <p className="text-[var(--foreground)] truncate max-w-[120px] sm:max-w-xs">
                          {p.full_name}
                          <span className="text-[var(--accent)] ml-1">
                            {isCurrentInnings && p.id === match.live_striker_id
                              ? "*"
                              : ""}
                          </span>
                        </p>
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-medium text-[var(--text-muted)] mt-0.5 sm:mt-1 truncate max-w-[150px] sm:max-w-xs">
                        {p.dismissalText}
                      </p>
                    </td>
                    <td className="p-3 sm:p-4 text-center font-black text-[var(--foreground)]">
                      {p.runs}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      {p.balls}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      {p.fours}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      {p.sixes}
                    </td>
                    <td className="p-3 sm:p-4 text-right text-[var(--accent)]">
                      {p.sr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* YET TO BAT SECTION */}
          {yetToBat.length > 0 && (
            <div className="bg-[var(--surface-2)] p-4 sm:p-5 border-t border-[var(--border-1)] flex gap-2 items-start transition-colors">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest shrink-0 mt-0.5">
                Yet to bat:
              </span>
              <span className="text-xs font-bold text-[var(--foreground)] opacity-80 leading-relaxed">
                {yetToBat.map((p: any) => p.full_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOWLING FIGURES */}
      <div>
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 sm:mb-4 px-2">
          Bowling Figures
        </h3>
        <div className="bg-[var(--surface-1)] rounded-3xl border border-[var(--border-1)] overflow-hidden transition-colors">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[9px] sm:text-[10px] uppercase font-black text-[var(--text-muted)]">
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
                    className="border-t border-[var(--border-1)] transition-colors"
                  >
                    <td className="p-3 sm:p-4 text-[var(--foreground)] flex items-center gap-2 truncate max-w-[120px] sm:max-w-xs">
                      {p.full_name}
                      {isCurrentInnings && p.id === match.live_bowler_id && (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--accent)] shrink-0"></span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      {p.overs}
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      0
                    </td>
                    <td className="p-3 sm:p-4 text-center text-[var(--text-muted)]">
                      {p.runs}
                    </td>
                    <td className="p-3 sm:p-4 text-center font-black text-red-500">
                      {p.wickets}
                    </td>
                    <td className="p-3 sm:p-4 text-right text-[var(--text-muted)]">
                      {p.econ}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* YET TO BOWL SECTION */}
          {yetToBowl.length > 0 && (
            <div className="bg-[var(--surface-2)] p-4 sm:p-5 border-t border-[var(--border-1)] flex gap-2 items-start transition-colors">
              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest shrink-0 mt-0.5">
                Yet to bowl:
              </span>
              <span className="text-xs font-bold text-[var(--foreground)] opacity-80 leading-relaxed">
                {yetToBowl.map((p: any) => p.full_name).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
