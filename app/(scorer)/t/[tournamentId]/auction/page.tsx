"use client";
import { useEffect, useState, useMemo, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Gavel,
  CheckCircle2,
  XCircle,
  Filter,
  Zap,
  ChevronRight,
  Shuffle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function AuctionConsole({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  // Security & Role State
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  // Live Auction State
  const [activePlayer, setActivePlayer] = useState<any | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState<any | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("all");

  // Custom Direct Buy Modal State
  const [directBuyModal, setDirectBuyModal] = useState<{
    isOpen: boolean;
    team: any | null;
  }>({ isOpen: false, team: null });
  const [manualPrice, setManualPrice] = useState<number | "">("");

  // ==========================================
  // REAL-TIME WEBSOCKET SYNC ENGINE
  // ==========================================
  const channelRef = useRef<any>(null);
  const stateRef = useRef({ activePlayer, currentBid, highestBidder });

  // Keep a ref updated so the Admin can respond to new spectators with fresh data
  useEffect(() => {
    stateRef.current = { activePlayer, currentBid, highestBidder };
  }, [activePlayer, currentBid, highestBidder]);

  useEffect(() => {
    const channel = supabase.channel(`auction_${tournamentId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "state_sync" }, ({ payload }) => {
        // Only Spectators listen to these updates (Admin dictates the state)
        if (!isAdmin) {
          setActivePlayer(payload.activePlayer);
          setCurrentBid(payload.currentBid);
          setHighestBidder(payload.highestBidder);
        }
      })
      .on("broadcast", { event: "request_sync" }, () => {
        // If a new Spectator joins, Admin beams the current podium data to them
        if (isAdmin) {
          channel.send({
            type: "broadcast",
            event: "state_sync",
            payload: stateRef.current,
          });
        }
      })
      .on("broadcast", { event: "global_refresh" }, () => {
        // Admin tells all Spectators to re-fetch DB data (budgets/pool) after a sale
        if (!isAdmin) fetchAuctionData();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !isAdmin) {
          // When Spectator connects, ask the Admin for the live state
          channel.send({ type: "broadcast", event: "request_sync" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, tournamentId]);

  // Admin Auto-Broadcaster (Beams state to all devices on every click)
  useEffect(() => {
    if (isAdmin) {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "state_sync",
          payload: { activePlayer, currentBid, highestBidder },
        });
      }
      if (activePlayer) {
        localStorage.setItem(
          `auction_podium_${tournamentId}`,
          JSON.stringify({
            player: activePlayer,
            bid: currentBid,
            bidder: highestBidder,
          }),
        );
      } else {
        localStorage.removeItem(`auction_podium_${tournamentId}`);
      }
    }
  }, [activePlayer, currentBid, highestBidder, isAdmin, tournamentId]);

  // Load Admin's local backup on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`auction_podium_${tournamentId}`);
    if (savedState && isAdmin) {
      try {
        const parsed = JSON.parse(savedState);
        setActivePlayer(parsed.player);
        setCurrentBid(parsed.bid);
        setHighestBidder(parsed.bidder);
      } catch (e) {
        console.error("Error loading auction state", e);
      }
    }
  }, [tournamentId, isAdmin]);
  // ==========================================

  useEffect(() => {
    checkAccessAndFetch();
  }, [tournamentId]);

  const checkAccessAndFetch = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data: tourneyData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (tourneyData) setConfig(tourneyData);

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (
        tourneyData?.owner_id === session.user.id ||
        profile?.role === "super_admin"
      ) {
        setIsAdmin(true);
      }
    }

    await fetchAuctionData();
    setLoading(false);
  };

  const fetchAuctionData = async () => {
    const { data: tData } = await supabase
      .from("teams")
      .select("*, players(*)")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    if (tData) setTeams(tData);

    const { data: sData } = await supabase
      .from("auction_slots")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("order_index");
    if (sData) setSlots(sData);

    const { data: pData } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    if (pData) setPlayers(pData);
  };

  const triggerGlobalRefresh = () => {
    if (channelRef.current)
      channelRef.current.send({ type: "broadcast", event: "global_refresh" });
  };

  // --- LOGIC: Bid Slab Calculation ---
  const currentIncrement = useMemo(() => {
    if (!config?.bid_slabs || config.bid_slabs.length === 0)
      return config?.bid_increment || 500;
    const activeSlab = [...config.bid_slabs]
      .sort((a, b) => a.max - b.max)
      .find((slab) => currentBid < slab.max);
    return activeSlab ? activeSlab.inc : config.bid_increment || 1000;
  }, [currentBid, config]);

  // --- LOGIC: Filter Pending Players for the Sidebar & Draw ---
  const pendingPlayers = useMemo(() => {
    let pool = players.filter(
      (p) => p.auction_status === "pending" || !p.auction_status,
    );
    if (selectedSlotId === "unassigned")
      pool = pool.filter((p) => !p.auction_slot_id);
    else if (selectedSlotId !== "all")
      pool = pool.filter((p) => p.auction_slot_id === selectedSlotId);
    return pool;
  }, [players, selectedSlotId]);

  // --- FEATURE: RANDOM DRAW & AUTO-UNSOLD ---
  const drawRandomPlayer = async () => {
    if (!isAdmin) return;

    if (activePlayer) {
      if (
        !window.confirm(
          `Mark ${activePlayer.full_name} as UNSOLD and draw next?`,
        )
      )
        return;
      await markUnsold(activePlayer.id);
    }

    const available = pendingPlayers.filter((p) => p.id !== activePlayer?.id);

    if (available.length === 0) {
      alert("No more pending players available in this set!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const selectedPlayer = available[randomIndex];

    setActivePlayer(selectedPlayer);
    setCurrentBid(selectedPlayer.base_price || config?.min_base_price || 1000);
    setHighestBidder(null);
  };

  // --- BIDDING ACTIONS ---
  const placeBid = (team: any) => {
    if (!isAdmin || !activePlayer) return;

    const newBid = highestBidder ? currentBid + currentIncrement : currentBid;

    if (newBid > team.purse_balance) {
      alert(`${team.short_name} has insufficient funds for this bid!`);
      return;
    }

    setCurrentBid(newBid);
    setHighestBidder(team);
  };

  const sellPlayer = async () => {
    if (!isAdmin || !activePlayer || !highestBidder) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("players")
      .update({
        team_id: highestBidder.id,
        sold_price: currentBid,
        auction_status: "sold",
      })
      .eq("id", activePlayer.id);

    if (!error) {
      await supabase
        .from("teams")
        .update({ purse_balance: highestBidder.purse_balance - currentBid })
        .eq("id", highestBidder.id);
      await supabase.from("auction_bids").insert({
        tournament_id: tournamentId,
        player_id: activePlayer.id,
        team_id: highestBidder.id,
        amount: currentBid,
      });
      setActivePlayer(null);
      setHighestBidder(null);
      await fetchAuctionData();
      triggerGlobalRefresh();
    }
    setIsProcessing(false);
  };

  const markUnsold = async (playerIdToMark: string = activePlayer?.id) => {
    if (!isAdmin || !playerIdToMark) return;
    setIsProcessing(true);
    await supabase
      .from("players")
      .update({ auction_status: "unsold" })
      .eq("id", playerIdToMark);
    if (activePlayer?.id === playerIdToMark) {
      setActivePlayer(null);
      setHighestBidder(null);
    }
    await fetchAuctionData();
    triggerGlobalRefresh();
    setIsProcessing(false);
  };

  // --- FEATURE: BEAUTIFUL CUSTOM DIRECT BUY MODAL ---
  const openDirectBuyModal = (team: any) => {
    setDirectBuyModal({ isOpen: true, team });
    setManualPrice(currentBid);
  };

  const confirmDirectBuy = async () => {
    const team = directBuyModal.team;
    if (!isAdmin || !activePlayer || !team) return;

    const finalPrice = Number(manualPrice);
    if (isNaN(finalPrice) || finalPrice < 0)
      return alert("Please enter a valid numeric price.");

    if (finalPrice > team.purse_balance) {
      alert(
        `${team.short_name} only has ₹${team.purse_balance.toLocaleString()} remaining.`,
      );
      return;
    }

    setIsProcessing(true);
    const { error } = await supabase
      .from("players")
      .update({
        team_id: team.id,
        sold_price: finalPrice,
        auction_status: "sold",
      })
      .eq("id", activePlayer.id);

    if (!error) {
      await supabase
        .from("teams")
        .update({ purse_balance: team.purse_balance - finalPrice })
        .eq("id", team.id);
      await supabase.from("auction_bids").insert({
        tournament_id: tournamentId,
        player_id: activePlayer.id,
        team_id: team.id,
        amount: finalPrice,
      });

      setDirectBuyModal({ isOpen: false, team: null });
      setActivePlayer(null);
      setHighestBidder(null);
      await fetchAuctionData();
      triggerGlobalRefresh();
    }
    setIsProcessing(false);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center accent-text font-black animate-pulse text-2xl tracking-widest">
        SYNCING AUCTION ENGINE...
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col transition-colors duration-300 relative">
      {/* HEADER */}
      <div className="bg-[var(--glass-bg)] border-b border-[var(--border-1)] p-4 flex justify-between items-center backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Gavel className="text-[var(--accent)]" size={24} />
          <h1 className="text-xl font-black uppercase tracking-widest">
            Live Auction Console
          </h1>
          {!isAdmin && (
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ml-2">
              Spectator View
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          {isAdmin && config?.allow_direct_buy && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Zap size={14} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase">
                Direct Buy Active
              </span>
            </div>
          )}
          {isAdmin && (
            <Link
              href={`/t/${tournamentId}/auction/admin`}
              className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] uppercase tracking-widest transition-colors">
              Admin
            </Link>
          )}
          <Link
            href={`/t/${tournamentId}`}
            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] uppercase tracking-widest transition-colors">
            Exit
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Player Preview Pool */}
        <div className="w-80 bg-[var(--surface-1)] border-r border-[var(--border-1)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border-1)] bg-[var(--surface-2)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Upcoming Queue ({pendingPlayers.length})
              </h2>
              <Filter size={14} className="text-[var(--text-muted)]" />
            </div>
            {isAdmin ? (
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full bg-[var(--surface-3)] border border-[var(--border-1)] text-[var(--foreground)] text-xs font-bold p-2.5 rounded-xl outline-none focus:border-[var(--accent)]">
                <option value="all">All Rounds</option>
                <option value="unassigned">Unassigned Players</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-bold text-[var(--text-muted)] py-2">
                Filtering managed by Auctioneer
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar opacity-70 pointer-events-none">
            {pendingPlayers.map((p) => (
              <div
                key={p.id}
                className={`bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 flex items-center gap-3 transition-all ${activePlayer?.id === p.id ? "ring-2 ring-[var(--accent)] opacity-100 shadow-md" : "grayscale"}`}>
                <div
                  className="w-10 h-10 rounded-lg bg-[var(--surface-3)] bg-cover bg-center shrink-0 border border-[var(--border-1)] flex items-center justify-center font-black text-xs"
                  style={{
                    backgroundImage: p.photo_url
                      ? `url(${p.photo_url})`
                      : "none",
                  }}>
                  {!p.photo_url && p.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.full_name}</p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {p.player_role}
                  </p>
                </div>
              </div>
            ))}
            {pendingPlayers.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-sm font-bold pt-10">
                Queue is empty.
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: The Hammer Podium */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--surface-1),_transparent)] opacity-60 z-0"></div>

          {!activePlayer ? (
            <div className="text-center opacity-70 flex flex-col items-center z-10">
              <Users
                size={100}
                className="mb-6 opacity-20 text-[var(--foreground)]"
              />
              <h2 className="text-3xl font-black uppercase tracking-widest text-[var(--foreground)] mb-8">
                Podium Ready
              </h2>

              {isAdmin ? (
                <button
                  onClick={drawRandomPlayer}
                  disabled={pendingPlayers.length === 0 || isProcessing}
                  className="accent-bg text-[var(--background)] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 shadow-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                  <Shuffle size={20} /> Draw Next Random Player
                </button>
              ) : (
                <p className="text-lg font-bold text-[var(--text-muted)]">
                  Waiting for Auctioneer to draw...
                </p>
              )}
            </div>
          ) : (
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300 z-10">
              <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2.5rem] p-8 shadow-2xl flex items-center gap-8 mb-8 relative overflow-hidden">
                <div
                  className="w-48 h-48 rounded-3xl bg-[var(--surface-3)] bg-cover bg-center shrink-0 ring-4 ring-[var(--surface-2)] shadow-xl flex items-center justify-center font-black text-5xl text-[var(--text-muted)]"
                  style={{
                    backgroundImage: activePlayer.photo_url
                      ? `url(${activePlayer.photo_url})`
                      : "none",
                  }}>
                  {!activePlayer.photo_url && activePlayer.full_name?.charAt(0)}
                </div>

                <div className="flex-1">
                  <span className="bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border-1)] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">
                    Base: ₹
                    {activePlayer.base_price?.toLocaleString() ||
                      config?.min_base_price?.toLocaleString()}
                  </span>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2 text-[var(--foreground)]">
                    {activePlayer.full_name}
                  </h2>
                  <p className="accent-text font-bold uppercase tracking-widest text-sm mb-6">
                    {activePlayer.player_role}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Batting
                      </p>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {activePlayer.batting_hand || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Bowling
                      </p>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {activePlayer.bowling_style || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  Current Bid
                </p>
                <div className="text-8xl font-black text-[var(--foreground)] tracking-tighter mb-4 tabular-nums drop-shadow-sm">
                  ₹{currentBid.toLocaleString("en-IN")}
                </div>
                {highestBidder ? (
                  <div className="inline-flex items-center gap-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-8 py-3 rounded-full animate-bounce">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: highestBidder.primary_color }}
                    />
                    <span className="font-black accent-text uppercase tracking-widest text-lg">
                      {highestBidder.short_name}
                    </span>
                  </div>
                ) : (
                  <div className="inline-block bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border-1)] px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest">
                    Awaiting Opening Bid
                  </div>
                )}
              </div>

              {/* ADMIN CONTROLS ONLY */}
              {isAdmin && (
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={drawRandomPlayer}
                    disabled={isProcessing || !!highestBidder}
                    className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-1)] text-[var(--text-muted)] font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs active:scale-95 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    <Shuffle size={16} /> Draw Next
                  </button>
                  <button
                    onClick={() => markUnsold(activePlayer.id)}
                    disabled={isProcessing || !!highestBidder}
                    className="bg-[var(--surface-2)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-[var(--border-1)] text-[var(--text-muted)] font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-xs active:scale-95 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    <XCircle size={16} /> Pass / Unsold
                  </button>
                  <button
                    onClick={sellPlayer}
                    disabled={!highestBidder || isProcessing}
                    className="accent-bg text-[var(--background)] disabled:opacity-50 font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs shadow-xl hover:opacity-90 active:scale-95">
                    <CheckCircle2 size={16} /> Sell Player
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Franchise Bidding Controls */}
        <div className="w-[400px] bg-[var(--surface-1)] border-l border-[var(--border-1)] flex flex-col z-10">
          <div className="p-4 border-b border-[var(--border-1)] bg-[var(--surface-2)]">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Franchise Desk
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {teams.map((team) => {
              const alreadyBoughtInSlot =
                config?.limit_one_per_slot &&
                activePlayer?.auction_slot_id &&
                team.players?.some(
                  (p: any) =>
                    p.auction_slot_id === activePlayer.auction_slot_id,
                );

              const isHighestBidder = highestBidder?.id === team.id;

              return (
                <div
                  key={team.id}
                  className={`bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 shadow-sm transition-opacity ${alreadyBoughtInSlot ? "opacity-40" : ""}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: team.primary_color,
                          boxShadow: `0 0 10px ${team.primary_color}`,
                        }}
                      />
                      <h3 className="font-black uppercase tracking-tighter text-lg leading-none text-[var(--foreground)]">
                        {team.short_name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-black ${team.purse_balance < 20000 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                        ₹{team.purse_balance.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* ADMIN BIDDING PADDLES */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => placeBid(team)}
                        disabled={
                          !activePlayer ||
                          alreadyBoughtInSlot ||
                          isHighestBidder ||
                          isProcessing
                        }
                        className={`flex-1 disabled:opacity-50 text-xs font-black py-4 rounded-xl transition-all border shadow-sm active:scale-95 ${isHighestBidder ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30" : "bg-[var(--surface-1)] hover:bg-[var(--surface-3)] text-[var(--foreground)] border-[var(--border-1)]"}`}>
                        {isHighestBidder
                          ? "LEADING BID"
                          : `BID +₹${currentIncrement.toLocaleString()}`}
                      </button>

                      {/* Direct Buy is always visible for Admin, clearly labeled as Buy */}
                      {config?.allow_direct_buy && (
                        <button
                          onClick={() => openDirectBuyModal(team)}
                          disabled={
                            !activePlayer || alreadyBoughtInSlot || isProcessing
                          }
                          className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-4 rounded-xl hover:bg-amber-500 hover:text-amber-950 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-1"
                          title="Offline / Direct Assign">
                          <Zap size={14} />
                          <span className="text-[10px] font-black uppercase">
                            Buy
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {alreadyBoughtInSlot && (
                    <p className="text-[8px] font-black text-amber-500 uppercase mt-2 text-center tracking-widest">
                      Set Limit Reached
                    </p>
                  )}
                </div>
              );
            })}
            {teams.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-sm font-bold pt-10">
                No franchises registered.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOM DIRECT BUY MODAL (Admin Only) */}
      {isAdmin &&
        directBuyModal.isOpen &&
        directBuyModal.team &&
        activePlayer && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[var(--overlay-bg)] backdrop-blur-md animate-in fade-in">
            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 overflow-hidden">
              {/* Header */}
              <div className="bg-amber-500 p-6 text-amber-950 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap size={20} />
                  <h3 className="font-black uppercase tracking-widest">
                    Offline Direct Buy
                  </h3>
                </div>
                <button
                  onClick={() =>
                    setDirectBuyModal({ isOpen: false, team: null })
                  }
                  className="p-1 hover:bg-amber-600/20 rounded-full">
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)]">
                  <div
                    className="w-12 h-12 rounded-xl bg-[var(--surface-3)] bg-cover bg-center shrink-0 border border-[var(--border-1)] flex items-center justify-center font-black"
                    style={{
                      backgroundImage: activePlayer.photo_url
                        ? `url(${activePlayer.photo_url})`
                        : "none",
                    }}>
                    {!activePlayer.photo_url &&
                      activePlayer.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      Assigning
                    </p>
                    <p className="font-black text-[var(--foreground)] text-lg leading-none mt-1">
                      {activePlayer.full_name}
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex justify-between">
                    <span>Final Sale Price (₹)</span>
                    <span className="text-[var(--foreground)]">
                      Max: ₹{directBuyModal.team.purse_balance.toLocaleString()}
                    </span>
                  </label>
                  <input
                    type="number"
                    autoFocus
                    value={manualPrice}
                    onChange={(e) => setManualPrice(Number(e.target.value))}
                    className={`w-full bg-[var(--surface-2)] border-2 rounded-xl py-4 px-5 text-2xl font-black outline-none transition-colors ${Number(manualPrice) > directBuyModal.team.purse_balance ? "border-[var(--danger)] text-[var(--danger)]" : "border-[var(--border-1)] text-[var(--foreground)] focus:border-amber-500"}`}
                  />
                  {Number(manualPrice) > directBuyModal.team.purse_balance && (
                    <p className="text-[10px] font-bold text-[var(--danger)] mt-2 uppercase tracking-widest flex items-center gap-1">
                      <AlertCircle size={12} /> Exceeds Available Budget
                    </p>
                  )}
                </div>

                <button
                  onClick={confirmDirectBuy}
                  disabled={
                    isProcessing ||
                    !manualPrice ||
                    Number(manualPrice) <= 0 ||
                    Number(manualPrice) > directBuyModal.team.purse_balance
                  }
                  className="w-full bg-amber-500 text-amber-950 font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                  {isProcessing
                    ? "Processing..."
                    : `Confirm Sale to ${directBuyModal.team.short_name}`}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
