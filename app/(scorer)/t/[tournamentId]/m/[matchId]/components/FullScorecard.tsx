export default function FullScorecard({
  deliveries,
  battingSquad,
  bowlingSquad,
  match,
}: any) {
  if (!match) return null; // Guard against undefined match data

  // Filter deliveries for the specific innings
  const inningsDelivs = deliveries.filter(
    (d: any) => d.innings === match.current_innings,
  );

  const getBattingStats = (squad: any[]) => {
    return (
      squad
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
            dismissal,
            facedAWide: playerBalls.length > 0,
          };
        })
        // THE FIX: Uses the match prop directly to keep live batsmen on the board
        .filter(
          (p: any) =>
            p.balls > 0 ||
            p.isOut ||
            p.facedAWide ||
            p.id === match.live_striker_id ||
            p.id === match.live_non_striker_id,
        )
    );
  };

  const getBowlingStats = (squad: any[]) => {
    return squad
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

        // THE FIX: We pass 'hasBowled' out of the map so the filter can safely read it
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
      .filter((p: any) => p.totalBalls > 0 || p.hasBowled);
  };

  const batsmen = getBattingStats(battingSquad);
  const bowlers = getBowlingStats(bowlingSquad);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* BATTING TABLE */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          Batting Scorecard
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400">
                <th className="p-4">Batsman</th>
                <th className="p-4 text-center">R</th>
                <th className="p-4 text-center">B</th>
                <th className="p-4 text-center">4s</th>
                <th className="p-4 text-center">6s</th>
                <th className="p-4 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold">
              {batsmen.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-50 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 dark:text-white">
                        {p.full_name}
                        {/* Highlights the active batsmen */}
                        {p.id === match.live_striker_id && (
                          <span className="text-teal-500 ml-1">*</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                      {p.isOut
                        ? p.dismissal.wicket_type === "run-out"
                          ? "run out"
                          : p.dismissal.wicket_type
                        : "not out"}
                    </p>
                  </td>
                  <td className="p-4 text-center font-black">{p.runs}</td>
                  <td className="p-4 text-center text-slate-400">{p.balls}</td>
                  <td className="p-4 text-center text-slate-400">{p.fours}</td>
                  <td className="p-4 text-center text-slate-400">{p.sixes}</td>
                  <td className="p-4 text-right text-teal-500">{p.sr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOWLING TABLE */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          Bowling Figures
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400">
                <th className="p-4">Bowler</th>
                <th className="p-4 text-center">O</th>
                <th className="p-4 text-center">M</th>
                <th className="p-4 text-center">R</th>
                <th className="p-4 text-center">W</th>
                <th className="p-4 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold">
              {bowlers.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-50 dark:border-slate-800">
                  <td className="p-4 text-slate-900 dark:text-white flex items-center gap-2">
                    {p.full_name}
                    {p.id === match.live_bowler_id && (
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    )}
                  </td>
                  <td className="p-4 text-center">{p.overs}</td>
                  <td className="p-4 text-center text-slate-400">0</td>{" "}
                  {/* Maidens feature placeholder */}
                  <td className="p-4 text-center">{p.runs}</td>
                  <td className="p-4 text-center font-black text-red-500">
                    {p.wickets}
                  </td>
                  <td className="p-4 text-right text-slate-400">{p.econ}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
