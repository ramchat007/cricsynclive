"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ZoomIn,
  Flashlight,
  ZapOff,
  Radio,
  AlertCircle,
  Mic,
  MicOff,
  Power,
  Moon,
  Sun,
  Plus,
  Minus,
  Tv,
  Image as ImageIcon,
  Users,
  Type,
  MessageSquare,
  Trophy,
  UploadCloud,
  Camera,
} from "lucide-react";

export default function StudioControl({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = React.use(params);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [camParam, setCamParam] = useState<string | null>(null);
  const [camCapabilities, setCamCapabilities] = useState<any>(null);

  // --- STUDIO TABS ---
  const [activeTab, setActiveTab] = useState<
    "camera" | "graphics" | "overlays" | "sponsors"
  >("camera");

  // --- CAMERA STATE ---
  const [remoteZoom, setRemoteZoom] = useState(1);
  const [remoteTorch, setRemoteTorch] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteOled, setRemoteOled] = useState(false);
  const [remoteExposure, setRemoteExposure] = useState(0);
  const [isLive, setIsLive] = useState(false);

  // --- OVERLAY STATE ---
  const [scorebugActive, setScorebugActive] = useState(true);
  const [tickerText, setTickerText] = useState("");
  const [tickerActive, setTickerActive] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customTextActive, setCustomTextActive] = useState(false);

  const [spotlightPlayer, setSpotlightPlayer] = useState("");
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [activeFullscreen, setActiveFullscreen] = useState<string | null>(null); // 'toss', 'innings', 'result', 'summary', 'xi'

  // --- SPONSOR STATE ---
  const [sponsorBannerUrl, setSponsorBannerUrl] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [sponsorBugUrl, setSponsorBugUrl] = useState("");
  const [bugActive, setBugActive] = useState(false);

  // --- REFS ---
  const signalingChannelRef = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const remoteZoomRef = useRef(1);
  const lastZoomTime = useRef(0);
  const lastExposureTime = useRef(0);
  const zoomIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    remoteZoomRef.current = remoteZoom;
  }, [remoteZoom]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const cameraQuery = searchParams.get("cam");
    if (cameraQuery) setCamParam(cameraQuery);
  }, []);

  useEffect(() => {
    if (!camParam) return;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (data?.broadcast_state?.activeMatchId)
        setMatchId(data.broadcast_state.activeMatchId);
    };
    fetchConfig();
  }, [tournamentId, camParam]);

  useEffect(() => {
    if (!matchId || !camParam) return;

    const connectionId = `${matchId}_${camParam}`;

    supabase
      .from("webrtc_signals")
      .select("status")
      .eq("match_id", connectionId)
      .single()
      .then(({ data }) => {
        if (data?.status === "live") setIsLive(true);
      });

    const channel = supabase.channel(`webrtc_broadcast_${connectionId}`);
    signalingChannelRef.current = channel;

    channel
      .on("broadcast", { event: "sync_state" }, (message) => {
        setIsLive(true);
        const data = message.payload;

        if (data.capabilities) setCamCapabilities(data.capabilities);
        if (Date.now() - lastZoomTime.current > 1000 && data.zoom !== undefined)
          setRemoteZoom(data.zoom);
        if (
          Date.now() - lastExposureTime.current > 1000 &&
          data.exposure !== undefined
        )
          setRemoteExposure(data.exposure);
        if (data.torch !== undefined) setRemoteTorch(data.torch);
        if (data.isMuted !== undefined) setRemoteMuted(data.isMuted);
        if (data.oled !== undefined) setRemoteOled(data.oled);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "request_sync",
            payload: {},
          });
        }
      });

    const dbSub = supabase
      .channel(`db_webrtc_remote_${connectionId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "webrtc_signals",
          filter: `match_id=eq.${connectionId}`,
        },
        () => {
          setIsLive(false);
          setCamCapabilities(null);
        },
      )
      .subscribe();

    dbChannelRef.current = dbSub;

    return () => {
      supabase.removeAllChannels();
    };
  }, [matchId, camParam]);

  // --- COMMAND SENDERS ---
  const sendPtzCommand = (type: string, value: any) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "ptz_command",
        payload: { type, value, timestamp: Date.now() },
      });
    }
  };

  const sendOverlayCommand = (
    type: string,
    value: any,
    extraData: any = {},
  ) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "overlay_command",
        payload: { type, active: value, ...extraData, timestamp: Date.now() },
      });
    }
  };

  // --- PTZ HANDLERS ---
  const handleRemoteZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRemoteZoom(val);
    const now = Date.now();
    if (now - lastZoomTime.current > 100) {
      sendPtzCommand("zoom", val);
      lastZoomTime.current = now;
    }
  };
  const handleZoomRelease = () => sendPtzCommand("zoom", remoteZoom);
  const startSmoothZoom = (direction: number) => {
    const min = camCapabilities?.zoom?.min || 1;
    const max = camCapabilities?.zoom?.max || 10;
    const stepSpeed = (max - min) * 0.05;
    zoomIntervalRef.current = setInterval(() => {
      let currentZ = Number(remoteZoomRef.current) || 1;
      let newZoom = Math.min(
        Math.max(currentZ + stepSpeed * direction, min),
        max,
      );
      setRemoteZoom(newZoom);
      sendPtzCommand("zoom", newZoom);
      lastZoomTime.current = Date.now();
    }, 150);
  };
  const stopSmoothZoom = () => {
    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
  };
  const snapZoom = (targetVal: number) => {
    const min = camCapabilities?.zoom?.min || 1;
    const max = camCapabilities?.zoom?.max || 10;
    let clamped = Math.min(Math.max(Number(targetVal), min), max);
    setRemoteZoom(clamped);
    sendPtzCommand("zoom", clamped);
    lastZoomTime.current = Date.now();
  };
  const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRemoteExposure(val);
    sendPtzCommand("exposure", val);
    lastExposureTime.current = Date.now();
  };
  const toggleRemoteTorch = () => {
    const newVal = !remoteTorch;
    setRemoteTorch(newVal);
    sendPtzCommand("torch", newVal);
  };
  const toggleRemoteMute = () => {
    const newVal = !remoteMuted;
    setRemoteMuted(newVal);
    sendPtzCommand("mute", newVal);
  };
  const toggleOledSleep = () => {
    const newVal = !remoteOled;
    setRemoteOled(newVal);
    sendPtzCommand("oled", newVal);
  };
  const handleKillStream = () => {
    if (
      window.confirm(
        "🚨 WARNING: This instantly kills the broadcast. Are you sure?",
      )
    )
      sendPtzCommand("stop", true);
  };

  // --- OVERLAY HANDLERS ---
  const toggleScorebug = () => {
    const val = !scorebugActive;
    setScorebugActive(val);
    sendOverlayCommand("scorebug", val);
  };
  const toggleTicker = () => {
    const val = !tickerActive;
    setTickerActive(val);
    sendOverlayCommand("ticker", val, { text: tickerText });
  };
  const toggleCustomText = () => {
    const val = !customTextActive;
    setCustomTextActive(val);
    sendOverlayCommand("custom_text", val, { text: customText });
  };
  const toggleSpotlight = () => {
    const val = !spotlightActive;
    setSpotlightActive(val);
    sendOverlayCommand("spotlight", val, { playerId: spotlightPlayer });
  };
  const toggleFullscreenOverlay = (type: string) => {
    if (activeFullscreen === type) {
      setActiveFullscreen(null);
      sendOverlayCommand("fullscreen", false);
    } else {
      setActiveFullscreen(type);
      sendOverlayCommand("fullscreen", true, { screenType: type });
    }
  };
  const toggleBanner = () => {
    const val = !bannerActive;
    setBannerActive(val);
    sendOverlayCommand("sponsor_banner", val, { url: sponsorBannerUrl });
  };
  const toggleBug = () => {
    const val = !bugActive;
    setBugActive(val);
    sendOverlayCommand("sponsor_bug", val, { url: sponsorBugUrl });
  };

  // --- RENDER FALLBACKS ---
  if (!camParam) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center text-white">
        <style>{`nav, header, footer { display: none !important; }`}</style>
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-red-500">
          Invalid Link
        </h1>
        <p className="text-gray-400 mt-2">No Camera ID provided in URL.</p>
      </div>
    );
  }
  if (!isLive) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center text-white">
        <style>{`nav, header, footer { display: none !important; }`}</style>
        <AlertCircle size={48} className="text-amber-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest">
          Stream Offline
        </h1>
        <p className="text-gray-400 mt-2">
          Waiting for{" "}
          <span className="text-cyan-500 font-mono">{camParam}</span>
        </p>
      </div>
    );
  }

  const rawMin = camCapabilities?.zoom?.min || 1;
  const rawMax = camCapabilities?.zoom?.max || 10;
  const rawExpMin = camCapabilities?.exposure?.min || -4;
  const rawExpMax = camCapabilities?.exposure?.max || 4;
  const mappedDisplayZoom =
    rawMax > rawMin
      ? (((Number(remoteZoom) - rawMin) / (rawMax - rawMin)) * 9 + 1).toFixed(1)
      : "1.0";

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <style>{`nav, header, footer { display: none !important; } ::-webkit-scrollbar { display: none; }`}</style>

      <div className="w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl my-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white">
              Studio V2 Control
            </h1>
            <p className="text-xs text-cyan-500 font-mono mt-1">
              ID: {camParam}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-2 rounded-full animate-pulse">
            <Radio size={16} />
            <span className="text-xs font-black uppercase tracking-widest">
              Live
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "camera" ? "bg-cyan-500 text-slate-900" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <Camera size={16} /> PTZ Camera
          </button>
          <button
            onClick={() => setActiveTab("graphics")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "graphics" ? "bg-teal-500 text-slate-900" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <Tv size={16} /> Match Graphics
          </button>
          <button
            onClick={() => setActiveTab("overlays")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "overlays" ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <Users size={16} /> Overlays & Spotlights
          </button>
          <button
            onClick={() => setActiveTab("sponsors")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "sponsors" ? "bg-amber-500 text-slate-900" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <ImageIcon size={16} /> Sponsors
          </button>
        </div>

        {/* --- TAB CONTENT: CAMERA --- */}
        {activeTab === "camera" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="md:col-span-4 space-y-4 flex flex-col">
              <button
                onClick={toggleRemoteMute}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteMuted ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-gray-950 text-emerald-500 border-gray-800 hover:bg-gray-800"}`}
              >
                {remoteMuted ? <MicOff size={28} /> : <Mic size={28} />}{" "}
                {remoteMuted ? "Muted" : "Mic Active"}
              </button>
              <button
                onClick={toggleOledSleep}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteOled ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-gray-950 text-indigo-400 border-gray-800 hover:bg-gray-800"}`}
              >
                {remoteOled ? <Moon size={28} /> : <Sun size={28} />}{" "}
                {remoteOled ? "Screen Off" : "Screen On"}
              </button>
              {camCapabilities?.torch !== undefined && (
                <button
                  onClick={toggleRemoteTorch}
                  className={`w-full flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteTorch ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-gray-950 text-amber-500 border-gray-800 hover:bg-gray-800"}`}
                >
                  {remoteTorch ? (
                    <Flashlight size={28} />
                  ) : (
                    <ZapOff size={28} />
                  )}{" "}
                  {remoteTorch ? "Torch ON" : "Torch OFF"}
                </button>
              )}
            </div>
            <div className="md:col-span-8 space-y-4 flex flex-col">
              <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex-1 flex flex-col shadow-lg relative overflow-hidden">
                <div className="flex justify-between gap-3 mb-8">
                  <button
                    onClick={() => snapZoom(rawMin)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black text-sm py-4 rounded-xl border border-gray-700 shadow active:scale-95 uppercase tracking-widest transition-all"
                  >
                    Wide
                  </button>
                  <button
                    onClick={() => snapZoom(rawMin + (rawMax - rawMin) * 0.3)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black text-sm py-4 rounded-xl border border-gray-700 shadow active:scale-95 uppercase tracking-widest transition-all"
                  >
                    Pitch
                  </button>
                  <button
                    onClick={() => snapZoom(rawMax)}
                    className="flex-1 bg-gray-800 hover:bg-cyan-900/50 text-cyan-400 border border-gray-700 hover:border-cyan-500/50 font-black text-sm py-4 rounded-xl shadow active:scale-95 uppercase tracking-widest transition-all"
                  >
                    Tight
                  </button>
                </div>
                <div className="flex items-center gap-6 mt-auto">
                  <div className="flex flex-col gap-1 shrink-0 bg-gray-900 p-1 rounded-xl border border-gray-800">
                    <button
                      onMouseDown={() => startSmoothZoom(1)}
                      onMouseUp={stopSmoothZoom}
                      onMouseLeave={stopSmoothZoom}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        startSmoothZoom(1);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopSmoothZoom();
                      }}
                      className="w-20 h-16 bg-gray-800 hover:bg-gray-700 active:bg-cyan-600 rounded-t-xl flex items-center justify-center text-white transition-colors touch-none select-none"
                    >
                      <Plus size={28} strokeWidth={3} />
                    </button>
                    <button
                      onMouseDown={() => startSmoothZoom(-1)}
                      onMouseUp={stopSmoothZoom}
                      onMouseLeave={stopSmoothZoom}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        startSmoothZoom(-1);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopSmoothZoom();
                      }}
                      className="w-20 h-16 bg-gray-800 hover:bg-gray-700 active:bg-cyan-600 rounded-b-xl flex items-center justify-center text-white transition-colors touch-none select-none"
                    >
                      <Minus size={28} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <ZoomIn size={18} className="text-cyan-500" /> Zoom
                        Level
                      </label>
                      <span className="text-cyan-500 font-mono font-black text-xl bg-cyan-500/10 px-4 py-1.5 rounded-lg">
                        {mappedDisplayZoom}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={rawMin}
                      max={rawMax}
                      step={camCapabilities?.zoom?.step || 0.1}
                      value={Number(remoteZoom) || rawMin}
                      onChange={handleRemoteZoom}
                      onPointerUp={handleZoomRelease}
                      onTouchEnd={handleZoomRelease}
                      className="w-full accent-cyan-500 h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Sun size={18} className="text-amber-500" /> Exposure (EV)
                  </label>
                  <span className="text-amber-500 font-mono font-black text-xl bg-amber-500/10 px-4 py-1.5 rounded-lg">
                    {Number(remoteExposure) > 0 ? "+" : ""}
                    {Number(remoteExposure).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-gray-600">-</span>
                  <input
                    type="range"
                    min={rawExpMin}
                    max={rawExpMax}
                    step={camCapabilities?.exposure?.step || 0.1}
                    value={Number(remoteExposure) || 0}
                    onChange={handleExposureChange}
                    className="flex-1 accent-amber-500 h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-lg font-black text-gray-600">+</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleKillStream}
              className="md:col-span-12 mt-2 py-5 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
            >
              <Power size={20} /> Emergency Kill Stream
            </button>
          </div>
        )}

        {/* --- TAB CONTENT: MATCH GRAPHICS --- */}
        {activeTab === "graphics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* SCOREBUG */}
            <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tv className="text-teal-500" size={20} />{" "}
                  <h3 className="font-black uppercase tracking-widest text-white text-lg">
                    Main Scorebug
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-6">
                  Bottom left corner score graphic
                </p>
              </div>
              <button
                onClick={toggleScorebug}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${scorebugActive ? "bg-teal-500 text-slate-900 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.4)]" : "bg-gray-800 text-gray-400 border-gray-700"}`}
              >
                {scorebugActive ? "Hide Scorebug" : "Show Scorebug"}
              </button>
            </div>

            {/* CUSTOM TEXT */}
            <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Type className="text-indigo-500" size={20} />{" "}
                  <h3 className="font-black uppercase tracking-widest text-white text-lg">
                    Custom Text
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-4">
                  Floating custom message
                </p>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Free Entry to VIP Stand"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 outline-none focus:border-indigo-500 mb-4 font-bold"
                />
              </div>
              <button
                onClick={toggleCustomText}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${customTextActive ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]" : "bg-gray-800 text-gray-400 border-gray-700"}`}
              >
                {customTextActive ? "Hide Text" : "Show Custom Text"}
              </button>
            </div>

            {/* TICKER */}
            <div className="md:col-span-2 bg-gray-950 p-6 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="text-amber-500" size={20} />{" "}
                <h3 className="font-black uppercase tracking-widest text-white text-lg">
                  Bottom Ticker
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-4">
                Scrolling news ticker at the very bottom
              </p>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder="e.g. Welcome to the Grand Finale! Sponsored by..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 outline-none focus:border-amber-500 font-bold"
                />
                <button
                  onClick={toggleTicker}
                  className={`px-8 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${tickerActive ? "bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"}`}
                >
                  {tickerActive ? "Stop" : "Start Ticker"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: OVERLAYS & SPOTLIGHTS --- */}
        {activeTab === "overlays" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* FULL SCREEN CARDS */}
            <div className="md:col-span-7 bg-gray-950 p-6 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="text-emerald-500" size={20} />{" "}
                <h3 className="font-black uppercase tracking-widest text-white text-lg">
                  Full-Screen Overlays
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "toss",
                  "innings_break",
                  "over_summary",
                  "result",
                  "playing_xi",
                ].map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFullscreenOverlay(type)}
                    className={`py-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all border shadow-lg flex flex-col items-center gap-2 ${activeFullscreen === type ? "bg-emerald-500 text-slate-900 border-emerald-400" : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"}`}
                  >
                    {activeFullscreen === type ? "Hide" : "Show"}{" "}
                    <span className="opacity-80">{type.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PLAYER SPOTLIGHT */}
            <div className="md:col-span-5 bg-gray-950 p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-cyan-500" size={20} />{" "}
                  <h3 className="font-black uppercase tracking-widest text-white text-lg">
                    Player Spotlight
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-4">
                  Highlight a specific player's stats
                </p>
                <select
                  value={spotlightPlayer}
                  onChange={(e) => setSpotlightPlayer(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 mb-6 font-bold"
                >
                  <option value="">Select a player...</option>
                  <option value="striker">Current Striker</option>
                  <option value="non_striker">Current Non-Striker</option>
                  <option value="bowler">Current Bowler</option>
                </select>
              </div>
              <button
                onClick={toggleSpotlight}
                disabled={!spotlightPlayer && !spotlightActive}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${!spotlightPlayer && !spotlightActive ? "bg-gray-900 text-gray-600 border-gray-800" : spotlightActive ? "bg-cyan-500 text-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-gray-800 text-white border-gray-600"}`}
              >
                {spotlightActive
                  ? "Hide Spotlight"
                  : "Push Spotlight to Stream"}
              </button>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: SPONSORS --- */}
        {activeTab === "sponsors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* FULLSCREEN BANNER */}
            <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="text-amber-500" size={20} />{" "}
                <h3 className="font-black uppercase tracking-widest text-white text-lg">
                  Fullscreen Banner
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-6">
                Between-overs sponsor takeover
              </p>

              {/* Cloudinary Mock Area */}
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 mb-6 bg-gray-900/50">
                <UploadCloud size={32} className="mb-2 text-gray-600" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  [Cloudinary Upload Widget Here]
                </span>
              </div>
              <input
                type="text"
                value={sponsorBannerUrl}
                onChange={(e) => setSponsorBannerUrl(e.target.value)}
                placeholder="Or paste Image URL..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 outline-none focus:border-amber-500 mb-4 font-mono text-xs"
              />

              <button
                onClick={toggleBanner}
                disabled={!sponsorBannerUrl && !bannerActive}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${bannerActive ? "bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-gray-800 text-gray-400 border-gray-700"}`}
              >
                {bannerActive ? "Hide Banner" : "Show Fullscreen Banner"}
              </button>
            </div>

            {/* SMALL BUG */}
            <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="text-emerald-500" size={20} />{" "}
                <h3 className="font-black uppercase tracking-widest text-white text-lg">
                  Sponsor Bug
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-6">
                Small floating logo in top corner
              </p>

              {/* Cloudinary Mock Area */}
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 mb-6 bg-gray-900/50">
                <UploadCloud size={32} className="mb-2 text-gray-600" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  [Cloudinary Upload Widget Here]
                </span>
              </div>
              <input
                type="text"
                value={sponsorBugUrl}
                onChange={(e) => setSponsorBugUrl(e.target.value)}
                placeholder="Or paste Image URL..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 outline-none focus:border-emerald-500 mb-4 font-mono text-xs"
              />

              <button
                onClick={toggleBug}
                disabled={!sponsorBugUrl && !bugActive}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border ${bugActive ? "bg-emerald-500 text-slate-900 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-gray-800 text-gray-400 border-gray-700"}`}
              >
                {bugActive ? "Hide Bug" : "Show Sponsor Bug"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
