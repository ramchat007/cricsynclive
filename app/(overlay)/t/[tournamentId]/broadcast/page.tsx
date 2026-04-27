"use client";
import React, { useState, useEffect, useRef, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Camera,
  Play,
  Square,
  Copy,
  AlertCircle,
  Check,
  Mic,
  MicOff,
  RefreshCw,
  Settings2,
  Maximize,
  Minimize,
  Flashlight,
  ZapOff,
  ZoomIn,
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
  const lastCommandTimeRef = useRef(0);

  const sigChannelRef = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const currentConnectionIdRef = useRef<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [cameraId, setCameraId] = useState("cam-1");
  const [isStreaming, setIsStreaming] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOledSleep, setIsOledSleep] = useState(false);

  const [copiedObs, setCopiedObs] = useState(false);
  const [copiedRemote, setCopiedRemote] = useState(false);
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

  const [origin, setOrigin] = useState("");

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator)
        wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err) {}
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (isStreaming && videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [isStreaming, localStream]);

  useEffect(() => {
    setOrigin(window.location.origin);
    let savedId = localStorage.getItem("cricsync_cam_id");
    if (!savedId) {
      savedId = `cam-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("cricsync_cam_id", savedId);
    }
    setDeviceId(savedId);

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

  useEffect(() => {
    if (
      isStreaming &&
      currentConnectionIdRef.current &&
      sigChannelRef.current
    ) {
      sigChannelRef.current
        .send({
          type: "broadcast",
          event: "sync_state",
          payload: {
            capabilities: {
              torch: torchSupported,
              zoom: zoomCap,
              exposure: exposureCap,
            },
            zoom: zoomLevel,
            exposure: exposureLevel,
            torch: torchOn,
            isMuted: isMuted,
            oled: isOledSleep,
          },
        })
        .catch(() => {});
    }
  }, [isMuted, torchOn, zoomLevel, exposureLevel, isOledSleep, isStreaming]);

  useEffect(() => {
    if (
      !isStreaming ||
      !currentConnectionIdRef.current ||
      !peerConnectionRef.current
    )
      return;
    let lastBytesSent = 0;
    let lastTime = Date.now();
    let cachedStats = {
      fps: 0,
      bitrate: 0,
      latency: 0,
      batteryLevel: 100,
      isCharging: false,
    };

    const telemetryInterval = setInterval(async () => {
      try {
        if ((navigator as any).getBattery) {
          const battery = await (navigator as any).getBattery();
          cachedStats.batteryLevel = Math.round(battery.level * 100);
          cachedStats.isCharging = battery.charging;
        }
      } catch (e) {}

      try {
        if (peerConnectionRef.current) {
          const stats = await peerConnectionRef.current.getStats();
          let foundActivePair = false;
          stats.forEach((report) => {
            if (
              report.type === "outbound-rtp" &&
              (report.kind === "video" || report.mediaType === "video")
            ) {
              if (report.framesPerSecond !== undefined)
                cachedStats.fps = Math.round(report.framesPerSecond);
              const bytes = report.bytesSent;
              const now = Date.now();
              if (lastBytesSent > 0 && bytes > lastBytesSent)
                cachedStats.bitrate = Math.round(
                  (8 * (bytes - lastBytesSent)) / (now - lastTime),
                );
              lastBytesSent = bytes || lastBytesSent;
              lastTime = now;
            }
            if (
              report.type === "candidate-pair" &&
              report.state === "succeeded" &&
              report.nominated
            ) {
              foundActivePair = true;
              if (report.currentRoundTripTime !== undefined)
                cachedStats.latency = Math.round(
                  report.currentRoundTripTime * 1000,
                );
            }
          });
        }
      } catch (e) {}

      if (sigChannelRef.current) {
        sigChannelRef.current
          .send({
            type: "broadcast",
            event: "telemetry",
            payload: {
              timestamp: Date.now(),
              batteryLevel: cachedStats.batteryLevel,
              isCharging: cachedStats.isCharging,
              fps: cachedStats.fps,
              bitrate: cachedStats.bitrate,
              latency: cachedStats.latency,
            },
          })
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(telemetryInterval);
  }, [isStreaming]);

  const copyLinkUrl = (type: "obs" | "remote") => {
    if (type === "obs") {
      navigator.clipboard.writeText(
        `${origin}/t/${tournamentId}/obs?cam=${deviceId}`,
      );
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2000);
    } else {
      navigator.clipboard.writeText(
        `${origin}/t/${tournamentId}/remote?cam=${deviceId}`,
      );
      setCopiedRemote(true);
      setTimeout(() => setCopiedRemote(false), 2000);
    }
  };

  const regenerateId = () => {
    if (isStreaming) return alert("Cannot change ID while streaming!");
    if (window.confirm("Generate a new Camera ID? Old links will break.")) {
      const newId = `cam-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("cricsync_cam_id", newId);
      setDeviceId(newId);
    }
  };

  const mapHardwareCapabilities = (videoTrack: MediaStreamTrack) => {
    let zCap = null,
      eCap = null,
      tCap = false;
    if (typeof videoTrack.getCapabilities === "function") {
      const caps = videoTrack.getCapabilities() as Record<string, any>;
      const settings = videoTrack.getSettings() as Record<string, any>;
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

  const applyVideoConstraint = async (constraint: Record<string, any>) => {
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
    const stepSpeed = (zoomCap.max - zoomCap.min) * 0.015;
    zoomIntervalRef.current = setInterval(() => {
      setZoomLevel((prevZoom) => {
        let newZoom = prevZoom + stepSpeed * direction;
        if (newZoom >= zoomCap.max) newZoom = zoomCap.max;
        if (newZoom <= zoomCap.min) newZoom = zoomCap.min;
        if (track.applyConstraints)
          track
            .applyConstraints({ advanced: [{ zoom: newZoom }] } as any)
            .catch(() => {});
        return newZoom;
      });
    }, 40);
  };

  const stopSmoothZoom = () => {
    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
  };

  const snapZoom = async (targetVal: number) => {
    if (!zoomCap) return;
    let clamped = Math.min(Math.max(targetVal, zoomCap.min), zoomCap.max);
    setZoomLevel(clamped);
    await applyVideoConstraint({ zoom: clamped });
  };

  const handleExposureChange = async (e: any) => {
    const val = Number(Number(e.target.value).toFixed(1));
    setExposureLevel(val);
    await applyVideoConstraint({ exposureCompensation: val });
  };

  const toggleTorch = async () => {
    const newState = !torchOn;
    await applyVideoConstraint({ torch: newState });
    setTorchOn(newState);
  };

  const switchLiveCamera = async (newDeviceId: string) => {
    if (!isStreaming || !peerConnectionRef.current) return;
    try {
      setSelectedCamera(newDeviceId);
      const width = resolution === "1080p" ? 1920 : 1280;
      const height = resolution === "1080p" ? 1080 : 720;
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: newDeviceId },
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: true,
      });

      newStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      const videoTrack = newStream.getVideoTracks()[0];
      const { zCap, eCap, tCap } = mapHardwareCapabilities(videoTrack);
      setTorchOn(false);

      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find(
        (s) => s.track && s.track.kind === "video",
      );
      const audioSender = senders.find(
        (s) => s.track && s.track.kind === "audio",
      );
      if (videoSender) await videoSender.replaceTrack(videoTrack);
      if (audioSender)
        await audioSender.replaceTrack(newStream.getAudioTracks()[0]);

      if (activeStreamRef.current)
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = newStream;
      setLocalStream(newStream);

      if (sigChannelRef.current) {
        sigChannelRef.current.send({
          type: "broadcast",
          event: "sync_state",
          payload: {
            capabilities: { zoom: zCap, torch: tCap, exposure: eCap },
            zoom: zCap?.min || 1,
            exposure: 0,
            torch: false,
            isMuted,
            oled: isOledSleep,
          },
        });
      }
    } catch (err) {}
  };

  const handleCycleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(
      (c) => c.deviceId === selectedCamera,
    );
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].deviceId;
    if (isStreaming) switchLiveCamera(nextCamId);
    else setSelectedCamera(nextCamId);
  };

  const handleStartStream = async () => {
    if (!matchId) return setError("No Active Match found.");
    try {
      setError("");
      if (sigChannelRef.current) {
        await supabase.removeChannel(sigChannelRef.current);
        sigChannelRef.current = null;
      }
      if (dbChannelRef.current) {
        await supabase.removeChannel(dbChannelRef.current);
        dbChannelRef.current = null;
      }
      if (activeStreamRef.current)
        activeStreamRef.current.getTracks().forEach((t) => t.stop());

      const connectionId = `${matchId}_${deviceId}`;
      currentConnectionIdRef.current = connectionId;

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

      const { zCap, tCap, eCap } = mapHardwareCapabilities(videoTrack);
      activeStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setError("⚠️ CONNECTION LOST! Please Stop and Go Live again.");
        } else if (pc.connectionState === "connected") setError("");
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 🔥 THE FIX: NON-TRICKLE WEBRTC 🔥
      // Wait for all ICE candidates to gather natively before sending the Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setError("Gathering Network Routes...");
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") resolve();
        else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
          setTimeout(resolve, 2000); // 2 second safety timeout
        }
      });
      setError("Connecting...");

      // Write the complete package to the database ONCE
      await supabase
        .from("webrtc_signals")
        .upsert({
          match_id: connectionId,
          offer: JSON.parse(JSON.stringify(pc.localDescription)),
          status: "live",
        });

      // Clean Remote Control Channel (No candidates sent here anymore!)
      const signalingChannel = supabase.channel(
        `webrtc_broadcast_${connectionId}`,
      );
      sigChannelRef.current = signalingChannel;

      signalingChannel.on("broadcast", { event: "ptz_command" }, (message) => {
        const cmd = message.payload;
        if (cmd.timestamp <= lastCommandTimeRef.current) return;
        lastCommandTimeRef.current = cmd.timestamp;

        if (cmd.type === "zoom") {
          setZoomLevel(cmd.value);
          applyVideoConstraint({ zoom: cmd.value });
        } else if (cmd.type === "torch") {
          setTorchOn(cmd.value);
          applyVideoConstraint({ torch: cmd.value });
        } else if (cmd.type === "exposure") {
          setExposureLevel(cmd.value);
          applyVideoConstraint({ exposureCompensation: cmd.value });
        } else if (cmd.type === "mute") {
          setIsMuted(cmd.value);
          if (activeStreamRef.current)
            activeStreamRef.current
              .getAudioTracks()
              .forEach((t) => (t.enabled = !cmd.value));
        } else if (cmd.type === "oled") setIsOledSleep(cmd.value);
        else if (cmd.type === "stop") handleStopStream();
        else if (cmd.type === "switch_camera") switchLiveCamera(cmd.value);
      });

      signalingChannel.on("broadcast", { event: "request_sync" }, () => {
        signalingChannel.send({
          type: "broadcast",
          event: "sync_state",
          payload: {
            capabilities: { zoom: zCap, torch: tCap, exposure: eCap },
            zoom: zoomLevel,
            torch: torchOn,
            exposure: exposureLevel,
            isMuted,
            oled: isOledSleep,
          },
        });
      });

      signalingChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          signalingChannel.send({
            type: "broadcast",
            event: "sync_state",
            payload: {
              capabilities: { zoom: zCap, torch: tCap, exposure: eCap },
              zoom: zCap?.min || 1,
              torch: false,
              exposure: 0,
              isMuted: isMuted,
              oled: false,
            },
          });
        }
      });

      const dbChannel = supabase.channel(
        `webrtc_db_${connectionId}_${Date.now()}`,
      );
      dbChannelRef.current = dbChannel;

      dbChannel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "webrtc_signals",
            filter: `match_id=eq.${connectionId}`,
          },
          async (payload) => {
            if (
              payload.new.answer &&
              pc.signalingState === "have-local-offer"
            ) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(payload.new.answer),
              );
              setError("");
            }
          },
        )
        .subscribe();

      setIsStreaming(true);
      await requestWakeLock();
    } catch (err: any) {
      setError(`Camera failed: ${err.message}`);
    }
  };

  const handleStopStream = async () => {
    setIsStreaming(false);
    setIsOledSleep(false);
    releaseWakeLock();
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
    setLocalStream(null);

    if (sigChannelRef.current) supabase.removeChannel(sigChannelRef.current);
    if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current);

    if (currentConnectionIdRef.current) {
      await supabase
        .from("webrtc_signals")
        .delete()
        .eq("match_id", currentConnectionIdRef.current);
      currentConnectionIdRef.current = null;
    }
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
    } catch (err) {}
  };

  const currentCameraLabel =
    cameras.find((c) => c.deviceId === selectedCamera)?.label ||
    "Default Camera";
  const verticalSliderStyle: any = {
    writingMode: "vertical-lr",
    direction: "rtl",
    WebkitAppearance: "slider-vertical",
    appearance: "slider-vertical",
  };

  return (
    <div className="fixed inset-0 z-[9999] h-[100dvh] flex flex-col font-sans overflow-hidden bg-gray-50 text-gray-900">
      <style>{`nav, header, footer { display: none !important; } ::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

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
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white text-xs font-bold p-3 rounded-xl text-center z-50 shadow-2xl flex items-center justify-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isOledSleep && (
        <div
          onClick={() => setIsOledSleep(false)}
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center cursor-pointer"
        >
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
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto bg-gray-50">
          <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl bg-white border-gray-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Settings2 size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
                Broadcast Setup
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 mb-6 text-white shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Device ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">
                    {deviceId}
                  </span>
                  <button
                    onClick={regenerateId}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => copyLinkUrl("obs")}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {copiedObs ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} className="text-slate-400" />
                  )}{" "}
                  OBS Link
                </button>
                <button
                  onClick={() => copyLinkUrl("remote")}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  {copiedRemote ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} className="text-slate-400" />
                  )}{" "}
                  Remote Link
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                  Camera Name
                </label>
                <select
                  className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-xs font-bold text-gray-700 outline-none focus:border-teal-500"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                >
                  <option value="cam-1">Camera 1 (Main / Bowler)</option>
                  <option value="cam-2">Camera 2 (Square Leg)</option>
                  <option value="cam-3">Camera 3 (Boundary / Roving)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                  Active Lens
                </label>
                <button
                  onClick={handleCycleCamera}
                  disabled={cameras.length <= 1}
                  className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all ${cameras.length > 1 ? "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 active:scale-95 cursor-pointer" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"}`}
                >
                  <span className="truncate pr-2">{currentCameraLabel}</span>
                  {cameras.length > 1 && (
                    <RefreshCw size={16} className="text-teal-500 shrink-0" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-gray-500">
                    Resolution
                  </label>
                  <select
                    className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-xs font-bold text-gray-700 outline-none focus:border-teal-500"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
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
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${isMuted ? "border-red-500 text-red-500 bg-red-50" : "border-gray-200 text-gray-700 bg-gray-50"}`}
                  >
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
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
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

          <div className="relative z-10 w-full p-4 flex flex-col gap-4 pointer-events-none">
            <div className="absolute right-4 bottom-[80px] flex flex-col gap-2 pointer-events-auto">
              {zoomCap && (
                <div className="bg-black/60 backdrop-blur-xl rounded-xl p-1.5 border border-white/10 flex flex-col gap-1 mb-2 shadow-2xl">
                  <span className="text-[8px] text-white/50 text-center font-black uppercase tracking-widest mb-1 mt-1">
                    Framing
                  </span>
                  <button
                    onClick={() => snapZoom(zoomCap.min)}
                    className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest"
                  >
                    Wide
                  </button>
                  <button
                    onClick={() =>
                      snapZoom(zoomCap.min + (zoomCap.max - zoomCap.min) * 0.3)
                    }
                    className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest"
                  >
                    Pitch
                  </button>
                  <button
                    onClick={() => snapZoom(zoomCap.max)}
                    className="bg-white/10 hover:bg-teal-500/50 text-teal-400 font-black text-[10px] py-2 px-3 rounded shadow active:scale-95 uppercase tracking-widest"
                  >
                    Tight
                  </button>
                </div>
              )}
              {zoomCap && (
                <div className="bg-black/60 backdrop-blur-xl rounded-full p-1 border border-white/10 flex flex-col items-center gap-1 shadow-2xl py-2">
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
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 active:bg-teal-500 rounded-full flex items-center justify-center text-white select-none touch-none mb-1"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                  <div className="h-24 w-full flex justify-center py-2">
                    <input
                      type="range"
                      min={zoomCap.min}
                      max={zoomCap.max}
                      step={zoomCap.step || 0.1}
                      value={zoomLevel}
                      onChange={(e) => snapZoom(Number(e.target.value))}
                      className="w-1.5 h-full appearance-none bg-white/20 rounded-full accent-cyan-400"
                      style={verticalSliderStyle}
                    />
                  </div>
                  <span className="text-[10px] font-black text-white/70 font-mono drop-shadow-md my-1">
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
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 active:bg-teal-500 rounded-full flex items-center justify-center text-white select-none touch-none mt-1"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>

            {exposureCap && (
              <div className="absolute left-4 bottom-[80px] bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-2xl h-48 flex flex-col items-center justify-between pointer-events-auto">
                <Sun size={14} className="text-amber-400 drop-shadow-md" />
                <input
                  type="range"
                  min={exposureCap.min}
                  max={exposureCap.max}
                  step={exposureCap.step || 0.1}
                  value={Number(exposureLevel || 0)}
                  onChange={handleExposureChange}
                  className="w-2 h-24 appearance-none bg-white/20 rounded-full accent-amber-400 outline-none flex-1 my-2"
                  style={verticalSliderStyle}
                />
                <span className="text-[8px] font-mono text-white/80 font-black">
                  {Number(exposureLevel) > 0 ? "+" : ""}
                  {Number(exposureLevel || 0).toFixed(1)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2 mt-auto bg-gradient-to-t from-black/90 to-transparent p-4 -mx-4 -mb-4 pointer-events-auto">
              <button
                onClick={() => setIsOledSleep(true)}
                className="flex items-center gap-2 border rounded-full px-4 py-2 backdrop-blur-xl bg-black/40 border-white/10 active:scale-95 text-cyan-400 shadow-xl shrink-0"
              >
                <Moon size={16} />{" "}
                <span className="text-white text-[10px] font-bold uppercase">
                  Save Battery
                </span>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCycleCamera}
                  disabled={cameras.length <= 1}
                  className={`flex items-center gap-2 border rounded-full px-3 py-2 backdrop-blur-xl transition-all shadow-xl ${cameras.length > 1 ? "bg-black/40 border-white/10 active:scale-95 cursor-pointer" : "bg-black/20 border-white/5 opacity-50"}`}
                >
                  <Video
                    size={16}
                    className={
                      cameras.length > 1 ? "text-white" : "text-gray-500"
                    }
                  />
                  {cameras.length > 1 && (
                    <RefreshCw size={12} className="text-white/70" />
                  )}
                </button>
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl active:scale-95 border ${torchOn ? "bg-amber-500 border-amber-400 text-black" : "bg-black/40 border-white/10 text-white backdrop-blur-xl"}`}
                  >
                    {torchOn ? <Flashlight size={16} /> : <ZapOff size={16} />}
                  </button>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl active:scale-95 border border-white/10 bg-black/40 text-white backdrop-blur-xl"
                >
                  {isFullscreen ? (
                    <Minimize size={16} />
                  ) : (
                    <Maximize size={16} />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl active:scale-95 border border-white/10 ${isMuted ? "bg-red-500 text-white border-red-400" : "bg-black/40 text-white backdrop-blur-xl"}`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={handleStopStream}
                  className="h-10 px-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2 text-[10px]"
                >
                  <Square size={12} fill="currentColor" /> Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
