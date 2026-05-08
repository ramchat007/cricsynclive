"use client";
import React, { useEffect, useState, useMemo, useCallback, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Settings,
  DollarSign,
  AlertTriangle,
  Save,
  Users,
  ArrowLeft,
  ListOrdered,
  Sliders,
  Trash2,
  Database,
  Search,
  RefreshCcw,
  Star,
  Check,
  UserPlus,
  Ban,
  PlusCircle,
} from "lucide-react";

// --- 1. OPTIMIZED PLAYER ROW COMPONENT ---
const PlayerRow = React.memo(
  ({
    p,
    teams,
    slots,
    onAssign,
    onUpdatePrice,
    onToggleIcon,
    onDelete,
    onReset,
    onAssignSlot,
    onMarkUnsold,
  }: any) => {
    const [tempTeam, setTempTeam] = useState("");
    const [tempPrice, setTempPrice] = useState(p.base_price || 1000);

    useEffect(() => {
      setTempPrice(p.base_price || 1000);
    }, [p.base_price]);

    const handleAssignClick = () => {
      onAssign(p.id, tempTeam, tempPrice);
    };

    const handlePriceBlur = () => {
      if (tempPrice !== p.base_price) {
        onUpdatePrice(p.id, tempPrice);
      }
    };

    const inputClass =
      "bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] rounded-lg p-2 text-[11px] outline-none font-bold focus:border-[var(--accent)] transition-colors";

    return (
      <tr className="hover:bg-[var(--surface-2)]/50 transition-colors group">
        <td className="p-4 font-bold text-[var(--foreground)] whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-[var(--surface-3)] bg-cover bg-center border border-[var(--border-1)] shrink-0 flex items-center justify-center text-[11px] font-black"
              style={{
                backgroundImage: p.photo_url ? `url(${p.photo_url})` : "none",
              }}>
              {!p.photo_url && (p.full_name || "P").charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {p.full_name}
                {p.is_icon && (
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="text-[9px] text-[var(--text-muted)] uppercase mt-1 tracking-widest">
                {p.player_role}
              </div>
            </div>
          </div>
        </td>

        <td className="p-4">
          {p.auction_status !== "sold" ? (
            <div className="flex items-center gap-2">
              <select
                className={`${inputClass} w-32`}
                value={tempTeam}
                onChange={(e) => setTempTeam(e.target.value)}>
                <option value="">Select Team</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.short_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={`${inputClass} w-20 text-[var(--accent)]`}
                value={tempPrice}
                onChange={(e) => setTempPrice(Number(e.target.value))}
              />
              <button
                onClick={handleAssignClick}
                disabled={!tempTeam}
                className="bg-[var(--accent)] text-[var(--background)] px-3 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all hover:opacity-90 disabled:opacity-50">
                Assign
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded w-max uppercase tracking-widest">
                Sold
              </span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] mt-1 ml-1">
                {teams.find((t: any) => t.id === p.team_id)?.short_name}
              </span>
            </div>
          )}
        </td>

        <td className="p-4">
          <select
            className={`${inputClass} w-full max-w-[160px] cursor-pointer`}
            value={p.auction_slot_id || ""}
            onChange={(e) => onAssignSlot(p.id, e.target.value)}>
            <option value="">-- Unassigned --</option>
            {slots.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </td>

        <td className="p-4 font-mono">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span className="text-[var(--text-muted)]">BASE: ₹</span>
              {p.auction_status === "sold" ? (
                <span className="text-[var(--foreground)]">
                  {p.base_price?.toLocaleString("en-IN")}
                </span>
              ) : (
                <input
                  type="number"
                  className="bg-transparent border-b border-[var(--border-1)] w-16 outline-none focus:border-[var(--accent)] text-[var(--foreground)]"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(Number(e.target.value))}
                  onBlur={handlePriceBlur}
                />
              )}
            </div>
            {p.auction_status === "sold" && p.sold_price && (
              <div className="text-[11px] font-black text-emerald-500 mt-1">
                FINAL: ₹{p.sold_price.toLocaleString("en-IN")}
              </div>
            )}
          </div>
        </td>

        <td className="p-4 text-right flex justify-end gap-2 items-center">
          <button
            onClick={() => onToggleIcon(p)}
            className={`transition-all p-2 rounded-lg ${
              p.is_icon
                ? "text-amber-500 bg-amber-500/10 scale-110"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }`}
            title="Toggle Icon Player">
            <Star size={16} className={p.is_icon ? "fill-amber-500" : ""} />
          </button>

          {p.auction_status === "pending" && (
            <button
              onClick={() => onMarkUnsold(p.id)}
              className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors rounded-lg"
              title="Mark Unsold">
              <Ban size={16} />
            </button>
          )}

          {(p.auction_status === "sold" || p.auction_status === "unsold") && (
            <button
              onClick={() => onReset(p)}
              className="p-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors rounded-lg"
              title="Reset to Pending">
              <RefreshCcw size={16} />
            </button>
          )}

          <button
            onClick={() => onDelete(p.id)}
            className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
            title="Delete Permanently">
            <Trash2 size={16} />
          </button>
        </td>
      </tr>
    );
  },
);
PlayerRow.displayName = "PlayerRow";

// --- 2. REGISTRATION QUEUE MODAL ---
const RegistrationQueueModal = ({
  isOpen,
  onClose,
  onImport,
  tournamentId,
}: any) => {
  const [queuePlayers, setQueuePlayers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchRegistrationQueue();
  }, [isOpen]);

  const fetchRegistrationQueue = async () => {
    setLoading(true);
    // Fetch directly from the players table where they are registered but NOT approved yet
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .neq("status", "approved");

    if (data) setQueuePlayers(data);
    setLoading(false);
  };

  const toggleSelect = (player: any) => {
    if (selected.find((s) => s.id === player.id)) {
      setSelected((prev) => prev.filter((x) => x.id !== player.id));
    } else {
      setSelected((prev) => [...prev, player]);
    }
  };

  const filtered = queuePlayers.filter((p) => {
    const name = (p.full_name || p.name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const isAllSelected =
    filtered.length > 0 &&
    filtered.every((p) => selected.some((s) => s.id === p.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelected((prev) =>
        prev.filter((s) => !filtered.some((f) => f.id === s.id)),
      );
    } else {
      const newSelected = [...selected];
      filtered.forEach((f) => {
        if (!newSelected.some((s) => s.id === f.id)) newSelected.push(f);
      });
      setSelected(newSelected);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[var(--surface-1)] border border-[var(--border-1)] w-full max-w-lg rounded-[2.5rem] flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
        <div className="p-6 border-b border-[var(--border-1)] flex justify-between items-center bg-[var(--surface-2)] rounded-t-[2.5rem] shrink-0">
          <h3 className="text-[var(--foreground)] font-black uppercase tracking-widest text-lg flex items-center gap-2">
            <Database size={20} className="text-[var(--accent)]" /> Registration
            Queue
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-1)] shrink-0">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl py-3 px-10 outline-none focus:border-[var(--accent)] text-sm font-bold text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-colors"
              placeholder="Search unapproved registrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
              {filtered.length} Pending Players
            </p>
            <button
              onClick={handleSelectAll}
              disabled={filtered.length === 0}
              className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all disabled:opacity-50 ${
                isAllSelected
                  ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)] shadow-md"
                  : "bg-[var(--surface-2)] text-[var(--foreground)] border-[var(--border-1)] hover:bg-[var(--surface-3)]"
              }`}>
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-[var(--accent)] animate-pulse font-black uppercase tracking-widest text-xs">
              Fetching Queue...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-[var(--text-muted)] border-2 border-dashed border-[var(--border-1)] rounded-xl">
              No pending registrations.
            </div>
          ) : (
            filtered.map((p) => {
              const isSel = selected.find((s) => s.id === p.id);
              const name = p.full_name || p.name || "Unknown";
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p)}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSel
                      ? "bg-[var(--accent)]/10 border-[var(--accent)] shadow-sm"
                      : "bg-[var(--surface-2)] border-[var(--border-1)] hover:border-[var(--accent)]/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl bg-[var(--surface-3)] bg-cover bg-center border border-[var(--border-1)] flex items-center justify-center text-xs font-black text-[var(--text-muted)]"
                      style={{
                        backgroundImage: p.photo_url
                          ? `url(${p.photo_url})`
                          : "none",
                      }}>
                      {!p.photo_url && name.charAt(0)}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-black transition-colors ${
                          isSel
                            ? "text-[var(--accent)]"
                            : "text-[var(--foreground)]"
                        }`}>
                        {name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] uppercase font-bold tracking-widest mt-0.5">
                        {p.player_role || "Unknown"}
                      </div>
                    </div>
                  </div>
                  {isSel && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--background)]">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t border-[var(--border-1)] flex justify-end gap-3 bg-[var(--surface-2)] rounded-b-[2.5rem] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-[var(--border-1)] bg-[var(--surface-1)] rounded-xl font-black uppercase tracking-widest text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onImport(selected)}
            disabled={selected.length === 0}
            className="flex-[2] bg-[var(--accent)] text-[var(--background)] px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 active:scale-95 transition-all hover:opacity-90">
            Approve {selected.length} Players
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. MAIN ADMIN PANEL COMPONENT ---
export default function AuctionAdminPanel({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState("pool");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  // Budgets
  const [globalPurse, setGlobalPurse] = useState<number>(100000);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editPurseValue, setEditPurseValue] = useState<number>(0);

  // Pool
  const [poolFilter, setPoolFilter] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  // Rules
  const [config, setConfig] = useState({
    min_squad_size: 11,
    max_squad_size: 15,
    min_base_price: 1000,
    bid_increment: 100,
    max_bid_per_player: 0,
    max_icons_per_team: 2,
    bid_slabs: [] as { max: number; inc: number }[],
    limit_one_per_slot: false,
    allow_direct_buy: false,
  });

  const [newSlotName, setNewSlotName] = useState("");

  // RBAC CHECK
  useEffect(() => {
    checkAccessAndFetch();
  }, [tournamentId]);

  const checkAccessAndFetch = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const { data: tourney } = await supabase
      .from("tournaments")
      .select("owner_id")
      .eq("id", tournamentId)
      .single();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (
      tourney?.owner_id === session.user.id ||
      profile?.role === "super_admin"
    ) {
      setHasAccess(true);
      await fetchAdminData();
    } else {
      setHasAccess(false);
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const { data: tData } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    if (tData) setTeams(tData);

    // ONLY fetch approved players for the active pool management
    const { data: pData } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .order("created_at");
    if (pData) setPlayers(pData);

    const { data: sData } = await supabase
      .from("auction_slots")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("order_index");
    if (sData) setSlots(sData);

    const { data: tourneyData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (tourneyData) {
      setConfig({
        min_squad_size: tourneyData.min_squad_size || 11,
        max_squad_size: tourneyData.max_squad_size || 15,
        min_base_price: tourneyData.min_base_price || 1000,
        bid_increment: tourneyData.bid_increment || 100,
        max_bid_per_player: tourneyData.max_bid_per_player || 0,
        max_icons_per_team: tourneyData.max_icons_per_team || 2,
        bid_slabs: tourneyData.bid_slabs || [],
        limit_one_per_slot: tourneyData.limit_one_per_slot || false,
        allow_direct_buy: tourneyData.allow_direct_buy || false,
      });
    }
    setLoading(false);
  };

  // --- STATS & FILTERS ---
  const stats = useMemo(() => {
    return {
      total: players.length,
      pending: players.filter(
        (p) => p.auction_status === "pending" || !p.auction_status,
      ).length,
      sold: players.filter((p) => p.auction_status === "sold").length,
      unsold: players.filter((p) => p.auction_status === "unsold").length,
    };
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const statusMatch =
        (poolFilter === "PENDING" &&
          (p.auction_status === "pending" || !p.auction_status)) ||
        (poolFilter === "SOLD" && p.auction_status === "sold") ||
        (poolFilter === "UNSOLD" && p.auction_status === "unsold");

      const searchMatch = (p.full_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [players, poolFilter, searchQuery]);

  // --- POOL INLINE ACTIONS ---
  const handleToggleIcon = useCallback(async (player: any) => {
    const newStatus = !player.is_icon;
    setPlayers((current) =>
      current.map((p) =>
        p.id === player.id ? { ...p, is_icon: newStatus } : p,
      ),
    );
    await supabase
      .from("players")
      .update({ is_icon: newStatus })
      .eq("id", player.id);
  }, []);

  const handleUpdatePrice = useCallback(
    async (playerId: string, val: number) => {
      setPlayers((current) =>
        current.map((p) => (p.id === playerId ? { ...p, base_price: val } : p)),
      );
      await supabase
        .from("players")
        .update({ base_price: val })
        .eq("id", playerId);
    },
    [],
  );

  const assignSlotToPlayer = useCallback(
    async (playerId: string, slotId: string) => {
      const finalSlotId = slotId === "" ? null : slotId;
      setPlayers((current) =>
        current.map((p) =>
          p.id === playerId ? { ...p, auction_slot_id: finalSlotId } : p,
        ),
      );
      await supabase
        .from("players")
        .update({ auction_slot_id: finalSlotId })
        .eq("id", playerId);
    },
    [],
  );

  const markUnsold = useCallback(async (playerId: string) => {
    await supabase
      .from("players")
      .update({ auction_status: "unsold" })
      .eq("id", playerId);
    fetchAdminData();
  }, []);

  const handleDeletePlayer = useCallback(async (playerId: string) => {
    if (
      window.confirm(
        "Permanent delete? This removes the player from the database.",
      )
    ) {
      setIsProcessing(true);
      await supabase.from("players").delete().eq("id", playerId);
      await fetchAdminData();
      setIsProcessing(false);
    }
  }, []);

  const forceAssignPlayer = useCallback(
    async (playerId: string, teamId: string, price: number) => {
      if (!window.confirm("Bypass auction and assign player instantly?"))
        return;
      setIsProcessing(true);
      const team = teams.find((t) => t.id === teamId);
      if (team) {
        await supabase
          .from("teams")
          .update({ purse_balance: team.purse_balance - price })
          .eq("id", team.id);
      }
      await supabase
        .from("players")
        .update({ team_id: teamId, sold_price: price, auction_status: "sold" })
        .eq("id", playerId);
      await supabase.from("auction_bids").insert({
        tournament_id: tournamentId,
        player_id: playerId,
        team_id: teamId,
        amount: price,
      });
      await fetchAdminData();
      setIsProcessing(false);
    },
    [teams, tournamentId],
  );

  const resetPlayerToPending = useCallback(
    async (player: any) => {
      if (
        !window.confirm(
          `Reset ${player.full_name} back to PENDING? This will refund their team's purse.`,
        )
      )
        return;
      setIsProcessing(true);
      if (player.team_id && player.sold_price) {
        const team = teams.find((t) => t.id === player.team_id);
        if (team) {
          await supabase
            .from("teams")
            .update({ purse_balance: team.purse_balance + player.sold_price })
            .eq("id", team.id);
        }
        await supabase.from("auction_bids").delete().eq("player_id", player.id);
      }
      await supabase
        .from("players")
        .update({ team_id: null, auction_status: "pending", sold_price: null })
        .eq("id", player.id);
      await fetchAdminData();
      setIsProcessing(false);
    },
    [teams],
  );

  // --- APPROVE REGISTRATIONS ---
  const handleApprovePlayers = async (selectedPendingPlayers: any[]) => {
    setIsProcessing(true);
    const idsToUpdate = selectedPendingPlayers.map((p) => p.id);

    const { error } = await supabase
      .from("players")
      .update({
        status: "approved",
        auction_status: "pending",
        base_price: config.min_base_price,
      })
      .in("id", idsToUpdate);

    if (!error) {
      setShowImportModal(false);
      fetchAdminData();
    } else {
      alert("Error approving players: " + error.message);
    }
    setIsProcessing(false);
  };

  // --- BUDGET ACTIONS ---
  const applyGlobalPurse = async () => {
    if (
      !window.confirm(
        `Set EVERY team's purse to ₹${globalPurse.toLocaleString("en-IN")}?`,
      )
    )
      return;
    setIsProcessing(true);
    await supabase
      .from("teams")
      .update({ purse_balance: globalPurse })
      .eq("tournament_id", tournamentId);
    await fetchAdminData();
    setIsProcessing(false);
  };

  const saveIndividualPurse = async (teamId: string) => {
    await supabase
      .from("teams")
      .update({ purse_balance: editPurseValue })
      .eq("id", teamId);
    setEditingTeamId(null);
    fetchAdminData();
  };

  // --- RULES & SLABS ACTIONS ---
  const handleSaveRules = async () => {
    setIsProcessing(true);
    const { error } = await supabase
      .from("tournaments")
      .update(config)
      .eq("id", tournamentId);
    if (!error) alert("Rules updated successfully!");
    setIsProcessing(false);
  };

  const addSlab = () =>
    setConfig({
      ...config,
      bid_slabs: [...config.bid_slabs, { max: 5000, inc: 500 }],
    });
  const updateSlab = (index: number, field: "max" | "inc", value: string) => {
    const newSlabs = [...config.bid_slabs];
    newSlabs[index][field] = Number(value);
    setConfig({ ...config, bid_slabs: newSlabs });
  };
  const removeSlab = (index: number) =>
    setConfig({
      ...config,
      bid_slabs: config.bid_slabs.filter((_, i) => i !== index),
    });

  // --- SLOTS ACTIONS ---
  const handleCreateSlot = async () => {
    if (!newSlotName.trim()) return;
    await supabase.from("auction_slots").insert({
      tournament_id: tournamentId,
      name: newSlotName.trim(),
      order_index: slots.length + 1,
    });
    setNewSlotName("");
    fetchAdminData();
  };
  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm("Delete this auction round/slot?")) return;
    await supabase.from("auction_slots").delete().eq("id", slotId);
    fetchAdminData();
  };

  // --- DANGER ZONE ACTIONS ---
  const handleSyncBasePrices = async () => {
    if (
      !window.confirm(
        `Update ALL players to the Min Base Price (₹${config.min_base_price})?`,
      )
    )
      return;
    setIsProcessing(true);
    await supabase
      .from("players")
      .update({ base_price: config.min_base_price })
      .eq("tournament_id", tournamentId);
    alert("Base prices synced successfully!");
    fetchAdminData();
    setIsProcessing(false);
  };

  const handleResetAllPlayers = async () => {
    if (
      !window.confirm(
        "⚠️ Mark all players back to PENDING and remove them from teams?",
      )
    )
      return;
    setIsProcessing(true);
    await supabase
      .from("players")
      .update({
        status: "pending",
        auction_status: "pending",
        team_id: null,
        sold_price: null,
      })
      .eq("tournament_id", tournamentId);
    await supabase
      .from("teams")
      .update({ purse_balance: globalPurse })
      .eq("tournament_id", tournamentId);
    await supabase
      .from("auction_bids")
      .delete()
      .eq("tournament_id", tournamentId);
    alert("Players reset to PENDING and budgets refunded.");
    fetchAdminData();
    setIsProcessing(false);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-[var(--accent)] font-black animate-pulse tracking-widest text-xl">
        AUTHENTICATING...
      </div>
    );
  if (!hasAccess)
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-red-500 font-black tracking-widest text-2xl">
        ACCESS DENIED: OWNERS ONLY
      </div>
    );

  return (
    <div className="h-[calc(100dvh-65px)] md:h-[calc(100vh-65px)] bg-[var(--background)] font-sans pb-20 transition-colors duration-300">
      {/* HEADER & TABS */}
      <div className="bg-[var(--glass-bg)] border-b border-[var(--border-1)] p-6 md:px-12 sticky top-0 z-20 backdrop-blur-xl transition-colors">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href={`/t/${tournamentId}/auction`}
              className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 mb-2 transition-colors">
              <ArrowLeft size={12} /> Back to Live Auction
            </Link>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-[var(--foreground)] flex items-center gap-3">
              <Settings className="text-[var(--accent)]" size={28} /> Auction
              Setup
            </h1>
          </div>

          <div className="flex bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl p-1 overflow-x-auto no-scrollbar">
            {[
              { id: "pool", name: "Player Pool", icon: Database },
              { id: "budgets", name: "Budgets", icon: DollarSign },
              { id: "rules", name: "Rules", icon: Sliders },
              { id: "slots", name: "Slots", icon: ListOrdered },
              { id: "danger", name: "Danger", icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                }`}>
                <tab.icon size={14} /> {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4">
        {/* TAB 1: PLAYER POOL */}
        {activeTab === "pool" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-5 rounded-2xl shadow-sm transition-colors">
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Total Active
                </p>
                <p className="text-3xl font-black text-[var(--foreground)] mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                  Sold
                </p>
                <p className="text-3xl font-black text-emerald-600 mt-1">
                  {stats.sold}
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">
                  Pending
                </p>
                <p className="text-3xl font-black text-amber-600 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-red-600">
                  Unsold
                </p>
                <p className="text-3xl font-black text-red-600 mt-1">
                  {stats.unsold}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm transition-colors">
              <div className="flex bg-[var(--surface-2)] border border-[var(--border-1)] p-1 rounded-xl w-full md:w-auto">
                {["PENDING", "SOLD", "UNSOLD"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPoolFilter(f)}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                      poolFilter === f
                        ? "bg-[var(--accent)] text-[var(--background)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                    }`}>
                    {f} (
                    {f === "PENDING"
                      ? stats.pending
                      : f === "SOLD"
                        ? stats.sold
                        : stats.unsold}
                    )
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    placeholder="Search auction pool..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] text-xs font-bold rounded-xl py-2.5 pl-9 pr-4 outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                  />
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap">
                  Review Registrations
                </button>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl overflow-hidden shadow-sm overflow-x-auto transition-colors">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-[var(--surface-2)] border-b border-[var(--border-1)] text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Player</th>
                    <th className="p-4">Force Assign</th>
                    <th className="p-4">Assign Slot</th>
                    <th className="p-4">Pricing</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-1)]">
                  {filteredPlayers.map((p) => (
                    <PlayerRow
                      key={p.id}
                      p={p}
                      teams={teams}
                      slots={slots}
                      onAssign={forceAssignPlayer}
                      onUpdatePrice={handleUpdatePrice}
                      onAssignSlot={assignSlotToPlayer}
                      onToggleIcon={handleToggleIcon}
                      onReset={resetPlayerToPending}
                      onMarkUnsold={markUnsold}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                </tbody>
              </table>
              {filteredPlayers.length === 0 && (
                <div className="p-10 text-center text-xs font-bold text-[var(--text-muted)]">
                  No players found in this list.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BUDGETS */}
        {activeTab === "budgets" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] p-6 md:p-8 shadow-sm transition-colors">
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
                <DollarSign size={16} /> Global Budget Allocation
              </h2>
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="w-full md:flex-1">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">
                    Standard Starting Purse (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={globalPurse}
                      onChange={(e) => setGlobalPurse(Number(e.target.value))}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] rounded-xl py-4 pl-8 pr-4 font-black text-xl outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={applyGlobalPurse}
                  disabled={isProcessing}
                  className="w-full md:w-auto bg-[var(--surface-2)] hover:bg-[var(--border-1)] text-[var(--foreground)] border border-[var(--border-1)] font-black text-xs uppercase tracking-widest py-4 px-8 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50">
                  {isProcessing ? "Processing..." : "Apply to All Teams"}
                </button>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] p-6 md:p-8 shadow-sm transition-colors">
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
                <Users size={16} /> Franchise Balances
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border-1)] p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: team.primary_color }}
                      />
                      <span className="font-black text-sm uppercase tracking-tighter text-[var(--foreground)]">
                        {team.short_name}
                      </span>
                    </div>
                    {editingTeamId === team.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editPurseValue}
                          onChange={(e) =>
                            setEditPurseValue(Number(e.target.value))
                          }
                          className="w-28 bg-[var(--surface-1)] border border-[var(--accent)] text-[var(--foreground)] rounded-lg py-2 px-3 text-xs font-bold outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => saveIndividualPurse(team.id)}
                          className="bg-[var(--accent)] text-[var(--background)] p-2 rounded-lg hover:opacity-90 transition-opacity">
                          <Save size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <span className="font-black text-[var(--foreground)] tabular-nums">
                          ₹{team.purse_balance?.toLocaleString("en-IN") || 0}
                        </span>
                        <button
                          onClick={() => {
                            setEditingTeamId(team.id);
                            setEditPurseValue(team.purse_balance || 0);
                          }}
                          className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 px-3 py-1.5 rounded-lg transition-colors">
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RULES */}
        {activeTab === "rules" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] p-6 shadow-sm transition-colors">
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-6">
                Tournament Limits
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Min Squad Size
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] font-bold outline-none focus:border-[var(--accent)] transition-colors"
                    value={config.min_squad_size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        min_squad_size: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Max Squad Size
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] font-bold outline-none focus:border-[var(--accent)] transition-colors"
                    value={config.max_squad_size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_squad_size: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Global Min Base Price (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] font-bold outline-none focus:border-[var(--accent)] transition-colors"
                    value={config.min_base_price}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        min_base_price: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--warning)] uppercase tracking-widest">
                    Max Bid Per Player (₹0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--foreground)] font-bold outline-none focus:border-[var(--warning)] transition-colors"
                    value={config.max_bid_per_player}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_bid_per_player: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border-1)] p-4 rounded-xl transition-colors">
                  <div>
                    <h4 className="font-bold text-[var(--foreground)] text-sm">
                      Allow Direct Buy
                    </h4>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                      Allows admins to bypass the hammer and instantly buy
                      players.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={config.allow_direct_buy}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          allow_direct_buy: e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-[var(--border-1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--surface-1)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--surface-1)] after:border-[var(--border-1)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border-1)] p-4 rounded-xl transition-colors">
                  <div>
                    <h4 className="font-bold text-[var(--foreground)] text-sm">
                      Limit: 1 Player Per Slot
                    </h4>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                      Teams can only buy 1 player from each round.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={config.limit_one_per_slot}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          limit_one_per_slot: e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-[var(--border-1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--surface-1)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--surface-1)] after:border-[var(--border-1)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] p-6 md:p-8 shadow-sm transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <ListOrdered size={16} /> Dynamic Bidding Slabs
                </h2>
                <button
                  onClick={addSlab}
                  className="bg-[var(--accent)] text-[var(--background)] px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:opacity-90 flex items-center gap-1 shadow-sm transition-all active:scale-95">
                  <PlusCircle size={14} /> Add Slab
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.bid_slabs.map((slab: any, index: number) => (
                  <div
                    key={index}
                    className="flex gap-4 items-center p-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1">
                      <label className="text-[8px] text-[var(--text-muted)] block mb-1 uppercase font-black">
                        Up to (₹)
                      </label>
                      <input
                        type="number"
                        className="bg-transparent text-[var(--foreground)] font-bold outline-none w-full"
                        value={slab.max}
                        onChange={(e) =>
                          updateSlab(index, "max", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1 border-l border-[var(--border-1)] pl-4">
                      <label className="text-[8px] text-[var(--accent)] block mb-1 uppercase font-black">
                        Increment (₹)
                      </label>
                      <input
                        type="number"
                        className="bg-transparent text-[var(--accent)] font-bold outline-none w-full"
                        value={slab.inc}
                        onChange={(e) =>
                          updateSlab(index, "inc", e.target.value)
                        }
                      />
                    </div>
                    <button
                      onClick={() => removeSlab(index)}
                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                  Fallback Increment (If bid exceeds all slabs)
                </label>
                <input
                  type="number"
                  className="w-full md:w-1/2 rounded-xl p-3 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] font-bold outline-none focus:border-[var(--accent)] transition-colors"
                  value={config.bid_increment}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bid_increment: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="mt-8">
                <button
                  onClick={handleSaveRules}
                  disabled={isProcessing}
                  className="w-full bg-[var(--foreground)] text-[var(--background)] font-black py-4 rounded-xl uppercase text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50">
                  {isProcessing ? "Saving..." : "Save Rules & Slabs"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SLOTS */}
        {activeTab === "slots" && (
          <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] p-6 md:p-8 shadow-sm max-w-3xl mx-auto transition-colors">
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-6">
              Auction Rounds / Slots
            </h2>

            <div className="flex flex-wrap gap-3 mb-8">
              <input
                className="flex-1 rounded-xl px-5 py-4 outline-none font-bold bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--foreground)] focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                placeholder="e.g., Marquee Players, Set 1 - Batsmen"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
              />
              <button
                onClick={handleCreateSlot}
                className="bg-[var(--accent)] text-[var(--background)] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-colors shadow-sm active:scale-95 hover:opacity-90">
                Add Slot
              </button>
            </div>

            <div className="space-y-3">
              {slots.map((s, index) => (
                <div
                  key={s.id}
                  className="bg-[var(--surface-2)] p-4 rounded-xl flex justify-between items-center border border-[var(--border-1)] shadow-sm transition-colors">
                  <span className="text-[var(--foreground)] font-bold flex items-center gap-3">
                    <span className="bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--text-muted)] w-6 h-6 rounded flex items-center justify-center text-[11px]">
                      {index + 1}
                    </span>
                    {s.name}
                  </span>
                  <button
                    onClick={() => handleDeleteSlot(s.id)}
                    className="text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg p-2 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="text-xs font-bold text-[var(--text-muted)] text-center py-6">
                  No slots created yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: DANGER ZONE */}
        {activeTab === "danger" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[var(--surface-1)] border border-[var(--accent)]/30 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
              <div>
                <h4 className="font-black text-sm uppercase text-[var(--foreground)] mb-1">
                  Sync Base Prices
                </h4>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  Update all players to Min Base Price (₹{config.min_base_price}
                  )
                </p>
              </div>
              <button
                onClick={handleSyncBasePrices}
                disabled={isProcessing}
                className="w-full md:w-auto px-6 py-3 rounded-xl text-[11px] font-black uppercase bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-1)] hover:border-[var(--accent)] transition-all whitespace-nowrap">
                Sync Prices
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="font-black text-sm uppercase text-red-500 mb-1">
                  Reset Auction Pool
                </h4>
                <p className="text-[11px] font-bold text-red-500/70 uppercase tracking-widest">
                  Unsell all players, remove from rosters, refund purses.
                </p>
              </div>
              <button
                onClick={handleResetAllPlayers}
                disabled={isProcessing}
                className="w-full md:w-auto px-6 py-3 rounded-xl text-[11px] font-black uppercase bg-red-500 text-white hover:opacity-90 transition-all shadow-lg shadow-red-500/20 whitespace-nowrap">
                Reset Auction
              </button>
            </div>
          </div>
        )}
      </div>

      <RegistrationQueueModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleApprovePlayers}
        tournamentId={tournamentId}
      />
    </div>
  );
}
