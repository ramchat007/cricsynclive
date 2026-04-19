"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Search,
  Filter,
  Home,
  User,
  Award,
  X,
  Calendar,
  ChevronRight,
  Loader2,
  Trophy,
  ArrowUpDown,
  Target,
  Activity,
} from "lucide-react";

export default function GlobalStatsPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [tournamentsList, setTournamentsList] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("total_runs");

  // Modal State
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // Top Performers
  const [topBatter, setTopBatter] = useState<any>(null);
  const [topBowler, setTopBowler] = useState<any>(null);

  useEffect(() => {
    fetchGlobalDirectory();
  }, []);

  const fetchGlobalDirectory = async () => {
    setIsLoading(true);

    const { data: statsData } = await supabase
      .from("global_career_stats")
      .select("*");
    const { data: mappingData } = await supabase
      .from("players")
      .select(
        "full_name, tournaments(id, name), teams(short_name, primary_color)",
      );

    if (statsData && mappingData) {
      const discoveredTournaments = new Map<string, string>();

      const mergedData = statsData.map((stat: any) => {
        const appearances = mappingData.filter(
          (m) =>
            m.full_name?.toLowerCase().trim() ===
            stat.full_name?.toLowerCase().trim(),
        );

        const playedTournaments = Array.from(
          new Set(
            appearances
              .map((a) => {
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

        return { ...stat, playedTournaments, franchiseHistory };
      });

      const availableTournaments = Array.from(
        discoveredTournaments,
        ([id, name]) => ({ id, name }),
      );
      setTournamentsList(availableTournaments);

      setPlayers(mergedData);

      const sortedByRuns = [...mergedData].sort(
        (a, b) => (b.total_runs || 0) - (a.total_runs || 0),
      );
      const sortedByWickets = [...mergedData].sort(
        (a, b) => (b.total_wickets || 0) - (a.total_wickets || 0),
      );

      if (sortedByRuns.length > 0) setTopBatter(sortedByRuns[0]);
      if (sortedByWickets.length > 0) setTopBowler(sortedByWickets[0]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let result = players;

    if (searchQuery)
      result = result.filter((p) =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (roleFilter !== "All")
      result = result.filter((p) => p.player_role === roleFilter);
    if (tournamentFilter !== "All")
      result = result.filter((p) =>
        p.playedTournaments.includes(tournamentFilter),
      );

    result.sort((a, b) => {
      const valA = a[sortBy] || 0;
      const valB = b[sortBy] || 0;
      return valB - valA;
    });

    setFilteredPlayers([...result]);
  }, [searchQuery, roleFilter, tournamentFilter, sortBy, players]);

  const openPlayerProfile = async (player: any) => {
    setSelectedPlayer(player);
    setIsLoadingMatches(true);
    setRecentMatches([]);

    const { data: profileData } = await supabase
      .from("players")
      .select("team_id")
      .ilike("full_name", player.full_name);

    if (profileData && profileData.length > 0) {
      const teamIds = Array.from(
        new Set(profileData.map((p) => p.team_id).filter(Boolean)),
      );
      if (teamIds.length > 0) {
        const { data: matches, error } = await supabase
          .from("matches")
          .select(`id, status, tournament_id, tournaments(name)`)
          .or(
            `team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`,
          )
          .order("created_at", { ascending: false })
          .limit(10);
        if (matches && !error) setRecentMatches(matches);
      }
    }
    setIsLoadingMatches(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-400 animate-pulse text-xl uppercase tracking-widest">
        Loading Global Stats...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* HEADER & NAVIGATION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 uppercase tracking-widest mb-4 transition-colors">
              <Home size={14} /> Back to Hub
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">
              Global Stats
            </h1>
            <p className="text-sm font-bold text-teal-600 uppercase tracking-widest mt-2">
              Leaderboards & Player Rankings
            </p>
          </div>
        </div>

        {/* PODIUM: TOP PERFORMERS (Mobile optimized layout) */}
        {!searchQuery && roleFilter === "All" && tournamentFilter === "All" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {topBatter && (
              <div
                onClick={() => openPlayerProfile(topBatter)}
                className="bg-orange-50 border border-orange-200 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 transition-all group">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-4 border-orange-500 shadow-lg bg-cover bg-center shrink-0 flex items-center justify-center text-orange-200"
                  style={{
                    backgroundImage: topBatter.photo_url
                      ? `url(${topBatter.photo_url})`
                      : "none",
                  }}>
                  {!topBatter.photo_url && <User size={32} />}
                </div>
                <div className="flex-1 w-full min-w-0">
                  <span className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">
                    <Trophy size={14} /> Orange Cap
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-orange-600 transition-colors truncate">
                    {topBatter.full_name}
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    {topBatter.total_runs} Runs{" "}
                    <span className="text-slate-300 mx-1">|</span> SR:{" "}
                    {topBatter.career_strike_rate}
                  </p>
                </div>
              </div>
            )}
            {topBowler && (
              <div
                onClick={() => openPlayerProfile(topBowler)}
                className="bg-purple-50 border border-purple-200 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 cursor-pointer hover:shadow-xl hover:shadow-purple-500/10 transition-all group">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-4 border-purple-500 shadow-lg bg-cover bg-center shrink-0 flex items-center justify-center text-purple-200"
                  style={{
                    backgroundImage: topBowler.photo_url
                      ? `url(${topBowler.photo_url})`
                      : "none",
                  }}>
                  {!topBowler.photo_url && <User size={32} />}
                </div>
                <div className="flex-1 w-full min-w-0">
                  <span className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">
                    <Target size={14} /> Purple Cap
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-purple-600 transition-colors truncate">
                    {topBowler.full_name}
                  </h3>
                  <p className="text-sm font-bold text-slate-500">
                    {topBowler.total_wickets} Wickets{" "}
                    <span className="text-slate-300 mx-1">|</span> Econ:{" "}
                    {topBowler.career_economy}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH, FILTER & SORT BAR */}
        <div className="bg-white p-4 rounded-[2rem] sm:rounded-3xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:w-auto">
              <div className="relative shrink-0 flex-1">
                <Filter
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-bold outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer">
                  <option value="All">All Roles</option>
                  <option value="Batsman">Batsmen</option>
                  <option value="Bowler">Bowlers</option>
                  <option value="All-Rounder">All-Rounders</option>
                  <option value="Wicket-Keeper">Wicket-Keepers</option>
                </select>
              </div>

              <div className="relative shrink-0 flex-1">
                <Award
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
                <select
                  value={tournamentFilter}
                  onChange={(e) => setTournamentFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-bold outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer">
                  <option value="All">All Tournaments</option>
                  {tournamentsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative shrink-0 flex-1">
                <ArrowUpDown
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none"
                  size={16}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-bold outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer">
                  <option value="total_runs">Sort: Most Runs</option>
                  <option value="total_wickets">Sort: Most Wickets</option>
                  <option value="career_strike_rate">Sort: Highest SR</option>
                  <option value="total_sixes">Sort: Most Sixes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE LEADERBOARD TABLE (Mobile Swipe Fix) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto custom-scrollbar w-full">
            {/* Added min-w-[800px] to force proper table rendering on mobile without squishing */}
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="p-4 md:p-5 w-16 text-center">Rank</th>
                  <th className="p-4 md:p-5">Athlete</th>
                  <th className="p-4 md:p-5">Role</th>
                  <th className="p-4 md:p-5 text-right">Runs</th>
                  <th className="p-4 md:p-5 text-right">SR</th>
                  <th className="p-4 md:p-5 text-right">6s</th>
                  <th className="p-4 md:p-5 text-right">Wickets</th>
                  <th className="p-4 md:p-5 text-right">Econ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-slate-400 font-bold">
                      No athletes match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player, index) => (
                    <tr
                      key={player.full_name}
                      onClick={() => openPlayerProfile(player)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="p-4 md:p-5 text-center font-black text-slate-400 group-hover:text-teal-500">
                        #{index + 1}
                      </td>
                      <td className="p-4 md:p-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl bg-slate-100 bg-cover bg-center shrink-0 border border-slate-200"
                            style={{
                              backgroundImage: player.photo_url
                                ? `url(${player.photo_url})`
                                : "none",
                            }}>
                            {!player.photo_url && (
                              <User
                                size={16}
                                className="text-slate-400 m-auto h-full"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 group-hover:text-teal-600 transition-colors uppercase">
                              {player.full_name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                              {player.franchiseHistory
                                ?.map((t: any) => t.short_name)
                                .join(", ") || "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:p-5">
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded whitespace-nowrap">
                          {player.player_role}
                        </span>
                      </td>
                      <td
                        className={`p-4 md:p-5 text-right font-black ${sortBy === "total_runs" ? "text-orange-600 text-lg" : "text-slate-700"}`}>
                        {player.total_runs}
                      </td>
                      <td
                        className={`p-4 md:p-5 text-right font-bold ${sortBy === "career_strike_rate" ? "text-teal-600 text-lg" : "text-slate-500"}`}>
                        {player.career_strike_rate}
                      </td>
                      <td
                        className={`p-4 md:p-5 text-right font-bold ${sortBy === "total_sixes" ? "text-blue-600 text-lg" : "text-slate-500"}`}>
                        {player.total_sixes}
                      </td>
                      <td
                        className={`p-4 md:p-5 text-right font-black ${sortBy === "total_wickets" ? "text-purple-600 text-lg" : "text-slate-700"}`}>
                        {player.total_wickets}
                      </td>
                      <td className="p-4 md:p-5 text-right font-bold text-slate-500">
                        {player.career_economy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PLAYER PROFILE MODAL (Mobile Scroll Trap Fixed) */}
        {/* ----------------------------------------------------------- */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
            {/* MOBILE FIX: 
              - On mobile (default): `overflow-y-auto h-[90vh]` so the whole modal scrolls as one continuous block. 
              - On desktop (`md:`): `overflow-hidden h-auto` to split scrolling between the two panes.
            */}
            <div className="bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 border border-slate-200 relative">
              {/* Close Button Mobile (Fixed to top right of modal view) */}
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 md:hidden w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center z-50 shadow-lg">
                <X size={20} />
              </button>

              {/* LEFT SIDE: Photo & Stats */}
              <div className="w-full md:w-5/12 bg-slate-50 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 shrink-0">
                <div
                  className="w-full h-64 md:h-80 bg-slate-200 bg-cover bg-center relative shrink-0"
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

                {/* Desktop gets inner scroll, mobile flows naturally */}
                <div className="p-6 md:overflow-y-auto custom-scrollbar flex-1 bg-white">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Career Aggregates
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest">
                          Total Runs
                        </p>
                        <p className="text-3xl font-black text-orange-600 leading-none">
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

                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-purple-600/70 uppercase tracking-widest">
                          Total Wickets
                        </p>
                        <p className="text-3xl font-black text-purple-600 leading-none">
                          {selectedPlayer.total_wickets}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Econ: {selectedPlayer.career_economy}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {selectedPlayer.legal_balls_bowled} Balls
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Recent Matches */}
              <div className="w-full md:w-7/12 bg-slate-50 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={20} className="text-teal-500" /> Recent
                    Matches
                  </h2>
                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="hidden md:flex text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Desktop gets inner scroll, mobile flows naturally */}
                <div className="p-6 md:overflow-y-auto custom-scrollbar flex-1">
                  {isLoadingMatches ? (
                    <div className="h-40 md:h-full flex flex-col items-center justify-center text-slate-400">
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
                          href={`/match/${match.id}`}
                          className="block bg-white border border-slate-200 rounded-2xl p-4 hover:border-teal-500 hover:shadow-md transition-all group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate pr-4">
                              {(Array.isArray(match.tournaments)
                                ? match.tournaments[0]?.name
                                : match.tournaments?.name) ||
                                "Tournament Match"}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${match.status?.toLowerCase() === "completed" ? "bg-teal-50 text-teal-600 border-teal-200" : match.status?.toLowerCase() === "live" ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {match.status || "Scheduled"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black text-slate-900 group-hover:text-teal-600 transition-colors uppercase tracking-tight">
                                Match #{match.id.substring(0, 4)}
                              </p>
                              <p className="text-xs font-bold text-slate-500 mt-0.5">
                                Click to view scorecard
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 md:h-full flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Activity size={20} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-900 mb-1">
                        No Recent Matches
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        This player hasn't played recently.
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
