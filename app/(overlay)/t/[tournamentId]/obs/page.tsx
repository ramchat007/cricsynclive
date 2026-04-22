"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ZoomIn, Flashlight, ZapOff } from "lucide-react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ObsReceiver({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const searchParams = useSearchParams();

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); // 🟢 Dedicated Audio Player for OBS
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<any>(null);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState("Waiting for tournament config...");
  const [connected, setConnected] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  // 🟢 REMOTE CONTROL STATE
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const [camCapabilities, setCamCapabilities] = useState<any>(null);
  const [remoteZoom, setRemoteZoom] = useState(1);
  const [remoteTorch, setRemoteTorch] = useState(false);

  // 1. Check URL for ?control=true
  useEffect(() => {
    if (searchParams.get("control") === "true") {
      setIsRemoteMode(true);
    }
  }, [searchParams]);

  // 2. Fetch Active Match ID
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (data?.broadcast_state?.activeMatchId) {
        setMatchId(data.broadcast_state.activeMatchId);
        setError("Waiting for camera operator to go live...");
      } else {
        setError("No Active Match found.");
      }
    };
    fetchConfig();
  }, [tournamentId]);

  // 3. WebRTC & Signaling Engine
  useEffect(() => {
    if (!matchId) return;

    let hasJoined = false;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // 🟢 THE SPLIT STREAM TRICK
    pc.ontrack = (event) => {
      if (event.streams && event.streams.length > 0) {
        // Send to Video Player (Muted for Autoplay)
        if (videoRef.current) videoRef.current.srcObject = event.streams[0];
        // Send to Audio Player (Unmuted for OBS Mixer)
        if (audioRef.current) audioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnected(true);
        setError("");
        // Try autoplaying
        if (videoRef.current)
          videoRef.current.play().catch(() => setNeedsInteraction(true));
        if (audioRef.current)
          audioRef.current.play().catch(() => setNeedsInteraction(true));
      } else if (
        ["disconnected", "failed", "closed"].includes(pc.connectionState)
      ) {
        setConnected(false);
        setError("Stream interrupted. Waiting to reconnect...");
        hasJoined = false;
      }
    };

    // 🟢 SUPABASE BROADCAST CHANNEL (For ICE and Remote Control)
    const signalingChannel = supabase.channel(`webrtc_${matchId}`);
    signalingChannelRef.current = signalingChannel;

    // Send local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingChannel.send({
          type: "broadcast",
          event: "candidate",
          payload: { candidate: event.candidate },
        });
      }
    };

    // Listen for Broadcasts (ICE, Capabilities, State Sync)
    signalingChannel
      .on("broadcast", { event: "candidate" }, (message) => {
        if (message.payload.candidate)
          pc.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
      })
      .on("broadcast", { event: "sync_state" }, (message) => {
        // The phone broadcasts its capabilities and current state to us
        if (message.payload.capabilities)
          setCamCapabilities(message.payload.capabilities);
        if (message.payload.zoom) setRemoteZoom(message.payload.zoom);
        if (message.payload.torch !== undefined)
          setRemoteTorch(message.payload.torch);
      })
      .subscribe();

    // 🟢 DATABASE SYNC (For Offer/Answer Handshake)
    const dbSub = supabase
      .channel(`db_webrtc_receiver_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "webrtc_signals",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const { offer } = payload.new;

          if (offer && !hasJoined && pc.signalingState === "stable") {
            hasJoined = true;
            setError("Connecting to stream...");
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await supabase
              .from("webrtc_signals")
              .update({ answer })
              .eq("match_id", matchId);
          } else if (!offer) {
            setConnected(false);
            setError("Waiting for camera operator to go live...");
            hasJoined = false;
          }
        },
      )
      .subscribe();

    return () => {
      pc.close();
      supabase.removeChannel(signalingChannel);
      supabase.removeChannel(dbSub);
    };
  }, [matchId]);

  const handleManualPlay = () => {
    if (videoRef.current) videoRef.current.play();
    if (audioRef.current) {
      audioRef.current.play();
      setNeedsInteraction(false);
    }
  };

  // 🟢 SEND COMMANDS VIA SUPABASE BROADCAST (Ultra-low latency)
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
    sendCommand("zoom", val);
  };

  const toggleRemoteTorch = () => {
    const newVal = !remoteTorch;
    setRemoteTorch(newVal);
    sendCommand("torch", newVal);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        fontFamily: "sans-serif",
      }}>
      {/* FORCE HIDE NEXT.JS UI ELEMENTS IN OBS */}
      <style>{`nav, header, footer { display: none !important; }`}</style>

      {!connected && (
        <div style={{ color: "white", textAlign: "center", zIndex: 10 }}>
          <p
            style={{
              fontSize: "24px",
              color: error.includes("Failed") ? "#ef4444" : "#f59e0b",
              fontWeight: "bold",
            }}>
            {error.includes("Failed") ? "🔴 " : "🟡 "} {error}
          </p>
          <p style={{ fontSize: "14px", opacity: 0.7, marginTop: "8px" }}>
            Match ID: {matchId || "Loading..."}
          </p>
        </div>
      )}

      {connected && needsInteraction && (
        <div
          onClick={handleManualPlay}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            color: "white",
          }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>▶️</div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
            Click to Unmute & Play
          </h2>
          <p style={{ opacity: 0.7, marginTop: "10px", fontSize: "14px" }}>
            Right-click in OBS -&gt; Interact -&gt; Click here
          </p>
        </div>
      )}

      {/* 🟢 THE REMOTE CONTROL DASHBOARD (?control=true) */}
      {isRemoteMode && connected && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "2px solid rgba(255,255,255,0.1)",
            padding: "15px 30px",
            borderRadius: "50px",
            display: "flex",
            alignItems: "center",
            gap: "24px",
            zIndex: 100,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
          <div
            style={{
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "2px",
              opacity: 0.5,
              marginRight: "10px",
            }}>
            Remote PTZ
          </div>

          {camCapabilities?.zoom ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "200px",
              }}>
              <ZoomIn size={20} color="white" />
              <input
                type="range"
                min={camCapabilities.zoom.min}
                max={camCapabilities.zoom.max}
                step={camCapabilities.zoom.step}
                value={remoteZoom}
                onChange={handleRemoteZoom}
                style={{ flex: 1, accentColor: "#14b8a6", cursor: "pointer" }}
              />
            </div>
          ) : (
            <div style={{ color: "white", fontSize: "12px", opacity: 0.5 }}>
              Zoom Unavailable
            </div>
          )}

          {camCapabilities?.torch && (
            <button
              onClick={toggleRemoteTorch}
              style={{
                backgroundColor: remoteTorch
                  ? "#f59e0b"
                  : "rgba(255,255,255,0.1)",
                border: "none",
                width: "45px",
                height: "45px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: remoteTorch ? "black" : "white",
                transition: "0.2s",
              }}>
              {remoteTorch ? <Flashlight size={20} /> : <ZapOff size={20} />}
            </button>
          )}
        </div>
      )}

      {/* 🟢 INVISIBLE AUDIO ELEMENT */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* 🟢 MUTED VIDEO ELEMENT */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: connected ? "block" : "none",
        }}
      />
    </div>
  );
}
