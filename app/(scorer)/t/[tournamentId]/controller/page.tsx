"use client";
import { useEffect, useRef, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import {
  Tv,
  Users,
  MessageSquare,
  LayoutTemplate,
  Zap,
  MonitorPlay,
  X,
  Power,
  Eye,
  EyeOff,
  Send,
  Check,
  Award,
  Activity,
  Trophy,
  Target,
  Play,
  BarChart,
  Star,
  Upload,
  ImageIcon,
  Info,
  Volume2,
  VolumeX,
  Palette,
  User,
  Plus,
  Radio,
} from "lucide-react";

export default function MasterController({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  // --- STATE ---
  const [activeMatchId, setActiveMatchId] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teamASquad, setTeamASquad] = useState<any[]>([]);
  const [teamBSquad, setTeamBSquad] = useState<any[]>([]);

  // Sponsor Input State
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorPhone, setNewSponsorPhone] = useState("");

  // Master Overlay Configuration State
  const [config, setConfig] = useState({
    activeViews: [] as string[],
    showTicker: false,
    hideBottomScoreTicker: false,
    sponsors: [] as any[],
    fullScreenBanners: [] as any[],
    organizerName: "",
    customMsgTitle: "",
    customMsgSub: "",
    tickerText: "",
    spotlightPlayerId: "",
    autoSpotlightEnabled: true,
    appLogo: "",
    showAppLogo: false,
    broadcastAudioEnabled: true,
  });
  const [isStudioConnected, setIsStudioConnected] = useState(false);
  const studioChannelRef = useRef<any>(null);
  const isStudioConnectedRef = useRef(false);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const channel = supabase.channel(`broadcast-${tournamentId}`);
    studioChannelRef.current = channel;

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        isStudioConnectedRef.current = true;
        setIsStudioConnected(true);
        console.log("Studio Link Active");
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        isStudioConnectedRef.current = false;
        setIsStudioConnected(false);
      }
    });

    fetchMatches();

    return () => {
      isStudioConnectedRef.current = false;
      setIsStudioConnected(false);
      studioChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchMatches = async () => {
    const { data } = await supabase
      .from("matches")
      .select(
        "id, team1_id, team2_id, team1:team1_id(short_name), team2:team2_id(short_name)",
      )
      .eq("tournament_id", tournamentId)
      .eq("status", "live");
    if (data) setMatches(data);
  };

  useEffect(() => {
    if (!activeMatchId) {
      setTeamASquad([]);
      setTeamBSquad([]);
      return;
    }
    const fetchSquads = async () => {
      const match = matches.find((m) => m.id === activeMatchId);
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
  }, [activeMatchId, matches]);

  const updateDB = (newConfig: any) => {
    setConfig(newConfig);
  };

  // --- REALTIME SYNC ENGINE ---
  const syncToOverlay = (updates: any) => {
    const newConfig = { ...configRef.current, ...updates };
    configRef.current = newConfig;
    updateDB(newConfig);

    if (isStudioConnectedRef.current && studioChannelRef.current) {
      studioChannelRef.current.send({
        type: "broadcast",
        event: "overlay-sync",
        payload: newConfig,
      });
    }
  };

  const toggleView = (viewName: string) => {
    const views = config.activeViews || [];
    const newViews = views.includes(viewName)
      ? views.filter((v) => v !== viewName)
      : [...views, viewName];
    syncToOverlay({ activeViews: newViews });
  };

  const isActive = (viewName: string) => config.activeViews.includes(viewName);

  const triggerManualEvent = (type: string) => {
    syncToOverlay({ manualAnimation: type, manualTriggerTime: Date.now() });
  };

  // --- COMPONENT HELPERS ---
  const panelClass =
    "bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden";
  const headerClass =
    "flex items-center gap-2 text-slate-300 font-black uppercase tracking-widest text-[10px] pb-2 border-b border-slate-800/80 mb-1";
  const inputClass =
    "w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600";

  const ToggleBtn = ({
    label,
    active,
    onClick,
    colorClass = "bg-teal-600",
    activeText = "text-white",
  }: any) => (
    <button
      onClick={onClick}
      className={`w-full py-2 px-3 rounded text-[10px] font-bold tracking-wider uppercase flex items-center justify-between transition-all border ${active ? `${colorClass} border-transparent shadow-[0_0_10px_rgba(0,0,0,0.5)] ${activeText}` : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"}`}>
      <div className="flex items-center gap-2 truncate">
        <div
          className={`w-3 h-3 rounded-sm flex items-center justify-center shrink-0 border ${active ? "border-white/50 bg-white/20" : "border-slate-600"}`}>
          {active && <Check size={10} strokeWidth={4} />}
        </div>
        <span className="truncate">{label}</span>
      </div>
      {active ? (
        <Eye size={12} className="shrink-0 ml-2" />
      ) : (
        <EyeOff size={12} className="opacity-40 shrink-0 ml-2" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 p-2 md:p-4">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
        {/* --- TOP BAR --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 animate-pulse text-white p-2 rounded shrink-0">
              <Radio size={16} />
            </div>
            <div>
              <h1 className="text-white font-black uppercase tracking-widest text-sm leading-none">
                Broadcast Studio
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Master Overlay Controller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Active Feed:
            </span>
            <select
              value={activeMatchId}
              onChange={(e) => {
                const matchId = e.target.value;
                setActiveMatchId(matchId);
                syncToOverlay({ activeMatchId: matchId });
              }}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none w-full md:w-64 cursor-pointer">
              <option value="">-- No Match Connected --</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.team1?.short_name} vs {m.team2?.short_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* --- 3 COLUMN PRO GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* ========================================================= */}
          {/* COL 1: GRAPHICS & BRANDING                                */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-4">
            {/* Match Displays */}
            <div className={panelClass}>
              <div className={headerClass}>
                <LayoutTemplate size={12} /> Match Displays
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ToggleBtn
                  label="Main Scorebug"
                  active={isActive("SCOREBUG")}
                  onClick={() => toggleView("SCOREBUG")}
                  colorClass="bg-blue-600"
                />
                <ToggleBtn
                  label="Mini Corner"
                  active={isActive("MINI_SCORE")}
                  onClick={() => toggleView("MINI_SCORE")}
                  colorClass="bg-blue-600"
                />
                <ToggleBtn
                  label="Partnership"
                  active={isActive("PARTNERSHIP")}
                  onClick={() => toggleView("PARTNERSHIP")}
                  colorClass="bg-amber-600"
                />
                <ToggleBtn
                  label="Hide BTM Bar"
                  active={config.hideBottomScoreTicker}
                  onClick={() =>
                    syncToOverlay({
                      hideBottomScoreTicker: !config.hideBottomScoreTicker,
                    })
                  }
                  colorClass="bg-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <ToggleBtn
                  label="XI (Team A)"
                  active={isActive("SQUAD_A")}
                  onClick={() => toggleView("SQUAD_A")}
                  colorClass="bg-cyan-700"
                />
                <ToggleBtn
                  label="XI (Team B)"
                  active={isActive("SQUAD_B")}
                  onClick={() => toggleView("SQUAD_B")}
                  colorClass="bg-rose-700"
                />
              </div>
            </div>

            {/* App Branding */}
            <div className={panelClass}>
              <div className={headerClass}>
                <Palette size={12} /> App Branding
              </div>
              <div className="flex gap-2 items-center">
                {config.appLogo && (
                  <img
                    src={config.appLogo}
                    className="h-8 w-12 object-contain bg-slate-950 rounded border border-slate-800"
                  />
                )}
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  onSuccess={(res: any) =>
                    syncToOverlay({ appLogo: res.info.secure_url })
                  }>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="flex-1 py-2 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold uppercase hover:bg-slate-800 flex items-center justify-center gap-1">
                      <Upload size={12} />{" "}
                      {config.appLogo ? "Change" : "Upload Logo"}
                    </button>
                  )}
                </CldUploadWidget>
                {config.appLogo && (
                  <button
                    onClick={() =>
                      syncToOverlay({ appLogo: "", showAppLogo: false })
                    }
                    className="p-2 rounded bg-red-950 border border-red-900 text-red-500 hover:bg-red-900">
                    <X size={12} />
                  </button>
                )}
              </div>
              <ToggleBtn
                label="Show Logo on Screen"
                active={config.showAppLogo}
                onClick={() =>
                  syncToOverlay({ showAppLogo: !config.showAppLogo })
                }
                colorClass="bg-indigo-600"
              />
            </div>

            {/* Sponsor Bug */}
            <div className={panelClass}>
              <div className={headerClass}>
                <Award size={12} /> Sponsor & Organizer
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inputClass} mb-0`}
                  placeholder="Sponsor Name"
                  value={newSponsorName}
                  onChange={(e) => setNewSponsorName(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (!newSponsorName.trim()) return;
                    syncToOverlay({
                      sponsors: [
                        ...config.sponsors,
                        {
                          id: Date.now().toString(),
                          name: newSponsorName,
                          image: "",
                        },
                      ],
                    });
                    setNewSponsorName("");
                  }}
                  className="px-3 rounded bg-slate-800 text-white hover:bg-slate-700">
                  <Plus size={14} />
                </button>
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  onSuccess={(res: any) => {
                    syncToOverlay({
                      sponsors: [
                        ...config.sponsors,
                        {
                          id: Date.now().toString(),
                          name: newSponsorName.trim(),
                          image: res.info.secure_url,
                        },
                      ],
                    });
                    setNewSponsorName("");
                  }}>
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="px-3 rounded bg-indigo-900/50 text-indigo-400 border border-indigo-800 hover:bg-indigo-900">
                      <ImageIcon size={14} />
                    </button>
                  )}
                </CldUploadWidget>
              </div>

              {config.sponsors.length > 0 && (
                <div className="max-h-20 overflow-y-auto bg-slate-950 border border-slate-800 rounded p-1 space-y-1">
                  {config.sponsors.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center text-[10px] bg-slate-900 px-2 py-1 rounded">
                      <span className="truncate flex items-center gap-2">
                        {s.image && (
                          <img
                            src={s.image}
                            className="w-4 h-4 object-contain"
                          />
                        )}{" "}
                        {s.name || "Image"}
                      </span>
                      <button
                        onClick={() =>
                          syncToOverlay({
                            sponsors: config.sponsors.filter(
                              (x) => x.id !== s.id,
                            ),
                          })
                        }
                        className="text-red-400 hover:text-red-300">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ToggleBtn
                label="Show Sponsor Bug"
                active={isActive("SPONSOR_BUG")}
                onClick={() => toggleView("SPONSOR_BUG")}
                colorClass="bg-amber-600"
                activeText="text-slate-900"
              />

              <div className="pt-2 border-t border-slate-800 mt-1">
                <input
                  className={inputClass}
                  placeholder="Organizer Name"
                  value={config.organizerName}
                  onChange={(e) =>
                    syncToOverlay({ organizerName: e.target.value })
                  }
                />
                <ToggleBtn
                  label="Show Organizer Card"
                  active={isActive("ORGANIZER")}
                  onClick={() => toggleView("ORGANIZER")}
                  colorClass="bg-purple-600"
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COL 2: FULL-SCREEN & ALERTS                               */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-4">
            {/* Full Screen Overlays */}
            <div className={panelClass}>
              <div className={headerClass}>
                <BarChart size={12} /> Full-Screen Overlays
              </div>
              <div className="flex flex-col gap-2">
                <ToggleBtn
                  label="Over Summary"
                  active={isActive("SUMMARY_CARD")}
                  onClick={() => toggleView("SUMMARY_CARD")}
                  colorClass="bg-indigo-700"
                />
                <ToggleBtn
                  label="Live Win Predictor"
                  active={isActive("WIN_PREDICTOR")}
                  onClick={() => toggleView("WIN_PREDICTOR")}
                  colorClass="bg-indigo-700"
                />
                <ToggleBtn
                  label="Toss Report"
                  active={isActive("TOSS_CARD")}
                  onClick={() => toggleView("TOSS_CARD")}
                  colorClass="bg-indigo-700"
                />
                <ToggleBtn
                  label="Innings Break / Target"
                  active={isActive("INNINGS_BREAK_CARD")}
                  onClick={() => toggleView("INNINGS_BREAK_CARD")}
                  colorClass="bg-indigo-700"
                />
                <ToggleBtn
                  label="Match Result"
                  active={isActive("RESULT_CARD")}
                  onClick={() => toggleView("RESULT_CARD")}
                  colorClass="bg-indigo-700"
                />
                <div className="h-px bg-slate-800 my-1" />
                <ToggleBtn
                  label="Match Intro Slab"
                  active={isActive("MATCH_INTRO")}
                  onClick={() => toggleView("MATCH_INTRO")}
                  colorClass="bg-cyan-600"
                />
                <ToggleBtn
                  label="Live Points Table"
                  active={isActive("POINTS_TABLE")}
                  onClick={() => {
                    const s = !isActive("POINTS_TABLE");
                    syncToOverlay({
                      activeViews: s
                        ? [...config.activeViews, "POINTS_TABLE"]
                        : config.activeViews.filter(
                            (v) => v !== "POINTS_TABLE",
                          ),
                      hideBottomScoreTicker: s,
                    });
                  }}
                  colorClass="bg-emerald-600"
                />
              </div>
            </div>

            {/* Alerts & Ticker */}
            <div className={panelClass}>
              <div className={headerClass}>
                <MessageSquare size={12} /> Alerts & Ticker
              </div>
              <div>
                <input
                  className={`${inputClass} mb-2`}
                  placeholder="Giant Title (e.g. FREE HIT)"
                  value={config.customMsgTitle}
                  onChange={(e) =>
                    syncToOverlay({ customMsgTitle: e.target.value })
                  }
                />
                <input
                  className={`${inputClass} mb-2`}
                  placeholder="Subtitle (Optional)"
                  value={config.customMsgSub}
                  onChange={(e) =>
                    syncToOverlay({ customMsgSub: e.target.value })
                  }
                />
                <button
                  onClick={() => {
                    syncToOverlay({
                      activeViews: [...config.activeViews, "CUSTOM_MSG"],
                    });
                    setTimeout(
                      () =>
                        syncToOverlay({
                          activeViews: config.activeViews.filter(
                            (v) => v !== "CUSTOM_MSG",
                          ),
                        }),
                      5000,
                    );
                  }}
                  className="w-full bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold uppercase py-2.5 rounded shadow-[0_0_15px_rgba(225,29,72,0.3)] flex justify-center gap-2 items-center">
                  Flash Alert (5s) <Send size={12} />
                </button>
              </div>
              <div className="pt-3 border-t border-slate-800 mt-1">
                <input
                  className={`${inputClass} mb-2`}
                  placeholder="Bottom Scroll Ticker Text..."
                  value={config.tickerText}
                  onChange={(e) =>
                    syncToOverlay({ tickerText: e.target.value })
                  }
                />
                <ToggleBtn
                  label="Show News Ticker"
                  active={config.showTicker}
                  onClick={() =>
                    syncToOverlay({ showTicker: !config.showTicker })
                  }
                  colorClass="bg-rose-600"
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COL 3: LIVE ACTION & EMERGENCY                            */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-4">
            {/* Player Spotlight */}
            <div className={panelClass}>
              <div className={headerClass}>
                <User size={12} /> Player Spotlight
              </div>
              <select
                value={config.spotlightPlayerId}
                onChange={(e) =>
                  syncToOverlay({ spotlightPlayerId: e.target.value })
                }
                className={inputClass}>
                <option value="">-- Manual Player Select --</option>
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
              <div className="flex gap-2">
                <button
                  onClick={() => syncToOverlay({ spotlightType: "striker" })}
                  className="flex-1 py-2 rounded bg-slate-950 border border-slate-800 text-amber-500 hover:bg-slate-800 text-[10px] font-bold uppercase">
                  Show Striker
                </button>
                <button
                  onClick={() => syncToOverlay({ spotlightType: "bowler" })}
                  className="flex-1 py-2 rounded bg-slate-950 border border-slate-800 text-blue-400 hover:bg-slate-800 text-[10px] font-bold uppercase">
                  Show Bowler
                </button>
              </div>
              <ToggleBtn
                label="Auto-Show Incoming (12s)"
                active={config.autoSpotlightEnabled}
                onClick={() =>
                  syncToOverlay({
                    autoSpotlightEnabled: !config.autoSpotlightEnabled,
                  })
                }
                colorClass="bg-teal-700"
              />
              <ToggleBtn
                label="Show Selected Profile"
                active={isActive("SPOTLIGHT")}
                onClick={() => {
                  if (!config.spotlightPlayerId) return alert("Select Player");
                  toggleView("SPOTLIGHT");
                }}
                colorClass="bg-teal-600"
              />
            </div>

            {/* Events & Audio */}
            <div className={panelClass}>
              <div className={headerClass}>
                <Zap size={12} /> Events & Audio
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => triggerManualEvent("FOUR")}
                  className="py-2 bg-teal-800/50 hover:bg-teal-700 text-teal-400 border border-teal-800 rounded font-black text-xs">
                  4
                </button>
                <button
                  onClick={() => triggerManualEvent("SIX")}
                  className="py-2 bg-amber-800/50 hover:bg-amber-700 text-amber-400 border border-amber-800 rounded font-black text-xs">
                  6
                </button>
                <button
                  onClick={() => triggerManualEvent("WICKET")}
                  className="py-2 bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-900 rounded font-black text-xs">
                  OUT
                </button>
              </div>
              <ToggleBtn
                label="Auto-Sounds (4s, 6s, W)"
                active={config.broadcastAudioEnabled}
                onClick={() =>
                  syncToOverlay({
                    broadcastAudioEnabled: !config.broadcastAudioEnabled,
                  })
                }
                icon={config.broadcastAudioEnabled ? Volume2 : VolumeX}
                colorClass="bg-green-700"
              />
            </div>

            {/* Break Banners */}
            <div className={panelClass}>
              <div className={headerClass}>
                <Tv size={12} /> Break Banners
              </div>
              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                onSuccess={(res: any) => {
                  syncToOverlay({
                    fullScreenBanners: [
                      ...config.fullScreenBanners,
                      { id: Date.now().toString(), image: res.info.secure_url },
                    ],
                  });
                }}>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full py-2 rounded bg-slate-950 border border-dashed border-slate-700 text-slate-400 hover:border-teal-500 hover:text-teal-500 text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                    <ImageIcon size={12} /> Upload Ad Banner
                  </button>
                )}
              </CldUploadWidget>
              {config.fullScreenBanners.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-1 bg-slate-950 rounded custom-scrollbar border border-slate-800">
                  {config.fullScreenBanners.map((b) => (
                    <div key={b.id} className="relative shrink-0">
                      <img
                        src={b.image}
                        className="h-8 w-14 object-cover rounded border border-slate-700"
                      />
                      <button
                        onClick={() =>
                          syncToOverlay({
                            fullScreenBanners: config.fullScreenBanners.filter(
                              (x) => x.id !== b.id,
                            ),
                          })
                        }
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5">
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ToggleBtn
                label="Show App Trnmt Banner"
                active={isActive("APP_TOURNAMENT_BANNER")}
                onClick={() => toggleView("APP_TOURNAMENT_BANNER")}
                colorClass="bg-yellow-600"
                activeText="text-slate-900"
              />
              <ToggleBtn
                label="Play Uploaded Ad Banners"
                active={isActive("CUSTOM_AD_BANNERS")}
                onClick={() => {
                  if (config.fullScreenBanners.length === 0)
                    return alert("Upload a banner first!");
                  toggleView("CUSTOM_AD_BANNERS");
                }}
                colorClass="bg-orange-600"
              />
            </div>

            {/* EMERGENCY KILL SWITCH */}
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mt-auto">
              <button
                onClick={() => syncToOverlay({ activeViews: [] })}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded shadow-[0_0_15px_rgba(220,38,38,0.4)] flex justify-center items-center gap-2 mb-2">
                <X size={14} strokeWidth={3} /> Clear Entire Screen
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "End Broadcast? This reverts to the default Tournament Banner.",
                    )
                  ) {
                    syncToOverlay({
                      activeViews: ["APP_TOURNAMENT_BANNER"],
                      activeMatchId: "",
                    });
                    setActiveMatchId("");
                  }
                }}
                className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-widest rounded flex justify-center items-center gap-2">
                <Power size={12} /> End Broadcast & Release
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
