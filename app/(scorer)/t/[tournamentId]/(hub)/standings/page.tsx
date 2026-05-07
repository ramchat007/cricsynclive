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
      <div className="min-h-screen flex items-center justify-center font-black text-[var(--text-muted)] bg-[var(--background)] animate-pulse transition-colors duration-300">
        LOADING STANDINGS...
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto animate-in fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/t/${tournamentId}/matches`}
            className="w-12 h-12 bg-[var(--surface-1)] rounded-full flex items-center justify-center shadow-sm border border-[var(--border-1)] hover:bg-[var(--surface-2)] hover:scale-105 transition-all text-[var(--foreground)]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Points Table
            </h1>
            <p className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest">
              Tournament Standings
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-muted)] border-b border-[var(--border-1)] text-xs uppercase font-black tracking-widest transition-colors">
                  <th className="p-5">Pos</th>
                  <th className="p-5">Team</th>
                  <th className="p-5 text-center">P</th>
                  <th className="p-5 text-center">W</th>
                  <th className="p-5 text-center">L</th>
                  <th className="p-5 text-center">T</th>
                  <th className="p-5 text-center text-[var(--accent)]">Pts</th>
                  <th className="p-5 text-right">NRR</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-[var(--foreground)]">
                {standings.map((team, index) => (
                  <tr
                    key={team.id}
                    className="border-t border-[var(--border-1)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="p-5 text-[var(--text-muted)]">
                      #{index + 1}
                    </td>
                    <td className="p-5 flex items-center gap-3">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.short_name}
                          className="w-8 h-8 rounded-full object-cover bg-[var(--surface-2)] border border-[var(--border-1)]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] flex items-center justify-center text-xs transition-colors">
                          {team.short_name?.[0]}
                        </div>
                      )}
                      <span>
                        {team.name}{" "}
                        <span className="text-[var(--text-muted)] ml-1 text-xs">
                          ({team.short_name})
                        </span>
                      </span>
                    </td>
                    <td className="p-5 text-center text-[var(--text-muted)]">
                      {team.played}
                    </td>
                    {/* Semantic Win Color - Kept Explicit */}
                    <td className="p-5 text-center text-emerald-500">
                      {team.won}
                    </td>
                    {/* Semantic Loss Color - Kept Explicit */}
                    <td className="p-5 text-center text-red-500">
                      {team.lost}
                    </td>
                    <td className="p-5 text-center text-[var(--text-muted)]">
                      {team.tied}
                    </td>
                    {/* Dynamic Theme Accent for Points */}
                    <td className="p-5 text-center font-black text-lg text-[var(--accent)]">
                      {team.points}
                    </td>
                    {/* Semantic NRR Colors */}
                    <td
                      className={`p-5 text-right font-black ${team.nrr >= 0 ? "text-emerald-500" : "text-red-500"}`}
                    >
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
