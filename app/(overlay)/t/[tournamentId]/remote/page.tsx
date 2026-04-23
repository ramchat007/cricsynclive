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
  Battery,
  BatteryCharging,
  Wifi,
  Activity,
  Zap,
  Info,
  Plus,
  Minus,
} from "lucide-react";

export default function RemoteControl({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = React.use(params);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [camParam, setCamParam] = useState<string | null>(null); 
  const [camCapabilities, setCamCapabilities] = useState<any>(null);
  const [deviceHealth, setDeviceHealth] = useState<any>(null);

  const [remoteZoom, setRemoteZoom] = useState(1);
  const [remoteTorch, setRemoteTorch] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteOled, setRemoteOled] = useState(false);
  const [remoteExposure, setRemoteExposure] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const signalingChannelRef = useRef<any>(null);
  const remoteZoomRef = useRef(1);
  const lastZoomTime = useRef(0);
  const lastExposureTime = useRef(0);
  const zoomIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { remoteZoomRef.current = remoteZoom; }, [remoteZoom]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const cameraQuery = searchParams.get("cam");
    if (cameraQuery) setCamParam(cameraQuery);
  }, []);

  useEffect(() => {
    if (!camParam) return;
    const fetchConfig = async () => {
      const { data } = await supabase.from("tournaments").select("broadcast_state").eq("id", tournamentId).single();
      if (data?.broadcast_state?.activeMatchId) setMatchId(data.broadcast_state.activeMatchId);
    };
    fetchConfig();
  }, [tournamentId, camParam]);

  useEffect(() => {
    if (!matchId || !camParam) return;

    const connectionId = `${matchId}_${camParam}`;
    const channel = supabase.channel(`webrtc_${connectionId}`);
    signalingChannelRef.current = channel;

    channel.on("broadcast", { event: "sync_state" }, (message) => {
      setIsLive(true);
      const data = message.payload;
      
      if (data.capabilities) setCamCapabilities(data.capabilities);
      if (Date.now() - lastZoomTime.current > 1000 && data.zoom !== undefined) setRemoteZoom(data.zoom);
      if (Date.now() - lastExposureTime.current > 1000 && data.exposure !== undefined) setRemoteExposure(data.exposure);
      if (data.torch !== undefined) setRemoteTorch(data.torch);
      if (data.isMuted !== undefined) setRemoteMuted(data.isMuted);
      if (data.oled !== undefined) setRemoteOled(data.oled);
    });

    const dbSub = supabase.channel(`db_webrtc_remote_${connectionId}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "webrtc_signals", filter: `match_id=eq.${connectionId}` }, 
      () => { setIsLive(false); setCamCapabilities(null); setDeviceHealth(null); }).subscribe();

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(dbSub);
    };
  }, [matchId, camParam]);

  const sendCommand = (type: string, value: any) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({ type: "broadcast", event: "ptz_command", payload: { type, value, timestamp: Date.now() } });
    }
  };

  const handleRemoteZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRemoteZoom(val);
    const now = Date.now();
    if (now - lastZoomTime.current > 100) {
      sendCommand("zoom", val);
      lastZoomTime.current = now;
    }
  };

  const handleZoomRelease = () => sendCommand("zoom", remoteZoom);

  const startSmoothZoom = (direction: number) => {
    const min = camCapabilities?.zoom?.min || 1;
    const max = camCapabilities?.zoom?.max || 10;
    const stepSpeed = (max - min) * 0.05; 

    zoomIntervalRef.current = setInterval(() => {
      let currentZ = Number(remoteZoomRef.current) || 1;
      let newZoom = currentZ + stepSpeed * direction;
      newZoom = Math.min(Math.max(newZoom, min), max); 

      setRemoteZoom(newZoom);
      sendCommand("zoom", newZoom);
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
    sendCommand("zoom", clamped);
    lastZoomTime.current = Date.now();
  };

  const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRemoteExposure(val);
    sendCommand("exposure", val);
    lastExposureTime.current = Date.now();
  };

  const toggleRemoteTorch = () => { const newVal = !remoteTorch; setRemoteTorch(newVal); sendCommand("torch", newVal); };
  const toggleRemoteMute = () => { const newVal = !remoteMuted; setRemoteMuted(newVal); sendCommand("mute", newVal); };
  const toggleOledSleep = () => { const newVal = !remoteOled; setRemoteOled(newVal); sendCommand("oled", newVal); };

  const handleKillStream = () => {
    if (window.confirm("🚨 WARNING: This instantly kills the broadcast from the phone. Are you sure?")) sendCommand("stop", true);
  };

  if (!camParam) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white font-sans">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-red-500">Invalid Link</h1>
        <p className="text-gray-400 mt-2">No Camera ID provided in URL.</p>
      </div>
    );
  }

  if (!isLive) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white font-sans">
        <AlertCircle size={48} className="text-amber-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest">Stream Offline</h1>
        <p className="text-gray-400 mt-2">Waiting for <span className="text-cyan-500 font-mono">{camParam}</span></p>
      </div>
    );
  }

  const rawMin = camCapabilities?.zoom?.min || 1;
  const rawMax = camCapabilities?.zoom?.max || 10;
  const rawExpMin = camCapabilities?.exposure?.min || -4;
  const rawExpMax = camCapabilities?.exposure?.max || 4;
  const mappedDisplayZoom = (((Number(remoteZoom) - rawMin) / (rawMax - rawMin)) * 9 + 1).toFixed(1);

  return (
    <div className="min-h-screen w-screen bg-gray-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">PTZ Remote V2</h1>
            <p className="text-[10px] text-gray-500 font-mono mt-1">ID: {matchId}_{camParam}</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-3 py-1 rounded-full animate-pulse">
            <Radio size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
          </div>
        </div>

        {!deviceHealth && (
          <div className="text-center py-3 mb-6 text-gray-600 text-[10px] font-bold uppercase tracking-widest bg-gray-950 rounded-xl border border-gray-800">
            Awaiting Telemetry Data...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-4 flex flex-col">
            <button onClick={toggleRemoteMute} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteMuted ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-gray-950 text-emerald-500 border-gray-800 hover:bg-gray-900"}`}>
              {remoteMuted ? <MicOff size={24} /> : <Mic size={24} />} {remoteMuted ? "Muted" : "Mic Active"}
            </button>

            <button onClick={toggleOledSleep} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteOled ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-gray-950 text-indigo-400 border-gray-800 hover:bg-gray-900"}`}>
              {remoteOled ? <Moon size={24} /> : <Sun size={24} />} {remoteOled ? "Screen Off" : "Screen On"}
            </button>

            {camCapabilities?.torch !== undefined && (
              <button onClick={toggleRemoteTorch} className={`w-full flex-1 p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border shadow-lg ${remoteTorch ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-gray-950 text-amber-500 border-gray-800 hover:bg-gray-900"}`}>
                {remoteTorch ? <Flashlight size={24} /> : <ZapOff size={24} />} {remoteTorch ? "Torch ON" : "Torch OFF"}
              </button>
            )}
          </div>

          <div className="md:col-span-8 space-y-4 flex flex-col">
            <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex-1 flex flex-col shadow-lg relative overflow-hidden">
              <div className="flex justify-between gap-2 mb-6">
                <button onClick={() => snapZoom(rawMin)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black text-xs py-3 rounded-lg border border-gray-700 shadow active:scale-95 uppercase tracking-widest transition-all">Wide</button>
                <button onClick={() => snapZoom(rawMin + (rawMax - rawMin) * 0.3)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-black text-xs py-3 rounded-lg border border-gray-700 shadow active:scale-95 uppercase tracking-widest transition-all">Pitch</button>
                <button onClick={() => snapZoom(rawMax)} className="flex-1 bg-gray-800 hover:bg-cyan-900/50 text-cyan-400 border border-gray-700 hover:border-cyan-500/50 font-black text-xs py-3 rounded-lg shadow active:scale-95 uppercase tracking-widest transition-all">Tight</button>
              </div>

              <div className="flex items-center gap-6 mt-auto">
                <div className="flex flex-col gap-1 shrink-0 bg-gray-900 p-1 rounded-xl border border-gray-800">
                  <button onMouseDown={() => startSmoothZoom(1)} onMouseUp={stopSmoothZoom} onMouseLeave={stopSmoothZoom} onTouchStart={(e) => { e.preventDefault(); startSmoothZoom(1); }} onTouchEnd={(e) => { e.preventDefault(); stopSmoothZoom(); }} className="w-16 h-14 bg-gray-800 hover:bg-gray-700 active:bg-cyan-600 rounded-t-lg flex items-center justify-center text-white transition-colors touch-none select-none">
                    <Plus size={24} strokeWidth={3} />
                  </button>
                  <button onMouseDown={() => startSmoothZoom(-1)} onMouseUp={stopSmoothZoom} onMouseLeave={stopSmoothZoom} onTouchStart={(e) => { e.preventDefault(); startSmoothZoom(-1); }} onTouchEnd={(e) => { e.preventDefault(); stopSmoothZoom(); }} className="w-16 h-14 bg-gray-800 hover:bg-gray-700 active:bg-cyan-600 rounded-b-lg flex items-center justify-center text-white transition-colors touch-none select-none">
                    <Minus size={24} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><ZoomIn size={16} className="text-cyan-500" /> Zoom Level</label>
                    <span className="text-cyan-500 font-mono font-black text-base bg-cyan-500/10 px-3 py-1 rounded">{mappedDisplayZoom}x</span>
                  </div>
                  <input type="range" min={rawMin} max={rawMax} step={camCapabilities?.zoom?.step || 0.1} value={Number(remoteZoom) || rawMin} onChange={handleRemoteZoom} onPointerUp={handleZoomRelease} onTouchEnd={handleZoomRelease} className="w-full accent-cyan-500 h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Sun size={16} className="text-amber-500" /> Exposure (EV)</label>
                <span className="text-amber-500 font-mono font-black text-base bg-amber-500/10 px-3 py-1 rounded">{Number(remoteExposure) > 0 ? "+" : ""}{Number(remoteExposure).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-gray-600">-</span>
                <input type="range" min={rawExpMin} max={rawExpMax} step={camCapabilities?.exposure?.step || 0.1} value={Number(remoteExposure) || 0} onChange={handleExposureChange} className="flex-1 accent-amber-500 h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                <span className="text-sm font-black text-gray-600">+</span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleKillStream} className="w-full mt-6 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg">
          <Power size={16} /> Emergency Kill Stream
        </button>
      </div>
    </div>
  );
}
