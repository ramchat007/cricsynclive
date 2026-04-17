"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Gavel,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function AuctionConsole({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auction State
  const [activePlayer, setActivePlayer] = useState<any | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState<any | null>(null);

  useEffect(() => {
    fetchAuctionData();
  }, [tournamentId]);

  const fetchAuctionData = async () => {
    // Fetch Teams with their purses
    const { data: tData } = await supabase
      .from("teams")
      .select("*, players(*)")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    if (tData) setTeams(tData);

    // Fetch Players who are approved but NOT sold yet
    const { data: pData } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .neq("auction_status", "sold")
      .order("created_at", { ascending: true });
    if (pData) setPlayers(pData);

    setLoading(false);
  };

  const bringToHammer = (player: any) => {
    setActivePlayer(player);
    setCurrentBid(player.base_price || 1000); // Default base price
    setHighestBidder(null);
  };

  const placeBid = (team: any, increment: number) => {
    if (!activePlayer) return;

    const newBid = highestBidder ? currentBid + increment : currentBid; // First bid is base price

    // Validate Purse
    if (newBid > team.purse_balance) {
      alert(`${team.short_name} does not have enough funds for this bid!`);
      return;
    }

    setCurrentBid(newBid);
    setHighestBidder(team);
  };

  const sellPlayer = async () => {
    if (!activePlayer || !highestBidder) return;

    // 1. Update Player Record
    await supabase
      .from("players")
      .update({
        team_id: highestBidder.id,
        sold_price: currentBid,
        auction_status: "sold",
      })
      .eq("id", activePlayer.id);

    // 2. Deduct from Team Purse
    await supabase
      .from("teams")
      .update({
        purse_balance: highestBidder.purse_balance - currentBid,
      })
      .eq("id", highestBidder.id);

    // 3. Log the Bid (Ledger)
    await supabase.from("auction_bids").insert({
      tournament_id: tournamentId,
      player_id: activePlayer.id,
      team_id: highestBidder.id,
      amount: currentBid,
    });

    // Reset and Refresh
    setActivePlayer(null);
    fetchAuctionData();
  };

  const markUnsold = async () => {
    if (!activePlayer) return;
    await supabase
      .from("players")
      .update({ auction_status: "unsold" })
      .eq("id", activePlayer.id);
    setActivePlayer(null);
    fetchAuctionData();
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-500 font-black animate-pulse text-2xl tracking-widest">
        INITIALIZING AUCTION ENGINE...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* HEADER */}
      <div className="bg-black/50 border-b border-slate-800 p-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Gavel className="text-teal-500" size={24} />
          <h1 className="text-xl font-black uppercase tracking-widest">
            Live Auction Console
          </h1>
        </div>
        <Link
          href={`/t/${tournamentId}`}
          className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
          Exit to Hub
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Player Queue */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Player Pool
            </h2>
            <p className="text-xl font-black">{players.length} Available</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {players.map((p) => (
              <div
                key={p.id}
                onClick={() => bringToHammer(p)}
                className="bg-black border border-slate-800 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-teal-500 transition-colors group">
                <div
                  className="w-10 h-10 rounded-lg bg-slate-800 bg-cover bg-center shrink-0 grayscale group-hover:grayscale-0 transition-all"
                  style={{ backgroundImage: `url(${p.photo_url})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.full_name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {p.player_role}
                  </p>
                </div>
                {p.auction_status === "unsold" && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
            ))}
            {players.length === 0 && (
              <div className="text-center text-slate-500 text-sm font-bold pt-10">
                Pool is empty.
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: The Podium */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
          {!activePlayer ? (
            <div className="text-center opacity-20 flex flex-col items-center">
              <Users size={100} className="mb-6" />
              <h2 className="text-3xl font-black uppercase tracking-widest">
                Podium Empty
              </h2>
              <p className="text-lg font-bold mt-2">
                Select a player from the queue.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
              {/* Player Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex items-center gap-8 mb-8 relative overflow-hidden">
                <div
                  className="w-48 h-48 rounded-3xl bg-slate-800 bg-cover bg-center shrink-0 ring-4 ring-slate-800 shadow-2xl"
                  style={{ backgroundImage: `url(${activePlayer.photo_url})` }}
                />
                <div className="flex-1 z-10">
                  <span className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">
                    Base Price: ₹{activePlayer.base_price || 1000}
                  </span>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
                    {activePlayer.full_name}
                  </h2>
                  <p className="text-teal-500 font-bold uppercase tracking-widest text-sm mb-6">
                    {activePlayer.player_role}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Batting
                      </p>
                      <p className="text-sm font-bold">
                        {activePlayer.batting_hand}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Bowling
                      </p>
                      <p className="text-sm font-bold">
                        {activePlayer.bowling_hand} {activePlayer.bowling_style}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bidding Info */}
              <div className="text-center mb-8">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Current Highest Bid
                </p>
                <div className="text-7xl font-black text-white tracking-tighter mb-4 tabular-nums">
                  ₹{currentBid.toLocaleString("en-IN")}
                </div>
                {highestBidder ? (
                  <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-6 py-2 rounded-full">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: highestBidder.primary_color }}
                    />
                    <span className="font-bold text-teal-400 uppercase tracking-widest text-sm">
                      {highestBidder.name}
                    </span>
                  </div>
                ) : (
                  <div className="inline-block bg-slate-800 text-slate-400 px-6 py-2 rounded-full font-bold text-sm uppercase tracking-widest">
                    Awaiting Opening Bid
                  </div>
                )}
              </div>

              {/* Auctioneer Controls */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={markUnsold}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm">
                  <XCircle size={18} /> Pass / Unsold
                </button>
                <button
                  onClick={sellPlayer}
                  disabled={!highestBidder}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-xl shadow-teal-500/20">
                  <CheckCircle2 size={18} /> Sell Player
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Franchise Bidding Controls */}
        <div className="w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Franchise Desk
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-black border border-slate-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      style={{
                        backgroundColor: team.primary_color,
                        boxShadow: `0 0 10px ${team.primary_color}`,
                      }}
                    />
                    <h3 className="font-black uppercase tracking-tighter text-lg leading-none">
                      {team.short_name}
                    </h3>
                  </div>
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
                </div>

                {/* Bidding Paddles (Leave your existing buttons here) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => placeBid(team, 500)}
                    disabled={!activePlayer}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-slate-800">
                    +500
                  </button>
                  <button
                    onClick={() => placeBid(team, 1000)}
                    disabled={!activePlayer}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-slate-800">
                    +1k
                  </button>
                  <button
                    onClick={() => placeBid(team, 5000)}
                    disabled={!activePlayer}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-slate-800">
                    +5k
                  </button>
                </div>

                {/* NEW: LIVE SQUAD TRACKER */}
                {team.players && team.players.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between">
                      <span>Squad</span>
                      <span>{team.players.length} / 15</span>
                    </p>
                    <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                      {team.players.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-5 h-5 rounded-full bg-slate-800 bg-cover bg-center shrink-0 grayscale opacity-70"
                              style={{ backgroundImage: `url(${p.photo_url})` }}
                            />
                            <span className="text-xs font-bold text-slate-300 truncate">
                              {p.full_name}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-teal-500 shrink-0 ml-2">
                            ₹{p.sold_price?.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {teams.length === 0 && (
              <div className="text-center text-slate-500 text-sm font-bold pt-10">
                No franchises registered.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
