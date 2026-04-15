"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import {
  Image as ImageIcon,
  Users,
  Trophy,
  Activity,
  Settings,
  UserPlus,
  Search,
} from "lucide-react";

export default function TournamentHub({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [tournament, setTournament] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("teams");

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShort, setNewTeamShort] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#2dd4bf"); // Default Teal
  const [logoUrl, setLogoUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("scorer");
  const [accessList, setAccessList] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  const [playerSearch, setPlayerSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    fetchTournamentData();
    fetchTeams();
    fetchAccessList();
    fetchPlayers();
  }, [tournamentId]);

  const fetchAccessList = async () => {
    const { data } = await supabase
      .from("tournament_access")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (data) setAccessList(data);
  };
  const fetchTournamentData = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (data) setTournament(data);
  };

  const fetchTeams = async () => {
    // This tells Supabase: "Get the teams, and ALSO get all players whose team_id matches this team!"
    const { data } = await supabase
      .from("teams")
      .select("*, players(*)")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    if (data) setTeams(data);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });
    if (data) setPlayers(data);
  };

  const togglePlayerStatus = async (
    playerId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "pending" ? "approved" : "pending";
    const { error } = await supabase
      .from("players")
      .update({ status: newStatus })
      .eq("id", playerId);

    if (!error) fetchPlayers();
  };

  const addTeam = async () => {
    if (!newTeamName || !newTeamShort)
      return alert("Name and Short Name are required!");

    const { error } = await supabase.from("teams").insert({
      tournament_id: tournamentId,
      name: newTeamName,
      short_name: newTeamShort.toUpperCase(),
      primary_color: newTeamColor,
      logo_url: logoUrl,
    });

    if (!error) {
      setNewTeamName("");
      setNewTeamShort("");
      setLogoUrl("");
      fetchTeams();
    } else {
      alert(error.message);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: tournament.name,
        location: tournament.location,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        overs_limit: tournament.overs_limit,
        max_registrations: tournament.max_registrations,
      })
      .eq("id", tournamentId);

    if (error) alert(error.message);
    else alert("Settings updated successfully!");
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    const { error } = await supabase.from("tournament_access").insert({
      tournament_id: tournamentId,
      user_email: inviteEmail.toLowerCase(),
      role: inviteRole,
    });

    if (error) alert(error.message);
    else {
      setInviteEmail("");
      fetchAccessList();
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.mobile_number.includes(playerSearch);
    const matchesRole = roleFilter === "All" || p.player_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!tournament)
    return (
      <div className="p-10 text-center font-bold tracking-widest animate-pulse">
        LOADING HUB...
      </div>
    );

  return (
    <div className="min-h-screen font-sans">
      {/* TOURNAMENT HERO HEADER */}
      <div
        className="h-64 md:h-80 w-full bg-cover bg-center relative border-b border-slate-200 dark:border-slate-800 group"
        style={{
          backgroundImage: `url(${tournament.banner_url || "https://placehold.co/1200x400/1e293b/a1a1aa?text=Tournament+Banner"})`,
        }}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-transparent" />

        {/* NEW: Hover Action Button for Banner Update */}
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <CldUploadWidget
            // Force the values to strings to satisfy TypeScript and the Widget
            uploadPreset={String(
              process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
            )}
            options={{
              sources: ["local", "url", "camera"],
              multiple: false,
              cropping: true, // Optional: gives a nice UI for logos/banners
            }}
            onSuccess={async (result: any) => {
              const newUrl = result.info.secure_url;
              setTournament({ ...tournament, banner_url: newUrl });
              await supabase
                .from("tournaments")
                .update({ banner_url: newUrl })
                .eq("id", tournamentId);
            }}>
            {({ open }) => (
              <button
                onClick={() => open()}
                className="bg-black/60 hover:bg-black/90 backdrop-blur-md text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 text-sm border border-white/20 transition-all shadow-xl">
                <ImageIcon size={16} /> Change Cover
              </button>
            )}
          </CldUploadWidget>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg mb-4 block w-fit">
              {tournament.status}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white drop-shadow-md">
              {tournament.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          {[
            { id: "teams", icon: Users, label: "Teams & Brands" },
            { id: "players", icon: UserPlus, label: "Player Registrations" },
            { id: "matches", icon: Activity, label: "Match Schedule" },
            { id: "bracket", icon: Trophy, label: "Knockout Bracket" },
            { id: "settings", icon: Settings, label: "Admin Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30"
                  : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          {/* TEAMS TAB CONTENT */}
          {activeTab === "teams" && (
            <div className="animate-in fade-in">
              <h2 className="text-2xl font-black uppercase mb-6 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
                Franchise Management
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Add Team Quick Form */}
                <div className="col-span-1 bg-slate-50 dark:bg-black rounded-3xl p-6 border border-slate-200 dark:border-slate-800 h-fit sticky top-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Register Franchise
                  </h3>

                  <input
                    placeholder="Full Name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                  />
                  <input
                    placeholder="Short Name (e.g. MI)"
                    value={newTeamShort}
                    onChange={(e) => setNewTeamShort(e.target.value)}
                    maxLength={4}
                    className="w-full mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500 uppercase"
                  />

                  <div className="flex items-center gap-3 mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex-1">
                      Brand Color
                    </label>
                    <input
                      type="color"
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>

                  <CldUploadWidget
                    uploadPreset={String(
                      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                    )}
                    onSuccess={(result: any) =>
                      setLogoUrl(result.info.secure_url)
                    }>
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        className="w-full mb-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors">
                        {logoUrl ? (
                          <span className="text-teal-500">✅ Logo Saved</span>
                        ) : (
                          <>
                            <ImageIcon size={16} /> Upload Logo
                          </>
                        )}
                      </button>
                    )}
                  </CldUploadWidget>

                  <button
                    onClick={addTeam}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all">
                    Create Team
                  </button>
                </div>

                {/* Team Roster Grid */}
                <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
                      {/* Ambient Brand Color */}
                      <div
                        className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none"
                        style={{ backgroundColor: team.primary_color }}
                      />

                      <div className="flex justify-between items-start mb-6 z-10">
                        <div
                          className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 bg-contain bg-no-repeat bg-center p-2 shadow-inner"
                          style={{
                            backgroundImage: `url(${team.logo_url || "https://placehold.co/100x100/1e293b/a1a1aa?text=Logo"})`,
                          }}
                        />
                        <span className="text-2xl font-black text-slate-200 dark:text-slate-800">
                          {team.short_name}
                        </span>
                      </div>

                      <div className="z-10">
                        <h4 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                          {team.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-4">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: team.primary_color }}
                          />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Brand Color
                          </p>
                        </div>
                      </div>

                      {/* Mock Stats for Auction Prep */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between z-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Squad Size
                          </p>
                          <p className="text-lg font-black text-slate-900 dark:text-white">
                            {team.players?.length || 0}{" "}
                            <span className="text-sm text-slate-400">/ 15</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Remaining Purse
                          </p>
                          <p
                            className={`text-lg font-black ${team.purse_balance < 20000 ? "text-red-500" : "text-teal-500"}`}>
                            ₹{team.purse_balance.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      {/* LIVE SQUAD LIST WITH NAMES */}
                      {team.players && team.players.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 z-10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Current Squad
                          </p>
                          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                            {team.players.map((p: any) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between bg-slate-50 dark:bg-black p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-500/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0 shadow-sm"
                                    style={{
                                      backgroundImage: `url(${p.photo_url || "https://placehold.co/100x100/1e293b/a1a1aa?text=Photo"})`,
                                    }}
                                  />
                                  <div className="truncate">
                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {p.full_name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                      {p.player_role}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className="text-xs font-black text-teal-500">
                                    ₹{p.sold_price?.toLocaleString("en-IN")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <div className="col-span-2 text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                      No franchises created yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* PLAYERS TAB CONTENT */}
          {activeTab === "players" && (
            <div className="animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">
                    Player Roster
                  </h2>
                  <p className="text-sm font-bold text-slate-500">
                    Manage {players.length} total registrations
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      placeholder="Search name or number..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none focus:border-teal-500"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500">
                    <option value="All">All Roles</option>
                    <option value="Batsman">Batsmen</option>
                    <option value="Bowler">Bowlers</option>
                    <option value="All-Rounder">All-Rounders</option>
                    <option value="Wicket-Keeper">Keepers</option>
                  </select>
                </div>
              </div>

              {/* Player List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    {/* Status Indicator */}
                    <div
                      className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 ${player.status === "approved" ? "bg-teal-500" : "bg-orange-500"}`}
                    />

                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 bg-cover bg-center ring-2 ring-slate-100 dark:ring-slate-800"
                        style={{ backgroundImage: `url(${player.photo_url})` }}
                      />

                      <div className="flex-1 min-w-0 z-10">
                        <h4 className="font-black text-lg text-slate-900 dark:text-white truncate">
                          {player.full_name}
                        </h4>
                        <p className="text-xs font-bold text-slate-500 mb-2">
                          {player.player_role}
                        </p>

                        <div className="flex gap-2">
                          <span className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                            Shirt: {player.tshirt_size}
                          </span>
                          <button
                            onClick={() =>
                              togglePlayerStatus(player.id, player.status)
                            }
                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${
                              player.status === "approved"
                                ? "bg-teal-50 text-teal-600 hover:bg-red-50 hover:text-red-600"
                                : "bg-orange-50 text-orange-600 hover:bg-teal-50 hover:text-teal-600"
                            }`}>
                            {player.status === "approved"
                              ? "Revoke"
                              : "Approve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredPlayers.length === 0 && (
                  <div className="col-span-full text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No players found matching your criteria.
                  </div>
                )}
              </div>
            </div>
          )}
          {/* MATCHES TAB UI */}
          {activeTab === "matches" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">
                  Match Schedule
                </h2>
                <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold px-4 py-2 rounded-lg">
                  Generate Fixtures
                </button>
              </div>

              {teams.length < 2 ? (
                <div className="text-center py-10 text-slate-500 font-bold">
                  Add at least 2 teams to schedule matches.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mock UI for a Match Card */}
                  <div className="bg-slate-50 dark:bg-black rounded-2xl p-1 flex flex-col md:flex-row items-center border border-slate-200 dark:border-slate-800">
                    <div className="px-6 py-4 text-center md:border-r border-slate-200 dark:border-slate-800 w-full md:w-32">
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Match 1
                      </p>
                      <p className="text-lg font-black mt-1">Oct 12</p>
                    </div>
                    <div className="flex-1 flex items-center justify-between px-8 py-4 w-full">
                      <div className="flex items-center gap-4 w-1/3">
                        <div
                          className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover"
                          style={{
                            backgroundImage: `url(${teams[0]?.logo_url})`,
                          }}
                        />
                        <span className="font-black text-xl">
                          {teams[0]?.short_name}
                        </span>
                      </div>
                      <div className="px-4 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">
                        VS
                      </div>
                      <div className="flex items-center justify-end gap-4 w-1/3">
                        <span className="font-black text-xl">
                          {teams[1]?.short_name || "TBA"}
                        </span>
                        <div
                          className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover"
                          style={{
                            backgroundImage: `url(${teams[1]?.logo_url})`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="px-6 py-4 w-full md:w-40 text-center">
                      <button className="w-full bg-teal-500/10 text-teal-600 font-bold py-2 rounded-lg text-sm hover:bg-teal-500 hover:text-white transition-colors">
                        Score Match
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BRACKET TAB UI */}
          {activeTab === "bracket" && (
            <div className="animate-in fade-in overflow-x-auto pb-10">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-8 min-w-[800px]">
                <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">
                  Knockout Stage
                </h2>
              </div>

              <div className="flex justify-between items-stretch min-w-[800px] h-[400px]">
                {/* Semi Finals */}
                <div className="flex flex-col justify-around w-64 relative">
                  <div className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm z-10">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                      <span className="font-bold">Team 1</span>
                      <span className="text-sm font-black text-slate-400">
                        -
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Team 2</span>
                      <span className="text-sm font-black text-slate-400">
                        -
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm z-10">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                      <span className="font-bold">Team 3</span>
                      <span className="text-sm font-black text-slate-400">
                        -
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Team 4</span>
                      <span className="text-sm font-black text-slate-400">
                        -
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connectors */}
                <div className="flex-1 relative">
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    preserveAspectRatio="none">
                    <path
                      d="M 0 100 C 50 100, 50 200, 100 200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <path
                      d="M 0 300 C 50 300, 50 200, 100 200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <path
                      d="M 100 200 L 100% 200"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-slate-200 dark:text-slate-800"
                    />
                  </svg>
                </div>

                {/* Final */}
                <div className="flex flex-col justify-center w-64 z-10">
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl p-1 shadow-xl">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-teal-500 text-center mb-3">
                        Championship Final
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Winner SF1
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Winner SF2
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* SETTINGS TAB CONTENT */}
          {activeTab === "settings" && (
            <div className="animate-in fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: General Logistics */}
              <div className="bg-slate-50 dark:bg-black rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black uppercase mb-6 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
                  Tournament Logistics
                </h2>
                <form onSubmit={saveSettings} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Tournament Name
                    </label>
                    <input
                      value={tournament.name || ""}
                      onChange={(e) =>
                        setTournament({ ...tournament, name: e.target.value })
                      }
                      className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Location / Ground
                    </label>
                    <input
                      value={tournament.location || ""}
                      onChange={(e) =>
                        setTournament({
                          ...tournament,
                          location: e.target.value,
                        })
                      }
                      className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tournament.start_date || ""}
                        onChange={(e) =>
                          setTournament({
                            ...tournament,
                            start_date: e.target.value,
                          })
                        }
                        className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tournament.end_date || ""}
                        onChange={(e) =>
                          setTournament({
                            ...tournament,
                            end_date: e.target.value,
                          })
                        }
                        className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Overs Per Match
                      </label>
                      <input
                        type="number"
                        value={tournament.overs_limit || 20}
                        onChange={(e) =>
                          setTournament({
                            ...tournament,
                            overs_limit: e.target.value,
                          })
                        }
                        className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Max Registrations
                      </label>
                      <input
                        type="number"
                        value={tournament.max_registrations || 120}
                        onChange={(e) =>
                          setTournament({
                            ...tournament,
                            max_registrations: e.target.value,
                          })
                        }
                        className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg transition-all">
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Right Column: Access Control */}
              <div className="bg-slate-50 dark:bg-black rounded-2xl p-6 border border-slate-200 dark:border-slate-800 h-fit">
                <h2 className="text-xl font-black uppercase mb-2 text-slate-900 dark:text-white">
                  Access Control
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Invite scorers and co-admins via email.
                </p>

                <div className="flex gap-2 mb-6">
                  <input
                    placeholder="user@email.com"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none focus:border-teal-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold outline-none">
                    <option value="scorer">Scorer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={sendInvite}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-4 rounded-lg hover:opacity-80">
                    Invite
                  </button>
                </div>

                {/* Active Access List */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Authorized Users
                  </h3>
                  {accessList.map((access) => (
                    <div
                      key={access.id}
                      className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {access.user_email}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${access.role === "admin" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
                        {access.role}
                      </span>
                    </div>
                  ))}
                  {accessList.length === 0 && (
                    <div className="text-sm text-slate-500 italic">
                      No external users added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
