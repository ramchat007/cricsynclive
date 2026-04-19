"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Search } from "lucide-react";
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
      if (tData?.owner_id === session.user.id || pData?.role === "super_admin")
        setIsAdmin(true);
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

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.mobile_number.includes(playerSearch);
    const matchesRole = roleFilter === "All" || p.player_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
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

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              placeholder="Search name..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 dark:bg-black border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none">
            <option value="All">All Roles</option>
            <option value="Batsman">Batsmen</option>
            <option value="Bowler">Bowlers</option>
            <option value="All-Rounder">All-Rounders</option>
            <option value="Wicket-Keeper">Keepers</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 ${player.status === "approved" ? "bg-teal-500" : "bg-orange-500"}`}
            />
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 bg-cover bg-center" 
                style={{ backgroundImage: player.photo_url ? `url(${player.photo_url})` : 'none' }} 
              />
              <div className="flex-1 min-w-0 z-10">
                <h4 className="font-black text-lg text-slate-900 dark:text-white truncate">
                  {player.full_name}
                </h4>
                <p className="text-xs font-bold text-slate-500 mb-2">
                  {player.player_role}
                </p>
                <div className="flex gap-2">
                  <span className="bg-slate-100 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded text-slate-600">
                    Shirt: {player.tshirt_size}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() =>
                          togglePlayerStatus(player.id, player.status)
                        }
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${player.status === "approved" ? "bg-teal-50 text-teal-600 hover:bg-red-50 hover:text-red-600" : "bg-orange-50 text-orange-600 hover:bg-teal-50 hover:text-teal-600"}`}>
                        {player.status === "approved" ? "Revoke" : "Approve"}
                      </button>
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="bg-slate-100 hover:bg-teal-500 text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors">
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-xl font-black uppercase tracking-widest mb-6">
              Edit Player Profile
            </h2>

            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 bg-cover bg-center border border-slate-200 dark:border-slate-700 shrink-0"
                  style={{ backgroundImage: `url(${editingPlayer.photo_url})` }}
                />
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  onSuccess={(result: any) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      photo_url: result.info.secure_url,
                    })
                  }>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hover:text-teal-500 transition-colors">
                      Change Photo
                    </button>
                  )}
                </CldUploadWidget>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                    Role
                  </label>
                  <select
                    value={editingPlayer.player_role}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        player_role: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option>Batsman</option>
                    <option>Bowler</option>
                    <option>All-Rounder</option>
                    <option>Wicket-Keeper</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option>S</option>
                    <option>M</option>
                    <option>L</option>
                    <option>XL</option>
                    <option>XXL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option value="pending">Pending Payment</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option>Right Hand</option>
                    <option>Left Hand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option>None</option>
                    <option>Right-arm Fast</option>
                    <option>Right-arm Medium</option>
                    <option>Right-arm Spin</option>
                    <option>Left-arm Fast</option>
                    <option>Left-arm Spin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setEditingPlayer(null)}
                className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={updatePlayer}
                className="bg-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-500 transition-all shadow-lg shadow-teal-500/20">
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
