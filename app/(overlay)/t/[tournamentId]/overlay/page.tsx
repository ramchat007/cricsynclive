"use client";
import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import ScoreTicker from "./components/ScoreTicker";
import PlayerSpotlight from "./components/PlayerSpotlight";
import FullscreenPlates from "./components/FullscreenPlates";

export default function BroadcastOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [config, setConfig] = useState<any>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const matchSubRef = useRef<any>(null);

  // Carousel State
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  useEffect(() => {
    if (!tournamentId) return;
    supabase
      .from("tournaments")
      .select("broadcast_state")
      .eq("id", tournamentId)
      .single()
      .then(({ data }) => {
        if (data?.broadcast_state) {
          const loadedState = data.broadcast_state;
          if (loadedState.sponsorBannerUrl) {
            loadedState.sponsorBanners = [loadedState.sponsorBannerUrl];
          }
          setConfig(loadedState);
        }
      });

    const channel = supabase
      .channel(`studio_graphics_${tournamentId}`)
      .on("broadcast", { event: "sync_graphics" }, (payload) => {
        setConfig(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  useEffect(() => {
    const matchId = config?.activeMatchId;
    if (!matchId) return;

    supabase
      .from("matches")
      .select(`*, team1:team1_id(*), team2:team2_id(*)`)
      .eq("id", matchId)
      .single()
      .then(({ data }) => {
        if (data) setMatchData(data);
      });

    if (matchSubRef.current) supabase.removeChannel(matchSubRef.current);

    const sub = supabase
      .channel(`match_overlay_${matchId}`)
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

  // 🔥 THE FIX: AUTOMATIC BANNER CAROUSEL LOGIC 🔥
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const activeViews = config?.activeViews || [];
    const banners = config?.sponsorBanners || [];

    if (activeViews.includes("SPONSOR_BANNER") && banners.length > 1) {
      timer = setInterval(() => {
        setCurrentBannerIdx((prev) => (prev + 1) % banners.length);
      }, 4000); // Rotates every 4 seconds
    }
    return () => clearInterval(timer);
  }, [config?.activeViews, config?.sponsorBanners]);

  if (!config || !config.activeMatchId) return null;

  const activeViews = config.activeViews || [];
  const fullscreenGraphics = [
    "TOSS_REPORT",
    "INNINGS_BREAK",
    "MATCH_RESULT",
    "OVER_SUMMARY",
    "PLAYING_XI",
    "SPONSOR_BANNER",
  ];
  const activeFullscreen = activeViews.find((v: string) =>
    fullscreenGraphics.includes(v),
  );

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent pointer-events-none z-[9999]">
      <style>{`
        html, body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
        @keyframes spin3D_Coin { 0% { transform: rotateY(0deg); } 10% { transform: rotateY(360deg); } 100% { transform: rotateY(360deg); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ticker-scroll { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .ticker-text { display: inline-block; white-space: nowrap; animation: ticker-scroll 25s linear infinite; }
      `}</style>

      {/* --- WATERMARK & BUG --- */}
      {config.showAppLogo && !activeFullscreen && (
        <div className="absolute top-8 right-8 z-[100] animate-fade-in flex flex-col items-center">
          <div
            className="relative bg-cyan-100 rounded-full p-2.5 border-[3px] border-white ring-2 ring-black/20 flex items-center justify-center shadow-lg"
            style={{ animation: "spin3D_Coin 10s ease-in-out infinite" }}
          >
            <img
              src="/cricsync-light-logo.png"
              className="h-14 w-auto"
              alt="Logo"
            />
          </div>
          <div className="relative z-10 -mt-3 bg-slate-950 border-2 border-slate-700 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xl">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">
              LIVE
            </span>
          </div>
        </div>
      )}

      {activeViews.includes("SPONSOR_BUG") &&
        config.sponsorBugUrl &&
        !activeFullscreen && (
          <div className="absolute top-8 left-8 z-[100] animate-fade-in">
            <img
              src={config.sponsorBugUrl}
              className="h-20 w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              alt="Sponsor Bug"
            />
          </div>
        )}

      {/* --- LAYER 2: PLAYER SPOTLIGHT --- */}
      {activeViews.includes("PLAYER_SPOTLIGHT") &&
        config.spotlightPlayerId &&
        matchData &&
        !activeFullscreen && (
          <div className="absolute bottom-40 left-12 z-[60]">
            <PlayerSpotlight
              playerId={config.spotlightPlayerId}
              matchId={matchData.id}
            />
          </div>
        )}

      {/* --- LAYER 3: FULLSCREEN BANNERS & GRAPHICS --- */}
      {activeFullscreen === "SPONSOR_BANNER" &&
      config.sponsorBanners?.length > 0 ? (
        <div className="absolute inset-0 w-[1920px] h-[1080px] z-[200] flex items-center justify-center bg-black animate-fade-in">
          <img
            key={config.sponsorBanners[currentBannerIdx]}
            src={config.sponsorBanners[currentBannerIdx]}
            className="w-full h-full object-cover animate-fade-in"
            alt="Sponsor Banner"
          />
        </div>
      ) : (
        activeFullscreen && (
          <div className="absolute inset-0 w-[1920px] h-[1080px] z-[150] bg-black/90 backdrop-blur-md animate-fade-in">
            {/* Plug the new Switchboard Component here! */}
            <FullscreenPlates
              type={activeFullscreen}
              matchData={matchData}
              tournamentId={tournamentId}
            />
          </div>
        )
      )}

      {/* --- LAYER 4: BOTTOM SCOREBUG & TICKER --- */}
      {activeViews.includes("SCOREBUG") && matchData && !activeFullscreen && (
        <div
          className={`absolute bottom-0 w-full z-[50] transition-transform duration-500 ${activeViews.includes("TICKER") ? "-translate-y-10" : "translate-y-0"}`}
        >
          <ScoreTicker overlayData={config} liveMatch={matchData} />
        </div>
      )}

      {activeViews.includes("TICKER") &&
        config.tickerText &&
        !activeFullscreen && (
          <div className="absolute bottom-0 left-0 w-full h-10 bg-amber-400 border-t-[3px] border-amber-300 text-black font-black uppercase tracking-[0.2em] text-xl flex items-center z-[250] overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
            <div className="ticker-text px-4">
              {config.tickerText} &nbsp;&nbsp;&nbsp;&nbsp; •
              &nbsp;&nbsp;&nbsp;&nbsp; {config.tickerText}{" "}
              &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;{" "}
              {config.tickerText} &nbsp;&nbsp;&nbsp;&nbsp; •
              &nbsp;&nbsp;&nbsp;&nbsp; {config.tickerText}
            </div>
          </div>
        )}
    </div>
  );
}
