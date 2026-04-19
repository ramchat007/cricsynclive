"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";

export default function TournamentOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [overlayData, setOverlayData] = useState<any>({
    activeViews: [],
    sponsors: [],
    fullScreenBanners: [],
    tickerText: "",
    showTicker: false,
    showAppLogo: true,
    appLogo: "",
    customMsgTitle: "",
    organizerName: "",
  });
  const [liveMatch, setLiveMatch] = useState<any>(null);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "background",
      "transparent",
      "important",
    );
    document.body.style.setProperty("background", "transparent", "important");
    const nav = document.querySelector("nav");
    if (nav) nav.style.display = "none";

    const channel = supabase.channel(`broadcast-${tournamentId}`);
    channel
      .on("broadcast", { event: "overlay-sync" }, (payload) =>
        setOverlayData(payload.payload),
      )
      .subscribe();

    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
      if (nav) nav.style.display = "";
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  useEffect(() => {
    const matchId = overlayData.activeMatchId;
    if (!matchId) {
      setLiveMatch(null);
      return;
    }
    supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()
      .then(({ data }) => setLiveMatch(data));
    const matchSub = supabase
      .channel(`overlay-listener-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => setLiveMatch(payload.new),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(matchSub);
    };
  }, [overlayData.activeMatchId]);

  const isActive = (viewName: string) =>
    overlayData.activeViews?.includes(viewName);

  // -- SUMMARY CARD LOGIC (Adapted from your V1 code) --
  const renderSummaryCard = (type: string) => {
    if (!liveMatch) return null;
    const isResult = type === "RESULT_CARD";
    const isToss = type === "TOSS_CARD";
    const isInningsBreak = type === "INNINGS_BREAK_CARD";
    const isSummary = type === "SUMMARY_CARD";

    const ScoreBlock = ({ inn, label }: any) => {
      if (!inn || inn.score === undefined)
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl border border-slate-700 w-full relative overflow-hidden shadow-xl h-full opacity-60">
            <span className="text-slate-500 font-black text-2xl uppercase tracking-widest">
              YET TO BAT
            </span>
          </div>
        );
      const topBatters = Object.entries(inn.batsmenStats || {})
        .sort((a: any, b: any) => b[1].runs - a[1].runs)
        .slice(0, 2);
      const blockColor =
        inn.battingTeam === liveMatch.meta?.teamA
          ? liveMatch.meta?.teamAColor || "#0284c7"
          : liveMatch.meta?.teamBColor || "#e11d48";

      return (
        <div className="flex flex-col items-center p-6 bg-slate-900 rounded-xl border border-slate-700 w-full relative overflow-hidden shadow-xl h-full">
          <div
            className="absolute top-0 w-full h-2"
            style={{ backgroundColor: blockColor }}></div>
          <div className="absolute top-4 right-4 bg-slate-800 px-3 py-1 text-[10px] font-black text-slate-400 rounded uppercase tracking-widest border border-slate-700">
            {label}
          </div>
          <h3
            className="font-black uppercase text-2xl mb-1 mt-4 text-center truncate w-full px-2"
            style={{ color: blockColor }}>
            {inn.battingTeam || "Team"}
          </h3>
          <div className="text-6xl font-black text-white mb-4 leading-none drop-shadow-md">
            {inn.score}/{inn.wickets}
          </div>
          <div className="w-full border-t border-slate-700/50 pt-4 space-y-3 mt-auto">
            {topBatters.length > 0 ? (
              topBatters.map(([name, s]: any) => (
                <div
                  key={name}
                  className="flex justify-between items-center text-lg">
                  <span className="text-white font-bold uppercase truncate flex-1 pr-4">
                    {name}
                  </span>
                  <span
                    className="font-mono font-bold shrink-0"
                    style={{ color: blockColor }}>
                    {s.runs} ({s.balls})
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic text-center w-full">
                No batting data
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-[1200px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 font-sans drop-shadow-2xl">
          <div className="relative flex flex-col border-b-4 border-slate-500">
            <div className="bg-slate-950 px-8 py-3 flex justify-between items-center border-b border-slate-800">
              <div className="flex gap-4 text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                <span>{liveMatch.meta?.matchTitle || "LIVE MATCH"}</span>
              </div>
            </div>
            <div
              className={`h-28 flex items-center justify-between px-10 relative overflow-hidden ${isResult ? "bg-emerald-900" : isToss ? "bg-indigo-900" : isInningsBreak ? "bg-amber-900" : "bg-slate-800"}`}>
              <div className="w-full text-center z-10">
                <span className="text-white font-black text-5xl uppercase italic tracking-wider drop-shadow-md">
                  {isToss
                    ? "TOSS REPORT"
                    : isInningsBreak
                      ? "INNINGS BREAK"
                      : isResult
                        ? "MATCH RESULT"
                        : "MATCH SUMMARY"}
                </span>
              </div>
            </div>
          </div>

          {isResult ? (
            <div className="flex flex-col w-full bg-slate-900 p-8 justify-center gap-6">
              <div className="text-center w-full bg-slate-950 py-5 rounded-xl border border-white/5 shadow-inner">
                <h2 className="text-5xl font-black uppercase tracking-wider leading-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  {liveMatch.result || "MATCH FINISHED"}
                </h2>
              </div>
              <div className="flex gap-4">
                <ScoreBlock inn={liveMatch.innings?.[0]} label="1st INNINGS" />
                <ScoreBlock inn={liveMatch.innings?.[1]} label="2nd INNINGS" />
              </div>
            </div>
          ) : isToss ? (
            <div className="flex flex-col items-center justify-center h-[400px] bg-slate-900 p-12 space-y-8">
              {liveMatch.meta?.toss?.winner ? (
                <>
                  <div className="text-4xl text-slate-400 font-bold uppercase tracking-[0.2em] text-center flex flex-col gap-3">
                    <span className="font-black drop-shadow-md text-7xl text-white">
                      {liveMatch.meta.toss.winner}
                    </span>{" "}
                    WON THE TOSS
                  </div>
                  <div className="text-5xl text-white font-black uppercase italic tracking-tighter text-center drop-shadow-2xl">
                    ELECTED TO{" "}
                    <span className="underline decoration-4 decoration-indigo-500 underline-offset-8">
                      {liveMatch.meta.toss.decision}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-7xl text-indigo-400 font-black uppercase italic tracking-tighter drop-shadow-lg animate-pulse">
                  TOSS PENDING...
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 h-[400px] p-10 w-full bg-slate-900">
              <ScoreBlock inn={liveMatch.innings?.[0]} label="1st INNINGS" />
              <ScoreBlock inn={liveMatch.innings?.[1]} label="2nd INNINGS" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none font-sans text-white">
      {/* COMPULSORY APP BRANDING (Top Left) */}
      {(overlayData.showAppLogo || overlayData.appLogo) && (
        <div className="absolute top-8 left-8 animate-in fade-in duration-500">
          {overlayData.appLogo ? (
            <img
              src={overlayData.appLogo}
              alt="App Logo"
              className="max-h-20 w-auto drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
            />
          ) : (
            <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 shadow-2xl">
              <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">
                CRICSYNC <span className="text-teal-400">PRO</span>
              </h1>
            </div>
          )}
        </div>
      )}

      {/* FULL SCREEN CARDS */}
      {isActive("SUMMARY_CARD") && renderSummaryCard("SUMMARY_CARD")}
      {isActive("TOSS_CARD") && renderSummaryCard("TOSS_CARD")}
      {isActive("INNINGS_BREAK_CARD") &&
        renderSummaryCard("INNINGS_BREAK_CARD")}
      {isActive("RESULT_CARD") && renderSummaryCard("RESULT_CARD")}

      {/* CUSTOM FLASH MESSAGE */}
      {isActive("CUSTOM_MSG") && overlayData.customMsgTitle && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 animate-in zoom-in-95 fade-in duration-500 z-50">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-1 flex items-center shadow-[0_20px_50px_rgba(220,38,38,0.4)] rounded-xl overflow-hidden">
            <div className="bg-black px-6 py-4 flex items-center justify-center h-full">
              <span className="text-red-500 font-black uppercase tracking-[0.3em] text-sm animate-pulse">
                ALERT
              </span>
            </div>
            <div className="px-8 py-3 flex flex-col justify-center">
              <p className="text-white font-black text-4xl uppercase tracking-tighter leading-none">
                {overlayData.customMsgTitle}
              </p>
              {overlayData.customMsgSub && (
                <p className="text-red-200 font-bold text-sm uppercase tracking-widest mt-1">
                  {overlayData.customMsgSub}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
