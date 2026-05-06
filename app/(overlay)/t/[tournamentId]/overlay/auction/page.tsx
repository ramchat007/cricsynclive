"use client";
import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Gavel,
  Trophy,
  AlertCircle,
  Star,
  Sparkles,
  XCircle,
} from "lucide-react";

export default function AuctionOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  // --- Broadcast Presentation State ---
  // Instead of just showing exactly what the admin sees, we manage a "Display State"
  // so we can freeze the screen for 10s after a player is sold.
  const [podiumState, setPodiumState] = useState<
    "standby" | "active" | "sold" | "unsold"
  >("standby");
  const [displayPlayer, setDisplayPlayer] = useState<any | null>(null);
  const [displayBid, setDisplayBid] = useState<number>(0);
  const [displayBidder, setDisplayBidder] = useState<any | null>(null);

  // Refs for tracking state inside Websocket Callbacks without stale closures
  const podiumStateRef = useRef<string>("standby");
  const displayBidderRef = useRef<any | null>(null);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ticker State
  const [soldPlayers, setSoldPlayers] = useState<any[]>([]);
  const [topBuysByTeam, setTopBuysByTeam] = useState<Record<string, number>>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sold players and calculate the top buy for EACH team
  const fetchSoldPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select(
        `
        id, 
        full_name, 
        sold_price,
        team_id,
        team:teams ( short_name )
      `,
      )
      .eq("tournament_id", tournamentId)
      .eq("auction_status", "sold")
      .order("sold_price", { ascending: false });

    if (data) {
      const topBuys: Record<string, number> = {};
      data.forEach((p) => {
        if (p.team_id) {
          if (!topBuys[p.team_id] || p.sold_price > topBuys[p.team_id]) {
            topBuys[p.team_id] = p.sold_price;
          }
        }
      });
      setTopBuysByTeam(topBuys);
      setSoldPlayers(data);
    }
  };

  // ==========================================
  // REAL-TIME WEBSOCKET SYNC ENGINE
  // ==========================================
  useEffect(() => {
    if (!tournamentId) {
      setError("Tournament ID is missing from the URL.");
      return;
    }

    fetchSoldPlayers();

    const channel = supabase.channel(`auction_${tournamentId}`);

    channel
      .on("broadcast", { event: "state_sync" }, ({ payload }) => {
        const { activePlayer, currentBid, highestBidder } = payload;

        // SCENARIO 1: A player is on the podium (Active Bidding)
        if (activePlayer) {
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          podiumStateRef.current = "active";
          setPodiumState("active");
          setDisplayPlayer(activePlayer);
          setDisplayBid(currentBid);
          setDisplayBidder(highestBidder);
          displayBidderRef.current = highestBidder;
        }
        // SCENARIO 2: Admin cleared the podium (Sold or Unsold)
        else if (!activePlayer && podiumStateRef.current === "active") {
          if (displayBidderRef.current) {
            // Player was SOLD
            podiumStateRef.current = "sold";
            setPodiumState("sold");

            // Hold screen for 10 seconds, then standby
            clearTimerRef.current = setTimeout(() => {
              podiumStateRef.current = "standby";
              setPodiumState("standby");
              setDisplayPlayer(null);
            }, 10000);
          } else {
            // Player was UNSOLD
            podiumStateRef.current = "unsold";
            setPodiumState("unsold");

            // Hold screen for 5 seconds, then standby
            clearTimerRef.current = setTimeout(() => {
              podiumStateRef.current = "standby";
              setPodiumState("standby");
              setDisplayPlayer(null);
            }, 5000);
          }
        }
        setLoading(false);
      })
      .on("broadcast", { event: "global_refresh" }, () => {
        // Admin finalized a sale, refresh the ticker
        fetchSoldPlayers();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request_sync" });
          setTimeout(() => setLoading(false), 3000);
        }
        if (status === "CHANNEL_ERROR") {
          setError("Failed to connect to the live auction stream.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [tournamentId]);

  if (error) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black font-sans text-white p-8">
        <AlertCircle size={64} className="text-red-500 mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-widest text-red-500 mb-2">
          Connection Error
        </h1>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center font-black text-white text-3xl tracking-widest animate-pulse bg-transparent">
        <span className="bg-black/60 px-8 py-4 rounded-2xl backdrop-blur-md border border-white/10">
          SYNCING STREAM...
        </span>
      </div>
    );
  }

  // Define visual styling based on the current broadcast state
  let cardBorder = "border-white/10";
  let bannerBg = "bg-slate-800 text-slate-400";
  let bannerText = "Standby";

  if (podiumState === "active") {
    bannerBg = "bg-amber-500 text-amber-950 animate-pulse";
    bannerText = "On The Block";
  } else if (podiumState === "sold") {
    cardBorder = "border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.4)]";
    bannerBg = "bg-emerald-500 text-emerald-950";
    bannerText = "★★★ PLAYER SOLD ★★★";
  } else if (podiumState === "unsold") {
    cardBorder = "border-red-500/50 shadow-[0_0_80px_rgba(239,68,68,0.4)]";
    bannerBg = "bg-red-500 text-red-950";
    bannerText = "UNSOLD";
  }

  return (
    <>
      <style>
        {`
          html, body, #root {
            background-color: transparent !important;
            background: transparent !important;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          @keyframes scrollTicker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker {
            display: flex;
            width: max-content;
            animation: scrollTicker 45s linear infinite;
          }
        `}
      </style>

      <div className="w-screen h-screen overflow-hidden bg-transparent font-sans text-white relative">
        {/* =========================================
            LEFT SIDE: FLOATING PLAYER CARD
            ========================================= */}
        <div
          className={`absolute top-12 left-12 w-[420px] bg-slate-950/90 backdrop-blur-2xl border-[3px] rounded-[2.5rem] flex flex-col z-40 overflow-hidden transition-all duration-700 ${cardBorder}`}>
          {/* Status Banner */}
          <div
            className={`text-center py-4 font-black uppercase tracking-[0.4em] text-sm transition-colors shrink-0 ${bannerBg}`}>
            {bannerText}
          </div>

          {displayPlayer ? (
            <div className="p-8 flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Profile Image */}
              <div className="relative shrink-0 mb-6">
                <div
                  className={`w-56 h-56 rounded-3xl bg-slate-800 bg-cover bg-center shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center text-7xl font-black text-slate-500 border-4 ${podiumState === "sold" ? "border-emerald-500" : podiumState === "unsold" ? "border-red-500" : "border-white/10"}`}
                  style={{
                    backgroundImage: displayPlayer.photo_url
                      ? `url(${displayPlayer.photo_url})`
                      : "none",
                  }}>
                  {!displayPlayer.photo_url &&
                    displayPlayer.full_name?.charAt(0)}
                </div>
                {displayPlayer.is_icon && (
                  <div className="absolute -top-3 -right-3 bg-amber-500 text-amber-950 px-4 py-1.5 rounded-xl font-black uppercase text-xs shadow-2xl border-2 border-black rotate-6 flex items-center gap-1">
                    <Star size={12} className="fill-amber-950" /> Icon
                  </div>
                )}
              </div>

              <h2 className="text-4xl font-black uppercase tracking-tighter text-center mb-3 drop-shadow-lg leading-tight break-words px-2 w-full text-white">
                {displayPlayer.full_name}
              </h2>

              <span className="inline-block px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400 mb-6">
                {displayPlayer.player_role || "Player"}
              </span>

              {/* Price Container */}
              <div
                className={`w-full p-6 rounded-3xl border shadow-inner text-center transition-colors duration-500 ${podiumState === "sold" ? "bg-emerald-500/10 border-emerald-500/30" : podiumState === "unsold" ? "bg-red-500/10 border-red-500/30" : "bg-black/40 border-white/5"}`}>
                {podiumState === "unsold" ? (
                  <div className="py-4">
                    <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                    <p className="text-red-400 font-black tracking-widest uppercase">
                      Passed by all franchises
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest mb-2 text-slate-400">
                      {podiumState === "sold" ? "Sold For" : "Current Bid"}
                    </p>
                    <p
                      className={`text-6xl font-black tracking-tighter drop-shadow-md tabular-nums ${podiumState === "sold" ? "text-emerald-400" : "text-amber-400"}`}>
                      ₹{displayBid.toLocaleString("en-IN")}
                    </p>

                    {/* Leading / Winning Team */}
                    {displayBidder ? (
                      <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
                        <Trophy
                          size={24}
                          className={
                            podiumState === "sold"
                              ? "text-emerald-400"
                              : "text-amber-400 shrink-0"
                          }
                        />
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1.5">
                            {podiumState === "sold"
                              ? "Bought By"
                              : "Leading Bidder"}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full shadow-sm shrink-0"
                              style={{
                                backgroundColor: displayBidder.primary_color,
                              }}
                            />
                            <p className="text-xl font-black text-white truncate max-w-[200px] leading-none uppercase">
                              {displayBidder.short_name || displayBidder.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 pt-6 border-t border-white/10 text-slate-500 font-bold text-sm uppercase tracking-widest animate-in fade-in duration-300">
                        Awaiting Opening Bid
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Batting
                  </p>
                  <p className="text-sm font-black text-white truncate">
                    {displayPlayer.batting_hand || "-"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Bowling
                  </p>
                  <p className="text-sm font-black text-white truncate">
                    {displayPlayer.bowling_style || "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 opacity-30 animate-in fade-in duration-500">
              <Gavel size={80} className="mb-6" />
              <p className="font-black text-2xl uppercase tracking-widest text-center leading-relaxed">
                Waiting For <br /> Auctioneer
              </p>
            </div>
          )}
        </div>

        {/* =========================================
            BOTTOM SCROLLING TICKER
            ========================================= */}
        {soldPlayers.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full h-12 bg-slate-950/95 border-t border-white/10 flex items-center z-50 overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {/* Static Label on the left */}
            <div className="bg-amber-500 text-amber-950 h-full px-6 flex items-center justify-center font-black uppercase tracking-widest text-[10px] z-20 shadow-[10px_0_20px_rgba(0,0,0,0.5)] shrink-0">
              Players Sold ({soldPlayers.length})
            </div>

            {/* Scrolling Content */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <div className="animate-ticker flex items-center">
                {/* Loop array twice for seamless marquee effect */}
                {[...soldPlayers, ...soldPlayers].map((p, idx) => {
                  // HIGHLIGHT LOGIC: Is this player the top buy for their specific team?
                  const isTopBuyForTeam =
                    p.team_id &&
                    topBuysByTeam[p.team_id] &&
                    p.sold_price === topBuysByTeam[p.team_id] &&
                    p.sold_price > 0;

                  const teamName = p.team
                    ? Array.isArray(p.team)
                      ? p.team[0]?.short_name
                      : p.team?.short_name
                    : "Unknown Team";

                  return (
                    <div
                      key={`${p.id}-${idx}`}
                      className="flex items-center mx-6 whitespace-nowrap">
                      {isTopBuyForTeam && (
                        <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mr-3 border border-amber-500/30">
                          <Sparkles size={10} /> {teamName} Top Buy
                        </span>
                      )}

                      <span
                        className={`font-bold text-sm ${isTopBuyForTeam ? "text-amber-400" : "text-white"}`}>
                        {p.full_name}
                      </span>

                      <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest mx-2">
                        → {teamName}
                      </span>

                      <span
                        className={`font-black tabular-nums ${isTopBuyForTeam ? "text-amber-400" : "text-emerald-400"}`}>
                        ₹{p.sold_price?.toLocaleString("en-IN")}
                      </span>

                      {/* Separator */}
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 ml-8" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
