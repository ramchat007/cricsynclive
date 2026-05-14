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
  MessageCircle,
  Play,
} from "lucide-react";
import { BROADCAST_THEMES } from "@/lib/themes";
import FeatureGate from "@/app/components/FeatureGate";

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
  const prevPlayersRef = useRef({
    striker: null,
    nonStriker: null,
    bowler: null,
  });
  const spotlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref for config so our websocket doesn't constantly disconnect when typing,
  // and for safe array manipulation (banners)
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // 🔥 THE MASTER SYNC ENGINE 🔥
  // Merges safe state + WebSocket + Supabase all in one bulletproof function
  const publishConfig = (updates: any) => {
    setConfig((prevConfig: any) => {
      const nextConfig = { ...prevConfig, ...updates };

      // 1. Fire instantly to the live overlay via WebSockets
      if (studioChannelRef.current) {
        studioChannelRef.current.send({
          type: "broadcast",
          event: "sync_graphics",
          payload: nextConfig,
        });
      }

      // 2. Save permanently to Supabase in the background
      if (tournamentId) {
        supabase
          .from("tournaments")
          .update({ broadcast_state: nextConfig })
          .eq("id", tournamentId)
          .then(({ error }) => {
            if (error) console.error("Failed to sync overlay:", error);
          });
      }

      // 3. Update the controller UI safely
      return nextConfig;
    });
  };

  useEffect(() => {
    if (!tournamentId) return;

    // We consolidate fetching the config and the live matches into one smart function
    const fetchMatchesAndSync = async () => {
      // 1. Get Live Matches
      const { data: mData } = await supabase
        .from("matches")
        .select(
          `
          id, 
          team1_id, 
          team2_id,
          team1:team1_id(short_name, name), 
          team2:team2_id(short_name, name)
        `,
        )
        .eq("tournament_id", tournamentId)
        .eq("status", "live");

      const liveMatches = mData || [];
      setMatches(liveMatches);

      // 2. Get Current Broadcast Config
      const { data: tData } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();

      let loadedState = tData?.broadcast_state || {};

      // Safety check for old banner string format
      if (loadedState.sponsorBannerUrl) {
        loadedState.sponsorBanners = [loadedState.sponsorBannerUrl];
        delete loadedState.sponsorBannerUrl;
      }

      // 🔥 3. THE AUTO-SELECT ENGINE 🔥
      // Check if our currently selected match is actually still live
      const isCurrentActiveLive = liveMatches.some(
        (m) => m.id === loadedState.activeMatchId,
      );

      // If there are live matches, BUT we either have no match selected OR the selected match finished...
      if (
        liveMatches.length > 0 &&
        (!loadedState.activeMatchId || !isCurrentActiveLive)
      ) {
        const newActiveId = liveMatches[0].id;
        loadedState.activeMatchId = newActiveId;

        // Instantly force-push this new match ID to the live overlay and database!
        publishConfig({ activeMatchId: newActiveId });
        console.log(`Auto-selected new live match: ${newActiveId}`);
      } else if (liveMatches.length === 0 && loadedState.activeMatchId) {
        // Optional cleanup: If no matches are live, clear the active match
        loadedState.activeMatchId = "";
        publishConfig({ activeMatchId: "" });
      }

      setConfig(loadedState);
    };

    // Run the initial fetch
    fetchMatchesAndSync();

    // 4. Setup Studio Graphics WebSocket (Your existing channel)
    const channel = supabase.channel(`studio_graphics_${tournamentId}`);
    studioChannelRef.current = channel;
    channel.subscribe();

    // 5. Setup Match Monitor WebSocket (The new listener)
    // This listens for any changes to matches in this tournament (like a status going "live")
    const matchMonitor = supabase
      .channel(`match_auto_selector_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log("Match state changed! Auto-evaluating live matches...");
          // Instantly re-run the logic to auto-update dropdowns and overlays
          fetchMatchesAndSync();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(matchMonitor);
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

  // --- SMART AUTOMATED PLAYER SPOTLIGHT ENGINE ---
  useEffect(() => {
    const matchId = config.activeMatchId;
    if (!matchId) return;

    // 1. Initial Baseline Fetch
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

          if (
            currentStriker &&
            currentStriker !== oldRefs.striker &&
            currentStriker !== oldRefs.nonStriker
          ) {
            newPlayerId = currentStriker;
          } else if (
            currentNonStriker &&
            currentNonStriker !== oldRefs.striker &&
            currentNonStriker !== oldRefs.nonStriker
          ) {
            newPlayerId = currentNonStriker;
          } else if (currentBowler && currentBowler !== oldRefs.bowler) {
            newPlayerId = currentBowler;
          }

          prevPlayersRef.current = {
            striker: currentStriker,
            nonStriker: currentNonStriker,
            bowler: currentBowler,
          };

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
              // Safely remove PLAYER_SPOTLIGHT using configRef and our master sync engine
              publishConfig({
                activeViews: (configRef.current.activeViews || []).filter(
                  (v: string) => v !== "PLAYER_SPOTLIGHT",
                ),
              });
            }, 10000);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [config.activeMatchId]);

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
      "LIVE_QUIZ",
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
    // Pure Manual Override - No database validation needed!
    // As long as the button is clicked, we force the graphic to the screen.
    publishConfig({ event: eventType, eventTime: Date.now() });

    setTriggerNote(`${eventType} graphic fired! 🚀`);
    setTimeout(() => setTriggerNote(""), 1800);
  };

  const removeBanner = (indexToRemove: number) => {
    // ✅ Safe Array Deletion
    const newBanners = (configRef.current.sponsorBanners || []).filter(
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

  // Helper to generate dynamic questions based on current match data
  const generateDynamicQuestions = () => {
    const matchData = matches.find((m) => m.id === config.activeMatchId);
    if (!matchData) return [];

    return [
      {
        question: `Who won the toss in today's match between ${matchData.team1?.name} and ${matchData.team2?.name}?`,
        options: [matchData.team1?.name, matchData.team2?.name],
      },
      {
        question: `Which team is currently leading the tournament points table?`,
        options: [matchData.team1?.name, matchData.team2?.name],
      },
      {
        question: `Who will win the current battle between ${matchData.team1?.name} and ${matchData.team2?.name}?`,
        options: [matchData.team1?.name, matchData.team2?.name],
      },
    ];
  };

  return (
    <FeatureGate
      tournamentId={tournamentId}
      requiredTier="broadcast"
      featureKey="obs_overlays_enabled"
      featureName="Master Overlay Controller"
    >
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 font-sans pb-24 transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="bg-[var(--surface-1)] border border-[var(--border-1)] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-sm gap-4 transition-colors">
            <div className="flex items-center gap-3">
              <Radio className="text-[var(--accent)] animate-pulse" size={28} />
              <div>
                <h1 className="text-[var(--foreground)] font-black uppercase tracking-tighter text-2xl leading-none">
                  Studio V2 Control
                </h1>
                <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">
                  Broadcast Director
                </p>
              </div>
            </div>
            <select
              value={config.activeMatchId || ""}
              onChange={(e) => publishConfig({ activeMatchId: e.target.value })}
              className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl px-6 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors font-bold uppercase tracking-wider text-sm w-full md:w-auto cursor-pointer"
            >
              <option value="">-- Select Active Feed --</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.team1?.short_name} vs {m.team2?.short_name}
                </option>
              ))}
            </select>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl space-y-4 shadow-sm flex flex-col transition-colors">
              <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2 mb-2">
                <Tv size={16} className="text-[var(--text-muted)]" /> In-Game
                Displays
              </h3>
              <button
                onClick={() => toggleView("SCOREBUG")}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("SCOREBUG") ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                Main Score Ticker{" "}
                {config.activeViews?.includes("SCOREBUG") ? (
                  <Check size={18} />
                ) : (
                  <EyeOff size={18} />
                )}
              </button>
              <button
                onClick={() => toggleView("MINI_SCOREBUG")}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("MINI_SCOREBUG") ? "bg-cyan-600 border-cyan-600 text-white shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                Mini Corner Bug{" "}
                {config.activeViews?.includes("MINI_SCOREBUG") ? (
                  <Check size={18} />
                ) : (
                  <EyeOff size={18} />
                )}
              </button>
              <button
                onClick={() => toggleView("PARTNERSHIP")}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all ${config.activeViews?.includes("PARTNERSHIP") ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
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
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-between px-5 border transition-all mt-auto ${config.showAppLogo ? "bg-[var(--foreground)] border-[var(--border-1)] text-[var(--background)]" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                Watermark Logo{" "}
                {config.showAppLogo ? (
                  <RotateCw size={16} className="text-[var(--accent)]" />
                ) : (
                  <EyeOff size={16} />
                )}
              </button>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl space-y-4 shadow-sm flex flex-col transition-colors">
              <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2 mb-2">
                <Zap size={16} className="text-[var(--text-muted)]" /> Rapid
                Triggers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => triggerRapidEvent("FOUR")}
                  className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 py-6 rounded-xl text-emerald-500 font-black text-sm active:scale-95 transition-all shadow-sm"
                >
                  4 RUNS
                </button>
                <button
                  onClick={() => triggerRapidEvent("SIX")}
                  className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-white hover:border-amber-500 py-6 rounded-xl text-amber-500 font-black text-sm active:scale-95 transition-all shadow-sm"
                >
                  6 RUNS
                </button>
              </div>
              <button
                onClick={() => triggerRapidEvent("WICKET")}
                className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white hover:border-rose-600 py-6 rounded-xl text-rose-500 font-black text-lg tracking-widest active:scale-95 transition-all shadow-sm"
              >
                WICKET
              </button>
              {!!triggerNote && (
                <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1">
                  {triggerNote}
                </p>
              )}

              <div className="pt-4 mt-auto border-t border-[var(--border-1)]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1">
                  <MessageSquare size={12} /> Custom Bottom Ticker
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type breaking news here..."
                    defaultValue={config.tickerText || ""}
                    onBlur={(e) =>
                      publishConfig({ tickerText: e.target.value })
                    }
                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder-[var(--text-muted)]"
                  />
                  <button
                    onClick={() => toggleView("TICKER")}
                    className={`px-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all border ${config.activeViews?.includes("TICKER") ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                  >
                    {config.activeViews?.includes("TICKER") ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl space-y-4 shadow-sm transition-colors">
              <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2 mb-2">
                <MonitorPlay size={16} className="text-[var(--text-muted)]" />{" "}
                Full-Screen Overlays
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "TOSS_REPORT", label: "Toss", icon: PieChart },
                  { id: "PLAYING_XI", label: "Lineups", icon: Users },
                  { id: "INNINGS_BREAK", label: "Target", icon: Target },
                  {
                    id: "OVER_SUMMARY",
                    label: "Summary",
                    icon: LayoutTemplate,
                  },
                  {
                    id: "POINTS_TABLE",
                    label: "Standings",
                    icon: ClipboardList,
                  },
                  { id: "LIVE_QUIZ", label: "Live Quiz", icon: MessageCircle },
                ].map((overlay) => (
                  <button
                    key={overlay.id}
                    onClick={() => toggleFullscreenView(overlay.id)}
                    className={`py-4 rounded-xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-2 border transition-all ${config.activeViews?.includes(overlay.id) ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                  >
                    <overlay.icon
                      size={18}
                      className={
                        config.activeViews?.includes(overlay.id)
                          ? "text-white"
                          : "text-[var(--text-muted)]"
                      }
                    />{" "}
                    {overlay.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toggleFullscreenView("MATCH_SUMMARY")}
                className={`w-full mt-2 py-5 rounded-xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 border transition-all ${config.activeViews?.includes("MATCH_SUMMARY") ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md" : "bg-[var(--surface-2)] border-[var(--border-1)] text-amber-500 hover:text-amber-600"}`}
              >
                <Trophy size={18} /> Match Summary
              </button>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl space-y-4 shadow-sm transition-colors">
              <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2 mb-2">
                <LayoutTemplate
                  size={16}
                  className="text-[var(--text-muted)]"
                />{" "}
                Broadcast Themes
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                App themes are free in navbar. Tournament broadcast themes
                include premium presets (payments can be integrated later).
              </p>
              <div className="grid grid-cols-1 gap-2">
                {BROADCAST_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => selectBroadcastTheme(theme.id)}
                    className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                      config.broadcastThemeId === theme.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border-1)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-black uppercase tracking-wider text-xs ${config.broadcastThemeId === theme.id ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
                      >
                        {theme.label}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                          theme.premium
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-emerald-500/20 text-emerald-500"
                        }`}
                      >
                        {theme.premium ? "Premium" : "Free"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {!!themeNote && (
                <p className="text-[11px] font-bold text-[var(--text-muted)]">
                  {themeNote}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl shadow-sm flex flex-col justify-between transition-colors">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2">
                    <Users size={16} className="text-[var(--text-muted)]" />{" "}
                    Player Spotlight
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                    <input
                      type="checkbox"
                      checked={config.autoSpotlight !== false}
                      onChange={(e) =>
                        publishConfig({ autoSpotlight: e.target.checked })
                      }
                      className="w-3 h-3 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">
                      Auto-Show (10s)
                    </span>
                  </label>
                </div>

                <div className="mb-5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
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
                      className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
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
                      className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
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

                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                  Manual Selection
                </label>
                <select
                  value={config.spotlightPlayerId || ""}
                  onChange={(e) =>
                    publishConfig({ spotlightPlayerId: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-bold uppercase tracking-wider text-sm mb-4 cursor-pointer transition-colors"
                >
                  <option value="">-- Choose a Player --</option>
                  {teamASquad.length > 0 && (
                    <optgroup label="Team A" className="bg-[var(--surface-1)]">
                      {teamASquad.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {teamBSquad.length > 0 && (
                    <optgroup label="Team B" className="bg-[var(--surface-1)]">
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
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${!config.spotlightPlayerId ? "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] cursor-not-allowed" : config.activeViews?.includes("PLAYER_SPOTLIGHT") ? "bg-cyan-500 border-cyan-500 text-white shadow-md" : "bg-[var(--surface-1)] border-[var(--border-1)] text-cyan-500 hover:bg-[var(--surface-2)]"}`}
              >
                <Users size={18} />{" "}
                {config.activeViews?.includes("PLAYER_SPOTLIGHT")
                  ? "Hide Profile"
                  : "Show Selected Profile"}
              </button>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border-1)] p-6 rounded-2xl shadow-sm transition-colors">
              <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-[0.2em] flex items-center gap-2 mb-6">
                <ImageIcon size={16} className="text-[var(--text-muted)]" />{" "}
                Sponsor Integration
              </h3>
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* 🔥 Safe Array Setup for Banners 🔥 */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
                    Fullscreen Banners
                  </label>

                  <CldUploadWidget
                    uploadPreset={String(
                      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                    )}
                    options={{
                      multiple: false,
                      cropping: true,
                      showSkipCropButton: false,
                      // 🔥 Changed from 1 (Square) to 16/9 (Widescreen TV format)
                      croppingAspectRatio: 16 / 9,
                      showCompletedButton: true,
                    }}
                    onSuccess={(result: any) => {
                      let url = result.info.secure_url;

                      // 🔥 THE FIX: Tell Cloudinary to actively apply the crop!
                      // If the user used the crop tool, inject the crop command into the URL
                      if (
                        result.info.coordinates &&
                        result.info.coordinates.custom
                      ) {
                        url = url.replace(
                          "/upload/",
                          "/upload/c_crop,g_custom/",
                        );
                      }

                      // ✅ Reads from ref to prevent overwriting
                      const currentBanners =
                        configRef.current.sponsorBanners || [];
                      publishConfig({
                        sponsorBanners: [...currentBanners, url],
                      });
                    }}
                  >
                    {({ open }) => (
                      <button
                        onClick={() => open()}
                        className="border-2 border-dashed border-[var(--border-1)] rounded-xl h-24 w-full flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-amber-500 transition-colors cursor-pointer bg-[var(--surface-2)]/50"
                      >
                        <UploadCloud size={24} className="mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          Upload Banner(s)
                        </span>
                      </button>
                    )}
                  </CldUploadWidget>

                  <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                    {(config.sponsorBanners || []).map(
                      (url: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative w-12 h-8 shrink-0 rounded border border-[var(--border-1)] group"
                        >
                          <img
                            src={url}
                            className="w-full h-full object-cover rounded"
                            alt="Banner Thumb"
                          />
                          <button
                            onClick={() => removeBanner(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
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
                    className={`mt-auto py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${!(config.sponsorBanners?.length > 0) && !config.activeViews?.includes("SPONSOR_BANNER") ? "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] cursor-not-allowed" : config.activeViews?.includes("SPONSOR_BANNER") ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                  >
                    {config.activeViews?.includes("SPONSOR_BANNER")
                      ? "Hide Banners"
                      : "Play Banner Ad(s)"}
                  </button>
                </div>

                {/* Bug Setup */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
                    Small Corner Bug
                  </label>
                  <CldUploadWidget
                    uploadPreset={String(
                      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                    )}
                    options={{
                      multiple: false,
                      cropping: true,
                      showSkipCropButton: false,
                      croppingAspectRatio: 1,
                      showCompletedButton: true,
                    }}
                    onSuccess={(result: any) => {
                      let url = result.info.secure_url;
                      if (
                        result.info.coordinates &&
                        result.info.coordinates.custom
                      ) {
                        url = url.replace(
                          "/upload/",
                          "/upload/c_crop,g_custom/",
                        );
                      }
                      publishConfig({ sponsorBugUrl: url });
                    }}
                  >
                    {({ open }) => (
                      <div
                        onClick={() => open()}
                        className="border-2 border-dashed border-[var(--border-1)] rounded-xl h-24 flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-pink-500 transition-colors cursor-pointer group relative overflow-hidden bg-[var(--surface-2)]/50"
                      >
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
                    className={`mt-auto py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${!config.sponsorBugUrl && !config.activeViews?.includes("SPONSOR_BUG") ? "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] cursor-not-allowed" : config.activeViews?.includes("SPONSOR_BUG") ? "bg-pink-600 border-pink-600 text-white shadow-md" : "bg-[var(--surface-1)] border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                  >
                    {config.activeViews?.includes("SPONSOR_BUG")
                      ? "Hide Bug"
                      : "Show Bug"}
                  </button>
                </div>
              </div>
            </div>

            {/* 1. YOUTUBE SUBSCRIBE BANNER CONTROL */}
            <div className="p-4 border border-[var(--border-1)] rounded-xl bg-[var(--surface-1)] mb-4 shadow-sm transition-colors">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-red-500">
                <Play size={18} /> YouTube Engagement
              </h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={config.youtubeChannelName || ""}
                    onChange={(e) =>
                      publishConfig({ youtubeChannelName: e.target.value })
                    }
                    className="w-full border border-[var(--border-1)] rounded p-2 text-sm bg-[var(--surface-2)] text-[var(--foreground)] focus:border-[var(--accent)] outline-none transition-all placeholder-[var(--text-muted)]"
                  />
                </div>
                <button
                  onClick={() =>
                    publishConfig({
                      showSubscribeBanner: !config.showSubscribeBanner,
                    })
                  }
                  className={`px-6 py-2 rounded font-bold text-sm transition-all ${config.showSubscribeBanner ? "bg-red-600 text-white" : "bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                >
                  {config.showSubscribeBanner
                    ? "Hide Subscribe Banner"
                    : "Show Subscribe Banner"}
                </button>
              </div>
            </div>

            {/* 2. LIVE QUIZ GENERATOR CONTROL */}
            <div className="p-4 border border-[var(--border-1)] rounded-xl bg-[var(--surface-1)] shadow-sm transition-colors">
              <h3 className="font-bold mb-3 text-red-500 flex items-center gap-2">
                Live Quiz Config
              </h3>
              {/* Dynamic Question Selector */}
              <select
                className="w-full border border-[var(--border-1)] rounded p-2 text-sm mb-3 bg-[var(--surface-2)] text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                onChange={(e) => {
                  if (e.target.value !== "") {
                    const q = JSON.parse(e.target.value);
                    publishConfig({
                      quizData: {
                        question: q.question,
                        options: q.options,
                        results: null,
                      },
                    });
                  }
                }}
              >
                <option value="">-- Select Auto-Generated Question --</option>
                {generateDynamicQuestions().map((q, idx) => (
                  <option key={idx} value={JSON.stringify(q)}>
                    {q.question}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or type a custom question..."
                value={config.quizData?.question || ""}
                onChange={(e) =>
                  publishConfig({
                    quizData: { ...config.quizData, question: e.target.value },
                  })
                }
                className="w-full text-[var(--foreground)] focus:border-[var(--accent)] outline-none transition-all rounded p-2 text-lg mb-2 placeholder-[var(--text-muted)] truncate"
              />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[0, 1].map((i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    value={config.quizData?.options?.[i] || ""}
                    onChange={(e) => {
                      const newOpts = [
                        ...(config.quizData?.options || ["", "", "", ""]),
                      ];
                      newOpts[i] = e.target.value;
                      publishConfig({
                        quizData: { ...config.quizData, options: newOpts },
                      });
                    }}
                    className="border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--foreground)] focus:border-[var(--accent)] outline-none transition-all rounded p-2 text-sm placeholder-[var(--text-muted)]"
                  />
                ))}
              </div>
              {/* Simulate Youtube Results */}
              <div className="border-t border-[var(--border-1)] pt-3 mt-3">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-2">
                  Simulate YouTube Chat Results
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      publishConfig({
                        quizData: {
                          ...config.quizData,
                          results: { 0: 65, 1: 15, 2: 10, 3: 10 },
                        },
                      })
                    }
                    className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1 rounded text-xs font-bold hover:bg-amber-500 hover:text-amber-950 transition-colors"
                  >
                    A Wins
                  </button>
                  <button
                    onClick={() =>
                      publishConfig({
                        quizData: {
                          ...config.quizData,
                          results: { 0: 10, 1: 75, 2: 5, 3: 10 },
                        },
                      })
                    }
                    className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1 rounded text-xs font-bold hover:bg-amber-500 hover:text-amber-950 transition-colors"
                  >
                    B Wins
                  </button>
                  <button
                    onClick={() =>
                      publishConfig({
                        quizData: { ...config.quizData, results: null },
                      })
                    }
                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)] py-1 rounded text-xs font-bold transition-colors"
                  >
                    Clear Results
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() =>
                publishConfig({
                  activeViews: [],
                  event: null,
                  showSubscribeBanner: false,
                })
              }
              className="w-full py-5 bg-red-500/10 text-red-500 font-black border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase text-sm tracking-[0.3em] shadow-sm"
            >
              🚨 Kill All Graphics 🚨
            </button>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
