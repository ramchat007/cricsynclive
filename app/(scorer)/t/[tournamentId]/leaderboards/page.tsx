"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Target, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateTournamentLeaderboards } from "../../../..//utils/cricketMath";

export default function LeaderboardsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orange" | "purple" | "mvp">(
    "orange",
  );

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // 1. Fetch all players in the tournament (joining their team info)
      const { data: players } = await supabase
        .from("players")
        .select("*, teams(name, short_name)")
        .eq("tournament_id", tournamentId);

      // 2. Fetch matches to get the scope
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("status", "completed");

      if (players && matches && matches.length > 0) {
        const matchIds = matches.map((m) => m.id);

        // 3. Fetch EVERY delivery from those completed matches
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select("*")
          .in("match_id", matchIds);

        // 4. Crunch the numbers
        if (deliveries) {
          const stats = generateTournamentLeaderboards(players, deliveries);
          setLeaderboards(stats);
        }
      } else if (players) {
        // If no matches are completed yet, just load empty stats
        setLeaderboards(generateTournamentLeaderboards(players, []));
      }
      setIsLoading(false);
    };

    fetchLeaderboards();
  }, [tournamentId]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse text-xl">
        LOADING STATS...
      </div>
    );

  // Sorting Logic
  const orangeCap = [...leaderboards]
    .filter((p) => p.runs > 0)
    .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
    .slice(0, 50);
  const purpleCap = [...leaderboards]
    .filter((p) => p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.econ - b.econ)
    .slice(0, 50);
  const mvpRace = [...leaderboards]
    .filter((p) => p.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}`}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Leaderboards
            </h1>
            <p className="text-sm font-bold text-teal-500 uppercase tracking-widest">
              Tournament Stats
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white dark:bg-slate-900 p-2 rounded-2xl sm:rounded-full border border-slate-200 dark:border-slate-800 mb-8 shadow-sm overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("orange")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl sm:rounded-full font-black uppercase text-sm whitespace-nowrap transition-colors ${activeTab === "orange" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
            <Target size={16} /> Orange Cap
          </button>
          <button
            onClick={() => setActiveTab("purple")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl sm:rounded-full font-black uppercase text-sm whitespace-nowrap transition-colors ${activeTab === "purple" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
            <Trophy size={16} /> Purple Cap
          </button>
          <button
            onClick={() => setActiveTab("mvp")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl sm:rounded-full font-black uppercase text-sm whitespace-nowrap transition-colors ${activeTab === "mvp" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
            <Star size={16} /> MVP Race
          </button>
        </div>

        {/* ORANGE CAP CONTENT */}
        {activeTab === "orange" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {orangeCap.length === 0 && (
              <p className="text-center text-slate-500 font-bold p-10">
                No runs scored yet.
              </p>
            )}
            {orangeCap.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm ${index === 0 ? "border-orange-400 bg-orange-50/50 dark:bg-orange-900/10" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div
                    className={`w-8 font-black text-xl text-center ${index === 0 ? "text-orange-500 text-3xl" : "text-slate-400"}`}>
                    {index === 0 ? "👑" : `#${index + 1}`}
                  </div>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight">
                      {player.full_name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {player.teamName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 text-right">
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      SR
                    </p>
                    <p className="font-bold">{player.sr}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      4s / 6s
                    </p>
                    <p className="font-bold">
                      {player.fours} / {player.sixes}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">
                      Runs
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
                      {player.runs}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PURPLE CAP CONTENT */}
        {activeTab === "purple" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {purpleCap.length === 0 && (
              <p className="text-center text-slate-500 font-bold p-10">
                No wickets taken yet.
              </p>
            )}
            {purpleCap.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm ${index === 0 ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/10" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div
                    className={`w-8 font-black text-xl text-center ${index === 0 ? "text-purple-600 text-3xl" : "text-slate-400"}`}>
                    {index === 0 ? "👑" : `#${index + 1}`}
                  </div>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight">
                      {player.full_name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {player.teamName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 text-right">
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Overs
                    </p>
                    <p className="font-bold">{player.overs}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Econ
                    </p>
                    <p className="font-bold">{player.econ}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">
                      Wickets
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
                      {player.wickets}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MVP CONTENT */}
        {activeTab === "mvp" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {mvpRace.length === 0 && (
              <p className="text-center text-slate-500 font-bold p-10">
                No points generated yet.
              </p>
            )}
            {mvpRace.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm ${index === 0 ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div
                    className={`w-8 font-black text-xl text-center ${index === 0 ? "text-slate-900 dark:text-white text-3xl" : "text-slate-400"}`}>
                    {index === 0 ? "⭐" : `#${index + 1}`}
                  </div>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight">
                      {player.full_name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {player.teamName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 text-right">
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Runs
                    </p>
                    <p className="font-bold">{player.runs}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Wickets
                    </p>
                    <p className="font-bold">{player.wickets}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">
                      MVP Pts
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-none">
                      {player.points}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
