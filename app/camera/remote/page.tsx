"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  RefreshCw,
} from "lucide-react";

function RemoteContent() {
  const searchParams = useSearchParams();
  const camParam = searchParams.get("cam");

  const [camCapabilities, setCamCapabilities] = useState<any>(null);
  const [deviceHealth, setDeviceHealth] = useState<any>(null);

  const [remoteZoom, setRemoteZoom] = useState(1);
  const [remoteTorch, setRemoteTorch] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteOled, setRemoteOled] = useState(false);
  const [remoteExposure, setRemoteExposure] = useState(0);
  const [isLive, setIsLive] = useState(false);

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
    if (!camParam) return;

    const connectionId = camParam;

    if (signalingChannelRef.current)
      supabase.removeChannel(signalingChannelRef.current);
    if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current);

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

    channel.on("broadcast", { event: "sync_state" }, (message) => {
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
    });

    channel.on("broadcast", { event: "telemetry" }, (message) => {
      setDeviceHealth(message.payload);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "request_sync", payload: {} });
      }
    });

    const dbSub = supabase
      .channel(`db_webrtc_remote_${connectionId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to ALL events (Insert, Update, Delete)
          schema: "public",
          table: "webrtc_signals",
          filter: `match_id=eq.${connectionId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            // Camera dropped or stopped
            setIsLive(false);
            setCamCapabilities(null);
            setDeviceHealth(null);
          } else if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            // Camera is back online!
            const newRow = payload.new as any;
            if (newRow.status === "live" && newRow.offer) {
              setIsLive(true);
              // Ask the camera to send its current zoom/torch state to update our UI
              if (signalingChannelRef.current) {
                signalingChannelRef.current.send({
                  type: "broadcast",
                  event: "request_sync",
                  payload: {},
                });
              }
            }
          }
        },
      )
      .subscribe();

    dbChannelRef.current = dbSub;

    return () => {
      if (signalingChannelRef.current)
        supabase.removeChannel(signalingChannelRef.current);
      if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current);
    };
  }, [camParam]);

  const sendCommand = (type: string, value: any) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "ptz_command",
        payload: { type, value, timestamp: Date.now() },
      });
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
      let newZoom = Math.min(
        Math.max(currentZ + stepSpeed * direction, min),
        max,
      );
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
  const toggleRemoteTorch = () => {
    const newVal = !remoteTorch;
    setRemoteTorch(newVal);
    sendCommand("torch", newVal);
  };
  const toggleRemoteMute = () => {
    const newVal = !remoteMuted;
    setRemoteMuted(newVal);
    sendCommand("mute", newVal);
  };
  const toggleOledSleep = () => {
    const newVal = !remoteOled;
    setRemoteOled(newVal);
    sendCommand("oled", newVal);
  };
  const handleKillStream = () => {
    if (
      window.confirm(
        "🚨 WARNING: This instantly kills the broadcast. Are you sure?",
      )
    )
      sendCommand("stop", true);
  };

  if (!camParam) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center text-slate-900"
        style={{ colorScheme: "light" }}
      >
        <style>{`nav, header, footer { display: none !important; }`}</style>
        <AlertCircle size={56} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-red-600">
          Invalid Link
        </h1>
        <p className="text-slate-500 mt-2 font-bold">
          No Camera ID provided in URL.
        </p>
      </div>
    );
  }

  if (!isLive) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center text-slate-900"
        style={{ colorScheme: "light" }}
      >
        <style>{`nav, header, footer { display: none !important; }`}</style>
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle size={40} className="text-amber-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800">
          Stream Offline
        </h1>
        <p className="text-slate-500 mt-3 font-bold text-center px-6 leading-relaxed">
          Waiting for the broadcaster to go live on ID: <br />
          <span className="text-blue-600 font-mono bg-blue-50 px-3 py-1 rounded-md mt-2 inline-block border border-blue-100">
            {camParam}
          </span>
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

  let networkStatus = "GOOD";
  let networkColor = "text-emerald-600";
  let networkBg = "bg-emerald-50";
  let networkBorder = "border-emerald-200";
  let networkTip =
    "Connection is stable. Phone and Laptop are communicating perfectly.";

  if (deviceHealth) {
    if (deviceHealth.fps < 20 && deviceHealth.fps > 0) {
      networkStatus = "THERMAL THROTTLING";
      networkColor = "text-red-600";
      networkBg = "bg-red-50";
      networkBorder = "border-red-200";
      networkTip =
        "Phone is overheating! Frame rate has dropped. Turn on 'Screen Off' mode.";
    } else if (deviceHealth.latency > 300) {
      networkStatus = "HIGH LATENCY";
      networkColor = "text-red-600";
      networkBg = "bg-red-50";
      networkBorder = "border-red-200";
      networkTip = `Delay is ${deviceHealth.latency}ms. Phone is too far from Laptop hotspot.`;
    } else if (deviceHealth.latency > 150) {
      networkStatus = "FAIR";
      networkColor = "text-amber-600";
      networkBg = "bg-amber-50";
      networkBorder = "border-amber-200";
      networkTip =
        "Latency is rising. Ensure clear line-of-sight between laptop and phone.";
    }
  }

  return (
    <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-2xl my-auto mx-auto relative z-10">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-900">
            PTZ Remote V2
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-1 font-bold">
            ID: {camParam}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2 rounded-full animate-pulse shadow-sm">
          <Radio size={14} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
            Live
          </span>
        </div>
      </div>

      {deviceHealth ? (
        <>
          <div className="flex justify-between bg-slate-50 rounded-xl border border-slate-200 p-4 mb-3 shadow-inner">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:px-4 flex-1 border-r border-slate-200 last:border-0">
              {deviceHealth.isCharging ? (
                <BatteryCharging size={18} className="text-emerald-500" />
              ) : (
                <Battery
                  size={18}
                  className={
                    deviceHealth.batteryLevel <= 20
                      ? "text-red-500"
                      : "text-slate-500"
                  }
                />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                {deviceHealth.batteryLevel}%
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:px-4 flex-1 border-r border-slate-200 last:border-0">
              <Wifi
                size={18}
                className={
                  deviceHealth.latency > 150
                    ? "text-amber-500"
                    : "text-blue-500"
                }
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                {deviceHealth.latency}ms
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:px-4 flex-1 border-r border-slate-200 last:border-0">
              <Activity
                size={18}
                className={
                  deviceHealth.fps < 20 && deviceHealth.fps > 0
                    ? "text-red-500"
                    : "text-emerald-500"
                }
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                {deviceHealth.fps} FPS
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:px-4 flex-1">
              <Zap size={18} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                {deviceHealth.bitrate} kbps
              </span>
            </div>
          </div>

          <div
            className={`${networkBg} border ${networkBorder} rounded-xl p-4 mb-8 flex items-start gap-3 shadow-sm transition-colors`}
          >
            <Info size={18} className={`mt-0.5 shrink-0 ${networkColor}`} />
            <div>
              <p
                className={`text-xs font-black tracking-widest uppercase mb-1 ${networkColor}`}
              >
                {networkStatus}
              </p>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {networkTip}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-4 mb-8 text-slate-500 text-xs font-bold uppercase tracking-widest bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
          Awaiting Telemetry Data...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-4 flex flex-col">
          <button
            onClick={toggleRemoteMute}
            className={`p-5 rounded-2xl flex flex-row md:flex-col items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${remoteMuted ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            {remoteMuted ? <MicOff size={24} /> : <Mic size={24} />}{" "}
            {remoteMuted ? "Muted" : "Mic Active"}
          </button>

          <button
            onClick={toggleOledSleep}
            className={`p-5 rounded-2xl flex flex-row md:flex-col items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${remoteOled ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            {remoteOled ? <Moon size={24} /> : <Sun size={24} />}{" "}
            {remoteOled ? "Screen Off" : "Screen On"}
          </button>

          {camCapabilities?.torch !== undefined && (
            <button
              onClick={toggleRemoteTorch}
              className={`w-full flex-1 p-5 rounded-2xl flex flex-row md:flex-col items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${remoteTorch ? "bg-amber-50 text-amber-600 border-amber-300" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
            >
              {remoteTorch ? <Flashlight size={24} /> : <ZapOff size={24} />}{" "}
              {remoteTorch ? "Torch ON" : "Torch OFF"}
            </button>
          )}
        </div>

        <div className="md:col-span-8 space-y-4 flex flex-col">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex-1 flex flex-col shadow-sm relative overflow-hidden">
            <div className="flex justify-between gap-3 mb-8">
              <button
                onClick={() => snapZoom(rawMin)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-800 font-black text-xs py-4 rounded-xl border border-slate-200 shadow-sm active:scale-95 uppercase tracking-widest transition-all"
              >
                Wide
              </button>
              <button
                onClick={() => snapZoom(rawMin + (rawMax - rawMin) * 0.3)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-800 font-black text-xs py-4 rounded-xl border border-slate-200 shadow-sm active:scale-95 uppercase tracking-widest transition-all"
              >
                Pitch
              </button>
              <button
                onClick={() => snapZoom(rawMax)}
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs py-4 rounded-xl shadow-sm active:scale-95 uppercase tracking-widest transition-all"
              >
                Tight
              </button>
            </div>

            <div className="flex items-center gap-6 mt-auto">
              <div className="flex flex-col gap-1 shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
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
                  className="w-16 h-16 sm:w-20 sm:h-16 bg-white border border-slate-200 hover:bg-slate-50 active:bg-blue-50 active:text-blue-600 rounded-t-xl flex items-center justify-center text-slate-700 transition-colors touch-none select-none shadow-sm"
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
                  className="w-16 h-16 sm:w-20 sm:h-16 bg-white border border-slate-200 hover:bg-slate-50 active:bg-blue-50 active:text-blue-600 rounded-b-xl flex items-center justify-center text-slate-700 transition-colors touch-none select-none shadow-sm"
                >
                  <Minus size={28} strokeWidth={3} />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <ZoomIn size={18} className="text-blue-500" /> Zoom Level
                  </label>
                  <span className="text-blue-600 font-mono font-black text-lg bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                    {mappedDisplayZoom}x
                  </span>
                </div>
                <div className="py-2">
                  <input
                    type="range"
                    min={rawMin}
                    max={rawMax}
                    step={camCapabilities?.zoom?.step || 0.1}
                    value={Number(remoteZoom) || rawMin}
                    onChange={handleRemoteZoom}
                    onPointerUp={handleZoomRelease}
                    onTouchEnd={handleZoomRelease}
                    className="w-full accent-blue-500 h-4 bg-slate-200 rounded-full appearance-none cursor-pointer shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Sun size={18} className="text-amber-500" /> Exposure (EV)
              </label>
              <span className="text-amber-600 font-mono font-black text-lg bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg">
                {Number(remoteExposure) > 0 ? "+" : ""}
                {Number(remoteExposure).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-4 py-2">
              <span className="text-lg font-black text-slate-400">-</span>
              <input
                type="range"
                min={rawExpMin}
                max={rawExpMax}
                step={camCapabilities?.exposure?.step || 0.1}
                value={Number(remoteExposure) || 0}
                onChange={handleExposureChange}
                className="flex-1 accent-amber-500 h-4 bg-slate-200 rounded-full appearance-none cursor-pointer shadow-inner"
              />
              <span className="text-lg font-black text-slate-400">+</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleKillStream}
        className="w-full mt-8 py-5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
      >
        <Power size={20} /> Emergency Kill Stream
      </button>
    </div>
  );
}

// 2. Wrap it in Suspense!
export default function GenericRemoteControl() {
  return (
    // 🚀 FIXED: Added colorScheme explicitly to 'light' to prevent OS-level text color inversions
    <div
      className="fixed inset-0 z-[9999] bg-slate-100 flex items-center justify-center p-4 font-sans overflow-y-auto custom-scrollbar"
      style={{ colorScheme: "light" }}
    >
      <style>{`nav, header, footer { display: none !important; } ::-webkit-scrollbar { display: none; }`}</style>
      <Suspense
        fallback={
          <div className="text-slate-800 bg-white border border-slate-200 shadow-xl px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3">
            <RefreshCw className="animate-spin text-blue-500" size={20} />{" "}
            Loading Remote...
          </div>
        }
      >
        <RemoteContent />
      </Suspense>
    </div>
  );
}
