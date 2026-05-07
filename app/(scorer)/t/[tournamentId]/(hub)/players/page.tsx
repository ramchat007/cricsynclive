"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { UserPlus, Search, Edit, Trash2 } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";

export default function PlayersPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [players, setPlayers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [editingPlayer, setEditingPlayer] = useState<any>(null);

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
        .select("owner_id")
        .eq("id", tournamentId)
        .single();
      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (
        tData?.owner_id === session.user.id ||
        pData?.role === "super_admin" ||
        pData?.role === "scorer"
      ) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }

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
    if (!isAdmin) return;
    const newStatus = currentStatus === "pending" ? "approved" : "pending";
    const { error } = await supabase
      .from("players")
      .update({ status: newStatus })
      .eq("id", playerId);
    if (!error) checkAdminAndFetch();
  };

  const updatePlayer = async () => {
    if (!editingPlayer) return;

    const { error } = await supabase
      .from("players")
      .update({
        full_name: editingPlayer.full_name,
        player_role: editingPlayer.player_role,
        batting_hand: editingPlayer.batting_hand,
        bowling_style: editingPlayer.bowling_style,
        photo_url: editingPlayer.photo_url,
        status: editingPlayer.status,
        tshirt_size: editingPlayer.tshirt_size,
      })
      .eq("id", editingPlayer.id);

    if (!error) {
      setEditingPlayer(null);
      checkAdminAndFetch();
    } else {
      alert("Failed to update player details.");
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    // 1. Safety Check
    const confirmDelete = window.confirm(
      `Are you absolutely sure you want to permanently delete ${playerName}?\n\nWarning: If this player has already batted or bowled in a match, deleting them will break those scorecards!`,
    );
    if (!confirmDelete) return;

    // 2. Delete from Supabase
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      alert("Error deleting player: " + error.message);
    } else {
      // 3. Instantly remove them from the UI without needing to refresh
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p.id !== playerId));
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.mobile_number.includes(playerSearch);
    const matchesRole = roleFilter === "All" || p.player_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="animate-in fade-in transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-1)] pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-[var(--foreground)]">
            Player Roster
          </h2>
          <p className="text-sm font-bold text-[var(--text-muted)]">
            Manage {players.length} total registrations
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={16}
            />
            <input
              placeholder="Search name..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
          >
            <option value="All" className="bg-[var(--surface-1)]">
              All Roles
            </option>
            <option value="Batsman" className="bg-[var(--surface-1)]">
              Batsmen
            </option>
            <option value="Bowler" className="bg-[var(--surface-1)]">
              Bowlers
            </option>
            <option value="All-Rounder" className="bg-[var(--surface-1)]">
              All-Rounders
            </option>
            <option value="Wicket-Keeper" className="bg-[var(--surface-1)]">
              Keepers
            </option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--border-1)] shadow-sm relative overflow-hidden transition-all hover:border-[var(--accent)]/50 hover:shadow-md"
          >
            {/* Status Ribbon */}
            <div
              className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 transition-colors ${
                player.status === "approved"
                  ? "bg-[var(--accent)]"
                  : "bg-amber-500"
              }`}
            />
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 shrink-0 rounded-2xl bg-[var(--surface-2)] bg-cover bg-center border border-[var(--border-1)]"
                style={{
                  backgroundImage: player.photo_url
                    ? `url(${player.photo_url})`
                    : "none",
                }}
              />
              <div className="flex-1 min-w-0 z-10">
                <h4 className="font-black text-lg text-[var(--foreground)] truncate">
                  {player.full_name}
                </h4>
                <p className="text-xs font-bold text-[var(--text-muted)] mb-2">
                  {player.player_role}
                </p>
                <div className="flex gap-2">
                  <span className="bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-1)] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">
                    Shirt: {player.tshirt_size}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() =>
                          togglePlayerStatus(player.id, player.status)
                        }
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${
                          player.status === "approved"
                            ? "bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-red-500/10 hover:text-red-500"
                            : "bg-amber-500/10 text-amber-600 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                        }`}
                      >
                        {player.status === "approved" ? "Revoke" : "Approve"}
                      </button>
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--background)] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDeletePlayer(player.id, player.full_name)
                        }
                        title="Delete Player"
                        className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[var(--background)] rounded-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredPlayers.length === 0 && (
          <div className="col-span-full py-12 text-center text-[var(--text-muted)] font-bold text-sm uppercase tracking-widest">
            No players found.
          </div>
        )}
      </div>

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--surface-1)] rounded-[2rem] w-full max-w-md p-6 border border-[var(--border-1)] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar transition-colors">
            <h2 className="text-xl font-black uppercase tracking-widest mb-6 text-[var(--foreground)]">
              Edit Player Profile
            </h2>

            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] bg-cover bg-center border border-[var(--border-1)] shrink-0"
                  style={{ backgroundImage: `url(${editingPlayer.photo_url})` }}
                />
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  options={{
                    multiple: false,
                    cropping: true,
                    showSkipCropButton: false,
                    croppingAspectRatio: 1,
                    showCompletedButton: true,
                  }}
                  onSuccess={(result: any) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      photo_url: result.info.secure_url,
                    })
                  }
                >
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="text-xs font-bold bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] px-4 py-2 rounded-lg hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
                    >
                      Change Photo
                    </button>
                  )}
                </CldUploadWidget>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                  Full Name
                </label>
                <input
                  value={editingPlayer.full_name}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                    Role
                  </label>
                  <select
                    value={editingPlayer.player_role || ""}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        player_role: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                  >
                    <option className="bg-[var(--surface-1)]">Batsman</option>
                    <option className="bg-[var(--surface-1)]">Bowler</option>
                    <option className="bg-[var(--surface-1)]">
                      All-Rounder
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Wicket-Keeper
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                    Jersey Size
                  </label>
                  <select
                    value={editingPlayer.tshirt_size}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        tshirt_size: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                  >
                    <option className="bg-[var(--surface-1)]">S</option>
                    <option className="bg-[var(--surface-1)]">M</option>
                    <option className="bg-[var(--surface-1)]">L</option>
                    <option className="bg-[var(--surface-1)]">XL</option>
                    <option className="bg-[var(--surface-1)]">XXL</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                    Status
                  </label>
                  <select
                    value={editingPlayer.status}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        status: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                  >
                    <option value="pending" className="bg-[var(--surface-1)]">
                      Pending Payment
                    </option>
                    <option value="approved" className="bg-[var(--surface-1)]">
                      Approved
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                    Batting
                  </label>
                  <select
                    value={editingPlayer.batting_hand}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        batting_hand: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                  >
                    <option className="bg-[var(--surface-1)]">
                      Right Hand
                    </option>
                    <option className="bg-[var(--surface-1)]">Left Hand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                    Bowling
                  </label>
                  <select
                    value={editingPlayer.bowling_style}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        bowling_style: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold outline-none text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                  >
                    <option className="bg-[var(--surface-1)]">None</option>
                    <option className="bg-[var(--surface-1)]">
                      Right-arm Fast
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Right-arm Medium
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Right-arm Spin
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Left-arm Fast
                    </option>
                    <option className="bg-[var(--surface-1)]">
                      Left-arm Spin
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setEditingPlayer(null)}
                className="px-6 py-3 rounded-xl text-[var(--text-muted)] font-bold hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updatePlayer}
                className="bg-[var(--foreground)] text-[var(--background)] font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
