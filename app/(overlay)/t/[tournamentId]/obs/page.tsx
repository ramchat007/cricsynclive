"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { supabase } from "@/lib/supabase";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function ObsReceiver({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [camParam, setCamParam] = useState<string | null>(null); 
  const [error, setError] = useState("Waiting for tournament config...");
  const [connected, setConnected] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const cameraQuery = searchParams.get("cam");
    if (cameraQuery) setCamParam(cameraQuery);
    else setError("Invalid Link: No Camera ID provided in URL.");
  }, []);

  useEffect(() => {
    if (!camParam) return; 
    const fetchConfig = async () => {
      const { data } = await supabase.from("tournaments").select("broadcast_state").eq("id", tournamentId).single();
      if (data?.broadcast_state?.activeMatchId) {
        setMatchId(data.broadcast_state.activeMatchId);
        setError(`Waiting for ${camParam} to go live...`);
      } else setError("No Active Match found.");
    };
    fetchConfig();
  }, [tournamentId, camParam]);

  useEffect(() => {
    if (!matchId || !camParam) return;
    let hasJoined = false;
    const connectionId = `${matchId}_${camParam}`;
    
    // 1. CLEANUP OLD CHANNELS
    supabase.removeAllChannels();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      if (event.streams && event.streams.length > 0) {
        if (videoRef.current) videoRef.current.srcObject = event.streams[0];
        if (audioRef.current) audioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnected(true); setError("");
        if (videoRef.current) videoRef.current.play().catch(() => setNeedsInteraction(true));
        if (audioRef.current) audioRef.current.play().catch(() => setNeedsInteraction(true));
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setConnected(false); setError(`Stream interrupted. Waiting for ${camParam}...`); hasJoined = false;
      }
    };

    // 🔥 THE BULLETPROOF HANDSHAKE FUNCTION
    const processOffer = async (offerStr: any) => {
      if (!offerStr || hasJoined) return;
      hasJoined = true;
      setError("Connecting to stream...");
      try {
        const offer = typeof offerStr === 'string' ? JSON.parse(offerStr) : offerStr;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Wait for Receiver ICE Gathering
        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') resolve(null);
          pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') resolve(null); };
          setTimeout(resolve, 2000); 
        });

        await supabase.from("webrtc_signals").update({ answer: JSON.parse(JSON.stringify(pc.localDescription)) }).eq("match_id", connectionId);
      } catch (err: any) {
        setError(`Handshake failed: ${err.message}`);
        hasJoined = false;
      }
    };

    // 2. CHECK IF BROADCASTER IS ALREADY LIVE
    supabase.from("webrtc_signals").select("offer").eq("match_id", connectionId).single().then(({data}) => {
      if (data?.offer) processOffer(data.offer);
    });

    // 3. LISTEN FOR NEW BROADCASTS (Both INSERT and UPDATE)
    const dbChannel = supabase.channel(`webrtc_db_obs_${connectionId}_${Date.now()}`);
    dbChannel.on("postgres_changes", { event: "*", schema: "public", table: "webrtc_signals", filter: `match_id=eq.${connectionId}` }, 
      (payload) => {
        if (payload.eventType === "DELETE") {
          setConnected(false); setError(`Stream stopped. Waiting for ${camParam}...`); hasJoined = false;
        } else if (payload.new?.offer && !hasJoined) {
          processOffer(payload.new.offer);
        }
      }).subscribe();

    return () => { pc.close(); supabase.removeAllChannels(); };
  }, [matchId, camParam]);

  const handleManualPlay = () => {
    if (videoRef.current) videoRef.current.play();
    if (audioRef.current) { audioRef.current.play(); setNeedsInteraction(false); }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "black", margin: 0, padding: 0, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", fontFamily: "sans-serif" }}>
      <style>{`nav, header, footer { display: none !important; }`}</style>
      {!connected && (
        <div style={{ color: "white", textAlign: "center", zIndex: 10 }}>
          <p style={{ fontSize: "24px", color: error.includes("Failed") || error.includes("Invalid") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
            {error.includes("Failed") || error.includes("Invalid") ? "🔴 " : "🟡 "} {error}
          </p>
          <p style={{ fontSize: "14px", opacity: 0.7, marginTop: "8px" }}>ID: {camParam ? `${camParam}` : "UNKNOWN"}</p>
        </div>
      )}
      {connected && needsInteraction && (
        <div onClick={handleManualPlay} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "white" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>▶️</div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>Click to Unmute & Play</h2>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline />
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "contain", display: connected ? "block" : "none" }} />
    </div>
  );
}
