"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Search as SearchIcon,
  User,
  Users,
  Trophy,
  ChevronRight,
  Activity,
  X,
  MapPin,
} from "lucide-react";

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "tournaments" | "teams" | "players"
  >("all");
  const [isSearching, setIsSearching] = useState(false);

  const [results, setResults] = useState({
    tournaments: [] as any[],
    teams: [] as any[],
    players: [] as any[],
  });

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        // Clear results if query is too short
        setResults({ tournaments: [], teams: [], players: [] });
      }
    }, 400); // Waits 400ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    setIsSearching(true);
    const likeQuery = `%${searchTerm}%`;

    try {
      // Run all three queries simultaneously for maximum speed
      const [tournamentsRes, teamsRes, playersRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, location, format, status")
          .ilike("name", likeQuery)
          .limit(5),
        supabase
          .from("teams")
          .select(
            "id, name, short_name, tournament_id, logo_url, tournaments(name)",
          )
          .or(`name.ilike.${likeQuery},short_name.ilike.${likeQuery}`)
          .limit(5),
        supabase
          .from("players")
          .select(
            "id, full_name, player_role, tournament_id, photo_url, tournaments(name)",
          )
          .ilike("full_name", likeQuery)
          .limit(10),
      ]);

      setResults({
        tournaments: tournamentsRes.data || [],
        teams: teamsRes.data || [],
        players: playersRes.data || [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults({ tournaments: [], teams: [], players: [] });
  };

  const totalResults =
    results.tournaments.length + results.teams.length + results.players.length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans transition-colors duration-300 pb-20">
      {/* 1. SEARCH HEADER */}
      <div className="bg-[var(--surface-1)] border-b border-[var(--border-1)] sticky top-0 z-30 pt-4 px-4 sm:px-8 pb-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            <SearchIcon
              className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
              size={24}
            />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments, teams, or players..."
              className="w-full bg-[var(--surface-2)] border-2 border-[var(--border-1)] rounded-[2rem] py-5 pl-14 pr-12 text-lg sm:text-xl font-black outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--text-muted)]/50 placeholder:font-bold"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--foreground)] rounded-full border border-[var(--border-1)] transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* FILTER TABS */}
          <div className="flex gap-2 mt-6 overflow-x-auto hide-scrollbar">
            {[
              { id: "all", label: "All Results", icon: SearchIcon },
              { id: "tournaments", label: "Tournaments", icon: Trophy },
              { id: "teams", label: "Franchises", icon: Users },
              { id: "players", label: "Players", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                  activeTab === tab.id
                    ? "bg-[var(--accent)] text-[var(--background)] shadow-lg shadow-[var(--accent)]/20"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border-1)] hover:text-[var(--foreground)] border border-[var(--border-1)]"
                }`}>
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-8">
        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] animate-in fade-in">
            <Activity
              className="animate-spin text-[var(--accent)] mb-4"
              size={32}
            />
            <p className="font-black uppercase tracking-widest text-xs">
              Scanning Database...
            </p>
          </div>
        )}

        {/* Empty State / Initial Prompt */}
        {!isSearching && query.length < 2 && (
          <div className="text-center py-24 animate-in fade-in">
            <div className="w-24 h-24 mx-auto bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] flex items-center justify-center text-[var(--text-muted)] mb-6 shadow-sm">
              <SearchIcon size={40} className="opacity-50" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--foreground)] mb-2">
              Global Search
            </h2>
            <p className="text-[var(--text-muted)] font-bold">
              Type at least 2 characters to find matches, teams, and athletes.
            </p>
          </div>
        )}

        {/* No Results State */}
        {!isSearching && query.length >= 2 && totalResults === 0 && (
          <div className="text-center py-24 animate-in fade-in">
            <div className="w-20 h-20 mx-auto bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4 border border-[var(--border-1)]">
              <X size={32} />
            </div>
            <h3 className="text-xl font-black uppercase text-[var(--foreground)]">
              No results found
            </h3>
            <p className="text-[var(--text-muted)] font-bold mt-1">
              We couldn't find anything matching "{query}"
            </p>
          </div>
        )}

        {/* RESULTS GRID */}
        {!isSearching && totalResults > 0 && (
          <div className="space-y-10 pb-10 animate-in fade-in slide-in-from-bottom-4">
            {/* TOURNAMENTS */}
            {(activeTab === "all" || activeTab === "tournaments") &&
              results.tournaments.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                    <Trophy size={14} /> Tournaments
                  </h3>
                  <div className="grid gap-3">
                    {results.tournaments.map((t) => (
                      <Link
                        key={t.id}
                        href={`/t/${t.id}`}
                        className="group bg-[var(--surface-1)] p-4 sm:p-5 rounded-2xl border border-[var(--border-1)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-lg text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                            {t.name}
                          </h4>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                              <MapPin size={12} /> {t.location}
                            </span>
                            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2 bg-[var(--surface-2)] rounded">
                              {t.format}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"
                          size={20}
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            {/* TEAMS */}
            {(activeTab === "all" || activeTab === "teams") &&
              results.teams.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                    <Users size={14} /> Franchises
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {results.teams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/t/${team.tournament_id}`}
                        className="group bg-[var(--surface-1)] p-4 rounded-2xl border border-[var(--border-1)] hover:border-[var(--accent)] transition-all flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-1)] bg-contain bg-no-repeat bg-center p-1 shrink-0"
                          style={{
                            backgroundImage: team.logo_url
                              ? `url(${team.logo_url})`
                              : "none",
                          }}>
                          {!team.logo_url && (
                            <Users className="w-full h-full text-[var(--text-muted)] p-2 opacity-50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
                            {team.name}
                          </h4>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
                            {team.tournaments?.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            {/* PLAYERS */}
            {(activeTab === "all" || activeTab === "players") &&
              results.players.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                    <User size={14} /> Players
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.players.map((player) => (
                      <Link
                        key={player.id}
                        // 🚀 UPDATED LINK ROUTE HERE
                        href={`/players/${player.id}`}
                        className="group bg-[var(--surface-1)] p-3 rounded-2xl border border-[var(--border-1)] hover:border-[var(--accent)] transition-all flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border-1)] bg-cover bg-center shrink-0"
                          style={{
                            backgroundImage: player.photo_url
                              ? `url(${player.photo_url})`
                              : "none",
                          }}>
                          {!player.photo_url && (
                            <User className="w-full h-full text-[var(--text-muted)] p-2 opacity-50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
                            {player.full_name}
                          </h4>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
                            {player.player_role}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
