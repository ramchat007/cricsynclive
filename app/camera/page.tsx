"use client";
import React, { useState, useEffect, useRef } from "react";
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
  Plus,
  Minus,
  Video,
  Moon,
  X,
} from "lucide-react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const RESOLUTIONS = [
  { label: "720p (HD)", width: 1280, height: 720 },
  { label: "1080p (FHD)", width: 1920, height: 1080 },
  { label: "4K (UHD)", width: 3840, height: 2160 },
];

const FRAMERATES = [
  { label: "30 FPS", value: 30 },
  { label: "60 FPS", value: 60 },
];

export default function GenericBroadcaster() {
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
  const [deviceId, setDeviceId] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOledSleep, setIsOledSleep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [copiedObs, setCopiedObs] = useState(false);
  const [copiedRemote, setCopiedRemote] = useState(false);
  const [error, setError] = useState("");

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  const [selectedRes, setSelectedRes] = useState(RESOLUTIONS[0]);
  const [selectedFps, setSelectedFps] = useState(FRAMERATES[0]);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [zoomCap, setZoomCap] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(1);
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
  }, []);

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
              resolution: selectedRes.label,
            },
          })
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(telemetryInterval);
  }, [isStreaming, selectedRes]);

  const copyLinkUrl = (type: "obs" | "remote") => {
    if (type === "obs") {
      navigator.clipboard.writeText(
        `${origin}/camera/receiver?cam=${deviceId}`,
      );
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2000);
    } else {
      navigator.clipboard.writeText(`${origin}/camera/remote?cam=${deviceId}`);
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

  // NEW: Instant step zoom for quick taps
  const stepInstantZoom = async (direction: number) => {
    if (!activeStreamRef.current || !zoomCap) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    const stepSize = zoomCap.step ? zoomCap.step * 2 : 0.2; // Jump slightly faster on tap

    setZoomLevel((prevZoom) => {
      let newZoom = prevZoom + stepSize * direction;
      if (newZoom >= zoomCap.max) newZoom = zoomCap.max;
      if (newZoom <= zoomCap.min) newZoom = zoomCap.min;

      if (track.applyConstraints) {
        track
          .applyConstraints({ advanced: [{ zoom: newZoom }] } as any)
          .catch(() => {});
      }
      return newZoom;
    });
  };

  const startSmoothZoom = (direction: number) => {
    if (!activeStreamRef.current || !zoomCap) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    const stepSpeed = (zoomCap.max - zoomCap.min) * 0.015;

    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);

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
    if (zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }
  };

  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    await applyVideoConstraint({ zoom: newZoom });
  };

  const toggleTorch = async () => {
    const newState = !torchOn;
    await applyVideoConstraint({ torch: newState });
    setTorchOn(newState);
  };

  const switchLiveCamera = async (
    newDeviceId: string,
    res = selectedRes,
    fps = selectedFps,
  ) => {
    if (!isStreaming || !peerConnectionRef.current) return;
    try {
      setSelectedCamera(newDeviceId);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: newDeviceId },
          width: { ideal: res.width },
          height: { ideal: res.height },
          frameRate: { ideal: fps.value },
        },
        audio: true,
      });

      newStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
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
    } catch (err) {
      setError(`Failed to apply ${res.label} resolution to this camera.`);
    }
  };

  const handleQualityChange = async (res: any, fps: any) => {
    setSelectedRes(res);
    setSelectedFps(fps);
    if (isStreaming) {
      await switchLiveCamera(selectedCamera, res, fps);
    }
  };

  const handleStartStream = async () => {
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

      const connectionId = deviceId;
      currentConnectionIdRef.current = connectionId;

      const videoConstraints = selectedCamera
        ? {
            deviceId: { exact: selectedCamera },
            width: { ideal: selectedRes.width },
            height: { ideal: selectedRes.height },
            frameRate: { ideal: selectedFps.value },
          }
        : {
            facingMode: "environment",
            width: { ideal: selectedRes.width },
            height: { ideal: selectedRes.height },
            frameRate: { ideal: selectedFps.value },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      stream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
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
          setTimeout(resolve, 2000);
        }
      });
      setError("Connecting...");

      await supabase.from("webrtc_signals").upsert({
        match_id: connectionId,
        offer: JSON.parse(JSON.stringify(pc.localDescription)),
        status: "live",
      });

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
            const newRow = payload.new as any;
            if (newRow.answer && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                new RTCSessionDescription(newRow.answer),
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

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden font-sans">
      {/* OLED SLEEP OVERLAY */}
      {isOledSleep && (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center">
          <Moon size={48} className="text-gray-800 mb-6" />
          <p className="text-gray-600 font-bold tracking-widest uppercase text-sm">
            OLED Sleep Mode
          </p>
          <p className="text-gray-700 text-xs mt-2 text-center px-6">
            Streaming is continuing. Screen is off to save battery and prevent
            burn-in.
          </p>
          <button
            onClick={() => setIsOledSleep(false)}
            className="mt-10 px-8 py-4 border-2 border-gray-800 text-gray-400 rounded-2xl hover:bg-gray-900 transition-colors uppercase text-sm font-black">
            Wake Screen
          </button>
        </div>
      )}

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 backdrop-blur-md text-xs sm:text-sm font-bold shadow-2xl w-[90%] sm:w-auto border border-red-500">
          <AlertCircle size={20} className="shrink-0" /> {error}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* TOP CONTROLS */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex justify-between items-start z-42 pb-16">
        <div>
          {isStreaming && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                </span>
                <span className="text-white font-black tracking-widest uppercase text-xs drop-shadow-md">
                  Live Broadcast
                </span>
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full w-max flex items-center gap-1 shadow-sm">
                {selectedRes.label} @ {selectedFps.label}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20 shadow-lg active:scale-95">
            <Settings2 size={18} />
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement)
                document.documentElement.requestFullscreen().catch(() => {});
              else document.exitFullscreen().catch(() => {});
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all hover:bg-white/20 shadow-lg active:scale-95">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* CENTER CONNECTION HUB */}
      {!isStreaming && !isOledSleep && (
        <div className="absolute inset-0 flex items-center justify-center z-30 p-4 sm:p-6 overflow-y-auto landscape:items-start bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm sm:max-w-md landscape:max-w-xl shadow-2xl flex flex-col items-center text-center my-auto">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
              <Camera size={32} className="text-blue-600" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
              Camera Hub
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed px-2">
              Connect this device to OBS using the receiver link, or mount it
              and use the remote.
            </p>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Device ID
                </span>
                <button
                  onClick={regenerateId}
                  className="text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase hover:bg-blue-100 bg-blue-50 px-2 py-1 rounded-md transition-colors">
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              <p className="font-mono text-2xl font-black text-slate-900 tracking-widest py-2">
                {deviceId}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
              <button
                onClick={() => copyLinkUrl("obs")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
                {copiedObs ? (
                  <Check size={18} className="text-emerald-600" />
                ) : (
                  <Copy size={18} className="text-slate-500" />
                )}
                <span className="text-xs font-black uppercase text-slate-800 tracking-widest">
                  {copiedObs ? "Copied OBS Link" : "Copy OBS Link"}
                </span>
              </button>
              <button
                onClick={() => copyLinkUrl("remote")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
                {copiedRemote ? (
                  <Check size={18} className="text-emerald-600" />
                ) : (
                  <Copy size={18} className="text-slate-500" />
                )}
                <span className="text-xs font-black uppercase text-slate-800 tracking-widest">
                  {copiedRemote ? "Copied Remote Link" : "Copy Remote Link"}
                </span>
              </button>
            </div>

            <button
              onClick={handleStartStream}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg active:scale-95">
              <Play size={20} fill="currentColor" /> Start Camera
            </button>
          </div>
        </div>
      )}

      {/* RIGHT SIDE CONTINUOUS ZOOM CONTROLS (Updated Landscape CSS + Instant Click) */}
      {isStreaming && zoomCap && !isOledSleep && (
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-[260px] sm:h-[320px] landscape:left-6 landscape:right-auto landscape:h-[60vh] bg-black/60 backdrop-blur-xl border border-white/20 rounded-[2rem] py-3 px-2 flex flex-col items-center justify-between z-40 shadow-2xl">
          <button
            onClick={() => stepInstantZoom(1)}
            onPointerDown={() => startSmoothZoom(1)}
            onPointerUp={stopSmoothZoom}
            onPointerLeave={stopSmoothZoom}
            className="text-white p-3 sm:p-4 active:scale-95 bg-white/10 rounded-full hover:bg-white/20 transition-colors touch-none"
            aria-label="Zoom In">
            <Plus size={18} />
          </button>

          <div className="flex-1 flex items-center justify-center w-full relative min-h-[140px] sm:min-h-[180px] landscape:min-h-[40vh]">
            <input
              type="range"
              min={zoomCap ? zoomCap.min : 1}
              max={zoomCap ? zoomCap.max : 3}
              step={zoomCap ? zoomCap.step : 0.1}
              value={zoomCap ? zoomLevel : digitalZoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="absolute w-[140px] sm:w-[180px] landscape:w-[40vh] h-1.5 appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </div>

          <button
            onClick={() => stepInstantZoom(-1)}
            onPointerDown={() => startSmoothZoom(-1)}
            onPointerUp={stopSmoothZoom}
            onPointerLeave={stopSmoothZoom}
            className="text-white p-3 sm:p-4 active:scale-95 bg-white/10 rounded-full hover:bg-white/20 transition-colors touch-none"
            aria-label="Zoom Out">
            <Minus size={18} />
          </button>
        </div>
      )}

      {/* BOTTOM CONTROLS (Updated Audio Toggle Broadcast) */}
      {isStreaming && !isOledSleep && (
        <div
          className="absolute bottom-0 left-0 w-full p-6 sm:p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-4 z-40 pt-16 
                      landscape:top-0 landscape:bottom-0 landscape:right-0 landscape:left-auto landscape:w-28 landscape:bg-none landscape:bg-gradient-to-l landscape:pt-6 landscape:pb-6">
          <div className="flex items-center justify-between gap-4 max-w-md mx-auto w-full landscape:flex-col landscape:justify-center landscape:h-full">
            <div className="flex gap-4 landscape:flex-col">
              <button
                onClick={() => setIsOledSleep(true)}
                className="w-14 h-14 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-slate-300 transition-colors hover:text-white hover:bg-white/10 shadow-lg active:scale-95">
                <Moon size={22} />
              </button>
              <button
                onClick={() => {
                  const newState = !isMuted;
                  setIsMuted(newState);
                  if (activeStreamRef.current) {
                    activeStreamRef.current
                      .getAudioTracks()
                      .forEach((t) => (t.enabled = !newState));
                  }

                  // Force broadcast the new mute state to Receiver and Remote
                  if (sigChannelRef.current) {
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
                          isMuted: newState,
                          oled: isOledSleep,
                        },
                      })
                      .catch(() => {});
                  }
                }}
                className={`w-14 h-14 backdrop-blur-md border rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95 ${
                  isMuted
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "bg-black/60 border-white/20 text-slate-300 hover:text-white hover:bg-white/10"
                }`}>
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`w-14 h-14 backdrop-blur-md border rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95 ${
                    torchOn
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : "bg-black/60 border-white/20 text-slate-300 hover:text-white hover:bg-white/10"
                  }`}>
                  {torchOn ? <Flashlight size={22} /> : <ZapOff size={22} />}
                </button>
              )}
            </div>

            <button
              onClick={handleStopStream}
              className="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all shadow-[0_0_30px_rgba(220,38,38,0.6)] active:scale-90 shrink-0 landscape:mt-8">
              <Square size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
          <div className="w-full sm:w-[450px] bg-white border border-slate-200 rounded-t-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-2 z-10">
              <h2 className="text-slate-900 font-black uppercase tracking-widest text-base sm:text-lg flex items-center gap-2">
                <Video size={20} className="text-blue-600" /> Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Lens Selection */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">
                  Select Lens
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => {
                    setSelectedCamera(e.target.value);
                    if (isStreaming)
                      switchLiveCamera(
                        e.target.value,
                        selectedRes,
                        selectedFps,
                      );
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-colors">
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution Selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">
                  Video Quality (Resolution)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res.label}
                      onClick={() => handleQualityChange(res, selectedFps)}
                      className={`py-4 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                        selectedRes.label === res.label
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}>
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate Selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FRAMERATES.map((fps) => (
                    <button
                      key={fps.label}
                      onClick={() => handleQualityChange(selectedRes, fps)}
                      className={`py-4 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                        selectedFps.label === fps.label
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}>
                      {fps.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-inner">
                  <AlertCircle
                    size={16}
                    className="text-amber-500 mt-0.5 shrink-0"
                  />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                    Note: 4K (UHD) @ 60FPS requires high-end hardware. Thermal
                    throttling may occur on older phones.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 bg-blue-600 text-white font-black uppercase tracking-widest text-sm py-5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
