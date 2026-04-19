"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateTournamentStandings } from "../../../../../utils/cricketMath";

export default function TournamentStandingsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStandingsData = async () => {
      // 1. Fetch all teams in this tournament
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", tournamentId);

      // 2. Fetch all completed matches for this tournament
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "completed");

      if (teams && matches) {
        const calculatedStandings = generateTournamentStandings(teams, matches);
        setStandings(calculatedStandings);
      }
      setIsLoading(false);
    };

    fetchStandingsData();
  }, [tournamentId]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">
        LOADING STANDINGS...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}/matches`}
            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Points Table
            </h1>
            <p className="text-sm font-bold text-teal-500 uppercase tracking-widest">
              Tournament Standings
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase font-black tracking-widest">
                  <th className="p-5">Pos</th>
                  <th className="p-5">Team</th>
                  <th className="p-5 text-center">P</th>
                  <th className="p-5 text-center">W</th>
                  <th className="p-5 text-center">L</th>
                  <th className="p-5 text-center">T</th>
                  <th className="p-5 text-center text-teal-400">Pts</th>
                  <th className="p-5 text-right">NRR</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-900 dark:text-white">
                {standings.map((team, index) => (
                  <tr
                    key={team.id}
                    className="border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-5 text-slate-400">#{index + 1}</td>
                    <td className="p-5 flex items-center gap-3">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.short_name}
                          className="w-8 h-8 rounded-full object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">
                          {team.short_name?.[0]}
                        </div>
                      )}
                      <span>
                        {team.name}{" "}
                        <span className="text-slate-400 ml-1 text-xs">
                          ({team.short_name})
                        </span>
                      </span>
                    </td>
                    <td className="p-5 text-center text-slate-500">
                      {team.played}
                    </td>
                    <td className="p-5 text-center text-emerald-500">
                      {team.won}
                    </td>
                    <td className="p-5 text-center text-red-500">
                      {team.lost}
                    </td>
                    <td className="p-5 text-center text-slate-500">
                      {team.tied}
                    </td>
                    <td className="p-5 text-center font-black text-lg text-teal-600 dark:text-teal-400">
                      {team.points}
                    </td>
                    <td
                      className={`p-5 text-right font-black ${team.nrr >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {team.nrr > 0 ? "+" : ""}
                      {team.nrr.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
