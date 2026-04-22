"use client";
import React, { useState, useEffect, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Camera,
  Play,
  Square,
  AlertCircle,
  Mic,
  MicOff,
  RefreshCw,
  Settings2,
  Maximize,
  Minimize,
  Flashlight,
  ZapOff,
  Video,
  Moon,
  Sun,
  Plus,
  Minus,
} from "lucide-react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function Broadcaster({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<any>(null);
  const zoomIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOledSleep, setIsOledSleep] = useState(false);
  const [error, setError] = useState("");

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [resolution, setResolution] = useState("720p");

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [zoomCap, setZoomCap] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [exposureCap, setExposureCap] = useState<any>(null);
  const [exposureLevel, setExposureLevel] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (data?.broadcast_state?.activeMatchId)
        setMatchId(data.broadcast_state.activeMatchId);
    };
    init();

    const loadCameras = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoInputs);

        const backCam = videoInputs.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("environment"),
        );
        if (backCam) setSelectedCamera(backCam.deviceId);
        else if (videoInputs.length > 0)
          setSelectedCamera(videoInputs[0].deviceId);

        tempStream.getTracks().forEach((t) => t.stop());
      } catch (err) {}
    };
    loadCameras();

    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      handleStopStream();
    };
  }, [tournamentId]);

  const applyVideoConstraint = async (constraint: any) => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({ advanced: [constraint] } as any);
      } catch (err) {}
    }
  };

  const startSmoothZoom = (direction: number) => {
    if (!activeStreamRef.current || !zoomCap) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    const stepSpeed = (zoomCap.max - zoomCap.min) * 0.02;

    zoomIntervalRef.current = setInterval(() => {
      setZoomLevel((prevZoom) => {
        let newZoom = prevZoom + stepSpeed * direction;
        if (newZoom >= zoomCap.max) newZoom = zoomCap.max;
        if (newZoom <= zoomCap.min) newZoom = zoomCap.min;

        if (track.applyConstraints) {
          track
            .applyConstraints({ advanced: [{ zoom: newZoom }] } as any)
            .catch(() => {});
        }
        return newZoom;
      });
    }, 40);
  };

  const stopSmoothZoom = () => {
    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
  };

  const snapZoom = async (targetVal: number) => {
    if (!zoomCap) return;
    let clamped = targetVal;
    if (clamped > zoomCap.max) clamped = zoomCap.max;
    if (clamped < zoomCap.min) clamped = zoomCap.min;
    setZoomLevel(clamped);
    await applyVideoConstraint({ zoom: clamped });
  };

  const handleExposureChange = async (e: any) => {
    const val = Number(e.target.value);
    setExposureLevel(val);
    await applyVideoConstraint({ exposureCompensation: val });
  };

  const toggleTorch = async () => {
    const newState = !torchOn;
    await applyVideoConstraint({ torch: newState });
    setTorchOn(newState);
  };

  const mapHardwareCapabilities = (videoTrack: MediaStreamTrack) => {
    let zCap = null,
      eCap = null,
      tCap = false;
    if (videoTrack.getCapabilities) {
      const caps = videoTrack.getCapabilities() as any;
      const settings = videoTrack.getSettings() as any;
      tCap = !!caps.torch;
      setTorchSupported(tCap);

      if (caps.zoom) {
        zCap = {
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
        };
        setZoomCap(zCap);
        setZoomLevel(settings.zoom || caps.zoom.min || 1);
      } else setZoomCap(null);

      if (caps.exposureCompensation) {
        eCap = {
          min: caps.exposureCompensation.min,
          max: caps.exposureCompensation.max,
          step: caps.exposureCompensation.step || 0.1,
        };
        setExposureCap(eCap);
        setExposureLevel(settings.exposureCompensation || 0);
      } else setExposureCap(null);
    }
    return { zCap, eCap, tCap };
  };

  const handleStartStream = async () => {
    if (!matchId)
      return setError("No Active Match found in Tournament Settings.");
    try {
      setError("");
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const width = resolution === "1080p" ? 1920 : 1280;
      const height = resolution === "1080p" ? 1080 : 720;
      const videoConstraints = selectedCamera
        ? {
            deviceId: { exact: selectedCamera },
            width: { ideal: width },
            height: { ideal: height },
          }
        : {
            facingMode: "environment",
            width: { ideal: width },
            height: { ideal: height },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      const videoTrack = stream.getVideoTracks()[0];

      // 🔥 FIX: Capturing the returned variables here!
      const { zCap, tCap } = mapHardwareCapabilities(videoTrack);

      activeStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setError(
            "⚠️ CONNECTION LOST! The network dropped. Stop and Go Live again.",
          );
        } else if (pc.connectionState === "connected") {
          setError("");
        }
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const signalingChannel = supabase.channel(`webrtc_${matchId}`);
      pc.onicecandidate = (event) => {
        if (event.candidate)
          signalingChannel.send({
            type: "broadcast",
            event: "candidate",
            payload: { candidate: event.candidate },
          });
      };
      signalingChannel
        .on("broadcast", { event: "candidate" }, (message) => {
          if (message.payload.candidate)
            pc.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
        })
        .subscribe();

      signalingChannel
        .on("broadcast", { event: "ptz_command" }, (message) => {
          const cmd = message.payload;
          if (cmd.type === "zoom") {
            setZoomLevel(cmd.value);
            applyVideoConstraint({ zoom: cmd.value });
          } else if (cmd.type === "torch") {
            setTorchOn(cmd.value);
            applyVideoConstraint({ torch: cmd.value });
          }
        })
        .subscribe();

      // Broadcast the initial capabilities so the laptop knows what sliders to show:
      signalingChannel.send({
        type: "broadcast",
        event: "sync_state",
        payload: {
          capabilities: { zoom: zCap, torch: tCap },
          zoom: zCap?.min || 1,
          torch: false,
        },
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase
        .from("webrtc_signals")
        .upsert({ match_id: matchId, offer: offer, status: "live" });

      supabase
        .channel(`db_webrtc_${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "webrtc_signals",
            filter: `match_id=eq.${matchId}`,
          },
          async (payload) => {
            if (payload.new.answer && pc.signalingState !== "stable") {
              await pc.setRemoteDescription(
                new RTCSessionDescription(payload.new.answer),
              );
            }
          },
        )
        .subscribe();

      setIsStreaming(true);
      if ("wakeLock" in navigator)
        wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err: any) {
      setError(`Camera failed: ${err.message}`);
    }
  };

  const handleStopStream = async () => {
    setIsStreaming(false);
    setIsOledSleep(false);
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    if (document.fullscreenElement && document.exitFullscreen)
      document.exitFullscreen().catch(() => {});
    setIsFullscreen(false);
    setTorchOn(false);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    if (matchId)
      await supabase.from("webrtc_signals").delete().eq("match_id", matchId);
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (activeStreamRef.current)
      activeStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !newState));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      setIsFullscreen(!isFullscreen);
    }
  };

  const currentCameraLabel =
    cameras.find((c) => c.deviceId === selectedCamera)?.label ||
    "Default Camera";

  return (
    <div className="h-[90dvh] flex flex-col font-sans overflow-hidden bg-gray-50 text-gray-900">
      {/* 🔥 CSS Hack to kill all ugly scrollbars while keeping things scrollable if absolutely needed 🔥 */}
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {!isFullscreen && (
        <div className="px-4 py-3 border-b flex justify-between items-center shrink-0 z-20 bg-white border-gray-200">
          <div className="flex items-center gap-2">
            <Camera className="text-teal-500" size={20} />
            <h1 className="font-black uppercase tracking-widest text-sm md:text-lg italic">
              Pro Cam V2
            </h1>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Live
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500 text-white text-xs font-bold p-3 text-center shrink-0 flex items-center justify-center gap-2 z-20 shadow-md">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isOledSleep && (
        <div
          onClick={() => setIsOledSleep(false)}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-pointer">
          <div className="flex flex-col items-center opacity-30">
            <Moon size={48} className="text-indigo-500 mb-4" />
            <p className="text-white text-xs font-black uppercase tracking-widest">
              OLED Sleep Mode
            </p>
            <p className="text-gray-500 text-[10px] mt-2">
              Tap anywhere to wake screen
            </p>
          </div>
        </div>
      )}

      {!isStreaming ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden bg-gray-50">
          <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl bg-white border-gray-200 max-h-full overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Settings2 size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
                Broadcast Setup
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                  Active Lens
                </label>
                <select
                  className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-xs font-bold text-gray-700 outline-none focus:border-teal-500 truncate"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}>
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Resolution
                  </label>
                  <select
                    className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-xs font-bold text-gray-700 outline-none focus:border-teal-500"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}>
                    <option value="720p">720p (Smooth)</option>
                    <option value="1080p">1080p (FHD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Microphone
                  </label>
                  <button
                    onClick={toggleMute}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${isMuted ? "border-red-500 text-red-500 bg-red-50" : "border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100"}`}>
                    {isMuted ? (
                      <>
                        <MicOff size={16} /> Muted
                      </>
                    ) : (
                      <>
                        <Mic size={16} /> Active
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartStream}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <Play size={18} fill="currentColor" /> Go Live
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative bg-black flex flex-col justify-end overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="relative z-10 w-full p-4 flex flex-col gap-4">
            <div className="absolute right-4 bottom-32 flex flex-col gap-2">
              {zoomCap && (
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-1.5 border border-white/20 flex flex-col gap-1 mb-4 shadow-xl">
                  <span className="text-[8px] text-white/50 text-center font-black uppercase tracking-widest mb-1 mt-1">
                    Framing
                  </span>
                  <button
                    onClick={() => snapZoom(zoomCap.min)}
                    className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest">
                    Wide
                  </button>
                  <button
                    onClick={() =>
                      snapZoom(zoomCap.min + (zoomCap.max - zoomCap.min) * 0.3)
                    }
                    className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest">
                    Pitch
                  </button>
                  <button
                    onClick={() => snapZoom(zoomCap.max)}
                    className="bg-white/10 hover:bg-teal-500/50 text-teal-400 font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest">
                    Tight
                  </button>
                </div>
              )}

              {zoomCap && (
                <div className="bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20 flex flex-col items-center gap-2 shadow-2xl">
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
                    className="w-12 h-16 bg-white/10 hover:bg-white/20 active:bg-teal-500 rounded-t-full flex flex-col items-center justify-center text-white select-none touch-none">
                    <Plus size={20} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase mt-1 opacity-50">
                      In
                    </span>
                  </button>
                  <span className="text-[10px] font-black text-white/50 font-mono">
                    {Number(zoomLevel || 1).toFixed(1)}x
                  </span>
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
                    className="w-12 h-16 bg-white/10 hover:bg-white/20 active:bg-teal-500 rounded-b-full flex flex-col items-center justify-center text-white select-none touch-none">
                    <span className="text-[8px] font-black uppercase mb-1 opacity-50">
                      Out
                    </span>
                    <Minus size={20} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>

            {exposureCap && (
              <div className="absolute left-4 bottom-[130px] bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-xl h-48 flex flex-col items-center justify-between">
                <Sun size={14} className="text-amber-400 drop-shadow-md" />
                <input
                  type="range"
                  min={exposureCap.min}
                  max={exposureCap.max}
                  step={exposureCap.step || 0.1}
                  value={Number(exposureLevel || 0)}
                  onChange={handleExposureChange}
                  className="w-2 h-24 appearance-none bg-white/20 rounded-full accent-amber-400 outline-none flex-1 my-2"
                  style={
                    {
                      WebkitAppearance: "slider-vertical",
                    } as React.CSSProperties
                  }
                />
                <span className="text-[8px] font-mono text-white/80 font-black">
                  {Number(exposureLevel) > 0 ? "+" : ""}
                  {Number(exposureLevel || 0).toFixed(1)}
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-center items-center gap-3 pb-2 mt-auto bg-gradient-to-t from-black/90 to-transparent p-6 -mx-4 -mb-4">
              <button
                onClick={() => setIsOledSleep(true)}
                className="flex items-center gap-2 border rounded-full px-4 py-3 backdrop-blur-md bg-black/50 border-white/20 active:scale-95 text-cyan-400">
                <Moon size={16} />{" "}
                <span className="text-white text-[10px] font-bold uppercase">
                  Save Battery
                </span>
              </button>

              <div className="flex flex-wrap justify-center items-center gap-3">
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 border ${torchOn ? "bg-amber-500 border-amber-400 text-black" : "bg-black/50 border-white/20 text-white backdrop-blur-md"}`}>
                    {torchOn ? <Flashlight size={18} /> : <ZapOff size={18} />}
                  </button>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 border border-white/20 bg-black/50 text-white backdrop-blur-md">
                  {isFullscreen ? (
                    <Minimize size={18} />
                  ) : (
                    <Maximize size={18} />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 border border-white/20 ${isMuted ? "bg-red-500 text-white" : "bg-black/50 text-white backdrop-blur-md"}`}>
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={handleStopStream}
                  className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 active:scale-95 text-xs">
                  <Square size={14} fill="currentColor" /> Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
