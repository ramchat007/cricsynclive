"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Search,
  Filter,
  Home,
  User,
  Shield,
  Activity,
  Award,
  X,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function GlobalPlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [tournamentsList, setTournamentsList] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [tournamentFilter, setTournamentFilter] = useState("All"); // NEW: Tournament Filter

  // Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    fetchGlobalDirectory();
  }, []);

  // Fetch list of tournaments for the dropdown
  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("id, name")
      .order("created_at", { ascending: false });
    if (data) setTournamentsList(data);
  };

  const fetchGlobalDirectory = async () => {
    setIsLoading(true);

    // 1. Fetch the fast aggregate stats we built in the SQL view
    const { data: statsData } = await supabase
      .from("global_career_stats")
      .select("*");

    // 2. Fetch the player mappings to get their Franchise & Tournament history
    const { data: mappingData } = await supabase
      .from("players")
      .select(
        "full_name, tournaments(id, name), teams(short_name, primary_color)",
      );

    if (statsData && mappingData) {
      // A Map to keep track of unique tournaments we discover
      const discoveredTournaments = new Map<string, string>();

      // Merge the Franchise history into the stats object
      const mergedData = statsData.map((stat: any) => {
        const appearances = mappingData.filter(
          (m) =>
            m.full_name?.toLowerCase().trim() ===
            stat.full_name?.toLowerCase().trim(),
        );

        // Extract unique tournaments AND add them to our discovered map
        const playedTournaments = Array.from(
          new Set(
            appearances
              .map((a) => {
                // Safe check: If it's an array, grab [0], otherwise use it as an object
                const t = Array.isArray(a.tournaments)
                  ? a.tournaments[0]
                  : a.tournaments;

                if (t) {
                  discoveredTournaments.set(t.id, t.name);
                  return t.id;
                }
                return null;
              })
              .filter(Boolean),
          ),
        );

        const franchiseHistory = appearances.reduce((acc: any[], curr: any) => {
          if (
            curr.teams &&
            !acc.find((t) => t.short_name === curr.teams.short_name)
          ) {
            acc.push(curr.teams);
          }
          return acc;
        }, []);

        return {
          ...stat,
          playedTournaments,
          franchiseHistory,
        };
      });

      // Convert our Map into an array for the Dropdown state
      const availableTournaments = Array.from(
        discoveredTournaments,
        ([id, name]) => ({ id, name }),
      );
      setTournamentsList(availableTournaments);

      setPlayers(mergedData);
      setFilteredPlayers(mergedData);
    }
    setIsLoading(false);
  };

  // Handle Search and Filtering
  useEffect(() => {
    let result = players;

    if (searchQuery) {
      result = result.filter((p) =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    if (roleFilter !== "All") {
      result = result.filter((p) => p.player_role === roleFilter);
    }
    if (tournamentFilter !== "All") {
      result = result.filter((p) =>
        p.playedTournaments.includes(tournamentFilter),
      );
    }

    setFilteredPlayers(result);
  }, [searchQuery, roleFilter, tournamentFilter, players]);

  const openPlayerProfile = async (player: any) => {
    setSelectedPlayer(player);
    setIsLoadingMatches(true);
    setRecentMatches([]);

    // 1. Find all Team IDs this person has played for
    const { data: profileData } = await supabase
      .from("players")
      .select("team_id")
      .ilike("full_name", player.full_name);

    if (profileData && profileData.length > 0) {
      // Extract unique team IDs, filtering out any nulls
      const teamIds = Array.from(
        new Set(profileData.map((p) => p.team_id).filter(Boolean)),
      );

      if (teamIds.length > 0) {
        // 2. Fetch matches where ANY of their teams were playing
        const { data: matches, error } = await supabase
          .from("matches")
          .select(
            `
            id,
            status,
            tournament_id,
            tournaments(name)
          `,
          )
          .or(
            `team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`,
          )
          .order("created_at", { ascending: false })
          .limit(10);

        if (matches && !error) {
          setRecentMatches(matches);
        } else {
          console.error("Error fetching matches:", error);
        }
      }
    }
    setIsLoadingMatches(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-black text-slate-400 animate-pulse text-xl uppercase tracking-widest">
        Loading Directory...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-7xl mx-auto">
        {/* HEADER & NAVIGATION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-500 uppercase tracking-widest mb-4 transition-colors">
              <Home size={14} /> Back to Hub
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              Global Directory
            </h1>
            <p className="text-sm font-bold text-teal-500 uppercase tracking-widest mt-2">
              {filteredPlayers.length} Athletes Found
            </p>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold outline-none focus:border-teal-500 transition-colors shadow-sm"
              />
            </div>

            <div className="relative shrink-0 flex-1 sm:w-48">
              <Filter
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-bold outline-none focus:border-teal-500 transition-colors shadow-sm appearance-none cursor-pointer">
                <option value="All">All Roles</option>
                <option value="Batsman">Batsmen</option>
                <option value="Bowler">Bowlers</option>
                <option value="All-Rounder">All-Rounders</option>
                <option value="Wicket-Keeper">Wicket-Keepers</option>
              </select>
            </div>

            {/* NEW: TOURNAMENT FILTER */}
            <div className="relative shrink-0 flex-1 sm:w-48">
              <Award
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
              <select
                value={tournamentFilter}
                onChange={(e) => setTournamentFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-bold outline-none focus:border-teal-500 transition-colors shadow-sm appearance-none cursor-pointer">
                <option value="All">All Tournaments</option>
                {tournamentsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PLAYER GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredPlayers.map((player) => (
            <div
              key={player.full_name}
              onClick={() => openPlayerProfile(player)}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-teal-500 transition-all cursor-pointer overflow-hidden group flex flex-col scale-100 active:scale-95">
              <div className="p-6 pb-4 relative">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 bg-cover bg-center shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 z-10"
                    style={{
                      backgroundImage: player.photo_url
                        ? `url(${player.photo_url})`
                        : "none",
                    }}>
                    {!player.photo_url && (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg z-10">
                    {player.player_role}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1 group-hover:text-teal-500 transition-colors">
                  {player.full_name}
                </h3>

                <div className="flex flex-col gap-1 mt-3">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Shield size={12} className="text-slate-400" />{" "}
                    {player.batting_hand}
                  </p>
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <Activity size={12} className="text-slate-400" />{" "}
                    {player.bowling_style}
                  </p>
                </div>
              </div>

              {/* Stats Preview */}
              <div className="p-6 pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Runs
                  </p>
                  <p className="text-xl font-black text-orange-500 leading-none">
                    {player.total_runs}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Wickets
                  </p>
                  <p className="text-xl font-black text-purple-500 leading-none">
                    {player.total_wickets}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Franchises
                  </p>
                  <p className="text-lg font-black text-teal-500 leading-none">
                    {player.franchiseHistory?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PLAYER PROFILE MODAL (Full Photo + Stats + Recent Matches) */}
        {/* ----------------------------------------------------------- */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 border border-slate-200 dark:border-slate-800">
              {/* CLOSE BUTTON (Mobile Absolute) */}
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 md:hidden w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center z-50">
                <X size={20} />
              </button>

              {/* LEFT SIDE: Full Photo & Career Stats */}
              <div className="w-full md:w-5/12 bg-slate-100 dark:bg-slate-950 flex flex-col border-r border-slate-200 dark:border-slate-800">
                {/* Full Profile Photo Area */}
                <div
                  className="w-full h-64 md:h-80 bg-slate-200 dark:bg-slate-800 bg-cover bg-center relative shrink-0"
                  style={{
                    backgroundImage: selectedPlayer.photo_url
                      ? `url(${selectedPlayer.photo_url})`
                      : "none",
                  }}>
                  {!selectedPlayer.photo_url && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <User size={64} className="text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                  <div className="absolute bottom-6 left-6 text-white">
                    <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg mb-2 inline-block">
                      {selectedPlayer.player_role}
                    </span>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none drop-shadow-md">
                      {selectedPlayer.full_name}
                    </h2>
                  </div>
                </div>

                {/* Deep Stats Area */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Career Aggregates
                  </h3>

                  <div className="space-y-4">
                    {/* Batting Card */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-orange-600/70 dark:text-orange-500/70 uppercase tracking-widest">
                          Total Runs
                        </p>
                        <p className="text-3xl font-black text-orange-600 dark:text-orange-500 leading-none">
                          {selectedPlayer.total_runs}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          SR: {selectedPlayer.career_strike_rate}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {selectedPlayer.total_fours} (4s) •{" "}
                          {selectedPlayer.total_sixes} (6s)
                        </p>
                      </div>
                    </div>

                    {/* Bowling Card */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-purple-600/70 dark:text-purple-500/70 uppercase tracking-widest">
                          Total Wickets
                        </p>
                        <p className="text-3xl font-black text-purple-600 dark:text-purple-500 leading-none">
                          {selectedPlayer.total_wickets}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Econ: {selectedPlayer.career_economy}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {selectedPlayer.legal_balls_bowled} Balls Bowled
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Franchise Badges */}
                  {selectedPlayer.franchiseHistory?.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        Franchises Represented
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlayer.franchiseHistory.map(
                          (team: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    team.primary_color || "#2dd4bf",
                                }}
                              />
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                {team.short_name}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: Recent Matches */}
              <div className="w-full md:w-7/12 bg-slate-50 dark:bg-slate-950 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={20} className="text-teal-500" /> Recent
                    Matches
                  </h2>
                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="hidden md:flex text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {isLoadingMatches ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Loader2
                        size={32}
                        className="animate-spin text-teal-500 mb-4"
                      />
                      <p className="text-xs font-black uppercase tracking-widest">
                        Digging through archives...
                      </p>
                    </div>
                  ) : recentMatches.length > 0 ? (
                    <div className="space-y-3">
                      {recentMatches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/match/${match.id}`} // <--- Updated to the clean public route!
                          className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-teal-500 hover:shadow-md transition-all group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate pr-4">
                              {(Array.isArray(match.tournaments)
                                ? match.tournaments[0]?.name
                                : match.tournaments?.name) ||
                                "Tournament Match"}
                            </span>

                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                                match.status?.toLowerCase() === "completed"
                                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 border-teal-200 dark:border-teal-800/50"
                                  : match.status?.toLowerCase() === "live"
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800/50 animate-pulse"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                              }`}>
                              {match.status || "Scheduled"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors uppercase tracking-tight">
                                Match #{match.id.substring(0, 4)}
                              </p>
                              <p className="text-xs font-bold text-slate-500 mt-0.5">
                                Click to view scorecard
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition-colors shrink-0">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Activity size={24} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">
                        No Recent Matches
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        This player hasn't played in any recorded matches yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
