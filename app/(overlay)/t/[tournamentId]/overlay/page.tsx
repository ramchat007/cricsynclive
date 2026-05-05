"use client";
import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import ScoreTicker from "./components/ScoreTicker";
import PlayerSpotlight from "./components/PlayerSpotlight";
import FullscreenPlates from "./components/FullscreenPlates";
import Partnership from "./components/Partnership";
import { getBroadcastTheme } from "@/lib/themes";

export default function BroadcastOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [config, setConfig] = useState<any>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [team1Squad, setTeam1Squad] = useState<any[]>([]);
  const [team2Squad, setTeam2Squad] = useState<any[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  // --- AUTO-TIMERS STATES ---
  const [autoSummaryActive, setAutoSummaryActive] = useState(false);
  const hasTriggeredSummary = useRef(false);

  const [autoTossActive, setAutoTossActive] = useState(false);
  const hasTriggeredToss = useRef(false);

  const upsertDelivery = (list: any[], delivery: any) => {
    const idx = list.findIndex((d) => d.id === delivery.id);
    if (idx === -1) return [...list, delivery];
    const next = [...list];
    next[idx] = delivery;
    return next;
  };

  // 1. TOURNAMENT CONFIG (Broadcast State)
  useEffect(() => {
    if (!tournamentId) return;
    supabase
      .from("tournaments")
      .select("broadcast_state")
      .eq("id", tournamentId)
      .single()
      .then(({ data }) => {
        if (data?.broadcast_state) setConfig(data.broadcast_state);
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

  // 2. MATCH DATA, SQUADS & REAL-TIME DELIVERIES
  useEffect(() => {
    const matchId = config?.activeMatchId;
    if (!matchId) return;

    const fetchData = async () => {
      const { data: m } = await supabase
        .from("matches")
        .select(`*, team1:team1_id(*), team2:team2_id(*)`)
        .eq("id", matchId)
        .single();

      if (m) {
        setMatchData(m);
        const { data: s1 } = await supabase
          .from("players")
          .select("*")
          .eq("team_id", m.team1_id);
        const { data: s2 } = await supabase
          .from("players")
          .select("*")
          .eq("team_id", m.team2_id);
        if (s1) setTeam1Squad(s1);
        if (s2) setTeam2Squad(s2);
      }

      const { data: d } = await supabase
        .from("deliveries")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (d) setDeliveries(d);
    };
    fetchData();

    const mSub = supabase
      .channel(`match_update_${matchId}`)
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
            team1: curr?.team1,
            team2: curr?.team2,
          }));
        },
      )
      .subscribe();

    const dSub = supabase
      .channel(`deliv_update_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
          filter: `match_id=eq.${matchId}`,
        },
        (p) => {
          if (p.eventType === "INSERT")
            setDeliveries((prev) => upsertDelivery(prev, p.new));
          else if (p.eventType === "UPDATE")
            setDeliveries((prev) => upsertDelivery(prev, p.new));
          else if (p.eventType === "DELETE")
            setDeliveries((prev) => prev.filter((d) => d.id !== p.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mSub);
      supabase.removeChannel(dSub);
    };
  }, [config?.activeMatchId]);

  // --- NEW: THE 10-SECOND AUTO-DISMISS TIMER FOR TOSS ---
  useEffect(() => {
    // Safety check: Only auto-trigger the toss if NO balls have been bowled yet!
    if (
      matchData?.toss_winner_id &&
      matchData?.toss_decision &&
      !hasTriggeredToss.current &&
      deliveries.length === 0
    ) {
      hasTriggeredToss.current = true; // Lock it so it doesn't fire again
      setAutoTossActive(true); // Turn on the Toss screen

      // Turn it off after 10 seconds
      const timer = setTimeout(() => {
        setAutoTossActive(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
    // If balls have already been bowled (e.g., page refresh mid-match), lock the toss trigger silently
    else if (deliveries.length > 0) {
      hasTriggeredToss.current = true;
    }
  }, [matchData?.toss_winner_id, matchData?.toss_decision, deliveries.length]);

  // --- EXISTING: THE 15-SECOND AUTO-DISMISS TIMER FOR SUMMARY ---
  useEffect(() => {
    if (matchData?.status === "completed" && !hasTriggeredSummary.current) {
      hasTriggeredSummary.current = true;
      setAutoSummaryActive(true);

      const timer = setTimeout(() => {
        setAutoSummaryActive(false);
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [matchData?.status]);

  if (!config || !config.activeMatchId) return null;

  const activeViews = config.activeViews || [];
  const broadcastTheme = getBroadcastTheme(config.broadcastThemeId);

  let activeFullscreen = activeViews.find((v: string) =>
    [
      "TOSS_REPORT",
      "INNINGS_BREAK",
      "MATCH_RESULT",
      "OVER_SUMMARY",
      "PLAYING_XI",
      "SPONSOR_BANNER",
      "MATCH_SUMMARY",
      "POINTS_TABLE",
      "LIVE_QUIZ",
    ].includes(v),
  );

  // ✅ AUTO-TRIGGER LOGIC CASCADE
  // Priority: 1. Manual User Selection -> 2. Auto Match Summary -> 3. Auto Toss Report
  // if (!activeFullscreen) {
  //   if (autoSummaryActive) {
  //     activeFullscreen = "MATCH_SUMMARY";
  //   } else if (autoTossActive) {
  //     activeFullscreen = "TOSS_REPORT";
  //   }
  // }

  // --- STACKING MATH ---
  const isTickerOn = activeViews.includes("TICKER");
  const isScorebugOn = activeViews.includes("SCOREBUG");

  let partnershipTranslate = "translate-y-0";
  if (isScorebugOn && isTickerOn) partnershipTranslate = "-translate-y-[160px]";
  else if (isScorebugOn) partnershipTranslate = "-translate-y-[120px]";
  else if (isTickerOn) partnershipTranslate = "-translate-y-10";

  // --- MINI SCOREBUG MATH ---
  let isT1Batting = true;
  let liveScore = 0;
  let liveWickets = 0;
  let liveOvers = "0.0";

  if (matchData) {
    const choseBat = String(matchData.toss_decision || "")
      .toLowerCase()
      .includes("bat");
    const t1Won = matchData.toss_winner_id === matchData.team1_id;
    const t1BattedFirst = choseBat ? t1Won : !t1Won;

    const currentInnings = Number(matchData.current_innings) || 1;
    isT1Batting = currentInnings === 1 ? t1BattedFirst : !t1BattedFirst;

    // Calculate score exactly like the Main Ticker does!
    const currentInningsBalls = deliveries.filter(
      (d) => Number(d.innings) === currentInnings,
    );

    liveScore = currentInningsBalls.reduce(
      (acc, d) =>
        acc + (Number(d.runs_off_bat) || 0) + (Number(d.extras_runs) || 0),
      0,
    );

    liveWickets = currentInningsBalls.filter((d) => d.is_wicket).length;

    const totalValidBalls = currentInningsBalls.filter((d) => {
      const type = (d.extras_type || "").toLowerCase();
      return (
        type !== "wd" && type !== "wide" && type !== "nb" && type !== "no-ball"
      );
    }).length;

    liveOvers = `${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`;
  }

  const miniBatName = isT1Batting
    ? matchData?.team1?.short_name
    : matchData?.team2?.short_name;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent pointer-events-none z-[9999]">
      <style>{`
        html, body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
        @keyframes spin3D_Coin { 0% { transform: rotateY(0deg); } 10% { transform: rotateY(360deg); } 100% { transform: rotateY(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .ticker-text { display: inline-block; white-space: nowrap; animation: ticker-scroll 25s linear infinite; }
        @keyframes ticker-scroll { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
      `}</style>

      {/* 1. WATERMARK */}
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

      {/* 🔥 NEW: YOUTUBE SUBSCRIBE BANNER 🔥 */}
      {config.showSubscribeBanner && (
        <div className="absolute bottom-40 right-12 z-[400] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="bg-slate-950/95 backdrop-blur-xl border-l-4 border-red-600 rounded-full pr-8 pl-4 py-3 flex items-center gap-5 shadow-2xl border-y border-r border-white/10">
            <div className="bg-red-600 rounded-full w-12 h-12 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]">
              {/* YouTube Play Triangle */}
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
            </div>
            <div>
              <p className="text-white font-black text-2xl uppercase tracking-tight leading-none mb-1">
                Subscribe
              </p>
              <p className="text-red-400 font-bold text-sm tracking-widest">
                {config.youtubeChannelName || "@cricsynclive"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SPONSOR BUG */}
      {activeViews.includes("SPONSOR_BUG") &&
        config.sponsorBugUrl &&
        !activeFullscreen && (
          <div className="absolute top-8 left-8 z-[100] animate-fade-in">
            <img
              src={config.sponsorBugUrl}
              className="h-24 w-auto object-contain drop-shadow-2xl"
              alt="Sponsor"
            />
          </div>
        )}

      {/* 3. MINI SCOREBUG */}
      {activeViews.includes("MINI_SCOREBUG") &&
        !isScorebugOn &&
        !activeFullscreen && (
          <div className="absolute top-8 left-8 z-[90] animate-fade-in">
            <div className="bg-slate-950/95 backdrop-blur-md border-l-4 border-amber-400 rounded-r-2xl pr-6 pl-4 py-3 shadow-2xl flex items-center gap-5 border border-white/10">
              <div className="flex flex-col border-r border-white/20 pr-5">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">
                  LIVE SCORE
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-black text-2xl">
                    {miniBatName}
                  </span>
                  <span className="text-white font-black text-3xl tabular-nums">
                    {liveScore}/{liveWickets}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">
                  OVERS
                </span>
                <span className="text-white font-bold text-xl tabular-nums">
                  {liveOvers}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* 4. PARTNERSHIP BANNER */}
      {activeViews.includes("PARTNERSHIP") && !activeFullscreen && (
        <div
          className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-[60] transition-transform duration-500 ${partnershipTranslate}`}
        >
          <Partnership
            matchData={matchData}
            deliveries={deliveries}
            team1Squad={team1Squad}
            team2Squad={team2Squad}
            themeId={config.broadcastThemeId}
          />
        </div>
      )}

      {/* 5. PLAYER SPOTLIGHT */}
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

      {/* 6. MAIN SCORE TICKER */}
      {isScorebugOn && matchData && !activeFullscreen && (
        <div
          className={`absolute bottom-0 w-full z-[50] transition-transform duration-500 ${isTickerOn ? "-translate-y-10" : "translate-y-0"}`}
        >
          <ScoreTicker overlayData={config} liveMatch={matchData} />
        </div>
      )}

      {/* 7. SCROLLING TICKER */}
      {isTickerOn && config.tickerText && !activeFullscreen && (
        <div
          className="absolute bottom-0 left-0 w-full h-10 text-black font-black uppercase tracking-[0.2em] text-xl flex items-center z-[250] overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"
          style={{
            backgroundColor: broadcastTheme.tokens.warning,
            borderTop: `3px solid ${broadcastTheme.tokens.accent}`,
          }}
        >
          <div className="ticker-text px-4">
            {config.tickerText} &nbsp;&nbsp;&nbsp;&nbsp; •
            &nbsp;&nbsp;&nbsp;&nbsp; {config.tickerText}{" "}
            &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp;{" "}
            {config.tickerText} &nbsp;&nbsp;&nbsp;&nbsp; •
            &nbsp;&nbsp;&nbsp;&nbsp; {config.tickerText}
          </div>
        </div>
      )}

      {/* 8. FULLSCREEN LAYERS */}
      {activeFullscreen && (
        <div
          className="absolute inset-0 w-full h-full z-[300] backdrop-blur-md animate-fade-in"
          style={{ backgroundColor: `${broadcastTheme.tokens.panelBg}` }}
        >
          {activeFullscreen === "SPONSOR_BANNER" ? (
            <img
              key={config.sponsorBanners[currentBannerIdx]}
              src={config.sponsorBanners[currentBannerIdx]}
              className="w-full h-full object-contain animate-fade-in"
            />
          ) : (
            <FullscreenPlates
              type={activeFullscreen}
              matchData={matchData}
              tournamentId={tournamentId}
              deliveries={deliveries}
              team1Squad={team1Squad}
              team2Squad={team2Squad}
              themeId={config.broadcastThemeId}
              config={config}
            />
          )}
        </div>
      )}
    </div>
  );
}
