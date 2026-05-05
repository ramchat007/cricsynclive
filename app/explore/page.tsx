"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Activity, ChevronRight } from "lucide-react";
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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4 transition-colors">
            Explore{" "}
            <span className="text-cyan-600 dark:text-cyan-500">
              Tournaments
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-lg uppercase tracking-widest transition-colors">
            Find local matches, leagues, and live streams
          </p>
        </div>

        {/* Live Search Bar */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tournament name or city..."
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-full py-4 pl-14 pr-6 shadow-sm focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg font-medium"
            />
          </div>
        </div>

        {/* The Grid */}
        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-slate-200 dark:bg-slate-800/50 rounded-[2rem] animate-pulse transition-colors"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.length === 0 ? (
              // Empty State (No search results or no tournaments at all)
              <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2rem] transition-colors bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                <Activity
                  size={40}
                  className="mx-auto text-slate-300 dark:text-slate-700 mb-4"
                />
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  No Tournaments Found
                </h3>
                <p className="text-slate-500 font-bold mt-2">
                  {searchQuery
                    ? "Try searching for a different name or city."
                    : "Check back soon for upcoming events."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-6 text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              // The Actual Tournament Cards (Reused from Homepage)
              filteredTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.id}/`}
                  className="group block relative h-64 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
                >
                  <div
                    className="absolute inset-0 bg-slate-300 dark:bg-slate-800 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: t.banner_url
                        ? `url(${t.banner_url})`
                        : "none",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-90"></div>

                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <span className="bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded w-max mb-2 shadow-md">
                      {t.format || "T20"}
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1 group-hover:text-cyan-400 transition-colors drop-shadow-md">
                      {t.name}
                    </h3>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1 drop-shadow">
                        📍 {t.location || "Local Ground"}
                      </p>
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-cyan-500 transition-colors shadow-lg">
                        <ChevronRight size={16} />
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
