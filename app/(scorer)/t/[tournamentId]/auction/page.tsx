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
  Shuffle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import FeatureGate from "@/app/components/FeatureGate";

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

  // 📋 Roster Summary Modal State
  const [rosterTab, setRosterTab] = useState<
    "sold" | "unsold" | "pending" | null
  >(null);

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
  const isRestored = useRef(false);

  useEffect(() => {
    stateRef.current = { activePlayer, currentBid, highestBidder };
  }, [activePlayer, currentBid, highestBidder]);

  useEffect(() => {
    const channel = supabase.channel(`auction_${tournamentId}`);
    channelRef.current = channel;
    
    channel
    .on("broadcast", { event: "state_sync" }, ({ payload }) => {
        console.log("PAYLOAD RECEIVED IN OVERLAY:", payload);
        if (!isAdmin) {
          setActivePlayer(payload.activePlayer);
          setCurrentBid(payload.currentBid);
          setHighestBidder(payload.highestBidder);
        }
      })
      .on("broadcast", { event: "request_sync" }, () => {
        if (isAdmin) {
          channel.send({
            type: "broadcast",
            event: "state_sync",
            payload: stateRef.current,
          });
        }
      })
      .on("broadcast", { event: "global_refresh" }, () => {
        if (!isAdmin) fetchAuctionData();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !isAdmin) {
          channel.send({ type: "broadcast", event: "request_sync" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, tournamentId]);

  // LOAD ADMIN'S BACKUP FIRST
  useEffect(() => {
    if (isAdmin && !isRestored.current) {
      const savedState = localStorage.getItem(`auction_podium_${tournamentId}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setActivePlayer(parsed.player);
          setCurrentBid(parsed.bid);
          setHighestBidder(parsed.bidder);
        } catch (e) {
          console.error("Error loading auction state", e);
        }
      }
      isRestored.current = true;
    }
  }, [isAdmin, tournamentId]);

  // SAVE STATE
  useEffect(() => {
    if (isAdmin && isRestored.current) {
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

  // Slab math
  const currentIncrement = useMemo(() => {
    if (!config?.bid_slabs || config.bid_slabs.length === 0)
      return config?.bid_increment || 500;
    const activeSlab = [...config.bid_slabs]
      .sort((a, b) => a.max - b.max)
      .find((slab) => currentBid < slab.max);
    return activeSlab ? activeSlab.inc : config.bid_increment || 1000;
  }, [currentBid, config]);

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

      if (channelRef.current) {
        console.log("SENDING DIRECT BUY");

        const result = await channelRef.current.send({
          type: "broadcast",
          event: "state_sync",
          payload: {
            activePlayer: null,
            currentBid: finalPrice,
            highestBidder: team,
            isDirectBuy: true,
          },
        });

        console.log("DIRECT BUY RESULT", result);
      }

      // 1. Update internal state
      setDirectBuyModal({ isOpen: false, team: null });
      setActivePlayer(null);
      setHighestBidder(null);
      
      // 2. Fetch fresh data
      await fetchAuctionData();
      
      triggerGlobalRefresh();
    }
    setIsProcessing(false);
  };

  if (loading)
    return (
      <div className="h-[calc(100vh-65px)] bg-[var(--background)] flex items-center justify-center text-[var(--accent)] font-black animate-pulse text-2xl tracking-widest p-4 text-center">
        SYNCING AUCTION ENGINE...
      </div>
    );

  return (
    <FeatureGate
      tournamentId={tournamentId}
      requiredTier="pro"
      featureKey="auctions_enabled"
      featureName="Player Auctions"
    >
      <div className="h-[calc(100dvh-65px)] md:h-[calc(100vh-65px)] overflow-hidden bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col relative select-none">
        {/* 1. TOP CONTROL BAR */}
        <div className="bg-[var(--glass-bg)] border-b border-[var(--border-1)] p-4 flex justify-between items-center gap-4 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-3">
            <Gavel className="text-[var(--accent)] hidden sm:block" size={26} />
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest">
              Live Auction Arena
            </h1>
            {!isAdmin && (
              <span className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ml-2">
                Spectator
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* 📋 ROSTER MODAL TRIGGER */}
            <button
              onClick={() => setRosterTab("sold")}
              className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border-1)] px-4 py-2 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              📋 Roster Summary
            </button>

            {isAdmin && config?.allow_direct_buy && (
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <Zap size={14} className="text-amber-500" />
                <span className="text-xs font-black text-amber-500 uppercase">
                  Direct Buy On
                </span>
              </div>
            )}
            {isAdmin && (
              <Link
                href={`/t/${tournamentId}/auction/admin`}
                className="text-xs md:text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent)] uppercase tracking-widest transition-colors"
              >
                Admin
              </Link>
            )}
            <Link
              href={`/t/${tournamentId}`}
              className="text-xs md:text-sm font-bold text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors ml-2"
            >
              Exit
            </Link>
          </div>
        </div>

        {/* 2. UPPER TIER: LEFT QUEUE + CENTER PODIUM */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden border-b border-[var(--border-1)]">
          {/* LEFT: UPCOMING POOL */}
          <div className="w-full md:w-80 lg:w-96 bg-[var(--surface-1)] border-b md:border-b-0 md:border-r border-[var(--border-1)] flex flex-col h-[22vh] md:h-full shrink-0">
            <div className="p-3 bg-[var(--surface-2)] border-b border-[var(--border-1)] flex items-center justify-between shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                Up Next ({pendingPlayers.length})
              </span>
              <Filter size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
              {pendingPlayers.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all ${activePlayer?.id === p.id ? "bg-[var(--surface-2)] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-md" : "bg-[var(--surface-1)] border-[var(--border-1)] opacity-60"}`}
                >
                  <div
                    className="w-9 h-9 rounded-lg bg-cover bg-center bg-[var(--surface-2)] shrink-0 border"
                    style={{
                      backgroundImage: p.photo_url
                        ? `url(${p.photo_url})`
                        : "none",
                    }}
                  >
                    {!p.photo_url && (
                      <span className="flex items-center justify-center h-full font-black text-xs">
                        {p.full_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs md:text-sm truncate">
                      {p.full_name}
                    </p>
                    <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest">
                      {p.player_role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: THE PODIUM */}
          {/* 🔥 FIX 2: Added overflow-y-auto so IF a screen is microscopic, the inside scrolls, not the page */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--surface-1),_transparent)]">
            {!activePlayer ? (
              <div className="text-center max-w-md my-auto py-4">
                <Users
                  size={60}
                  className="mx-auto mb-3 text-[var(--text-muted)] opacity-30"
                />
                <h2 className="text-xl lg:text-3xl font-black uppercase tracking-widest text-[var(--text-muted)] mb-5">
                  Podium Vacant
                </h2>
                {isAdmin && (
                  <button
                    onClick={drawRandomPlayer}
                    disabled={pendingPlayers.length === 0 || isProcessing}
                    className="w-full bg-[var(--accent)] text-[var(--background)] py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl hover:opacity-90 active:scale-95 transition-all"
                  >
                    Draw Next Random Player
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full max-w-4xl flex flex-col md:flex-row flex-wrap justify-center gap-4 items-center animate-in zoom-in-95 duration-200">
                <div className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-8 mb-6">
                  <div
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-cover bg-center shadow-inner border border-[var(--border-1)] shrink-0 bg-[var(--surface-2)] flex items-center justify-center font-black text-4xl text-[var(--text-muted)]"
                    style={{
                      backgroundImage: activePlayer.photo_url
                        ? `url(${activePlayer.photo_url})`
                        : "none",
                    }}
                  >
                    {!activePlayer.photo_url &&
                      activePlayer.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <span className="bg-[var(--surface-2)] border border-[var(--border-1)] text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
                      Base: ₹
                      {activePlayer.base_price?.toLocaleString() ||
                        config?.min_base_price?.toLocaleString() ||
                        "1,000"}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight truncate mb-1">
                      {activePlayer.full_name}
                    </h2>
                    <p className="text-[var(--accent)] font-black text-xs sm:text-sm uppercase tracking-widest mb-3">
                      {activePlayer.player_role}
                    </p>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 text-xs font-bold text-[var(--text-muted)]">
                      <span className="bg-[var(--surface-2)] px-2.5 py-1 rounded-md border">
                        Bat: {activePlayer.batting_hand || "N/A"}
                      </span>
                      <span className="bg-[var(--surface-2)] px-2.5 py-1 rounded-md border">
                        Bowl: {activePlayer.bowling_style || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 📺 TIGHTER BID DISPLAY */}
                <div className="text-center mb-4">
                  <p className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
                    Current Total Bid
                  </p>
                  <div className="text-5xl sm:text-7xl font-black tracking-tight tabular-nums text-[var(--foreground)] leading-none mb-2 drop-shadow">
                    ₹{currentBid.toLocaleString("en-IN")}
                  </div>
                  {highestBidder ? (
                    <span className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-4 py-1 sm:px-6 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest animate-pulse inline-block">
                      Leading: {highestBidder.short_name}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest inline-block">
                      Awaiting First Bid
                    </span>
                  )}
                </div>

                {/* 🕹️ COMPACT HAMMER BUTTONS */}
                {isAdmin && (
                  <div className="flex gap-3 w-full max-w-md">
                    <button
                      onClick={() => markUnsold(activePlayer.id)}
                      disabled={isProcessing || !!highestBidder}
                      className="flex-1 bg-[var(--surface-2)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--border-1)] font-black py-3 sm:py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all disabled:opacity-40"
                    >
                      Pass / Unsold
                    </button>
                    <button
                      onClick={sellPlayer}
                      disabled={!highestBidder || isProcessing}
                      className="flex-1 bg-[var(--accent)] text-[var(--background)] font-black py-3 sm:py-3.5 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                    >
                      Drop Hammer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. LOWER TIER: HORIZONTAL SCROLL FRANCHISE DECK */}
        <div className="w-full bg-[var(--surface-1)] p-4 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-3 max-w-[1920px] mx-auto px-2">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
              Franchise Desks ({teams.length})
            </span>
            <span className="text-xs font-bold text-[var(--text-muted)] hidden md:block">
              ↔️ Scroll horizontally to view all franchises
            </span>
          </div>

          <div className="flex gap-4 pb-2 w-max items-stretch">
            {teams.map((team) => {
              const totalSpent =
                team.players?.reduce(
                  (sum: number, p: any) => sum + (p.sold_price || 0),
                  0,
                ) || 0;
              const totalPurse =
                team.purse_limit ||
                team.budget ||
                team.purse_balance + totalSpent;
              const remainingPurse = team.purse_balance;

              // 🧮 EXACT DB COLUMN MAPPING
              const maxSquad =
                config?.max_squad_size || config?.squad_limit || 15;
              const currSquad = team.players?.length || 0;
              const needed = Math.max(0, maxSquad - currSquad);
              const minBase = config?.min_base_price || 1000;
              const reserve = needed > 0 ? (needed - 1) * minBase : 0;
              const maxBid = Math.max(0, remainingPurse - reserve);

              const isHighest = highestBidder?.id === team.id;
              const cannotAfford =
                maxBid <
                (isHighest ? currentBid : currentBid + currentIncrement);

              return (
                <div
                  key={team.id}
                  className={`w-[250px] xl:w-[300px] shrink-0 bg-[var(--surface-2)] border rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all ${isHighest ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/50" : "border-[var(--border-1)]"}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 border-b border-[var(--border-1)] pb-2.5">
                      <h3
                        className="font-black text-sm xl:text-sm uppercase tracking-tight max-w-[180px]"
                        style={{ color: team.primary_color }}
                      >
                        {team.name}
                      </h3>
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-[var(--text-muted)] block">
                          Max Bid
                        </span>
                        <span
                          className={`text-sm xl:text-base font-black ${cannotAfford && !isHighest ? "text-red-400" : "text-emerald-400"}`}
                        >
                          ₹{maxBid.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs xl:text-sm font-bold mb-4 bg-[var(--surface-1)]/50 p-2.5 rounded-xl border border-[var(--border-1)]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Purse:</span>
                        <span>₹{totalPurse.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Spent:</span>
                        <span className="text-red-400">
                          ₹{totalSpent.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--border-1)] pt-1 font-black">
                        <span className="text-[var(--text-muted)]">Left:</span>
                        <span className="text-emerald-400">
                          ₹{remainingPurse.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-black text-[var(--text-muted)] mb-2.5 px-1">
                      <span>
                        {needed > 0
                          ? `Reserve: ₹${reserve.toLocaleString()}`
                          : "Goal Met"}
                      </span>
                      <span className="bg-[var(--surface-1)] px-2 py-0.5 rounded border">
                        {currSquad} / {maxSquad}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => placeBid(team)}
                          disabled={
                            !activePlayer ||
                            isHighest ||
                            isProcessing ||
                            cannotAfford
                          }
                          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${isHighest ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)] shadow-lg" : cannotAfford ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-[var(--surface-1)] hover:bg-[var(--surface-3)] border-[var(--border-1)] text-[var(--foreground)] active:scale-95"}`}
                        >
                          {isHighest
                            ? "Leading"
                            : cannotAfford
                              ? "No Funds"
                              : `Bid +₹${currentIncrement.toLocaleString()}`}
                        </button>

                        {config?.allow_direct_buy && (
                          <button
                            onClick={() => openDirectBuyModal(team)}
                            disabled={!activePlayer || isProcessing}
                            className="bg-amber-500/10 hover:bg-amber-500 hover:text-amber-950 text-amber-400 border border-amber-500/20 p-3 rounded-xl transition-all flex items-center justify-center shrink-0"
                            title="Direct Buy"
                          >
                            <Zap size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL 1: LIVE ROSTER DIRECTORY */}
        {rosterTab && (
          <RosterSummaryModal
            isOpen={!!rosterTab}
            initialTab={rosterTab}
            onClose={() => setRosterTab(null)}
            players={players}
            teams={teams}
          />
        )}

        {/* MODAL 2: CUSTOM DIRECT BUY */}
        {isAdmin &&
          directBuyModal.isOpen &&
          directBuyModal.team &&
          activePlayer && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-[var(--surface-1)] border border-[var(--border-1)] w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 overflow-hidden">
                <div className="bg-amber-500 p-4 md:p-6 text-amber-950 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Zap size={20} />
                    <h3 className="font-black uppercase tracking-widest text-sm md:text-base">
                      Offline Direct Buy
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      setDirectBuyModal({ isOpen: false, team: null })
                    }
                    className="p-1 hover:bg-amber-600/20 rounded-full"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-4 mb-6 md:mb-8 bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border-1)]">
                    <div
                      className="w-10 h-10 rounded-xl bg-cover bg-center bg-[var(--surface-3)] border shrink-0 flex items-center justify-center font-black"
                      style={{
                        backgroundImage: activePlayer.photo_url
                          ? `url(${activePlayer.photo_url})`
                          : "none",
                      }}
                    >
                      {!activePlayer.photo_url &&
                        activePlayer.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Assigning
                      </p>
                      <p className="font-black text-base leading-none mt-1 truncate">
                        {activePlayer.full_name}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 md:mb-8">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex justify-between">
                      <span>Final Sale Price (₹)</span>
                      <span>
                        Max: ₹
                        {directBuyModal.team.purse_balance.toLocaleString()}
                      </span>
                    </label>
                    <input
                      type="number"
                      autoFocus
                      value={manualPrice}
                      onChange={(e) => setManualPrice(Number(e.target.value))}
                      className={`w-full bg-[var(--surface-2)] border-2 rounded-xl py-3 px-4 text-xl font-black outline-none transition-colors ${Number(manualPrice) > directBuyModal.team.purse_balance ? "border-red-500 text-red-500" : "border-[var(--border-1)] text-[var(--foreground)] focus:border-amber-500"}`}
                    />
                    {Number(manualPrice) >
                      directBuyModal.team.purse_balance && (
                      <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-widest flex items-center gap-1">
                        <AlertCircle size={12} /> Exceeds Budget
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
                    className="w-full bg-amber-500 text-amber-950 font-black py-3 rounded-xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isProcessing
                      ? "Processing..."
                      : `Confirm Sale to ${directBuyModal.team.short_name}`}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </FeatureGate>
  );
}

// ==========================================
// 📋 STANDALONE ROSTER DIRECTORY MODAL
// ==========================================
function RosterSummaryModal({
  isOpen,
  initialTab,
  onClose,
  players,
  teams,
}: {
  isOpen: boolean;
  initialTab: any;
  onClose: () => void;
  players: any[];
  teams: any[];
}) {
  const [tab, setTab] = useState<"sold" | "unsold" | "pending">(
    initialTab || "sold",
  );

  const filtered = useMemo(() => {
    if (tab === "sold")
      return players.filter((p) => p.auction_status === "sold");
    if (tab === "unsold")
      return players.filter((p) => p.auction_status === "unsold");
    return players.filter(
      (p) => !p.auction_status || p.auction_status === "pending",
    );
  }, [players, tab]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.id, t]));
  }, [teams]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-[var(--surface-1)] border border-[var(--border-1)] w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95">
        <div className="p-6 bg-[var(--surface-2)] border-b border-[var(--border-1)] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Player Roster Directory
            </h2>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              Live snapshot of all auction participants
            </p>
          </div>

          <div className="flex bg-[var(--surface-1)] p-1 rounded-xl border border-[var(--border-1)]">
            {(["sold", "unsold", "pending"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === t ? "bg-[var(--accent)] text-[var(--background)] shadow" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                {t} (
                {
                  players.filter((p) =>
                    t === "pending"
                      ? !p.auction_status || p.auction_status === "pending"
                      : p.auction_status === t,
                  ).length
                }
                )
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center font-bold hover:bg-red-500/20 hover:text-red-400 absolute top-6 right-6 sm:static"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filtered.map((player) => {
            const franchise = player.team_id
              ? teamMap.get(player.team_id)
              : null;

            return (
              <div
                key={player.id}
                className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl bg-cover bg-center bg-[var(--surface-3)] border shrink-0 flex items-center justify-center font-black"
                    style={{
                      backgroundImage: player.photo_url
                        ? `url(${player.photo_url})`
                        : "none",
                    }}
                  >
                    {!player.photo_url && player.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-base uppercase text-[var(--foreground)]">
                      {player.full_name}
                    </h4>
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                      {player.player_role}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-6">
                  {tab === "sold" && franchise ? (
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md text-emerald-950 bg-emerald-400 inline-block mb-1">
                        Sold: ₹{player.sold_price?.toLocaleString("en-IN")}
                      </span>
                      <p className="text-xs font-black uppercase text-[var(--text-muted)]">
                        {franchise.short_name}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                        Base Price
                      </span>
                      <span className="text-sm font-black text-[var(--foreground)]">
                        ₹{player.base_price?.toLocaleString("en-IN") || "1,000"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[var(--text-muted)] font-black text-lg uppercase tracking-widest">
              No players found in this list
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
