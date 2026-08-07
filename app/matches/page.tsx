"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Swords,
  Zap,
  Trophy,
  Loader2,
  ArrowRight,
  Activity,
} from "lucide-react";

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Added the 3 tabs for your new mobile journey
  const [filter, setFilter] = useState<"live" | "upcoming" | "completed">(
    "live",
  );

  useEffect(() => {
    fetchAllMatches();
  }, []);

  const fetchAllMatches = async () => {
    setLoading(true);

    // 2. Query ALL matches globally (Removed the user auth block and created_by filter)
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        team1:teams!team1_id(name, short_name),
        team2:teams!team2_id(name, short_name),
        tournaments(name)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
    } else if (data) {
      setMatches(data);
    }
    setLoading(false);
  };

  // 3. Filter the global list based on the active tab
  const filteredMatches = matches.filter((m) => {
    if (filter === "live") return m.status === "live";
    if (filter === "completed") return m.status === "completed";
    if (filter === "upcoming") return m.status === "upcoming" || !m.status;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 font-sans pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-12">
      {/* HEADER & TABS */}
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[var(--foreground)] mb-6 flex items-center gap-3">
          <Swords className="text-[var(--accent)]" /> Global Match Hub
        </h1>

        {/* The Segmented Pill Toggle */}
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl w-full sm:w-fit border border-[var(--border-1)]">
          {(["live", "upcoming", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                filter === tab
                  ? "bg-[var(--foreground)] text-[var(--background)] shadow-md"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab === "live" && filter === tab && (
                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-pulse" />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="font-bold text-xs uppercase tracking-widest">
            Loading arena...
          </p>
        </div>
      ) : (
        /* MATCHES GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredMatches.map((m) => {
            const teamA = m.team1?.name || m.team1_name || "Team A";
            const teamB = m.team2?.name || m.team2_name || "Team B";
            const isQuick =
              m.tournament_id === null ||
              m.tournament_id === "00000000-0000-0000-0000-000000000000";

            const targetUrl = isQuick
              ? `/t/QUICK_MATCH/m/${m.id}`
              : `/t/${m.tournament_id}/m/${m.id}`;

            return (
              <div
                key={m.id}
                className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* BADGES */}
                  <div className="flex items-center justify-between mb-5">
                    {isQuick ? (
                      <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <Zap size={10} /> Quick Match
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1.5 truncate max-w-[150px]">
                        <Trophy size={10} className="shrink-0" />
                        <span className="truncate">
                          {m.tournaments?.name || "Tournament"}
                        </span>
                      </span>
                    )}

                    {m.status === "live" ? (
                      <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <Activity size={10} className="animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="bg-[var(--surface-2)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        {m.status || "Upcoming"}
                      </span>
                    )}
                  </div>

                  {/* TEAMS VS */}
                  <div className="my-6 text-center bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border-1)]">
                    <div className="text-lg font-black text-[var(--foreground)] uppercase tracking-tight truncate">
                      {teamA}
                    </div>
                    <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] my-2">
                      VS
                    </div>
                    <div className="text-lg font-black text-[var(--foreground)] uppercase tracking-tight truncate">
                      {teamB}
                    </div>
                  </div>

                  {/* METADATA */}
                  <div className="flex items-center justify-between text-[12px] font-bold text-[var(--text-muted)] px-1 mb-6">
                    <span>Overs: {m.overs_count || 12}</span>
                    <span>Ball: {m.ball_type || "Tennis"}</span>
                  </div>
                </div>

                {/* UNIVERSAL LINK BUTTON */}
                <Link href={targetUrl} className="block mt-auto">
                  <button className="w-full bg-[var(--surface-2)] hover:bg-[var(--foreground)] text-[var(--foreground)] hover:text-[var(--background)] border border-[var(--border-1)] font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                    Match Center <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            );
          })}

          {/* EMPTY STATE */}
          {filteredMatches.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-[var(--border-1)] rounded-2xl bg-[var(--surface-1)]/50">
              <Swords size={40} className="text-[var(--border-1)] mb-4" />
              <h3 className="text-lg font-black uppercase tracking-widest text-[var(--foreground)]">
                No {filter} Matches
              </h3>
              <p className="text-[var(--text-muted)] font-bold text-sm mt-2">
                There is no action in this category right now.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
