"use client";
import { useEffect, useRef, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import {
  Radio,
  Tv,
  Zap,
  Check,
  EyeOff,
  RotateCw,
  Trophy,
  Users,
  LayoutTemplate,
  Image as ImageIcon,
  UploadCloud,
  PieChart,
  Target,
  MonitorPlay,
  MessageSquare,
  Camera,
  X,
  ClipboardList,
} from "lucide-react";
import { BROADCAST_THEMES } from "@/lib/themes";

export default function MasterController({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [matches, setMatches] = useState<any[]>([]);
  const [teamASquad, setTeamASquad] = useState<any[]>([]);
  const [teamBSquad, setTeamBSquad] = useState<any[]>([]);
  const [triggerNote, setTriggerNote] = useState<string>("");
  const [themeNote, setThemeNote] = useState<string>("");

  // 🔥 Notice: sponsorBanners is now an array!
  const [config, setConfig] = useState<any>({
    activeViews: [],
    activeMatchId: "",
    showAppLogo: true,
    event: null,
    tickerText: "",
    sponsorBanners: [],
    sponsorBugUrl: "",
    spotlightPlayerId: "",
    broadcastThemeId: "classic",
  });

  const studioChannelRef = useRef<any>(null);
  // Track BOTH batters to detect strike rotation vs new batter
  const prevPlayersRef = useRef({
    striker: null,
    nonStriker: null,
    bowler: null,
  });
  const spotlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref for config so our websocket doesn't constantly disconnect when typing
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!tournamentId) return;
    const fetchMatches = async () => {
      const { data: mData } = await supabase
        .from("matches")
        .select(
          `
          id, 
          team1_id, 
          team2_id, 
          partnership_url, 
          mini_scorebug_url,
          team1:team1_id(short_name, name), 
          team2:team2_id(short_name, name)
        `,
        )
        .eq("tournament_id", tournamentId)
        .eq("status", "live");
      if (mData) setMatches(mData);
    };
    fetchMatches();
    const channel = supabase.channel(`studio_graphics_${tournamentId}`);
    studioChannelRef.current = channel;
    channel.subscribe();

    const init = async () => {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (tData?.broadcast_state) {
        // Ensure sponsorBanners is an array if migrating from old string logic
        const loadedState = tData.broadcast_state;
        if (loadedState.sponsorBannerUrl) {
          loadedState.sponsorBanners = [loadedState.sponsorBannerUrl];
          delete loadedState.sponsorBannerUrl;
        }
        setConfig(loadedState);
      }

      const { data: mData } = await supabase
        .from("matches")
        .select(
          "id, team1_id, team2_id, team1:team1_id(short_name), team2:team2_id(short_name)",
        )
        .eq("tournament_id", tournamentId)
        .eq("status", "live");
      if (mData) setMatches(mData);
    };
    init();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  useEffect(() => {
    const matchId = config.activeMatchId;
    if (!matchId || matches.length === 0) return;
    const fetchSquads = async () => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;
      const { data: squadA } = await supabase
        .from("players")
        .select("id, full_name")
        .eq("team_id", match.team1_id);
      const { data: squadB } = await supabase
        .from("players")
        .select("id, full_name")
        .eq("team_id", match.team2_id);
      if (squadA) setTeamASquad(squadA);
      if (squadB) setTeamBSquad(squadB);
    };
    fetchSquads();
  }, [config.activeMatchId, matches]);

  const publishConfig = async (updates: any) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    if (studioChannelRef.current)
      studioChannelRef.current.send({
        type: "broadcast",
        event: "sync_graphics",
        payload: newConfig,
      });
    await supabase
      .from("tournaments")
      .update({ broadcast_state: newConfig })
      .eq("id", tournamentId);
  };

  // --- SMART AUTOMATED PLAYER SPOTLIGHT ENGINE ---
  useEffect(() => {
    const matchId = config.activeMatchId;
    if (!matchId) return;

    // 1. Initial Baseline Fetch (Who is currently on the pitch?)
    supabase
      .from("matches")
      .select("live_striker_id, live_non_striker_id, live_bowler_id")
      .eq("id", matchId)
      .single()
      .then(({ data }) => {
        if (data) {
          prevPlayersRef.current = {
            striker: data.live_striker_id,
            nonStriker: data.live_non_striker_id,
            bowler: data.live_bowler_id,
          };
        }
      });

    const sub = supabase
      .channel(`match_spotlight_monitor_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newMatch = payload.new;
          const oldRefs = prevPlayersRef.current;
          let newPlayerId = null;

          const currentStriker = newMatch.live_striker_id;
          const currentNonStriker = newMatch.live_non_striker_id;
          const currentBowler = newMatch.live_bowler_id;

          // SMART LOGIC 1: Is the new striker completely new to the crease? (Not just strike rotation)
          if (
            currentStriker &&
            currentStriker !== oldRefs.striker &&
            currentStriker !== oldRefs.nonStriker
          ) {
            newPlayerId = currentStriker;
          }
          // SMART LOGIC 2: Did the non-striker change to someone completely new?
          else if (
            currentNonStriker &&
            currentNonStriker !== oldRefs.striker &&
            currentNonStriker !== oldRefs.nonStriker
          ) {
            newPlayerId = currentNonStriker;
          }
          // SMART LOGIC 3: Did a new over start with a new bowler?
          else if (currentBowler && currentBowler !== oldRefs.bowler) {
            newPlayerId = currentBowler;
          }

          // Update the baseline for the next ball
          prevPlayersRef.current = {
            striker: currentStriker,
            nonStriker: currentNonStriker,
            bowler: currentBowler,
          };

          // Fire the 10-second spotlight if we found a genuinely new player AND Auto-Show is enabled
          if (newPlayerId && configRef.current.autoSpotlight !== false) {
            if (spotlightTimerRef.current)
              clearTimeout(spotlightTimerRef.current);

            publishConfig({
              activeViews: [
                ...(configRef.current.activeViews || []).filter(
                  (v: string) => v !== "PLAYER_SPOTLIGHT",
                ),
                "PLAYER_SPOTLIGHT",
              ],
              spotlightPlayerId: newPlayerId,
            });

            spotlightTimerRef.current = setTimeout(() => {
              setConfig((prev: any) => {
                const views = (prev.activeViews || []).filter(
                  (v: string) => v !== "PLAYER_SPOTLIGHT",
                );
                const nextConfig = { ...prev, activeViews: views };
                if (studioChannelRef.current)
                  studioChannelRef.current.send({
                    type: "broadcast",
                    event: "sync_graphics",
                    payload: nextConfig,
                  });
                supabase
                  .from("tournaments")
                  .update({ broadcast_state: nextConfig })
                  .eq("id", tournamentId);
                return nextConfig;
              });
            }, 10000); // Hide exactly 10 seconds later
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [config.activeMatchId]); // Notice we removed autoSpotlight from here!

  const toggleView = (view: string) => {
    const views = config.activeViews || [];
    publishConfig({
      activeViews: views.includes(view)
        ? views.filter((v: any) => v !== view)
        : [...views, view],
    });
  };

  const toggleFullscreenView = (view: string) => {
    const fullscreenGraphics = [
      "TOSS_REPORT",
      "INNINGS_BREAK",
      "OVER_SUMMARY",
      "PLAYING_XI",
      "MATCH_SUMMARY",
      "POINTS_TABLE",
    ];
    let views = [...(config.activeViews || [])];
    if (views.includes(view)) views = views.filter((v) => v !== view);
    else {
      views = views.filter((v) => !fullscreenGraphics.includes(v));
      views.push(view);
    }
    publishConfig({ activeViews: views });
  };

  const triggerRapidEvent = async (eventType: "FOUR" | "SIX" | "WICKET") => {
    if (!config.activeMatchId) {
      setTriggerNote("Select active match first.");
      return;
    }

    const { data: lastBall } = await supabase
      .from("deliveries")
      .select("id, runs_off_bat, is_wicket")
      .eq("match_id", config.activeMatchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastBall) {
      setTriggerNote("No delivery found for this match.");
      return;
    }

    const runs = Number(lastBall.runs_off_bat) || 0;
    const isWicket = !!lastBall.is_wicket;
    const matchesEvent =
      (eventType === "FOUR" && runs === 4 && !isWicket) ||
      (eventType === "SIX" && runs === 6 && !isWicket) ||
      (eventType === "WICKET" && isWicket);

    if (!matchesEvent) {
      setTriggerNote(`Last ball does not match ${eventType} trigger.`);
      return;
    }

    await publishConfig({ event: eventType, eventTime: Date.now() });
    setTriggerNote(`${eventType} trigger fired.`);
    setTimeout(() => setTriggerNote(""), 1800);
  };

  const removeBanner = (indexToRemove: number) => {
    const newBanners = config.sponsorBanners.filter(
      (_: any, i: number) => i !== indexToRemove,
    );
    publishConfig({ sponsorBanners: newBanners });
  };

  const selectBroadcastTheme = (themeId: string) => {
    publishConfig({ broadcastThemeId: themeId });
    const selected = BROADCAST_THEMES.find((t) => t.id === themeId);
    setThemeNote(
      selected?.premium
        ? "Premium theme selected (dummy access enabled until payments are integrated)."
        : "Free theme selected.",
    );
    setTimeout(() => setThemeNote(""), 2200);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <Radio className="text-emerald-500 animate-pulse" size={28} />
            <div>
              <h1 className="text-gray-900 font-black uppercase tracking-tighter text-2xl leading-none">
                Studio V2 Control
              </h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                Broadcast Director
              </p>
            </div>
          </div>
          <select
            value={config.activeMatchId || ""}
            onChange={(e) => publishConfig({ activeMatchId: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-3 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold uppercase tracking-wider text-sm w-full md:w-auto cursor-pointer">
            <option value="">-- Select Active Feed --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.team1?.short_name} vs {m.team2?.short_name}
              </option>
            ))}
          </select>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Tv size={16} className="text-gray-400" /> In-Game Displays
            </h3>
            <button
              onClick={() => toggleView("SCOREBUG")}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("SCOREBUG") ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
              Main Score Ticker{" "}
              {config.activeViews?.includes("SCOREBUG") ? (
                <Check size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
            <button
              onClick={() => toggleView("MINI_SCOREBUG")}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("MINI_SCOREBUG") ? "bg-cyan-600 border-cyan-600 text-white shadow-md" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
              Mini Corner Bug{" "}
              {config.activeViews?.includes("MINI_SCOREBUG") ? (
                <Check size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
            <button
              onClick={() => toggleView("PARTNERSHIP")}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("PARTNERSHIP") ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
              Current Partnership{" "}
              {config.activeViews?.includes("PARTNERSHIP") ? (
                <Check size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
            <button
              onClick={() =>
                publishConfig({ showAppLogo: !config.showAppLogo })
              }
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all mt-auto ${config.showAppLogo ? "bg-gray-800 border-gray-800 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
              Watermark Logo{" "}
              {config.showAppLogo ? (
                <RotateCw size={16} className="text-emerald-400" />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Zap size={16} className="text-gray-400" /> Rapid Triggers
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => triggerRapidEvent("FOUR")}
                className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 py-6 rounded-xl text-emerald-700 font-black text-sm active:scale-95 transition-all shadow-sm">
                4 RUNS
              </button>
              <button
                onClick={() => triggerRapidEvent("SIX")}
                className="bg-amber-50 border border-amber-200 hover:bg-amber-400 hover:text-white hover:border-amber-400 py-6 rounded-xl text-amber-700 font-black text-sm active:scale-95 transition-all shadow-sm">
                6 RUNS
              </button>
            </div>
            <button
              onClick={() => triggerRapidEvent("WICKET")}
              className="w-full bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 py-6 rounded-xl text-rose-700 font-black text-lg tracking-widest active:scale-95 transition-all shadow-sm">
              WICKET
            </button>
            {!!triggerNote && (
              <p className="text-[11px] font-bold text-gray-500 mt-1">
                {triggerNote}
              </p>
            )}

            <div className="pt-4 mt-auto border-t border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                <MessageSquare size={12} /> Custom Bottom Ticker
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type breaking news here..."
                  defaultValue={config.tickerText || ""}
                  onBlur={(e) => publishConfig({ tickerText: e.target.value })}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => toggleView("TICKER")}
                  className={`px-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all border ${config.activeViews?.includes("TICKER") ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md" : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"}`}>
                  {config.activeViews?.includes("TICKER") ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-2">
              <MonitorPlay size={16} className="text-gray-400" /> Full-Screen
              Overlays
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "TOSS_REPORT", label: "Toss", icon: PieChart },
                { id: "PLAYING_XI", label: "Lineups", icon: Users },
                { id: "INNINGS_BREAK", label: "Target", icon: Target },
                { id: "OVER_SUMMARY", label: "Summary", icon: LayoutTemplate },
                {
                  id: "POINTS_TABLE",
                  label: "POINTS_TABLE",
                  icon: ClipboardList,
                },
              ].map((overlay) => (
                <button
                  key={overlay.id}
                  onClick={() => toggleFullscreenView(overlay.id)}
                  className={`py-4 rounded-xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-2 border transition-all ${config.activeViews?.includes(overlay.id) ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                  <overlay.icon
                    size={18}
                    className={
                      config.activeViews?.includes(overlay.id)
                        ? "text-white"
                        : "text-gray-400"
                    }
                  />{" "}
                  {overlay.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => toggleFullscreenView("MATCH_SUMMARY")}
              className={`w-full mt-2 py-5 rounded-xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 border transition-all ${config.activeViews?.includes("MATCH_SUMMARY") ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md" : "bg-gray-50 border-gray-200 text-amber-600 hover:bg-gray-100"}`}>
              <Trophy size={18} /> Match Summary
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-2">
              <LayoutTemplate size={16} className="text-gray-400" /> Broadcast
              Themes
            </h3>
            <p className="text-[11px] text-gray-500">
              App themes are free in navbar. Tournament broadcast themes include
              premium presets (payments can be integrated later).
            </p>
            <div className="grid grid-cols-1 gap-2">
              {BROADCAST_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectBroadcastTheme(theme.id)}
                  className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                    config.broadcastThemeId === theme.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase tracking-wider text-xs text-gray-700">
                      {theme.label}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                        theme.premium
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                      {theme.premium ? "Premium" : "Free"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!!themeNote && (
              <p className="text-[11px] font-bold text-gray-500">{themeNote}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                  <Users size={16} className="text-gray-400" /> Player Spotlight
                </h3>

                {/* Auto-Show Toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                  <input
                    type="checkbox"
                    checked={config.autoSpotlight !== false}
                    onChange={(e) =>
                      publishConfig({ autoSpotlight: e.target.checked })
                    }
                    className="w-3 h-3 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">
                    Auto-Show (10s)
                  </span>
                </label>
              </div>

              {/* Live Crease Controls */}
              <div className="mb-5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Live Crease Controls
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      publishConfig({
                        spotlightPlayerId: matches.find(
                          (m) => m.id === config.activeMatchId,
                        )?.live_striker_id,
                      });
                      toggleView("PLAYER_SPOTLIGHT");
                    }}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                    🏏{" "}
                    {teamASquad
                      .concat(teamBSquad)
                      .find(
                        (p) =>
                          p.id ===
                          matches.find((m) => m.id === config.activeMatchId)
                            ?.live_striker_id,
                      )?.full_name || "Striker"}
                  </button>
                  <button
                    onClick={() => {
                      publishConfig({
                        spotlightPlayerId: matches.find(
                          (m) => m.id === config.activeMatchId,
                        )?.live_bowler_id,
                      });
                      toggleView("PLAYER_SPOTLIGHT");
                    }}
                    className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                    🥎{" "}
                    {teamASquad
                      .concat(teamBSquad)
                      .find(
                        (p) =>
                          p.id ===
                          matches.find((m) => m.id === config.activeMatchId)
                            ?.live_bowler_id,
                      )?.full_name || "Bowler"}
                  </button>
                </div>
              </div>

              {/* Manual Selection */}
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                Manual Selection
              </label>
              <select
                value={config.spotlightPlayerId || ""}
                onChange={(e) =>
                  publishConfig({ spotlightPlayerId: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-bold uppercase tracking-wider text-sm mb-4 cursor-pointer">
                <option value="">-- Choose a Player --</option>
                {teamASquad.length > 0 && (
                  <optgroup label="Team A">
                    {teamASquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {teamBSquad.length > 0 && (
                  <optgroup label="Team B">
                    {teamBSquad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <button
              onClick={() => toggleView("PLAYER_SPOTLIGHT")}
              disabled={!config.spotlightPlayerId}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${!config.spotlightPlayerId ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : config.activeViews?.includes("PLAYER_SPOTLIGHT") ? "bg-cyan-500 border-cyan-500 text-white shadow-md" : "bg-white border-gray-300 text-cyan-600 hover:bg-gray-50"}`}>
              <Users size={18} />{" "}
              {config.activeViews?.includes("PLAYER_SPOTLIGHT")
                ? "Hide Profile"
                : "Show Selected Profile"}
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-6">
              <ImageIcon size={16} className="text-gray-400" /> Sponsor
              Integration
            </h3>
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* 🔥 Banners Array Setup 🔥 */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                  Fullscreen Banners
                </label>

                {/* Cloudinary Widget Wrapper */}
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  options={{ multiple: true, cropping: true }}
                  onSuccess={(result: any) => {
                    const url = result.info.secure_url;
                    const currentBanners = config.sponsorBanners || [];
                    publishConfig({ sponsorBanners: [...currentBanners, url] });
                  }}>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="border-2 border-dashed border-gray-300 rounded-xl h-24 w-full flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-amber-500 transition-colors cursor-pointer bg-gray-50/50">
                      <UploadCloud size={24} className="mb-1" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        Upload Banner(s)
                      </span>
                    </button>
                  )}
                </CldUploadWidget>

                {/* Miniature Gallery of uploaded banners */}
                <div className="flex gap-2 overflow-x-auto py-1">
                  {(config.sponsorBanners || []).map(
                    (url: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative w-12 h-8 shrink-0 rounded border border-gray-200 group">
                        <img
                          src={url}
                          className="w-full h-full object-cover rounded"
                          alt="Banner Thumb"
                        />
                        <button
                          onClick={() => removeBanner(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                          <X size={10} />
                        </button>
                      </div>
                    ),
                  )}
                </div>

                <button
                  onClick={() => toggleFullscreenView("SPONSOR_BANNER")}
                  disabled={
                    !(config.sponsorBanners?.length > 0) &&
                    !config.activeViews?.includes("SPONSOR_BANNER")
                  }
                  className={`mt-auto py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${!(config.sponsorBanners?.length > 0) && !config.activeViews?.includes("SPONSOR_BANNER") ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : config.activeViews?.includes("SPONSOR_BANNER") ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
                  {config.activeViews?.includes("SPONSOR_BANNER")
                    ? "Hide Banners"
                    : "Play Banner Ad(s)"}
                </button>
              </div>

              {/* Bug Setup */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                  Small Corner Bug
                </label>
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  options={{ multiple: false, cropping: true }}
                  onSuccess={(result: any) => {
                    publishConfig({ sponsorBugUrl: result.info.secure_url });
                  }}>
                  {({ open }) => (
                    <div
                      onClick={() => open()}
                      className="border-2 border-dashed border-gray-300 rounded-xl h-24 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-pink-500 transition-colors cursor-pointer group relative overflow-hidden bg-gray-50/50">
                      {config.sponsorBugUrl ? (
                        <img
                          src={config.sponsorBugUrl}
                          className="absolute inset-0 w-full h-full object-contain p-2 opacity-60 group-hover:opacity-20 transition-opacity"
                          alt="Bug"
                        />
                      ) : null}
                      <ImageIcon size={24} className="mb-1 relative z-10" />
                      <span className="text-[9px] font-black uppercase tracking-widest relative z-10">
                        Upload Logo Bug
                      </span>
                    </div>
                  )}
                </CldUploadWidget>

                <button
                  onClick={() => toggleView("SPONSOR_BUG")}
                  disabled={
                    !config.sponsorBugUrl &&
                    !config.activeViews?.includes("SPONSOR_BUG")
                  }
                  className={`mt-auto py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${!config.sponsorBugUrl && !config.activeViews?.includes("SPONSOR_BUG") ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : config.activeViews?.includes("SPONSOR_BUG") ? "bg-pink-600 border-pink-600 text-white shadow-md" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
                  {config.activeViews?.includes("SPONSOR_BUG")
                    ? "Hide Bug"
                    : "Show Bug"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={() => publishConfig({ activeViews: [], event: null })}
            className="w-full py-5 bg-red-50 text-red-600 font-black border border-red-200 rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase text-sm tracking-[0.3em] shadow-sm">
            🚨 Kill All Graphics 🚨
          </button>
        </div>
      </div>
    </div>
  );
}
