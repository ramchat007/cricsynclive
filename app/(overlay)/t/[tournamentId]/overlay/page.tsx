"use client";
import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import ScoreTicker from "./components/ScoreTicker";

export default function BroadcastOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [config, setConfig] = useState<any>(null);
  const [matchData, setMatchData] = useState<any>(null);

  const matchSubRef = useRef<any>(null);

  // 🔥 1. CONTROLLER STATE (MASTER SOURCE)
  useEffect(() => {
    if (!tournamentId) return;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();

      if (data?.broadcast_state) {
        setConfig(data.broadcast_state);
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`broadcast_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          setConfig(payload.new.broadcast_state);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // 🔥 2. MATCH DATA SYNC (AUTO CLEANUP + SWITCH SAFE)
  useEffect(() => {
    const matchId = config?.activeMatchId;
    if (!matchId) return;

    const loadMatch = async () => {
      const { data } = await supabase
        .from("matches")
        .select(`*, team1:team1_id(*), team2:team2_id(*)`)
        .eq("id", matchId)
        .single();

      if (data) setMatchData(data);
    };

    loadMatch();

    // 🔁 CLEAN previous subscription
    if (matchSubRef.current) {
      supabase.removeChannel(matchSubRef.current);
    }

    // 🔴 subscribe new
    const sub = supabase
      .channel(`match_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatchData((current: any) => ({
            ...current,
            ...payload.new,
            team1: current?.team1,
            team2: current?.team2,
          }));
        },
      )
      .subscribe();

    matchSubRef.current = sub;

    return () => {
      supabase.removeChannel(sub);
    };
  }, [config?.activeMatchId]);

  // 🔥 3. SAFETY GUARDS
  if (!config) return null;

  // ❌ Do not render if no active match
  if (!config.activeMatchId) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent pointer-events-none z-[9999]">
      {/* 🔥 GLOBAL CLEAN MODE (NO LAYOUT LEAK) */}
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
          @keyframes spin3D_Coin {
            0% { transform: rotateY(0deg); }
            10% { transform: rotateY(360deg); } 
            100% { transform: rotateY(360deg); } 
          }
      `}</style>

      {/* 🔥 LOGO (OBS SAFE) */}
      {config.showAppLogo && (
        <div className="absolute top-8 right-8 z-[100] animate-fade-in flex flex-col items-center">
          <div
            className="relative bg-cyan-100 rounded-full p-2.5 border-[3px] border-white ring-2 ring-black/20 flex items-center justify-center shadow-lg"
            style={{ animation: "spin3D_Coin 10s ease-in-out infinite" }}>
            <img src="/cricsync-light-logo.png" className="h-14 w-auto" />
          </div>

          <div className="relative z-10 -mt-3 bg-slate-950 border-2 border-slate-700 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xl">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">
              LIVE
            </span>
          </div>
        </div>
      )}

      {/* 🔥 SCORE TICKER */}
      {config.activeViews?.includes("SCOREBUG") && matchData && (
        <ScoreTicker overlayData={config} liveMatch={matchData} />
      )}
    </div>
  );
}
