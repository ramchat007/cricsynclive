"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Activity, ChevronRight, Crown, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ExploreTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch ALL tournaments on page load
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        // .eq("status", "active") // Optional: uncomment if you only want active ones here too
        .order("created_at", { ascending: false });

      if (data && !error) {
        setTournaments(data);
      }
      setLoading(false);
    };

    fetchTournaments();
  }, []);

  // Filter tournaments based on the search bar input
  const filteredTournaments = tournaments.filter((t) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = t.name?.toLowerCase().includes(query);
    const locationMatch = t.location?.toLowerCase().includes(query);
    return nameMatch || locationMatch;
  });

  return (
    <main className="min-h-screen bg-[var(--background)] pt-6 md:pt-32 pb-20 px-4 md:px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="text-center mb-6 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tight text-[var(--foreground)] mb-3 md:mb-4 transition-colors">
            Explore <span className="accent-text">Tournaments</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium text-xs sm:text-sm md:text-lg uppercase tracking-widest transition-colors">
            Find local matches, leagues, and live streams
          </p>
        </div>

        {/* Live Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 md:mb-16">
          <div className="relative group">
            <Search
              className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tournament name or city..."
              className="w-full bg-[var(--surface-1)] border-2 border-[var(--border-1)] text-[var(--foreground)] rounded-full py-3.5 md:py-4 pl-12 md:pl-14 pr-6 shadow-sm focus:outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-muted)] text-sm md:text-lg font-medium"
            />
          </div>
        </div>

        {/* The Grid */}
        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 md:h-64 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl animate-pulse transition-colors"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTournaments.length === 0 ? (
              // Empty State (No search results or no tournaments at all)
              <div className="col-span-full py-16 md:py-24 text-center border-2 border-dashed border-[var(--border-1)] rounded-2xl transition-colors bg-[var(--surface-1)] backdrop-blur-sm px-4">
                <Activity size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-[var(--foreground)]">
                  No Tournaments Found
                </h3>
                <p className="text-[var(--text-muted)] text-xs md:text-sm font-bold mt-2">
                  {searchQuery
                    ? "Try searching for a different name or city."
                    : "Check back soon for upcoming events."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-5 accent-text font-bold text-xs md:text-sm hover:underline uppercase tracking-widest"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              // The Actual Tournament Cards
              filteredTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.id}/`}
                  className="group block relative h-60 md:h-64 rounded-2xl overflow-hidden border border-[var(--border-1)] shadow-sm hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  <div
                    className="absolute inset-0 bg-[var(--surface-2)] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: t.banner_url
                        ? `url(${t.banner_url})`
                        : "none",
                    }}
                  />

                  {/* 🌟 PREMIUM SUBSCRIPTION BADGES 🌟 */}
                  {t.subscription_tier === "pro" && (
                    <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg shadow-amber-500/30 border border-amber-300/50">
                      <Crown size={11} className="fill-amber-950/20" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-px">
                        Pro
                      </span>
                    </div>
                  )}

                  {t.subscription_tier === "broadcast" && (
                    <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg shadow-purple-500/30 border border-purple-400/50">
                      <Radio size={11} className="animate-pulse" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-px">
                        Broadcast
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-90 z-10"></div>

                  <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-end z-20">
                    {/* Theme-Adaptive Format Badge */}
                    <span className="accent-bg text-[var(--background)] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded w-max mb-2 shadow-md">
                      {t.format || "T20"}
                    </span>

                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1 group-hover:text-[var(--accent)] transition-colors drop-shadow-md truncate">
                      {t.name}
                    </h3>

                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[11px] md:text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1 drop-shadow truncate pr-2">
                        📍 {t.location || "Local Ground"}
                      </p>

                      {/* Hover Arrow */}
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-[var(--accent)] transition-colors shadow-lg shrink-0">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
