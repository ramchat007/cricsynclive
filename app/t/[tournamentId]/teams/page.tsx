"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import { ImageIcon } from "lucide-react";

export default function TeamsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [teams, setTeams] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShort, setNewTeamShort] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#2dd4bf");
  const [newTeamGroup, setNewTeamGroup] = useState("Group A"); // <-- NEW
  const [logoUrl, setLogoUrl] = useState("");
  const [squadLimit, setSquadLimit] = useState(11);
  const [isAuctionEnabled, setIsAuctionEnabled] = useState(true); // <-- NEW
  const [editingTeam, setEditingTeam] = useState<any>(null);

  const [addingToTeam, setAddingToTeam] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuickAdd, setIsQuickAdd] = useState(false);

  // Quick Add Form
  const [quickPlayer, setQuickPlayer] = useState({
    full_name: "",
    player_role: "All-Rounder",
    batting_hand: "Right Hand",
    bowling_style: "Right-arm Medium",
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, [tournamentId]);

  const checkAdminAndFetch = async () => {
    // Check Admin
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("owner_id, squad_limit, is_auction_enabled")
        .eq("id", tournamentId)
        .single();
      if (tData) {
        setSquadLimit(tData.squad_limit || 15);
        setIsAuctionEnabled(tData.is_auction_enabled ?? true); // <-- SET DYNAMIC TOGGLE
      }

      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (tData?.owner_id === session.user.id || pData?.role === "super_admin")
        setIsAdmin(true);
    }

    // Fetch Teams + their drafted players
    const { data } = await supabase
      .from("teams")
      .select("*, players(*)")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    if (data) setTeams(data);
  };

  const addTeam = async () => {
    if (!newTeamName || !newTeamShort)
      return alert("Fill required team fields");
    const { error } = await supabase.from("teams").insert({
      tournament_id: tournamentId,
      name: newTeamName,
      short_name: newTeamShort.toUpperCase(),
      primary_color: newTeamColor,
      group_name: newTeamGroup, // <-- NEW
      logo_url: logoUrl,
    });
    if (!error) {
      setNewTeamName("");
      setNewTeamShort("");
      setLogoUrl("");
      checkAdminAndFetch();
    }
  };

  const updateTeam = async () => {
    if (!editingTeam) return;
    const { error } = await supabase
      .from("teams")
      .update({
        name: editingTeam.name,
        short_name: editingTeam.short_name.toUpperCase(),
        primary_color: editingTeam.primary_color,
        group_name: editingTeam.group_name,
      })
      .eq("id", editingTeam.id);

    if (!error) {
      setEditingTeam(null);
      checkAdminAndFetch();
    } else alert("Failed to update team.");
  };

  // Search global directory (or existing players in this project)
  const searchPlayers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    // Search across ALL tournaments (Global Directory concept)
    const { data } = await supabase
      .from("players")
      .select("*")
      .ilike("full_name", `%${query}%`)
      .limit(5);

    if (data) setSearchResults(data);
  };

  const addPlayerToSquad = async (playerData: any) => {
    if (!addingToTeam) return;

    // 1. Create a new entry in the players table linked to THIS tournament and team
    const { error } = await supabase.from("players").insert({
      tournament_id: tournamentId,
      team_id: addingToTeam.id,
      full_name: playerData.full_name,
      player_role: playerData.player_role,
      photo_url: playerData.photo_url || null,
      batting_hand: playerData.batting_hand,
      bowling_style: playerData.bowling_style,
      status: "approved", // Auto-approve if Admin adds them
      auction_status: isAuctionEnabled ? "sold" : "pending",
      sold_price: isAuctionEnabled ? 0 : null, // Manual add defaults to 0 in auction mode
    });

    if (!error) {
      setAddingToTeam(null);
      setSearchQuery("");
      setSearchResults([]);
      checkAdminAndFetch();
    } else {
      alert("Error adding player: " + error.message);
    }
  };

  return (
    <div className="animate-in fade-in">
      {/* NEW LAYOUT: Add Team Form stays on top */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
            Register New Franchise
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <input
              placeholder="Full Franchise Name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
            />
            <input
              placeholder="Short (e.g. MI)"
              value={newTeamShort}
              onChange={(e) => setNewTeamShort(e.target.value)}
              maxLength={4}
              className="w-24 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500 uppercase text-center"
            />
            <select
              value={newTeamGroup}
              onChange={(e) => setNewTeamGroup(e.target.value)}
              className="w-32 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500">
              <option value="Group A">Group A</option>
              <option value="Group B">Group B</option>
              <option value="Group C">Group C</option>
              <option value="Group D">Group D</option>
            </select>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1 h-[46px] shrink-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Color
              </label>
              <input
                type="color"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>

            <CldUploadWidget
              uploadPreset={String(
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
              )}
              onSuccess={(result: any) => setLogoUrl(result.info.secure_url)}>
              {({ open }) => (
                <button
                  onClick={() => open()}
                  className="h-[46px] px-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors shrink-0">
                  {logoUrl ? (
                    <span className="text-teal-500">✅ Uploaded</span>
                  ) : (
                    <>
                      <ImageIcon size={16} /> Logo
                    </>
                  )}
                </button>
              )}
            </CldUploadWidget>

            <button
              onClick={addTeam}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold h-[46px] px-8 rounded-xl transition-all shrink-0">
              Create
            </button>
          </div>
        </div>
      )}

      {/* Team Roster Grid fills the rest of the screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div
              className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-50 pointer-events-none"
              style={{ backgroundColor: team.primary_color }}
            />
            <div className="flex justify-between items-start mb-6 z-10 gap-2">
              {/* Left Side: Logo & Info */}
              <div className="flex gap-4 items-start min-w-0">
                <div
                  className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800 bg-contain bg-no-repeat bg-center p-2 shadow-inner border border-slate-100 dark:border-slate-700"
                  style={{ backgroundImage: `url(${team.logo_url})` }}
                />
                <div className="flex flex-col gap-1 mt-1 truncate">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-2 py-1 rounded w-max">
                    {team.group_name || "Unassigned"}
                  </span>
                  <span
                    className="text-xl md:text-2xl font-black text-slate-300 dark:text-slate-700 leading-none mt-1 truncate"
                    style={{ color: team.primary_color }}>
                    {team.short_name}
                  </span>
                </div>
              </div>

              {/* Right Side: Edit Team Button (No longer absolute!) */}
              {isAdmin && (
                <button
                  onClick={() => setEditingTeam(team)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-teal-500 text-slate-500 hover:text-white p-2.5 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                  ✏️
                </button>
              )}
            </div>

            <div className="z-10">
              <h4 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                {team.name}
              </h4>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between z-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Squad Size
                </p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {team.players?.length || 0}{" "}
                  <span className="text-sm text-slate-400">/ {squadLimit}</span>
                </p>
              </div>
              {/* Only show purse if Auction is Enabled */}
              {isAuctionEnabled && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Remaining Purse
                  </p>
                  <p
                    className={`text-lg font-black ${team.purse_balance < 20000 ? "text-red-500" : "text-teal-500"}`}>
                    ₹{team.purse_balance.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            {team.players && team.players.length > 0 && (
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 z-10">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Current Squad
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setAddingToTeam(team)}
                      className="text-[10px] font-black uppercase text-teal-600 hover:text-teal-500 transition-colors">
                      + Add Player
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                  {team.players.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-slate-50 dark:bg-black p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0"
                          style={{ backgroundImage: `url(${p.photo_url})` }}
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
                      {isAuctionEnabled && (
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-black text-teal-500">
                            ₹{p.sold_price?.toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
            No franchises created yet.
          </div>
        )}
      </div>
      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-black uppercase tracking-widest mb-6">
              Edit Franchise
            </h2>
            <div className="space-y-4">
              <input
                value={editingTeam.name}
                onChange={(e) =>
                  setEditingTeam({ ...editingTeam, name: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                placeholder="Team Name"
              />
              <input
                value={editingTeam.short_name}
                onChange={(e) =>
                  setEditingTeam({ ...editingTeam, short_name: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none uppercase"
                placeholder="Short Name"
              />
              <select
                value={editingTeam.group_name}
                onChange={(e) =>
                  setEditingTeam({ ...editingTeam, group_name: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                <option value="Group A">Group A</option>
                <option value="Group B">Group B</option>
                <option value="Group C">Group C</option>
                <option value="Group D">Group D</option>
              </select>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-black border border-slate-200 rounded-xl px-4 py-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex-1">
                  Brand Color
                </label>
                <input
                  type="color"
                  value={editingTeam.primary_color}
                  onChange={(e) =>
                    setEditingTeam({
                      ...editingTeam,
                      primary_color: e.target.value,
                    })
                  }
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingTeam(null)}
                className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={updateTeam}
                className="bg-teal-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-teal-500">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ADD PLAYER MODAL */}
      {addingToTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Add to {addingToTeam.short_name}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                  Global Directory Search
                </p>
              </div>
              <button
                onClick={() => setAddingToTeam(null)}
                className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-6">
              {!isQuickAdd ? (
                <>
                  <input
                    placeholder="Search global players..."
                    value={searchQuery}
                    onChange={(e) => searchPlayers(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none mb-4"
                  />

                  <div className="space-y-2 mb-6 min-h-[100px]">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addPlayerToSquad(p)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 transition-all bg-white dark:bg-black">
                        <span className="font-bold text-sm">
                          {p.full_name} ({p.player_role})
                        </span>
                        <span className="text-[10px] font-black text-teal-500 uppercase">
                          Select
                        </span>
                      </button>
                    ))}
                    {searchQuery.length >= 3 && searchResults.length === 0 && (
                      <p className="text-center text-xs text-slate-500 font-bold py-4">
                        No global record found.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setIsQuickAdd(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs font-black uppercase hover:border-teal-500 hover:text-teal-500 transition-all">
                    + Create New Player Entry
                  </button>
                </>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <input
                    placeholder="Full Name"
                    value={quickPlayer.full_name}
                    onChange={(e) =>
                      setQuickPlayer({
                        ...quickPlayer,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                  />
                  <select
                    value={quickPlayer.player_role}
                    onChange={(e) =>
                      setQuickPlayer({
                        ...quickPlayer,
                        player_role: e.target.value,
                      })
                    }
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none">
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-Rounder</option>
                    <option>Wicket-Keeper</option>
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsQuickAdd(false)}
                      className="flex-1 py-3 text-sm font-bold text-slate-500">
                      Back to Search
                    </button>
                    <button
                      onClick={() => addPlayerToSquad(quickPlayer)}
                      className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-500 transition-all">
                      Add Player
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
