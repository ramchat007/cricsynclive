"use client";
import { useEffect, useState, use } from "react";
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

  useEffect(() => {
    if (!tournamentId) return;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (data?.broadcast_state) setConfig(data.broadcast_state);
    };
    fetchConfig();
    const sub = supabase
      .channel(`obs_sync`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (p) => setConfig(p.new.broadcast_state),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [tournamentId]);

  useEffect(() => {
    const matchId = config?.activeMatchId;
    if (!matchId) return;
    const fetchMatch = async () => {
      const { data } = await supabase
        .from("matches")
        .select(`*, team1:team1_id(*), team2:team2_id(*)`)
        .eq("id", matchId)
        .single();
      if (data) setMatchData(data);
    };
    fetchMatch();

    const matchSub = supabase
      .channel(`match_heartbeat`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (p) => {
          setMatchData((curr: any) => ({
            ...curr,
            ...p.new,
            team1: curr?.team1, // Keep branding info
            team2: curr?.team2,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(matchSub);
    };
  }, [config?.activeMatchId]);

  if (!config) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent overflow-hidden pointer-events-none z-50 flex flex-col items-center justify-end">
      <style>{`
         html, body { background: transparent !important; margin: 0; padding: 0; }
         nav, header, footer, .navbar { display: none !important; }
         @keyframes spin3D { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
       `}</style>

      {config.showAppLogo && (
        <div className="absolute top-12 right-12 flex flex-col items-center">
          <div
            className="bg-cyan-100 rounded-full p-2.5 border-[3px] border-white shadow-lg"
            style={{ animation: "spin3D 10s linear infinite" }}>
            <img
              src="/cricsync-light-logo.png"
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="relative z-10 -mt-3 bg-slate-950 border-2 border-slate-700 px-4 py-1 rounded-full flex items-center gap-2 shadow-xl">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
              LIVE
            </span>
          </div>
        </div>
      )}

      {config.activeViews?.includes("SCOREBUG") && matchData && (
        <ScoreTicker overlayData={config} liveMatch={matchData} />
      )}
    </div>
  );
}
