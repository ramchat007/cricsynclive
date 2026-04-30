"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import { ImageIcon, X } from "lucide-react";

export default function TeamsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [teams, setTeams] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // New Team Form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShort, setNewTeamShort] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#2dd4bf");
  const [newTeamGroup, setNewTeamGroup] = useState(""); // Changed default to empty string
  const [logoUrl, setLogoUrl] = useState("");

  // Settings
  const [squadLimit, setSquadLimit] = useState(11);
  const [isAuctionEnabled, setIsAuctionEnabled] = useState(true);

  // Modals
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [addingToTeam, setAddingToTeam] = useState<any>(null);

  // Player Search/Add
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
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
        setIsAuctionEnabled(tData.is_auction_enabled ?? true);
      }

      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (
        tData?.owner_id === session.user.id ||
        pData?.role === "super_admin"
      ) {
        setIsAdmin(true);
      }
    }

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
      group_name: newTeamGroup,
      logo_url: logoUrl,
    });

    if (!error) {
      setNewTeamName("");
      setNewTeamShort("");
      setNewTeamGroup("");
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
        logo_url: editingTeam.logo_url, // Added logo_url so edits save to DB
      })
      .eq("id", editingTeam.id);

    if (!error) {
      setEditingTeam(null);
      checkAdminAndFetch();
    } else alert("Failed to update team.");
  };

  const searchPlayers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      searchResults.length > 0 && setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("players")
      .select("*")
      .ilike("full_name", `%${query}%`)
      .limit(5);

    if (data) setSearchResults(data);
  };

  const addPlayerToSquad = async (playerData: any) => {
    if (!addingToTeam) return;

    const { error } = await supabase.from("players").insert({
      tournament_id: tournamentId,
      team_id: addingToTeam.id,
      full_name: playerData.full_name,
      player_role: playerData.player_role,
      photo_url: playerData.photo_url || null,
      batting_hand: playerData.batting_hand,
      bowling_style: playerData.bowling_style,
      status: "approved",
      auction_status: isAuctionEnabled ? "sold" : "pending",
      sold_price: isAuctionEnabled ? 0 : null,
    });

    if (!error) {
      setAddingToTeam(null);
      setSearchQuery("");
      setSearchResults([]);
      setIsQuickAdd(false);
      checkAdminAndFetch();
    } else {
      alert("Error adding player: " + error.message);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6 md:space-y-8">
      {/* 1. RESPONSIVE FRANCHISE REGISTRATION FORM */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
            Register New Franchise
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Name Input */}
            <div className="md:col-span-4">
              <input
                placeholder="Full Franchise Name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
              />
            </div>

            {/* Short Name & Group (Side by side on mobile) */}
            <div className="grid grid-cols-2 gap-4 md:col-span-4">
              <input
                placeholder="Short (e.g. MI)"
                value={newTeamShort}
                onChange={(e) => setNewTeamShort(e.target.value)}
                maxLength={4}
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500 uppercase text-center"
              />
              <input
                type="text"
                placeholder="Group (e.g. Pool A)"
                value={newTeamGroup}
                onChange={(e) => setNewTeamGroup(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
              />
            </div>

            {/* Actions (Side by side on mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-4">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1 h-[46px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                />
              </div>

              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                onSuccess={(result: any) => setLogoUrl(result.info.secure_url)}
              >
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="h-[46px] w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors"
                  >
                    {logoUrl ? (
                      <span className="text-teal-500 text-xs">✅ Done</span>
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
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold h-[46px] w-full rounded-xl transition-all uppercase text-xs tracking-widest sm:col-span-full md:col-span-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM ROSTER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            {/* Background Glow */}
            <div
              className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 pointer-events-none"
              style={{ backgroundColor: team.primary_color }}
            />

            <div className="flex justify-between items-start mb-6 z-10 gap-2">
              {/* Left Side: Logo & Info */}
              <div className="flex gap-4 items-start min-w-0">
                <div
                  className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800 bg-contain bg-no-repeat bg-center p-2 shadow-inner border border-slate-100 dark:border-slate-700"
                  style={{
                    backgroundImage: team.logo_url
                      ? `url(${team.logo_url})`
                      : "none",
                  }}
                />
                <div className="flex flex-col gap-1 mt-1 truncate">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-2 py-1 rounded w-max">
                    {team.group_name || "Unassigned"}
                  </span>
                  <span
                    className="text-xl md:text-2xl font-black text-slate-300 dark:text-slate-700 leading-none mt-1 truncate"
                    style={{ color: team.primary_color }}
                  >
                    {team.short_name}
                  </span>
                </div>
              </div>

              {/* Right Side: Edit Button */}
              {isAdmin && (
                <button
                  onClick={() => setEditingTeam(team)}
                  className="bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-500 p-2.5 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shrink-0"
                >
                  ✏️
                </button>
              )}
            </div>

            <div className="z-10">
              <h4 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate">
                {team.name}
              </h4>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between z-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Squad Size
                </p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {team.players?.length || 0}{" "}
                  <span className="text-sm text-slate-400">/ {squadLimit}</span>
                </p>
              </div>

              {isAuctionEnabled && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Remaining Purse
                  </p>
                  <p
                    className={`text-lg font-black ${team.purse_balance < 20000 ? "text-red-500" : "text-teal-500"}`}
                  >
                    ₹{team.purse_balance?.toLocaleString("en-IN") || 0}
                  </p>
                </div>
              )}
            </div>

            {/* Current Squad List */}
            {team.players && team.players.length > 0 && (
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 z-10">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Current Squad
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setAddingToTeam(team)}
                      className="text-[10px] font-black uppercase text-teal-600 hover:text-teal-500 transition-colors bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded"
                    >
                      + Add Player
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                  {team.players.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-slate-50 dark:bg-black p-2 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0"
                          style={{
                            backgroundImage: p.photo_url
                              ? `url(${p.photo_url})`
                              : "none",
                          }}
                        />
                        <div className="truncate">
                          <p className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate">
                            {p.full_name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
                            {p.player_role}
                          </p>
                        </div>
                      </div>
                      {isAuctionEnabled && (
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-400">
                            ₹{p.sold_price?.toLocaleString("en-IN") || 0}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Player button if squad is empty */}
            {(!team.players || team.players.length === 0) && isAdmin && (
              <button
                onClick={() => setAddingToTeam(team)}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-teal-500 hover:text-teal-500 transition-colors z-10"
              >
                + Add First Player
              </button>
            )}
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
            No franchises created yet.
          </div>
        )}
      </div>

      {/* 2. RESPONSIVE EDIT TEAM MODAL (Bottom Sheet on Mobile) */}
      {editingTeam && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:rounded-[2rem] rounded-t-[2rem] max-w-md border border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">
                Edit Franchise
              </h2>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <input
                value={editingTeam.name}
                onChange={(e) =>
                  setEditingTeam({ ...editingTeam, name: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500"
                placeholder="Team Name"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  value={editingTeam.short_name}
                  onChange={(e) =>
                    setEditingTeam({
                      ...editingTeam,
                      short_name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none uppercase text-center focus:border-teal-500"
                  placeholder="Short Name"
                />
                <input
                  type="text"
                  value={editingTeam.group_name || ""}
                  onChange={(e) =>
                    setEditingTeam({
                      ...editingTeam,
                      group_name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500"
                  placeholder="Group (e.g. Pool A)"
                />
              </div>

              {/* Edit Logo & Color Section */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
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
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 bg-contain bg-no-repeat bg-center border border-slate-200 dark:border-slate-700"
                    style={{
                      backgroundImage: editingTeam.logo_url
                        ? `url(${editingTeam.logo_url})`
                        : "none",
                    }}
                  />
                  <CldUploadWidget
                    uploadPreset={String(
                      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                    )}
                    onSuccess={(result: any) =>
                      setEditingTeam({
                        ...editingTeam,
                        logo_url: result.info.secure_url,
                      })
                    }
                  >
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        className="flex-1 h-14 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <ImageIcon size={16} /> Update Logo
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button
                onClick={() => setEditingTeam(null)}
                className="flex-1 py-4 rounded-xl text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={updateTeam}
                className="flex-1 bg-teal-600 text-white font-black py-4 rounded-xl hover:bg-teal-500 text-xs uppercase tracking-widest shadow-lg shadow-teal-500/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESPONSIVE ADD PLAYER MODAL (Bottom Sheet on Mobile) */}
      {addingToTeam && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:rounded-[2rem] rounded-t-[2rem] max-w-md flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">
                  Add to {addingToTeam.short_name}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                  Global Directory
                </p>
              </div>
              <button
                onClick={() => {
                  setAddingToTeam(null);
                  setIsQuickAdd(false);
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
              {!isQuickAdd ? (
                <>
                  <input
                    placeholder="Search global players..."
                    value={searchQuery}
                    onChange={(e) => searchPlayers(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500 mb-4"
                  />

                  {/* Added max-height to prevent modal blowout on mobile */}
                  <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addPlayerToSquad(p)}
                        className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all bg-white dark:bg-black"
                      >
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate pr-2">
                          {p.full_name}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({p.player_role})
                          </span>
                        </span>
                        <span className="text-[10px] font-black text-teal-500 uppercase shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                    {searchQuery.length >= 3 && searchResults.length === 0 && (
                      <p className="text-center text-xs text-slate-500 font-bold py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        No player found.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setIsQuickAdd(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-teal-500 hover:border-teal-500 text-xs font-black uppercase tracking-widest transition-all"
                  >
                    + Create New Player
                  </button>
                </>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <input
                    placeholder="Full Name"
                    value={quickPlayer.full_name}
                    onChange={(e) =>
                      setQuickPlayer({
                        ...quickPlayer,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500"
                  />
                  <select
                    value={quickPlayer.player_role}
                    onChange={(e) =>
                      setQuickPlayer({
                        ...quickPlayer,
                        player_role: e.target.value,
                      })
                    }
                    className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500"
                  >
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-Rounder</option>
                    <option>Wicket-Keeper</option>
                  </select>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsQuickAdd(false)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs uppercase tracking-widest font-bold text-slate-500"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => addPlayerToSquad(quickPlayer)}
                      disabled={!quickPlayer.full_name}
                      className="flex-[2] bg-teal-600 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/20"
                    >
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
