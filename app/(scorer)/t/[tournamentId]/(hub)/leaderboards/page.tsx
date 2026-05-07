"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Target,
  Star,
  X,
  Activity,
  BarChart2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateTournamentLeaderboards } from "../../../../../utils/cricketMath";

export default function LeaderboardsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [recentFormMap, setRecentFormMap] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orange" | "purple" | "mvp">(
    "orange",
  );
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // 1. Fetch players
      const { data: players } = await supabase
        .from("players")
        .select("*, teams(name, short_name)")
        .eq("tournament_id", tournamentId);

      // 2. Fetch completed matches
      const { data: matches } = await supabase
        .from("matches")
        .select(
          "id, match_date, team1:team1_id(short_name), team2:team2_id(short_name)",
        )
        .eq("tournament_id", tournamentId)
        .eq("status", "completed")
        .order("match_date", { ascending: false });

      if (players && matches && matches.length > 0) {
        const matchIds = matches.map((m) => m.id);

        // 3. Fetch ALL deliveries for these matches
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select("*")
          .in("match_id", matchIds);

        if (deliveries) {
          // 4. Global Stats
          const stats = generateTournamentLeaderboards(players, deliveries);
          setLeaderboards(stats);

          // 5. Local Timeline Calculation (Highly Aggressive Matching)
          const formMap: Record<string, any[]> = {};

          players.forEach((p) => {
            const pMatches: any[] = [];
            const pIdStr = String(p.id).toLowerCase().trim();

            matches.forEach((m) => {
              const mDels = deliveries.filter(
                (d) => String(d.match_id) === String(m.id),
              );

              // Search ALL possible ID columns for this player
              const isStriker = (d: any) =>
                [d.striker_id, d.batsman_id, d.batter_id, d.player_id].some(
                  (id) => String(id).toLowerCase().trim() === pIdStr,
                );

              const isNonStriker = (d: any) =>
                [d.non_striker_id, d.runner_id].some(
                  (id) => String(id).toLowerCase().trim() === pIdStr,
                );

              const isBowler = (d: any) =>
                String(d.bowler_id).toLowerCase().trim() === pIdStr;

              const hasBatted = mDels.some(
                (d) => isStriker(d) || isNonStriker(d),
              );
              const hasBowled = mDels.some(isBowler);

              if (hasBatted || hasBowled) {
                // Aggressively search for run values including runs_off_bat
                const matchRuns = mDels.filter(isStriker).reduce((acc, d) => {
                  let r = 0;
                  if (d.runs_off_bat !== undefined) r = d.runs_off_bat;
                  else if (d.batsman_runs !== undefined) r = d.batsman_runs;
                  else if (d.batter_runs !== undefined) r = d.batter_runs;
                  else if (d.runs_scored !== undefined) r = d.runs_scored;
                  else if (typeof d.runs === "number") r = d.runs;
                  else if (d.runs?.batsman !== undefined) r = d.runs.batsman;
                  return acc + (Number(r) || 0);
                }, 0);

                const matchBalls = mDels.filter(
                  (d) =>
                    isStriker(d) &&
                    !(d.extras_type || "").toLowerCase().includes("wide"),
                ).length;

                const matchWickets = mDels.filter(
                  (d) =>
                    isBowler(d) &&
                    (d.is_wicket === true ||
                      d.is_wicket === "true" ||
                      !!d.wicket_type) &&
                    !["run out", "runout", "retired hurt"].includes(
                      (d.wicket_type || "").toLowerCase(),
                    ),
                ).length;

                // Handle Supabase Array/Object Join mismatch
                const t1: any = Array.isArray(m.team1) ? m.team1[0] : m.team1;
                const t2: any = Array.isArray(m.team2) ? m.team2[0] : m.team2;

                pMatches.push({
                  matchId: m.id,
                  title: `${t1?.short_name || "T1"} vs ${t2?.short_name || "T2"}`,
                  date: m.match_date,
                  runs: matchRuns,
                  balls: matchBalls,
                  wickets: matchWickets,
                  batted: hasBatted,
                  bowled: hasBowled,
                });
              }
            });
            formMap[p.id] = pMatches;
          });
          setRecentFormMap(formMap);
        }
      } else if (players) {
        setLeaderboards(generateTournamentLeaderboards(players, []));
      }
      setIsLoading(false);
    };

    fetchLeaderboards();
  }, [tournamentId]);

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-black text-[var(--text-muted)] bg-[var(--background)] transition-colors duration-300">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={32}
        />
        <p className="uppercase tracking-widest text-xs">Crunching Stats...</p>
      </div>
    );

  const orangeCap = [...leaderboards]
    .filter((p) => (p.runs || 0) > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 50);
  const purpleCap = [...leaderboards]
    .filter((p) => (p.wickets || 0) > 0)
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 50);
  const mvpRace = [...leaderboards]
    .filter((p) => (p.points || 0) > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);

  const renderTimelineChips = (playerId: string) => {
    const recent = recentFormMap[playerId]?.slice(0, 5) || [];
    if (recent.length === 0) return null;

    return (
      <div className="flex gap-1 mt-2 overflow-x-auto hide-scrollbar">
        {recent.map((stat, i) => {
          let text = "";
          if (activeTab === "orange")
            text = stat.batted ? `${stat.runs}` : "DNB";
          else if (activeTab === "purple")
            text = stat.bowled ? `${stat.wickets}W` : "DNB";
          else
            text = `${stat.batted ? stat.runs : "0"}R / ${stat.bowled ? stat.wickets : "0"}W`;

          return (
            <span
              key={i}
              className="shrink-0 bg-[var(--surface-2)] text-[var(--text-muted)] text-[9px] font-black px-2 py-0.5 rounded border border-[var(--border-1)] uppercase"
            >
              {text}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 font-sans pb-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8 animate-in fade-in">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-[var(--surface-1)] rounded-full flex items-center justify-center shadow-sm border border-[var(--border-1)] hover:bg-[var(--surface-2)] transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Leaderboards
            </h1>
            <p className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest">
              Tournament Stats
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-[var(--surface-1)] p-1.5 rounded-2xl border border-[var(--border-1)] mb-8 shadow-sm overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("orange")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black uppercase text-xs transition-all ${activeTab === "orange" ? "bg-orange-500 text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <Target size={14} /> Orange Cap
          </button>
          <button
            onClick={() => setActiveTab("purple")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black uppercase text-xs transition-all ${activeTab === "purple" ? "bg-purple-600 text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <Trophy size={14} /> Purple Cap
          </button>
          <button
            onClick={() => setActiveTab("mvp")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black uppercase text-xs transition-all ${activeTab === "mvp" ? "bg-[var(--accent)] text-[var(--background)] shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <Star size={14} /> MVP Race
          </button>
        </div>

        {/* LIST RENDERER */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {(activeTab === "orange"
            ? orangeCap
            : activeTab === "purple"
              ? purpleCap
              : mvpRace
          ).map((player, index) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className={`flex items-center justify-between p-4 sm:p-6 bg-[var(--surface-1)] rounded-3xl border shadow-sm cursor-pointer hover:border-[var(--accent)]/50 transition-all ${index === 0 ? "border-[var(--accent)]/40 bg-[var(--accent)]/5" : "border-[var(--border-1)]"}`}
            >
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <div
                  className={`w-8 font-black text-xl text-center shrink-0 ${index === 0 ? "text-[var(--accent)] text-3xl" : "text-[var(--text-muted)]"}`}
                >
                  {index === 0 ? "👑" : `#${index + 1}`}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg uppercase tracking-tight text-[var(--foreground)] truncate">
                    {player.full_name}
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
                    {player.teamName}
                  </p>
                  {renderTimelineChips(player.id)}
                </div>
              </div>
              <div className="flex items-center gap-6 text-right shrink-0">
                <div className="hidden sm:block">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-1">
                    {activeTab === "orange"
                      ? "SR"
                      : activeTab === "purple"
                        ? "ECON"
                        : "RUNS"}
                  </p>
                  <p className="font-bold text-sm">
                    {activeTab === "orange"
                      ? player.sr
                      : activeTab === "purple"
                        ? player.econ
                        : player.runs}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-[9px] font-black uppercase mb-1 ${activeTab === "orange" ? "text-orange-500" : activeTab === "purple" ? "text-purple-500" : "text-[var(--accent)]"}`}
                  >
                    {activeTab === "orange"
                      ? "Runs"
                      : activeTab === "purple"
                        ? "Wkts"
                        : "Points"}
                  </p>
                  <p className="text-3xl font-black leading-none">
                    {activeTab === "orange"
                      ? player.runs
                      : activeTab === "purple"
                        ? player.wickets
                        : player.points}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-[var(--surface-1)] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] border border-[var(--border-1)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-[var(--border-1)] flex justify-between items-start bg-[var(--surface-2)]">
              <div>
                <h3 className="text-xl font-black uppercase text-[var(--foreground)]">
                  {selectedPlayer.full_name}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] mt-1">
                  {selectedPlayer.teamName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-2 rounded-full bg-[var(--surface-1)] hover:bg-[var(--border-1)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[var(--background)] space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                <BarChart2 size={12} /> Recent Match Breakdown
              </h4>
              <div className="space-y-2">
                {(recentFormMap[selectedPlayer.id] || []).map((m, i) => (
                  <Link
                    key={i}
                    href={`/match/${m.matchId}`}
                    className="bg-[var(--surface-1)] border border-[var(--border-1)] p-4 rounded-2xl flex justify-between items-center group hover:border-[var(--accent)]/50 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-black uppercase truncate max-w-[140px] sm:max-w-[180px] group-hover:text-[var(--accent)] transition-colors">
                        {m.title}
                      </p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                        {m.date
                          ? new Date(m.date).toLocaleDateString()
                          : "Unknown Date"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-right">
                      <div className="bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg text-center min-w-[45px] group-hover:bg-[var(--background)] transition-colors">
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          Runs
                        </p>
                        <p className="text-xs font-black text-[var(--foreground)] leading-tight">
                          {m.batted ? m.runs : "DNB"}
                        </p>
                      </div>
                      <div className="bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg text-center min-w-[45px] group-hover:bg-[var(--background)] transition-colors">
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          Wkts
                        </p>
                        <p className="text-xs font-black text-[var(--foreground)] leading-tight">
                          {m.bowled ? m.wickets : "DNB"}
                        </p>
                      </div>
                      <div className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors ml-1">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
